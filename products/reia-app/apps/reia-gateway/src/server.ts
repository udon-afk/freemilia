import cors from 'cors'
import express from 'express'
import type { ChatRequest, OpenClawAdapter } from '@reia/events'
import { mapAvatarMood } from '@reia/events'
import { OpenClawRuntimeAdapter } from './adapters.js'

const adapter: OpenClawAdapter = new OpenClawRuntimeAdapter()
const app = express()
const port = Number(process.env.REIA_GATEWAY_PORT ?? 8787)

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'reia-gateway', adapter: 'mock', ts: Date.now() })
})

app.post('/api/chat', async (req, res) => {
  const body = req.body as ChatRequest
  if (!body?.message || typeof body.message !== 'string') {
    return res.status(400).json({ error: 'message is required' })
  }

  const result = await adapter.chat(body)
  res.json({
    ...result,
    avatarMood: mapAvatarMood(result.avatarMood)
  })
})

app.listen(port, () => {
  console.log(`reia-gateway listening on http://localhost:${port}`)
})
