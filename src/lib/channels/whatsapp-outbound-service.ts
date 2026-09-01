import type { SupabaseClient } from '@supabase/supabase-js';
import { sendWhatsAppFromThread } from './whatsapp-account-send';

export interface OutboundActor {
  userId: string;
  role: string;
}

const ALLOWED_ROLES = new Set(['admin', 'manager', 'sales', 'customer_service']);

export async function sendWhatsAppReply(
  supabase: SupabaseClient,
  actor: OutboundActor,
  threadId: string,
  body: string,
  decrypt: (ciphertext: string) => Promise<string>,
  fetchImpl: typeof fetch = fetch,
) {
  if (!actor.userId) throw new Error('Authenticated user is required');
  if (!ALLOWED_ROLES.has(actor.role)) throw new Error('User is not authorized to send WhatsApp messages');
  if (!body.trim()) throw new Error('Message body is required');

  const result = await sendWhatsAppFromThread(supabase, { threadId, body }, decrypt, fetchImpl);

  const { error } = await supabase.from('audit_logs').insert({
    actor_id: actor.userId,
    action: 'whatsapp.message.sent',
    entity_type: 'inbox_thread',
    entity_id: threadId,
    metadata: { provider_message_id: result.messageId, phone_number_id: result.phoneNumberId },
  });
  if (error) throw error;

  return result;
}
