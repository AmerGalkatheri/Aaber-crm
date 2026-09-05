export type ChannelKey = 'whatsapp' | 'messenger' | 'instagram'

export type MessageDirection = 'inbound' | 'outbound'
export type MessageContentType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'template'

export interface NormalizedMessage {
  externalMessageId: string
  externalUserId: string
  accountExternalId?: string
  direction: MessageDirection
  contentType: MessageContentType
  text?: string
  mediaUrl?: string
  timestamp: string
  rawPayload: unknown
}

export interface NormalizedChannelEvent {
  externalEventId: string
  type: 'message.received' | 'message.status' | 'message.unknown'
  accountExternalId?: string
  message?: NormalizedMessage
  rawPayload: unknown
}

export interface ChannelAdapter {
  readonly key: ChannelKey
  validateWebhook(request: Request, rawBody: string): boolean | Promise<boolean>
  receiveEvent(rawBody: string): NormalizedChannelEvent[]
  sendText(input: { accountExternalId: string; recipientExternalId: string; text: string }): Promise<{ externalMessageId: string }>
  sendMedia(input: { accountExternalId: string; recipientExternalId: string; mediaUrl: string; caption?: string }): Promise<{ externalMessageId: string }>
  sendTemplate(input: { accountExternalId: string; recipientExternalId: string; templateName: string; variables?: Record<string, string> }): Promise<{ externalMessageId: string }>
  markRead(input: { accountExternalId: string; externalMessageId: string }): Promise<void>
  getMessageStatus(input: { accountExternalId: string; externalMessageId: string }): Promise<string>
}
