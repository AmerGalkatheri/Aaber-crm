import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveWhatsAppCredentials } from './secure-whatsapp-credentials';
import { sendWhatsAppText } from './whatsapp-outbound';

export interface WhatsAppSendFromThreadInput {
  threadId: string;
  body: string;
}

export async function sendWhatsAppFromThread(
  supabase: SupabaseClient,
  input: WhatsAppSendFromThreadInput,
  decrypt: (ciphertext: string) => Promise<string>,
  fetchImpl: typeof fetch = fetch,
) {
  const { data: thread, error } = await supabase
    .from('inbox_threads')
    .select('id, channel, channel_account_id, external_user_id')
    .eq('id', input.threadId)
    .maybeSingle();
  if (error) throw error;
  if (!thread) throw new Error('Conversation not found');
  if (thread.channel !== 'whatsapp') throw new Error('Conversation is not a WhatsApp conversation');
  if (!thread.channel_account_id || !thread.external_user_id) throw new Error('WhatsApp conversation routing data is incomplete');

  const credentials = await resolveWhatsAppCredentials(supabase, thread.channel_account_id, decrypt);
  const result = await sendWhatsAppText(credentials, { to: thread.external_user_id, body: input.body }, fetchImpl);

  const { error: insertError } = await supabase.from('inbox_messages').insert({
    thread_id: thread.id,
    channel_account_id: thread.channel_account_id,
    external_message_id: result.messageId,
    external_user_id: thread.external_user_id,
    direction: 'outbound',
    message_type: 'text',
    body: input.body,
    provider_metadata: { phone_number_id: result.phoneNumberId },
  });
  if (insertError) throw insertError;

  await supabase
    .from('inbox_threads')
    .update({ preview: input.body, last_message_at: new Date().toISOString() })
    .eq('id', thread.id);

  return result;
}
