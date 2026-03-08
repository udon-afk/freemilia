#!/usr/bin/env node
/**
 * Minimal OpenAI-compatible bridge for AIRI.
 *
 * Endpoints:
 *   GET  /v1/models
 *   POST /v1/chat/completions
 *
 * Modes:
 *   - mock (default): synthetic assistant response
 *   - passthrough: forwards to upstream OpenAI-compatible endpoint
 *   - openclaw: forwards to OpenClaw endpoint / custom webhook and maps errors to OpenAI-style payload
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

function sendOpenAIError(res, {
  status = 500,
  message = 'Internal error',
  type = 'server_error',
  code,
  param,
}) {
  const errorPayload = {
    error: {
      message,
      type,
      ...(param ? { param } : {}),
      ...(code ? { code } : {}),
    },
  }
  sendJson(res, status, errorPayload)
}

function nowUnix() {
  return Math.floor(Date.now() / 1000)
}

function normalizeMessageContent(content) {
  if (typeof content === 'string')
    return content

  if (!Array.isArray(content))
    return ''

  return content
    .map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && typeof part.text === 'string')
        return part.text
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

function extractUserText(messages) {
  if (!Array.isArray(messages))
    return ''

  return messages
    .filter(msg => msg && msg.role === 'user')
    .map(msg => normalizeMessageContent(msg.content))
    .filter(Boolean)
    .join('\n')
}

function toOpenAIErrorFromStatus(status, fallbackMessage) {
  if (status === 400)
    return { status, type: 'invalid_request_error', message: fallbackMessage || 'Bad request' }
  if (status === 401)
    return { status, type: 'invalid_request_error', code: 'invalid_api_key', message: fallbackMessage || 'Invalid authentication credentials' }
  if (status === 403)
    return { status, type: 'invalid_request_error', code: 'forbidden', message: fallbackMessage || 'Access denied' }
  if (status === 404)
    return { status, type: 'invalid_request_error', code: 'not_found', message: fallbackMessage || 'Resource not found' }
  if (status === 408)
    return { status, type: 'request_timeout', code: 'request_timeout', message: fallbackMessage || 'Request timed out' }
  if (status === 409)
    return { status, type: 'invalid_request_error', code: 'conflict', message: fallbackMessage || 'Conflict' }
  if (status === 413)
    return { status, type: 'invalid_request_error', code: 'context_length_exceeded', message: fallbackMessage || 'Request too large' }
  if (status === 422)
    return { status, type: 'invalid_request_error', code: 'unprocessable_entity', message: fallbackMessage || 'Unprocessable entity' }
  if (status === 429)
    return { status, type: 'rate_limit_error', code: 'rate_limit_exceeded', message: fallbackMessage || 'Rate limit exceeded' }
  if (status >= 500 && status < 600)
    return { status, type: 'server_error', code: 'upstream_error', message: fallbackMessage || `Upstream server error (${status})` }
  return { status, type: 'server_error', code: 'upstream_error', message: fallbackMessage || `Upstream error (${status})` }
}

function parseMaybeJson(text) {
  if (!text)
    return null
  try {
    return JSON.parse(text)
  }
  catch {
    return null
  }
}

function mapUpstreamError(status, text) {
  const parsed = parseMaybeJson(text)
  if (parsed && typeof parsed === 'object' && parsed.error && typeof parsed.error === 'object') {
    const source = parsed.error
    return {
      status,
      type: typeof source.type === 'string' ? source.type : toOpenAIErrorFromStatus(status).type,
      message: typeof source.message === 'string' ? source.message : toOpenAIErrorFromStatus(status).message,
      code: typeof source.code === 'string' ? source.code : toOpenAIErrorFromStatus(status).code,
      param: typeof source.param === 'string' ? source.param : undefined,
    }
  }

  if (parsed && typeof parsed === 'object') {
    const message = typeof parsed.message === 'string'
      ? parsed.message
      : typeof parsed.error === 'string'
        ? parsed.error
        : ''
    return toOpenAIErrorFromStatus(status, message || undefined)
  }

  const fallback = typeof text === 'string' && text.trim() ? text.trim().slice(0, 800) : undefined
  return toOpenAIErrorFromStatus(status, fallback)
}

function writeSse(res, payloadObj) {
  res.write(`data: ${JSON.stringify(payloadObj)}\n\n`)
}

function sendSseDone(res) {
  res.write('data: [DONE]\n\n')
  res.end()
}

function openSse(res) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  })
}

function createBaseChunk({ id, model, created, index, delta, finishReason }) {
  return {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [
      {
        index,
        delta,
        finish_reason: finishReason ?? null,
      },
    ],
  }
}

async function streamMockCompletion(res, { model, content }) {
  openSse(res)
  const id = `chatcmpl_mock_${Date.now()}`
  const created = nowUnix()

  writeSse(res, createBaseChunk({
    id,
    model,
    created,
    index: 0,
    delta: { role: 'assistant' },
    finishReason: null,
  }))

  for (const token of content.split(/(\s+)/).filter(Boolean)) {
    writeSse(res, createBaseChunk({
      id,
      model,
      created,
      index: 0,
      delta: { content: token },
      finishReason: null,
    }))
    await new Promise(resolvePromise => setTimeout(resolvePromise, 15))
  }

  writeSse(res, createBaseChunk({
    id,
    model,
    created,
    index: 0,
    delta: {},
    finishReason: 'stop',
  }))

  sendSseDone(res)
}

function buildMockCompletion(body) {
  const model = body.model || config.defaultModel
  const userText = extractUserText(body.messages)

  return {
    model,
    content: `Mock bridge response (mode=mock). Received ${userText.length} chars from user messages.`,
  }
}

async function forwardJsonRequest({ url, authHeader, body, timeoutMs }) {
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), timeoutMs)
  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
      signal: abortController.signal,
    })
  }
  finally {
    clearTimeout(timeout)
  }
}

function resolveBackendTarget(mode) {
  if (mode === 'passthrough') {
    if (!config.passthroughBaseUrl)
      return null
    return {
      url: new URL('/v1/chat/completions', config.passthroughBaseUrl).toString(),
      authHeader: config.passthroughApiKey
        ? `Bearer ${config.passthroughApiKey}`
        : null,
    }
  }

  if (mode === 'openclaw') {
    const explicit = config.openclawWebhookUrl || config.openclawEndpoint
    if (!explicit)
      return null
    return {
      url: explicit,
      authHeader: config.openclawApiKey
        ? `Bearer ${config.openclawApiKey}`
        : null,
    }
  }

  return null
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
  openclawEndpoint: process.env.BRIDGE_OPENCLAW_ENDPOINT || '',
  openclawWebhookUrl: process.env.BRIDGE_OPENCLAW_WEBHOOK_URL || '',
  openclawApiKey: process.env.BRIDGE_OPENCLAW_API_KEY || '',
  upstreamTimeoutMs: Number(process.env.BRIDGE_UPSTREAM_TIMEOUT_MS || 60_000),
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
        return sendOpenAIError(res, {
          status: 401,
          message: 'Unauthorized',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
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
      const stream = body?.stream === true

      if (config.mode === 'mock') {
        const mock = buildMockCompletion(body)

        if (stream)
          return streamMockCompletion(res, mock)

        return sendJson(res, 200, {
          id: `chatcmpl_mock_${Date.now()}`,
          object: 'chat.completion',
          created: nowUnix(),
          model: mock.model,
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              message: {
                role: 'assistant',
                content: mock.content,
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

      if (config.mode === 'passthrough' || config.mode === 'openclaw') {
        const target = resolveBackendTarget(config.mode)
        if (!target) {
          const envHint = config.mode === 'passthrough'
            ? 'BRIDGE_PASSTHROUGH_BASE_URL'
            : 'BRIDGE_OPENCLAW_ENDPOINT or BRIDGE_OPENCLAW_WEBHOOK_URL'
          return sendOpenAIError(res, {
            status: 501,
            message: `${config.mode} mode is selected, but ${envHint} is not set`,
            type: 'invalid_request_error',
            code: 'not_configured',
          })
        }

        const inboundAuth = req.headers.authorization || ''
        const upstreamAuth = target.authHeader || inboundAuth

        let upstreamResp
        try {
          upstreamResp = await forwardJsonRequest({
            url: target.url,
            authHeader: upstreamAuth,
            body,
            timeoutMs: config.upstreamTimeoutMs,
          })
        }
        catch (error) {
          const isAbort = error instanceof Error && error.name === 'AbortError'
          return sendOpenAIError(res, {
            status: isAbort ? 504 : 502,
            type: isAbort ? 'request_timeout' : 'server_error',
            code: isAbort ? 'upstream_timeout' : 'upstream_unreachable',
            message: isAbort
              ? `Upstream timeout after ${config.upstreamTimeoutMs}ms`
              : (error instanceof Error ? error.message : 'Upstream request failed'),
          })
        }

        const contentType = upstreamResp.headers.get('content-type') || ''
        if (upstreamResp.ok && stream && contentType.includes('text/event-stream')) {
          res.writeHead(upstreamResp.status, {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-cache, no-transform',
            connection: 'keep-alive',
            'x-accel-buffering': 'no',
          })

          if (!upstreamResp.body) {
            sendSseDone(res)
            return
          }

          for await (const chunk of upstreamResp.body)
            res.write(chunk)

          if (!res.writableEnded)
            res.end()
          return
        }

        const text = await upstreamResp.text()
        if (!upstreamResp.ok) {
          const mapped = mapUpstreamError(upstreamResp.status, text)
          return sendOpenAIError(res, mapped)
        }

        if (stream) {
          const parsed = parseMaybeJson(text)
          const msg = parsed?.choices?.[0]?.message?.content
          const model = parsed?.model || body.model || config.defaultModel
          await streamMockCompletion(res, {
            model,
            content: typeof msg === 'string' ? msg : 'Upstream response delivered.',
          })
          return
        }

        res.writeHead(upstreamResp.status, {
          'content-type': contentType || 'application/json; charset=utf-8',
        })
        res.end(text)
        return
      }

      return sendOpenAIError(res, {
        status: 501,
        message: `Unsupported BRIDGE_MODE: ${config.mode}`,
        type: 'invalid_request_error',
        code: 'unsupported_mode',
      })
    }

    sendOpenAIError(res, {
      status: 404,
      message: `Not found: ${req.method || 'GET'} ${reqUrl.pathname}`,
      type: 'invalid_request_error',
      code: 'not_found',
    })
  }
  catch (error) {
    sendOpenAIError(res, {
      status: 500,
      message: error instanceof Error ? error.message : 'Internal error',
      type: 'server_error',
      code: 'internal_error',
    })
  }
})

server.listen(config.port, config.host, () => {
  console.log(`[openclaw-openai-bridge] listening on http://${config.host}:${config.port} (mode=${config.mode})`)
  console.log(`[openclaw-openai-bridge] model=${config.defaultModel}`)
  console.log(`[openclaw-openai-bridge] env=${ENV_FILE}`)
})
