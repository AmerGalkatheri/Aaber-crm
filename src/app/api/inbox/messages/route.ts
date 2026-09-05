import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { channelAdapters } from '@/lib/channels/adapters'
import type { Channel } from '@/lib/omnichannel/core'

const channels = new Set<Channel>(['whatsapp', 'messenger', 'instagram'])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await supabase.from('profiles').select('account_id').eq('user_id', user.id).single()
  if (profile.error || !profile.data?.account_id) return NextResponse.json({ error: 'Account not found' }, { status: 403 })

  const body = await request.json().catch(() => null) as { conversationId?: string; text?: string } | null
  if (!body?.conversationId || !body.text?.trim()) return NextResponse.json({ error: 'conversationId and text are required' }, { status: 400 })

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id,contact_id,channel_account_id,channel_accounts(id,display_name,channels(key)),customer_id')
    .eq('id', body.conversationId)
    .eq('account_id', profile.data.account_id)
    .single()
  if (error || !conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  const account = Array.isArray(conversation.channel_accounts) ? conversation.channel_accounts[0] : conversation.channel_accounts
  const channel = account?.channels?.key as Channel | undefined
  const channelAccountId = conversation.channel_account_id as string | null
  if (!channelAccountId || !channel || !channels.has(channel)) return NextResponse.json({ error: 'Conversation channel is not configured' }, { status: 409 })

  const { data: identity, error: identityError } = await supabase
    .from('customer_identities')
    .select('external_user_id')
    .eq('customer_id', conversation.customer_id)
    .eq('channel_account_id', channelAccountId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (identityError || !identity?.external_user_id) return NextResponse.json({ error: 'Customer channel identity not found' }, { status: 409 })

  const result = await channelAdapters[channel].sendText(channelAccountId, identity.external_user_id, body.text.trim())
  const { data: message, error: messageError } = await supabase.from('messages').insert({
    conversation_id: conversation.id,
    sender_type: 'agent',
    content_type: 'text',
    content_text: body.text.trim(),
    direction: 'outbound',
    status: 'sent',
    channel_account_id: channelAccountId,
    metadata: { channel, provider_response: result },
  }).select('id,conversation_id,content_text,direction,status,created_at').single()
  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 })

  await supabase.from('conversations').update({ last_message_text: body.text.trim(), last_message_at: new Date().toISOString(), last_message_channel: channel, updated_at: new Date().toISOString() }).eq('id', conversation.id)
  return NextResponse.json({ message })
}
