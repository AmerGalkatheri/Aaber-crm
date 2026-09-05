import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const channels = new Set(['whatsapp', 'messenger', 'instagram'])
const modes = new Set(['human', 'ai'])
const priorities = new Set(['low', 'normal', 'high', 'urgent'])

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await supabase.from('profiles').select('account_id').eq('user_id', user.id).single()
  if (profile.error || !profile.data?.account_id) return NextResponse.json({ error: 'Account not found' }, { status: 403 })

  const url = new URL(request.url)
  const channel = url.searchParams.get('channel')
  const status = url.searchParams.get('status')
  const mode = url.searchParams.get('mode')
  const priority = url.searchParams.get('priority')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50) || 50, 100)

  let query = supabase
    .from('conversations')
    .select('id, contact_id, customer_id, channel_account_id, status, assigned_agent_id, mode, priority, last_message_text, last_message_at, unread_count, updated_at, contacts(id,name,phone,email), customers(id,display_name,email,phone), channel_accounts(id,display_name,department,team,channel_id,channels(key,name))')
    .eq('account_id', profile.data.account_id)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (mode && modes.has(mode)) query = query.eq('mode', mode)
  if (priority && priorities.has(priority)) query = query.eq('priority', priority)
  if (channel && channels.has(channel)) query = query.eq('channel_accounts.channels.key', channel)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversations: data ?? [] })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await supabase.from('profiles').select('account_id').eq('user_id', user.id).single()
  if (profile.error || !profile.data?.account_id) return NextResponse.json({ error: 'Account not found' }, { status: 403 })

  const body = await request.json().catch(() => null) as { conversationId?: string; mode?: string; priority?: string; status?: string; assignedAgentId?: string | null } | null
  if (!body?.conversationId) return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
  if (body.mode && !modes.has(body.mode)) return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  if (body.priority && !priorities.has(body.priority)) return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
  if (body.status && !['open', 'pending', 'closed'].includes(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.mode) patch.mode = body.mode
  if (body.priority) patch.priority = body.priority
  if (body.status) patch.status = body.status
  if (body.assignedAgentId !== undefined) patch.assigned_agent_id = body.assignedAgentId

  const { data, error } = await supabase
    .from('conversations')
    .update(patch)
    .eq('id', body.conversationId)
    .eq('account_id', profile.data.account_id)
    .select('id,mode,priority,status,assigned_agent_id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversation: data })
}
