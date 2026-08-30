import type { SupabaseClient } from '@supabase/supabase-js';
import type { InboundPersistenceStore } from './inbound-persistence';

export function createSupabaseInboundStore(supabase: SupabaseClient): InboundPersistenceStore {
  return {
    async findMessageByExternalId(channelAccountId, externalMessageId) {
      const { data, error } = await supabase
        .from('inbox_messages').select('id, thread_id')
        .eq('channel_account_id', channelAccountId).eq('external_message_id', externalMessageId).maybeSingle();
      if (error) throw error;
      return data ? { id: data.thread_id } : null;
    },
    async findIdentity(channelAccountId, externalUserId) {
      const { data, error } = await supabase
        .from('customer_identities').select('customer_id')
        .eq('channel_account_id', channelAccountId).eq('external_user_id', externalUserId).maybeSingle();
      if (error) throw error;
      return data ? { customerId: data.customer_id } : null;
    },
    async createCustomer(displayName) {
      const { data, error } = await supabase.from('customers').insert({
        full_name: displayName?.trim() || 'WhatsApp Customer', market: 'unknown', stage: 'lead',
        lifecycle_state: 'active', trip_count: 0, total_value: 0, source: 'whatsapp',
      }).select('id').single();
      if (error) throw error;
      return { id: data.id };
    },
    async createIdentity(input) {
      const { error } = await supabase.from('customer_identities').insert({
        customer_id: input.customerId, channel_account_id: input.channelAccountId,
        external_user_id: input.externalUserId, display_name: input.displayName,
        phone_number: input.externalUserId,
      });
      if (error) throw error;
    },
    async findThread(channelAccountId, externalConversationId) {
      const { data, error } = await supabase.from('inbox_threads').select('id')
        .eq('channel_account_id', channelAccountId).eq('external_conversation_id', externalConversationId).maybeSingle();
      if (error) throw error;
      return data ? { id: data.id } : null;
    },
    async createThread(input) {
      const { data, error } = await supabase.from('inbox_threads').insert({
        customer_id: input.customerId, channel_account_id: input.channelAccountId, channel: input.channel,
        external_conversation_id: input.externalConversationId, external_user_id: input.externalUserId,
        preview: input.preview, last_message_at: input.lastMessageAt, status: 'open',
      }).select('id').single();
      if (error) throw error;
      return { id: data.id };
    },
    async appendMessage(input) {
      const { error } = await supabase.from('inbox_messages').insert({
        thread_id: input.threadId, channel_account_id: input.channelAccountId,
        external_message_id: input.externalMessageId, external_user_id: input.externalUserId,
        direction: 'inbound', message_type: 'text', body: input.text, provider_metadata: {}, created_at: input.timestamp,
      });
      if (error?.code === '23505') return;
      if (error) throw error;
    },
    async touchThread(input) {
      const { error } = await supabase.from('inbox_threads').update({
        preview: input.preview, last_message_at: input.lastMessageAt,
      }).eq('id', input.threadId);
      if (error) throw error;
    },
  };
}
