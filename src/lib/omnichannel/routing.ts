import type { ConversationMode, RoutingContext } from './core'

export type RoutingRule = {
  departmentId?: string
  agentId?: string
  priority?: RoutingContext['priority']
  mode?: ConversationMode
  channels?: Array<'whatsapp' | 'messenger' | 'instagram'>
}

export function selectRoutingRule(
  channel: 'whatsapp' | 'messenger' | 'instagram',
  rules: RoutingRule[],
): RoutingContext {
  const rule = rules.find((candidate) => !candidate.channels?.length || candidate.channels.includes(channel))
  return {
    departmentId: rule?.departmentId,
    assignedAgentId: rule?.agentId,
    priority: rule?.priority ?? 'normal',
    mode: rule?.mode ?? 'human',
  }
}
