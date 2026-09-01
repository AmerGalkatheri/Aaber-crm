import { describe, expect, it, vi } from 'vitest';
import { sendWhatsAppText } from './whatsapp-outbound';

describe('WhatsApp outbound sender', () => {
  it('sends through the selected account phone number ID', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ messages: [{ id: 'wamid-out-1' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ));

    const result = await sendWhatsAppText(
      { accessToken: 'secret-a', phoneNumberId: 'phone-id-a', graphApiVersion: 'v23.0' },
      { to: '967700000001', body: 'Hello from ABAR' },
      fetchMock,
    );

    expect(result).toEqual({ messageId: 'wamid-out-1', phoneNumberId: 'phone-id-a' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v23.0/phone-id-a/messages',
      expect.objectContaining({ method: 'POST' }),
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(request.headers).toMatchObject({ Authorization: 'Bearer secret-a' });
    expect(JSON.parse(String(request.body))).toMatchObject({ to: '967700000001', type: 'text' });
  });

  it('does not send when credentials are incomplete', async () => {
    const fetchMock = vi.fn();
    await expect(sendWhatsAppText(
      { accessToken: '', phoneNumberId: 'phone-id-a', graphApiVersion: 'v23.0' },
      { to: '967700000001', body: 'Hello' },
      fetchMock,
    )).rejects.toThrow('credentials are incomplete');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces provider failures as errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: { message: 'Invalid token' } }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    ));

    await expect(sendWhatsAppText(
      { accessToken: 'bad', phoneNumberId: 'phone-id-a', graphApiVersion: 'v23.0' },
      { to: '967700000001', body: 'Hello' },
      fetchMock,
    )).rejects.toThrow('Invalid token');
  });
});
