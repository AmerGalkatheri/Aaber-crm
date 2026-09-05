import { describe, expect, it } from 'vitest'
import { eventKey, resolveRouting, type NormalizedEvent } from './core'

describe('omnichannel core', () => {
  const event: NormalizedEvent = {
    channel: 'instagram',
    accountId: 'acct-1',
    externalConversationId: 'thread-1',
    externalMessageId: 'msg-1',
    externalCustomerId: 'user-1',
    direction: 'inbound',
    text: 'مرحبا',
    timestamp: '2026-09-05T00:00:00.000Z',
    raw: {},
  }

  it('builds a stable idempotency key', () => {
    expect(eventKey(event)).toBe('instagram:acct-1:msg-1')
    expect(eventKey(event)).toBe(eventKey(event))
  })

  it('defaults new conversations to human and normal priority', () => {
    expect(resolveRouting({})).toEqual({ priority: 'normal', mode: 'human', departmentId: undefined })
  })

  it('preserves explicit assignment and routing', () => {
    expect(resolveRouting({ assignedAgentId: 'agent-1', mode: 'ai', priority: 'urgent' })).toEqual({ assignedAgentId: 'agent-1', mode: 'ai', priority: 'urgent' })
  })
})
