import { NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { channelAdapters } from '@/lib/channels/adapters'
import { processInboundEvent } from '@/lib/omnichannel/process-event'
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
      const eventKey = `${event.channel}:${event.accountId}:${event.externalMessageId}`
      const existing = await db.from('channel_events').select('id, processed_at, error').eq('event_key', eventKey).maybeSingle()
      if (existing.error) {
        console.error('[channel-webhook] event lookup failed', existing.error)
        continue
      }
      if (existing.data?.processed_at) continue

      const persisted = existing.data ?? (await db.from('channel_events').insert({
        channel_account_id: accountId,
        event_key: eventKey,
        event_type: 'message.received',
        payload: event.raw,
      }).select('id, processed_at, error').maybeSingle()).data
      if (!persisted) {
        const retry = await db.from('channel_events').select('id, processed_at, error').eq('event_key', eventKey).maybeSingle()
        if (retry.error || retry.data?.processed_at) continue
        if (!retry.data) {
          console.error('[channel-webhook] event persistence failed', retry.error)
          continue
        }
      }

      try {
        await processInboundEvent(event)
        await db.from('channel_events').update({ processed_at: new Date().toISOString(), error: null }).eq('event_key', eventKey)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await db.from('channel_events').update({ error: message }).eq('event_key', eventKey)
        console.error('[channel-webhook] event processing failed', error)
      }
    }
  })
  return NextResponse.json({ status: 'received', accepted: events.length }, { status: 200 })
}

function isChannel(value: string): value is Channel {
  return value === 'whatsapp' || value === 'messenger' || value === 'instagram'
}
