import type { ConversationMode } from './core'

export type HandoffReason = 'customer_request' | 'low_confidence' | 'tool_failure' | 'sensitive_topic' | 'policy'

export type HandoffDecision = {
  mode: ConversationMode
  reason?: HandoffReason
  summary?: string
}

export function decideHandoff(input: {
  requestedHuman?: boolean
  confidence?: number
  toolFailed?: boolean
  sensitive?: boolean
  threshold?: number
  summary?: string
}): HandoffDecision {
  if (input.requestedHuman) return { mode: 'human', reason: 'customer_request', summary: input.summary }
  if (input.sensitive) return { mode: 'human', reason: 'sensitive_topic', summary: input.summary }
  if (input.toolFailed) return { mode: 'human', reason: 'tool_failure', summary: input.summary }
  const threshold = input.threshold ?? 0.65
  if (input.confidence !== undefined && input.confidence < threshold) {
    return { mode: 'human', reason: 'low_confidence', summary: input.summary }
  }
  return { mode: 'ai', summary: input.summary }
}
