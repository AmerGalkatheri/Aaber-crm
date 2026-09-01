import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseInboundStore } from './supabase-inbound-store';

export function createWhatsAppWebhookDependencies(supabase: SupabaseClient) {
  const store = createSupabaseInboundStore(supabase);

  return {
    store,
    async resolveChannelAccountId(externalPhoneNumberId: string): Promise<string | null> {
      if (!externalPhoneNumberId) return null;
      const { data, error } = await supabase
        .from('channel_accounts')
        .select('id')
        .eq('channel', 'whatsapp')
        .eq('external_phone_number_id', externalPhoneNumberId)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data?.id ?? null;
    },
  };
}
