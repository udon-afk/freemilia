import type { ChatRequest, ChatResponse, OpenClawAdapter } from '@reia/events'
import { toSafeEvent } from '@reia/events'

export class MockOpenClawAdapter implements OpenClawAdapter {
  async chat(input: ChatRequest): Promise<ChatResponse> {
    const text = input.message.toLowerCase()
    const avatarMood = text.includes('?') ? 'thinking' : text.includes('ありがとう') || text.includes('thanks') ? 'happy' : 'neutral'

    return {
      reply: `REIA mock reply: ${input.message}`,
      avatarMood,
      events: [
        toSafeEvent('mood', avatarMood),
        toSafeEvent('expression', avatarMood === 'happy' ? 'smile' : 'calm'),
        toSafeEvent('motion', avatarMood === 'thinking' ? 'head_tilt' : 'idle')
      ],
      source: 'mock'
    }
  }
}

// S1: interface-first adapter seam. Replace internals with OpenClaw runtime call in S2+.
export class OpenClawRuntimeAdapter implements OpenClawAdapter {
  async chat(input: ChatRequest): Promise<ChatResponse> {
    // TODO: call OpenClaw runtime endpoint/tooling once wired.
    return new MockOpenClawAdapter().chat(input)
  }
}
