import type { SupabaseClient } from '@supabase/supabase-js';

export interface ResolvedWhatsAppCredentials {
  channelAccountId: string;
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
}

/** Server-only resolver. Decryption must be performed by the configured secrets service.
 * Plaintext credentials are never persisted, logged, or returned to browser code.
 */
export async function resolveWhatsAppCredentials(
  supabase: SupabaseClient,
  channelAccountId: string,
  decrypt: (ciphertext: string) => Promise<string>,
): Promise<ResolvedWhatsAppCredentials> {
  if (!channelAccountId) throw new Error('channel_account_id is required');

  const { data, error } = await supabase
    .from('channel_account_credentials')
    .select('channel_account_id, access_token_ciphertext, graph_api_version, status')
    .eq('channel_account_id', channelAccountId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Active WhatsApp credentials not found');

  const { data: account, error: accountError } = await supabase
    .from('channel_accounts')
    .select('id, channel, external_phone_number_id, status')
    .eq('id', channelAccountId)
    .eq('channel', 'whatsapp')
    .eq('status', 'active')
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account || account.id !== data.channel_account_id || !account.external_phone_number_id) {
    throw new Error('WhatsApp channel account is invalid or inactive');
  }

  const accessToken = await decrypt(data.access_token_ciphertext);
  if (!accessToken) throw new Error('Unable to resolve WhatsApp access token');

  return {
    channelAccountId: account.id,
    accessToken,
    phoneNumberId: account.external_phone_number_id,
    graphApiVersion: data.graph_api_version,
  };
}
