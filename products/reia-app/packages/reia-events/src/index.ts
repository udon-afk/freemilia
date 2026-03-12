export type AvatarMood = 'neutral' | 'happy' | 'thinking'

export type AvatarEvent =
  | { kind: 'mood'; value: string }
  | { kind: 'expression'; value: string }
  | { kind: 'motion'; value: string }
  | { kind: 'unknown'; value: string }

export interface ChatRequest {
  message: string
  sessionId?: string
}

export interface ChatResponse {
  reply: string
  avatarMood: AvatarMood
  events: AvatarEvent[]
  source: 'mock' | 'openclaw'
}

export interface OpenClawAdapter {
  chat(input: ChatRequest): Promise<ChatResponse>
}

export function mapAvatarMood(input: string): AvatarMood {
  const normalized = input.toLowerCase()
  if (["happy", "joy", "smile", "excited"].includes(normalized)) return 'happy'
  if (["thinking", "think", "focus", "processing"].includes(normalized)) return 'thinking'
  return 'neutral'
}

export function toSafeEvent(kind: string, value: string): AvatarEvent {
  if (kind === 'mood' || kind === 'expression' || kind === 'motion') {
    return { kind, value } as AvatarEvent
  }
  return { kind: 'unknown', value: `${kind}:${value}` }
}
