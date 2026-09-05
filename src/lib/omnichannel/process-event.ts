import { createClient } from '@supabase/supabase-js'
import type { NormalizedEvent } from '@/lib/omnichannel/core'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

/** Materializes a normalized channel event into the existing CRM contact/conversation/message core. */
export async function processInboundEvent(event: NormalizedEvent) {
  const supabase = db()
  const { data: account, error: accountError } = await supabase
    .from('channel_accounts')
    .select('id, account_id, user_id, channel_id')
    .eq('id', event.accountId)
    .maybeSingle()
  if (accountError) throw accountError
  if (!account) throw new Error(`Unknown channel account: ${event.accountId}`)

  const ownerUserId = account.user_id as string | null
  const tenantAccountId = account.account_id as string | null
  if (!ownerUserId || !tenantAccountId) throw new Error(`Channel account ${event.accountId} is not linked to an account owner`)

  const externalPhone = event.raw && typeof event.raw === 'object' ? extractPhone(event.raw) : undefined
  const contactPhone = externalPhone ?? `omni:${event.channel}:${event.externalCustomerId}`
  const displayName = extractName(event.raw) ?? event.externalCustomerId

  let contact = await supabase
    .from('contacts')
    .select('id')
    .eq('account_id', tenantAccountId)
    .eq('phone', contactPhone)
    .maybeSingle()
  if (contact.error) throw contact.error

  if (!contact.data) {
    const inserted = await supabase.from('contacts').insert({
      user_id: ownerUserId,
      account_id: tenantAccountId,
      phone: contactPhone,
      name: displayName,
    }).select('id').single()
    if (inserted.error) {
      const retry = await supabase.from('contacts').select('id').eq('account_id', tenantAccountId).eq('phone', contactPhone).maybeSingle()
      if (retry.error || !retry.data) throw inserted.error
      contact = retry
    } else contact = inserted
  }

  const contactId = contact.data!.id as string
  const customerLookup = await supabase.from('customers').select('id').eq('account_id', tenantAccountId).eq('contact_id', contactId).maybeSingle()
  if (customerLookup.error) throw customerLookup.error

  let customerId = customerLookup.data?.id as string | undefined
  if (!customerId) {
    const created = await supabase.from('customers').insert({
      user_id: ownerUserId,
      account_id: tenantAccountId,
      contact_id: contactId,
      display_name: displayName,
      phone: externalPhone ?? null,
      locale: 'ar',
      lifecycle_stage: 'lead',
      metadata: { source: event.channel },
    }).select('id').single()
    if (created.error) {
      const retry = await supabase.from('customers').select('id').eq('account_id', tenantAccountId).eq('contact_id', contactId).maybeSingle()
      if (retry.error || !retry.data) throw created.error
      customerId = retry.data.id as string
    } else customerId = created.data.id as string
  }

  const identity = await supabase.from('customer_identities').upsert({
    customer_id: customerId,
    channel_id: account.channel_id,
    channel_account_id: event.accountId,
    external_user_id: event.externalCustomerId,
    external_username: displayName,
    external_phone: externalPhone ?? null,
    metadata: { conversation_id: event.externalConversationId },
  }, { onConflict: 'channel_id,channel_account_id,external_user_id' })
  if (identity.error) throw identity.error

  let conversation = await supabase.from('conversations').select('id').eq('account_id', tenantAccountId).eq('contact_id', contactId).maybeSingle()
  if (conversation.error) throw conversation.error
  if (!conversation.data) {
    const created = await supabase.from('conversations').insert({
      user_id: ownerUserId,
      account_id: tenantAccountId,
      contact_id: contactId,
      customer_id: customerId,
      channel_account_id: event.accountId,
      status: 'open',
      mode: 'human',
      priority: 'normal',
      last_message_channel: event.channel,
    }).select('id').single()
    if (created.error) {
      const retry = await supabase.from('conversations').select('id').eq('account_id', tenantAccountId).eq('contact_id', contactId).maybeSingle()
      if (retry.error || !retry.data) throw created.error
      conversation = retry
    } else conversation = created
  }

  const conversationId = conversation.data!.id as string
  const existing = await supabase.from('messages').select('id').eq('conversation_id', conversationId).eq('external_message_id', event.externalMessageId).maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return { conversationId, customerId, contactId, duplicate: true }

  const contentType = event.mediaUrl ? 'image' : 'text'
  const message = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_type: 'customer',
    content_type: contentType,
    content_text: event.text ?? null,
    media_url: event.mediaUrl ?? null,
    message_id: event.externalMessageId,
    external_message_id: event.externalMessageId,
    direction: event.direction,
    status: 'sent',
    channel_account_id: event.accountId,
    raw_payload: event.raw,
    metadata: { channel: event.channel, external_conversation_id: event.externalConversationId },
    created_at: event.timestamp,
  }).select('id').single()
  if (message.error) throw message.error

  await supabase.from('conversations').update({
    customer_id: customerId,
    channel_account_id: event.accountId,
    last_message_text: event.text ?? (event.mediaUrl ? '[media]' : null),
    last_message_at: event.timestamp,
    last_message_channel: event.channel,
    unread_count: event.direction === 'inbound' ? 1 : 0,
    status: 'open',
    updated_at: new Date().toISOString(),
  }).eq('id', conversationId)

  return { conversationId, customerId, contactId, messageId: message.data.id as string, duplicate: false }
}

function extractPhone(raw: object): string | undefined {
  const value = raw as Record<string, unknown>
  if (typeof value.from === 'string') return value.from
  const sender = value.sender as Record<string, unknown> | undefined
  if (sender && typeof sender.id === 'string' && /^\+?[0-9]{6,20}$/.test(sender.id)) return sender.id
  return undefined
}

function extractName(raw: object): string | undefined {
  const value = raw as Record<string, unknown>
  const contact = value.contacts as Array<Record<string, unknown>> | undefined
  const profile = contact?.[0]?.profile as Record<string, unknown> | undefined
  if (profile && typeof profile.name === 'string') return profile.name
  const sender = value.sender as Record<string, unknown> | undefined
  if (sender && typeof sender.name === 'string') return sender.name
  return undefined
}
