export type Channel = 'whatsapp' | 'messenger' | 'instagram'
export type MessageDirection = 'inbound' | 'outbound'
export type ConversationMode = 'human' | 'ai'

export interface NormalizedEvent {
  channel: Channel
  accountId: string
  externalConversationId: string
  externalMessageId: string
  externalCustomerId: string
  direction: MessageDirection
  text?: string
  mediaUrl?: string
  timestamp: string
  raw: unknown
}

export interface RoutingContext {
  departmentId?: string
  assignedAgentId?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  mode?: ConversationMode
}

export function resolveRouting(context: RoutingContext): RoutingContext {
  if (context.assignedAgentId) return context
  return { priority: context.priority ?? 'normal', mode: context.mode ?? 'human', departmentId: context.departmentId }
}

export function eventKey(event: NormalizedEvent) {
  return `${event.channel}:${event.accountId}:${event.externalMessageId}`
}
