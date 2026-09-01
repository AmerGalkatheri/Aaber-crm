export type ChannelKind = "whatsapp" | "messenger" | "instagram";

export type MessageDirection = "inbound" | "outbound";

export interface ChannelAccount {
  id: string;
  channel: ChannelKind;
  displayName: string;
  departmentId?: string | null;
  teamId?: string | null;
  routingProfileId?: string | null;
  aiAgentId?: string | null;
  externalAccountId: string;
}

export interface NormalizedMessageEvent {
  channel: ChannelKind;
  accountId: string;
  externalEventId: string;
  externalMessageId?: string;
  direction: MessageDirection;
  customerExternalId: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  timestamp: string;
  raw: unknown;
}

export interface SendTextInput {
  accountId: string;
  recipientExternalId: string;
  text: string;
  conversationId?: string;
}

/**
 * Every messaging provider is isolated behind this contract.
 * The Messaging Core must never depend on provider-specific SDKs.
 */
export interface ChannelAdapter {
  readonly kind: ChannelKind;
  receiveEvent(payload: unknown, headers?: Headers): Promise<NormalizedMessageEvent[]>;
  sendText(input: SendTextInput): Promise<{ externalMessageId: string }>;
  sendMedia?(input: {
    accountId: string;
    recipientExternalId: string;
    mediaUrl: string;
    mediaType: string;
    caption?: string;
  }): Promise<{ externalMessageId: string }>;
  sendTemplate?(input: {
    accountId: string;
    recipientExternalId: string;
    templateName: string;
    language: string;
    variables?: Record<string, string>;
  }): Promise<{ externalMessageId: string }>;
  markRead?(input: { accountId: string; externalMessageId: string }): Promise<void>;
  getMessageStatus?(input: {
    accountId: string;
    externalMessageId: string;
  }): Promise<string>;
  validateWebhook(payload: string, signature: string | null): boolean;
}
