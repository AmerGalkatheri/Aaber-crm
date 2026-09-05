import { createHmac, timingSafeEqual } from 'node:crypto'
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

function tokenFor(accountId: string) {
  const key = accountId.toUpperCase().replace(/[^A-Z0-9]/g, '_')
  const token = process.env[`ABAR_CHANNEL_${key}_ACCESS_TOKEN`]
  if (!token) throw new Error(`Missing channel access token for ${accountId}`)
  return token
}

abstract class BaseMetaAdapter implements ChannelAdapter {
  abstract readonly channel: Channel
  abstract receiveEvent(payload: unknown, accountId: string): NormalizedEvent[]

  async sendText(accountId: string, recipientId: string, text: string) {
    return this.request(accountId, { recipient: { id: recipientId }, message: { text } })
  }

  async sendMedia(accountId: string, recipientId: string, url: string, caption?: string) {
    return this.request(accountId, { recipient: { id: recipientId }, message: { attachment: { type: 'image', payload: { url, is_reusable: false } }, ...(caption ? { text: caption } : {}) } })
  }

  async sendTemplate(accountId: string, recipientId: string, template: unknown) {
    return this.request(accountId, { recipient: { id: recipientId }, message: template })
  }

  async markRead(accountId: string, recipientId: string) {
    return this.request(accountId, { recipient: { id: recipientId }, sender_action: 'mark_seen' })
  }

  async getMessageStatus() { return { status: 'webhook_driven' } }

  protected async request(accountId: string, body: unknown) {
    const version = process.env.META_GRAPH_API_VERSION
    if (!version) throw new Error('META_GRAPH_API_VERSION is required')
    const response = await fetch(`https://graph.facebook.com/${version}/${accountId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${tokenFor(accountId)}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Meta API ${response.status}: ${JSON.stringify(data)}`)
    return data
  }

  validateWebhook(headers: Record<string, string>, rawBody: string) {
    const secret = process.env.META_APP_SECRET
    const signature = headers['x-hub-signature-256'] ?? headers['X-Hub-Signature-256']
    if (!secret || !signature?.startsWith('sha256=')) return false
    const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`)
    const actual = Buffer.from(signature)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  }
}

export class MessengerAdapter extends BaseMetaAdapter {
  readonly channel = 'messenger' as const
  receiveEvent(payload: unknown, accountId: string) { return normalizeMeta(payload, accountId, this.channel) }
}

export class InstagramAdapter extends BaseMetaAdapter {
  readonly channel = 'instagram' as const
  receiveEvent(payload: unknown, accountId: string) { return normalizeMeta(payload, accountId, this.channel) }
}

export class WhatsAppAdapter extends BaseMetaAdapter {
  readonly channel = 'whatsapp' as const
  receiveEvent(payload: unknown, accountId: string) { return normalizeWhatsApp(payload, accountId) }
}

function normalizeMeta(payload: unknown, accountId: string, channel: Channel): NormalizedEvent[] {
  const root = payload as { entry?: Array<{ messaging?: Array<Record<string, unknown>> }> }
  const events: NormalizedEvent[] = []
  for (const entry of root.entry ?? []) {
    for (const item of entry.messaging ?? []) {
      const sender = item.sender as { id?: string } | undefined
      const recipient = item.recipient as { id?: string } | undefined
      const message = item.message as { mid?: string; text?: string; attachments?: Array<{ type?: string; payload?: { url?: string } }> } | undefined
      if (!sender?.id || !message?.mid) continue
      events.push({ channel, accountId, externalConversationId: sender.id, externalMessageId: message.mid, externalCustomerId: sender.id, direction: recipient?.id === accountId ? 'inbound' : 'outbound', text: message.text, mediaUrl: message.attachments?.[0]?.payload?.url, timestamp: toIso(item.timestamp), raw: item })
    }
  }
  return events
}

type WhatsAppMessage = {
  id?: string
  from?: string
  timestamp?: string
  type?: string
  text?: { body?: string }
  image?: { link?: string; caption?: string }
  video?: { link?: string; caption?: string }
  audio?: { link?: string }
  document?: { link?: string; filename?: string; caption?: string }
  sticker?: { link?: string }
}

type WhatsAppChange = {
  field?: string
  value?: {
    metadata?: { phone_number_id?: string }
    contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>
    messages?: WhatsAppMessage[]
    statuses?: unknown[]
  }
}

function normalizeWhatsApp(payload: unknown, accountId: string): NormalizedEvent[] {
  const root = payload as { entry?: Array<{ id?: string; changes?: WhatsAppChange[] }> }
  const events: NormalizedEvent[] = []
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages' || !change.value?.messages) continue
      const value = change.value
      const contact = value.contacts?.[0]
      for (const message of value.messages) {
        if (!message.id || !message.from) continue
        const media = message.image?.link ?? message.video?.link ?? message.audio?.link ?? message.document?.link ?? message.sticker?.link
        const text = message.text?.body ?? message.image?.caption ?? message.video?.caption ?? message.document?.caption
        events.push({
          channel: 'whatsapp',
          accountId,
          externalConversationId: message.from,
          externalMessageId: message.id,
          externalCustomerId: contact?.wa_id ?? message.from,
          direction: 'inbound',
          text,
          mediaUrl: media,
          timestamp: toIso(message.timestamp ? Number(message.timestamp) * 1000 : undefined),
          raw: { ...message, phone_number_id: value.metadata?.phone_number_id, contact },
        })
      }
    }
  }
  return events
}

function toIso(value?: number | string) {
  const timestamp = typeof value === 'string' ? Number(value) : value
  return new Date(Number.isFinite(timestamp) && timestamp ? timestamp : Date.now()).toISOString()
}

export const channelAdapters: Record<Channel, ChannelAdapter> = {
  whatsapp: new WhatsAppAdapter(),
  messenger: new MessengerAdapter(),
  instagram: new InstagramAdapter(),
}
