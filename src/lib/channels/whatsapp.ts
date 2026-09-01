import type { ChannelAdapter, NormalizedMessageEvent, SendTextInput } from "./types";

/**
 * Provider-specific WhatsApp implementation is intentionally kept behind this boundary.
 * Credentials and Graph API calls must be injected by the application layer.
 */
export class WhatsAppAdapter implements ChannelAdapter {
  readonly kind = "whatsapp" as const;

  constructor(
    private readonly deps: {
      receive: (payload: unknown, headers?: Headers) => Promise<NormalizedMessageEvent[]>;
      sendText: (input: SendTextInput) => Promise<{ externalMessageId: string }>;
      validate: (payload: string, signature: string | null) => boolean;
    },
  ) {}

  receiveEvent(payload: unknown, headers?: Headers) {
    return this.deps.receive(payload, headers);
  }

  sendText(input: SendTextInput) {
    return this.deps.sendText(input);
  }

  validateWebhook(payload: string, signature: string | null) {
    return this.deps.validate(payload, signature);
  }
}
