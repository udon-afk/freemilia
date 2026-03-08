#!/usr/bin/env node
/**
 * Minimal OpenAI-compatible bridge for AIRI.
 *
 * Endpoints:
 *   GET  /v1/models
 *   POST /v1/chat/completions
 *
 * Modes:
 *   - mock (default): always returns synthetic assistant response
 *   - passthrough: placeholder that forwards request to upstream OpenAI-compatible endpoint
 */

import http from 'node:http'
import { URL } from 'node:url'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(filePath) {
  if (!existsSync(filePath))
    return

  const content = readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#'))
      continue

    const idx = line.indexOf('=')
    if (idx <= 0)
      continue

    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1)

    if (!(key in process.env))
      process.env[key] = value
  }
}

function readJsonBody(req) {
  return new Promise((resolvePromise, rejectPromise) => {
    let buf = ''
    req.on('data', (chunk) => {
      buf += chunk
      if (buf.length > 1_000_000) {
        rejectPromise(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!buf)
        return resolvePromise({})
      try {
        resolvePromise(JSON.parse(buf))
      }
      catch {
        rejectPromise(new Error('Invalid JSON body'))
      }
    })
    req.on('error', rejectPromise)
  })
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function nowUnix() {
  return Math.floor(Date.now() / 1000)
}

const ENV_FILE = process.env.BRIDGE_ENV_FILE || resolve(process.cwd(), 'ops/bridge/.env')
loadEnvFile(ENV_FILE)

const config = {
  host: process.env.BRIDGE_HOST || '127.0.0.1',
  port: Number(process.env.BRIDGE_PORT || 8787),
  mode: (process.env.BRIDGE_MODE || 'mock').toLowerCase(),
  defaultModel: process.env.BRIDGE_MODEL || 'openclaw-reia-mock',
  apiKey: process.env.BRIDGE_API_KEY || '',
  passthroughBaseUrl: process.env.BRIDGE_PASSTHROUGH_BASE_URL || '',
  passthroughApiKey: process.env.BRIDGE_PASSTHROUGH_API_KEY || '',
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    if (reqUrl.pathname === '/health') {
      return sendJson(res, 200, {
        ok: true,
        mode: config.mode,
      })
    }

    if (config.apiKey) {
      const auth = req.headers.authorization || ''
      if (auth !== `Bearer ${config.apiKey}`) {
        return sendJson(res, 401, {
          error: {
            message: 'Unauthorized',
            type: 'invalid_request_error',
          },
        })
      }
    }

    if (req.method === 'GET' && reqUrl.pathname === '/v1/models') {
      return sendJson(res, 200, {
        object: 'list',
        data: [
          {
            id: config.defaultModel,
            object: 'model',
            created: nowUnix(),
            owned_by: 'openclaw-bridge',
          },
        ],
      })
    }

    if (req.method === 'POST' && reqUrl.pathname === '/v1/chat/completions') {
      const body = await readJsonBody(req)

      if (config.mode === 'passthrough') {
        if (!config.passthroughBaseUrl) {
          return sendJson(res, 501, {
            error: {
              message: 'passthrough mode is selected, but BRIDGE_PASSTHROUGH_BASE_URL is not set',
              type: 'not_implemented',
            },
          })
        }

        const upstreamUrl = new URL('/v1/chat/completions', config.passthroughBaseUrl).toString()
        const upstreamAuth = config.passthroughApiKey
          ? `Bearer ${config.passthroughApiKey}`
          : (req.headers.authorization || '')

        const upstreamResp = await fetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(upstreamAuth ? { authorization: upstreamAuth } : {}),
          },
          body: JSON.stringify(body),
        })

        const text = await upstreamResp.text()
        res.writeHead(upstreamResp.status, {
          'content-type': upstreamResp.headers.get('content-type') || 'application/json; charset=utf-8',
        })
        res.end(text)
        return
      }

      const model = body.model || config.defaultModel
      const userText = Array.isArray(body.messages)
        ? body.messages
          .filter(msg => msg && msg.role === 'user')
          .map((msg) => {
            if (typeof msg.content === 'string')
              return msg.content
            return '[non-text-content]'
          })
          .join('\n')
        : ''

      return sendJson(res, 200, {
        id: `chatcmpl_mock_${Date.now()}`,
        object: 'chat.completion',
        created: nowUnix(),
        model,
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: `Mock bridge response (mode=mock). Received ${userText.length} chars from user messages.`,
            },
          },
        ],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      })
    }

    sendJson(res, 404, {
      error: {
        message: `Not found: ${req.method || 'GET'} ${reqUrl.pathname}`,
        type: 'invalid_request_error',
      },
    })
  }
  catch (error) {
    sendJson(res, 500, {
      error: {
        message: error instanceof Error ? error.message : 'Internal error',
        type: 'server_error',
      },
    })
  }
})

server.listen(config.port, config.host, () => {
  console.log(`[openclaw-openai-bridge] listening on http://${config.host}:${config.port} (mode=${config.mode})`)
  console.log(`[openclaw-openai-bridge] model=${config.defaultModel}`)
  console.log(`[openclaw-openai-bridge] env=${ENV_FILE}`)
})
