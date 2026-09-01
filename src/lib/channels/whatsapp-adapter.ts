import { decideInboxRoute, type InboxChannelAccount } from './unified-inbox';

export interface WhatsAppWebhookMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
}

export interface WhatsAppWebhookEvent {
  object: 'whatsapp_business_account';
  entry: Array<{
    id?: string;
    changes: Array<{
      field: 'messages' | string;
      value: {
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
        messages?: WhatsAppWebhookMessage[];
      };
    }>;
  }>;
}

export interface NormalizedInboundMessage {
  channel: 'whatsapp';
  channelAccountExternalId: string;
  externalUserId: string;
  externalMessageId: string;
  timestamp: string;
  messageType: string;
  text: string | null;
  customerDisplayName: string | null;
  providerMetadata: Record<string, unknown>;
}

export function normalizeWhatsAppWebhook(
  payload: WhatsAppWebhookEvent,
): NormalizedInboundMessage[] {
  const result: NormalizedInboundMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId = change.value.metadata?.phone_number_id;
      if (!phoneNumberId || change.field !== 'messages') continue;

      for (const message of change.value.messages ?? []) {
        const contact = change.value.contacts?.find((item) => item.wa_id === message.from);
        result.push({
          channel: 'whatsapp',
          channelAccountExternalId: phoneNumberId,
          externalUserId: message.from,
          externalMessageId: message.id,
          timestamp: message.timestamp,
          messageType: message.type,
          text: message.text?.body ?? null,
          customerDisplayName: contact?.profile?.name ?? null,
          providerMetadata: {
            entryId: entry.id ?? null,
            displayPhoneNumber: change.value.metadata?.display_phone_number ?? null,
          },
        });
      }
    }
  }

  return result;
}

export function resolveWhatsAppInboxRoute(
  message: NormalizedInboundMessage,
  account: InboxChannelAccount,
  departmentUserId?: string | null,
) {
  if (message.channel !== 'whatsapp' || message.channelAccountExternalId.length === 0) {
    throw new Error('Invalid WhatsApp normalized message');
  }

  return decideInboxRoute({
    channelAccount: account,
    departmentUserId,
  });
}
