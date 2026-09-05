import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await supabase.from('profiles').select('account_id').eq('user_id', user.id).single()
  if (profile.error || !profile.data?.account_id) return NextResponse.json({ error: 'Account not found' }, { status: 403 })

  const body = await request.json().catch(() => null) as { conversationId?: string; agentId?: string | null; departmentId?: string | null } | null
  if (!body?.conversationId) return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })

  const patch = {
    assigned_agent_id: body.agentId === undefined ? user.id : body.agentId,
    department_id: body.departmentId ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('conversations')
    .update(patch)
    .eq('id', body.conversationId)
    .eq('account_id', profile.data.account_id)
    .select('id,assigned_agent_id,department_id,updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversation: data })
}
