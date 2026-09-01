export interface NormalizedInboundRecord {
  channel: 'whatsapp' | 'instagram' | 'messenger';
  channelAccountId: string;
  externalConversationId: string;
  externalUserId: string;
  externalMessageId: string;
  customerDisplayName?: string | null;
  text?: string | null;
  timestamp: string;
}

export interface InboundPersistenceStore {
  findMessageByExternalId(channelAccountId: string, externalMessageId: string): Promise<{ id: string } | null>;
  findIdentity(channelAccountId: string, externalUserId: string): Promise<{ customerId: string } | null>;
  createCustomer(displayName: string | null): Promise<{ id: string }>;
  createIdentity(input: { customerId: string; channelAccountId: string; externalUserId: string; displayName: string | null }): Promise<void>;
  findThread(channelAccountId: string, externalConversationId: string): Promise<{ id: string } | null>;
  createThread(input: { customerId: string; channelAccountId: string; channel: string; externalConversationId: string; externalUserId: string; preview: string | null; lastMessageAt: string }): Promise<{ id: string }>;
  appendMessage(input: { threadId: string; channelAccountId: string; externalMessageId: string; text: string | null; timestamp: string }): Promise<void>;
  touchThread(input: { threadId: string; preview: string | null; lastMessageAt: string }): Promise<void>;
}

export async function persistInboundMessage(
  store: InboundPersistenceStore,
  record: NormalizedInboundRecord,
): Promise<{ threadId: string; duplicate: boolean }> {
  const duplicate = await store.findMessageByExternalId(record.channelAccountId, record.externalMessageId);
  if (duplicate) return { threadId: duplicate.id, duplicate: true };

  let identity = await store.findIdentity(record.channelAccountId, record.externalUserId);
  if (!identity) {
    const customer = await store.createCustomer(record.customerDisplayName ?? null);
    await store.createIdentity({
      customerId: customer.id,
      channelAccountId: record.channelAccountId,
      externalUserId: record.externalUserId,
      displayName: record.customerDisplayName ?? null,
    });
    identity = { customerId: customer.id };
  }

  let thread = await store.findThread(record.channelAccountId, record.externalConversationId);
  if (!thread) {
    thread = await store.createThread({
      customerId: identity.customerId,
      channelAccountId: record.channelAccountId,
      channel: record.channel,
      externalConversationId: record.externalConversationId,
      externalUserId: record.externalUserId,
      preview: record.text ?? null,
      lastMessageAt: record.timestamp,
    });
  }

  await store.appendMessage({
    threadId: thread.id,
    channelAccountId: record.channelAccountId,
    externalMessageId: record.externalMessageId,
    text: record.text ?? null,
    timestamp: record.timestamp,
  });
  await store.touchThread({
    threadId: thread.id,
    preview: record.text ?? null,
    lastMessageAt: record.timestamp,
  });

  return { threadId: thread.id, duplicate: false };
}
