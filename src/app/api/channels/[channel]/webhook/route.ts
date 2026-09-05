import { NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { channelAdapters } from '@/lib/channels/adapters'
import type { Channel } from '@/lib/omnichannel/core'

export const maxDuration = 30

type Params = { params: Promise<{ channel: string }> }

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export async function GET(request: Request, { params }: Params) {
  const { channel } = await params
  if (!isChannel(channel)) return NextResponse.json({ error: 'Unsupported channel' }, { status: 404 })
  const url = new URL(request.url)
  if (url.searchParams.get('hub.mode') !== 'subscribe' || !url.searchParams.get('hub.challenge') || url.searchParams.get('hub.verify_token') !== process.env.META_VERIFY_TOKEN) return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
  return new Response(url.searchParams.get('hub.challenge')!, { status: 200, headers: { 'content-type': 'text/plain' } })
}

export async function POST(request: Request, { params }: Params) {
  const { channel } = await params
  if (!isChannel(channel)) return NextResponse.json({ error: 'Unsupported channel' }, { status: 404 })
  const accountId = new URL(request.url).searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id is required' }, { status: 400 })
  const rawBody = await request.text()
  const adapter = channelAdapters[channel]
  if (!adapter.validateWebhook(Object.fromEntries(request.headers.entries()), rawBody)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  let payload: unknown
  try { payload = JSON.parse(rawBody) } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const events = adapter.receiveEvent(payload, accountId)
  after(async () => {
    const db = admin()
    for (const event of events) {
      const { error } = await db.from('channel_events').upsert({ channel_account_id: accountId, event_key: `${event.channel}:${event.accountId}:${event.externalMessageId}`, event_type: 'message.received', payload: event.raw }, { onConflict: 'event_key', ignoreDuplicates: true })
      if (error) console.error('[channel-webhook] event persistence failed', error)
    }
  })
  return NextResponse.json({ status: 'received', accepted: events.length }, { status: 200 })
}

function isChannel(value: string): value is Channel {
  return value === 'whatsapp' || value === 'messenger' || value === 'instagram'
}
