export interface WhatsAppAccountCredentials {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
}

export interface WhatsAppOutboundText {
  to: string;
  body: string;
}

export interface WhatsAppSendResult {
  messageId: string;
  phoneNumberId: string;
}

/**
 * Provider boundary for account-scoped WhatsApp sends.
 * Credentials must be loaded server-side for the selected channel account.
 */
export async function sendWhatsAppText(
  credentials: WhatsAppAccountCredentials,
  message: WhatsAppOutboundText,
  fetchImpl: typeof fetch = fetch,
): Promise<WhatsAppSendResult> {
  if (!credentials.accessToken || !credentials.phoneNumberId) {
    throw new Error('WhatsApp account credentials are incomplete');
  }
  if (!message.to || !message.body.trim()) {
    throw new Error('WhatsApp recipient and message body are required');
  }

  const response = await fetchImpl(
    `https://graph.facebook.com/${credentials.graphApiVersion}/${credentials.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
        type: 'text',
        text: { preview_url: false, body: message.body },
      }),
    },
  );

  const payload = (await response.json()) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || `WhatsApp send failed (${response.status})`);
  }

  const messageId = payload.messages?.[0]?.id;
  if (!messageId) {
    throw new Error('WhatsApp provider returned no message ID');
  }

  return { messageId, phoneNumberId: credentials.phoneNumberId };
}
