import { describe, expect, it } from 'vitest'
import { selectRoutingRule } from './routing'

describe('omnichannel routing', () => {
  it('selects the first matching channel rule', () => {
    expect(selectRoutingRule('instagram', [
      { channels: ['whatsapp'], agentId: 'w1' },
      { channels: ['instagram'], departmentId: 'sales', agentId: 'i1', priority: 'high', mode: 'ai' },
    ])).toEqual({ departmentId: 'sales', assignedAgentId: 'i1', priority: 'high', mode: 'ai' })
  })

  it('uses safe defaults when no rule matches', () => {
    expect(selectRoutingRule('messenger', [{ channels: ['whatsapp'], agentId: 'w1' }])).toEqual({
      departmentId: undefined,
      assignedAgentId: undefined,
      priority: 'normal',
      mode: 'human',
    })
  })
})
