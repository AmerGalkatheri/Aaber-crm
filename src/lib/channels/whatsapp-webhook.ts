import { normalizeWhatsAppWebhook, type WhatsAppWebhookEvent } from './whatsapp-adapter';
import { persistInboundMessage } from './inbound-persistence';
import type { InboundPersistenceStore } from './inbound-persistence';

export interface WhatsAppWebhookConfig {
  verifyToken: string;
}

export function verifyWhatsAppWebhookToken(
  suppliedToken: string | null,
  expectedToken: string,
): boolean {
  return Boolean(suppliedToken && expectedToken && suppliedToken === expectedToken);
}

export async function handleWhatsAppWebhook(
  payload: WhatsAppWebhookEvent,
  store: InboundPersistenceStore,
  resolveChannelAccountId: (externalPhoneNumberId: string) => Promise<string | null>,
) {
  const normalized = normalizeWhatsAppWebhook(payload);
  const results: Array<{ externalMessageId: string; threadId: string; duplicate: boolean }> = [];

  for (const event of normalized) {
    const channelAccountId = await resolveChannelAccountId(event.channelAccountExternalId);
    if (!channelAccountId) {
      throw new Error(`Unknown WhatsApp channel account: ${event.channelAccountExternalId}`);
    }

    const result = await persistInboundMessage(store, {
      ...event,
      channelAccountId,
      externalConversationId: event.externalUserId,
    });

    results.push({
      externalMessageId: event.externalMessageId,
      threadId: result.threadId,
      duplicate: result.duplicate,
    });
  }

  return { accepted: true, results };
}
