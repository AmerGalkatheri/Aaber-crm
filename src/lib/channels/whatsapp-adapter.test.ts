import { describe, expect, it } from 'vitest';
import { normalizeWhatsAppWebhook, resolveWhatsAppInboxRoute } from './whatsapp-adapter';

describe('WhatsApp adapter', () => {
  it('normalizes messages using phone_number_id as the channel account key', () => {
    const events = normalizeWhatsAppWebhook({
      object: 'whatsapp_business_account',
      entry: [{
        id: 'business-1',
        changes: [{
          field: 'messages',
          value: {
            metadata: { phone_number_id: 'phone-id-2', display_phone_number: '+967700000002' },
            contacts: [{ wa_id: '967700000001', profile: { name: 'Customer One' } }],
            messages: [{
              id: 'wamid-1', from: '967700000001', timestamp: '1724970000', type: 'text',
              text: { body: 'Hello ABAR' },
            }],
          },
        }],
      }],
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      channel: 'whatsapp',
      channelAccountExternalId: 'phone-id-2',
      externalUserId: '967700000001',
      externalMessageId: 'wamid-1',
      text: 'Hello ABAR',
      customerDisplayName: 'Customer One',
    });
  });

  it('never derives the account from the customer phone number', () => {
    const events = normalizeWhatsAppWebhook({
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          field: 'messages',
          value: {
            metadata: { phone_number_id: 'phone-id-9' },
            messages: [{ id: 'm-9', from: '967711111111', timestamp: '1', type: 'text' }],
          },
        }],
      }],
    });

    expect(events[0].channelAccountExternalId).toBe('phone-id-9');
    expect(events[0].externalUserId).toBe('967711111111');
  });

  it('uses the unified inbox routing contract', () => {
    const result = resolveWhatsAppInboxRoute(
      {
        channel: 'whatsapp', channelAccountExternalId: 'phone-id-1', externalUserId: 'u-1',
        externalMessageId: 'm-1', timestamp: '1', messageType: 'text', text: 'Hi',
        customerDisplayName: 'Customer', providerMetadata: {},
      },
      {
        id: 'account-1', channel: 'whatsapp', display_name: 'ABAR Sales', status: 'active',
        routing_profile: 'sales-first-response',
      },
      'agent-1',
    );

    expect(result.channelAccountId).toBe('account-1');
    expect(result.assignedUserId).toBe('agent-1');
  });
});
