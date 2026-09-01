export type SupportedChannel = 'whatsapp' | 'instagram' | 'messenger';

export interface InboxChannelAccount {
  id: string;
  channel: SupportedChannel;
  display_name: string;
  status: 'active' | 'inactive' | 'error';
  department?: string | null;
  routing_profile?: string | null;
}

export interface UnifiedInboxConversation {
  id: string;
  customerId: string;
  channelAccountId: string;
  channel: SupportedChannel;
  channelDisplayName: string;
  unreadCount: number;
  assignedUserId?: string | null;
  status: 'open' | 'pending' | 'closed';
  lastMessageAt: string;
}

export interface InboxRouteDecision {
  channelAccountId: string;
  assignedUserId?: string | null;
  routingProfile?: string | null;
  reason: 'explicit-assignment' | 'account-routing-profile' | 'department' | 'unassigned';
}

export function buildInboxConversation(input: {
  id: string;
  customerId: string;
  channelAccount: InboxChannelAccount;
  unreadCount?: number;
  assignedUserId?: string | null;
  status?: UnifiedInboxConversation['status'];
  lastMessageAt: string;
}): UnifiedInboxConversation {
  return {
    id: input.id,
    customerId: input.customerId,
    channelAccountId: input.channelAccount.id,
    channel: input.channelAccount.channel,
    channelDisplayName: input.channelAccount.display_name,
    unreadCount: input.unreadCount ?? 0,
    assignedUserId: input.assignedUserId ?? null,
    status: input.status ?? 'open',
    lastMessageAt: input.lastMessageAt,
  };
}

export function decideInboxRoute(input: {
  channelAccount: InboxChannelAccount;
  explicitUserId?: string | null;
  departmentUserId?: string | null;
}): InboxRouteDecision {
  const { channelAccount, explicitUserId, departmentUserId } = input;

  if (explicitUserId) {
    return {
      channelAccountId: channelAccount.id,
      assignedUserId: explicitUserId,
      routingProfile: channelAccount.routing_profile ?? null,
      reason: 'explicit-assignment',
    };
  }

  if (channelAccount.routing_profile && departmentUserId) {
    return {
      channelAccountId: channelAccount.id,
      assignedUserId: departmentUserId,
      routingProfile: channelAccount.routing_profile,
      reason: 'account-routing-profile',
    };
  }

  if (departmentUserId) {
    return {
      channelAccountId: channelAccount.id,
      assignedUserId: departmentUserId,
      routingProfile: channelAccount.routing_profile ?? null,
      reason: 'department',
    };
  }

  return {
    channelAccountId: channelAccount.id,
    assignedUserId: null,
    routingProfile: channelAccount.routing_profile ?? null,
    reason: 'unassigned',
  };
}
