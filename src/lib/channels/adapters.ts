import type { Channel, NormalizedEvent } from '@/lib/omnichannel/core'

export interface ChannelAdapter {
  readonly channel: Channel
  receiveEvent(payload: unknown, accountId: string): NormalizedEvent[]
  sendText(accountId: string, recipientId: string, text: string): Promise<unknown>
  sendMedia(accountId: string, recipientId: string, url: string, caption?: string): Promise<unknown>
  sendTemplate(accountId: string, recipientId: string, template: unknown): Promise<unknown>
  markRead(accountId: string, messageId: string): Promise<unknown>
  getMessageStatus(accountId: string, messageId: string): Promise<unknown>
  validateWebhook(headers: Record<string, string>, rawBody: string): boolean
}

abstract class BaseAdapter implements ChannelAdapter {
  abstract readonly channel: Channel
  abstract receiveEvent(payload: unknown, accountId: string): NormalizedEvent[]
  abstract validateWebhook(headers: Record<string, string>, rawBody: string): boolean
  async sendText(accountId: string, recipientId: string, text: string) { return this.request(accountId, { recipientId, text }) }
  async sendMedia(accountId: string, recipientId: string, url: string, caption?: string) { return this.request(accountId, { recipientId, url, caption }) }
  async sendTemplate(accountId: string, recipientId: string, template: unknown) { return this.request(accountId, { recipientId, template }) }
  async markRead(accountId: string, messageId: string) { return this.request(accountId, { messageId, read: true }) }
  async getMessageStatus(accountId: string, messageId: string) { return this.request(accountId, { messageId, status: true }) }
  protected async request(_accountId: string, _body: unknown) { throw new Error('Channel transport must be implemented with provider credentials') }
}

export class WhatsAppAdapter extends BaseAdapter { readonly channel = 'whatsapp' as const; receiveEvent(payload: unknown, accountId: string) { return normalize(payload, accountId, this.channel) }; validateWebhook() { return true } }
export class MessengerAdapter extends BaseAdapter { readonly channel = 'messenger' as const; receiveEvent(payload: unknown, accountId: string) { return normalize(payload, accountId, this.channel) }; validateWebhook() { return true } }
export class InstagramAdapter extends BaseAdapter { readonly channel = 'instagram' as const; receiveEvent(payload: unknown, accountId: string) { return normalize(payload, accountId, this.channel) }; validateWebhook() { return true } }

function normalize(payload: unknown, accountId: string, channel: Channel): NormalizedEvent[] {
  const p = payload as Record<string, unknown>
  const id = String(p.message_id ?? p.id ?? crypto.randomUUID())
  return [{ channel, accountId, externalConversationId: String(p.conversation_id ?? p.thread_id ?? ''), externalMessageId: id, externalCustomerId: String(p.customer_id ?? p.sender_id ?? ''), direction: 'inbound', text: typeof p.text === 'string' ? p.text : undefined, mediaUrl: typeof p.media_url === 'string' ? p.media_url : undefined, timestamp: new Date().toISOString(), raw: payload }]
}

export const channelAdapters: Record<Channel, ChannelAdapter> = {
  whatsapp: new WhatsAppAdapter(), messenger: new MessengerAdapter(), instagram: new InstagramAdapter(),
}
