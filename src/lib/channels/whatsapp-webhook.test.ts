import { describe, expect, it, vi } from 'vitest';
import { handleWhatsAppWebhook, verifyWhatsAppWebhookToken } from './whatsapp-webhook';

describe('WhatsApp webhook', () => {
  it('verifies the configured webhook token', () => {
    expect(verifyWhatsAppWebhookToken('secret', 'secret')).toBe(true);
    expect(verifyWhatsAppWebhookToken('wrong', 'secret')).toBe(false);
    expect(verifyWhatsAppWebhookToken(null, 'secret')).toBe(false);
  });

  it('resolves phone_number_id to the correct channel account before persistence', async () => {
    const store = {
      findMessageByExternalId: vi.fn().mockResolvedValue(null),
      findIdentity: vi.fn().mockResolvedValue({ customerId: 'customer-1' }),
      createCustomer: vi.fn(), createIdentity: vi.fn(),
      findThread: vi.fn().mockResolvedValue({ id: 'thread-1' }),
      createThread: vi.fn(),
      appendMessage: vi.fn().mockResolvedValue(undefined),
      touchThread: vi.fn().mockResolvedValue(undefined),
    };
    const resolve = vi.fn().mockResolvedValue('account-2');

    const result = await handleWhatsAppWebhook({
      object: 'whatsapp_business_account',
      entry: [{ changes: [{
        field: 'messages', value: {
          metadata: { phone_number_id: 'phone-id-2' },
          messages: [{ id: 'wamid-2', from: '967700000002', timestamp: '2', type: 'text', text: { body: 'Hi' } }],
        },
      }] }],
    }, store, resolve);

    expect(resolve).toHaveBeenCalledWith('phone-id-2');
    expect(store.findIdentity).toHaveBeenCalledWith('account-2', '967700000002');
    expect(result.results[0]).toMatchObject({ externalMessageId: 'wamid-2', threadId: 'thread-1', duplicate: false });
  });

  it('rejects an unknown business phone number instead of falling back', async () => {
    const store = {} as never;
    await expect(handleWhatsAppWebhook({
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'unknown' }, messages: [{ id: 'm', from: 'u', timestamp: '1', type: 'text' }] } }] }],
    }, store, vi.fn().mockResolvedValue(null))).rejects.toThrow('Unknown WhatsApp channel account');
  });
});
