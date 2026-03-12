import type { ChatResponse, AvatarMood } from '@reia/events'

const gateway = (import.meta.env.VITE_REIA_GATEWAY_URL as string | undefined) ?? 'http://localhost:8787'
const connection = document.getElementById('connection')!
const moodEl = document.getElementById('mood')!
const avatarEl = document.getElementById('avatar')!
const logEl = document.getElementById('log')!
const inputEl = document.getElementById('message') as HTMLInputElement
const sendBtn = document.getElementById('send') as HTMLButtonElement

let lastMessage = ''

const moodMap: Record<AvatarMood, string> = {
  neutral: '😐',
  happy: '😊',
  thinking: '🤔'
}

function setConnection(state: 'Connected' | 'Reconnecting' | 'Offline') {
  connection.textContent = state
}

function setMood(mood: AvatarMood) {
  moodEl.textContent = mood
  avatarEl.textContent = moodMap[mood]
}

async function healthcheck() {
  try {
    const res = await fetch(`${gateway}/health`)
    setConnection(res.ok ? 'Connected' : 'Reconnecting')
  } catch {
    setConnection('Offline')
  }
}

async function send() {
  const message = inputEl.value.trim()
  if (!message || message === lastMessage) return

  sendBtn.disabled = true
  try {
    setConnection('Reconnecting')
    const res = await fetch(`${gateway}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = (await res.json()) as ChatResponse
    lastMessage = message
    setConnection('Connected')
    setMood(data.avatarMood)
    logEl.textContent = `you: ${message}\nreia: ${data.reply}\nsource: ${data.source}`
    inputEl.value = ''
  } catch (err) {
    setConnection('Offline')
    logEl.textContent = `send failed: ${String(err)}`
  } finally {
    sendBtn.disabled = false
  }
}

sendBtn.addEventListener('click', send)
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') void send()
})

if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js')
}

void healthcheck()
setInterval(() => {
  void healthcheck()
}, 5000)
