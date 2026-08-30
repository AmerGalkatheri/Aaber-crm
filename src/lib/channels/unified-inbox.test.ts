import { describe, expect, it } from 'vitest';
import { buildInboxConversation, decideInboxRoute } from './unified-inbox';

const account = {
  id: 'wa-1',
  channel: 'whatsapp' as const,
  display_name: 'ABAR Sales',
  status: 'active' as const,
  department: 'sales',
  routing_profile: 'sales-first-response',
};

describe('unified inbox', () => {
  it('keeps the business display name instead of exposing a phone identifier', () => {
    const conversation = buildInboxConversation({
      id: 'c-1',
      customerId: 'customer-1',
      channelAccount: account,
      lastMessageAt: '2026-08-30T00:00:00Z',
    });

    expect(conversation.channelDisplayName).toBe('ABAR Sales');
    expect(conversation.channelAccountId).toBe('wa-1');
  });

  it('prefers explicit assignment', () => {
    const result = decideInboxRoute({
      channelAccount: account,
      explicitUserId: 'agent-1',
      departmentUserId: 'agent-2',
    });

    expect(result.reason).toBe('explicit-assignment');
    expect(result.assignedUserId).toBe('agent-1');
  });

  it('routes to department fallback when no explicit assignee exists', () => {
    const result = decideInboxRoute({
      channelAccount: account,
      departmentUserId: 'agent-2',
    });

    expect(result.reason).toBe('account-routing-profile');
    expect(result.assignedUserId).toBe('agent-2');
    expect(result.routingProfile).toBe('sales-first-response');
  });

  it('leaves a conversation unassigned when no route target exists', () => {
    const result = decideInboxRoute({ channelAccount: account });

    expect(result.reason).toBe('unassigned');
    expect(result.assignedUserId).toBeNull();
  });
});
