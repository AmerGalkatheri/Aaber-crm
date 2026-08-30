import { describe, expect, it, vi } from 'vitest';
import { persistInboundMessage, type InboundPersistenceStore } from './inbound-persistence';

function makeStore(overrides: Partial<InboundPersistenceStore> = {}): InboundPersistenceStore {
  return {
    findMessageByExternalId: vi.fn().mockResolvedValue(null),
    findIdentity: vi.fn().mockResolvedValue({ customerId: 'customer-1' }),
    createCustomer: vi.fn(),
    createIdentity: vi.fn(),
    findThread: vi.fn().mockResolvedValue({ id: 'thread-1' }),
    createThread: vi.fn(),
    appendMessage: vi.fn().mockResolvedValue(undefined),
    touchThread: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const record = {
  channel: 'whatsapp' as const,
  channelAccountId: 'account-1',
  externalConversationId: '967700000001',
  externalUserId: '967700000001',
  externalMessageId: 'wamid-1',
  customerDisplayName: 'Customer One',
  text: 'Hello',
  timestamp: '2026-08-30T00:00:00Z',
};

describe('inbound persistence', () => {
  it('does not duplicate a previously persisted provider message', async () => {
    const store = makeStore({ findMessageByExternalId: vi.fn().mockResolvedValue({ id: 'thread-1' }) });
    const result = await persistInboundMessage(store, record);
    expect(result).toEqual({ threadId: 'thread-1', duplicate: true });
    expect(store.appendMessage).not.toHaveBeenCalled();
  });

  it('creates the customer identity and thread when missing', async () => {
    const store = makeStore({
      findIdentity: vi.fn().mockResolvedValue(null),
      createCustomer: vi.fn().mockResolvedValue({ id: 'customer-2' }),
      findThread: vi.fn().mockResolvedValue(null),
      createThread: vi.fn().mockResolvedValue({ id: 'thread-2' }),
    });

    const result = await persistInboundMessage(store, record);
    expect(result).toEqual({ threadId: 'thread-2', duplicate: false });
    expect(store.createIdentity).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-2', channelAccountId: 'account-1', externalUserId: '967700000001',
    }));
    expect(store.createThread).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'customer-2', channelAccountId: 'account-1', externalConversationId: '967700000001',
    }));
    expect(store.appendMessage).toHaveBeenCalledWith(expect.objectContaining({
      threadId: 'thread-2', channelAccountId: 'account-1', externalMessageId: 'wamid-1',
    }));
  });

  it('keeps identities scoped to the originating channel account', async () => {
    const store = makeStore({ findIdentity: vi.fn().mockResolvedValue({ customerId: 'customer-9' }) });
    await persistInboundMessage(store, { ...record, channelAccountId: 'account-9' });
    expect(store.findIdentity).toHaveBeenCalledWith('account-9', record.externalUserId);
  });
});
