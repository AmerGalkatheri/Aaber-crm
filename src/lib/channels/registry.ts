import type { ChannelAdapter, ChannelKind } from "./types";

export class ChannelRegistry {
  private readonly adapters = new Map<ChannelKind, ChannelAdapter>();

  register(adapter: ChannelAdapter): void {
    if (this.adapters.has(adapter.kind)) {
      throw new Error(`Channel adapter already registered: ${adapter.kind}`);
    }
    this.adapters.set(adapter.kind, adapter);
  }

  get(kind: ChannelKind): ChannelAdapter {
    const adapter = this.adapters.get(kind);
    if (!adapter) {
      throw new Error(`No channel adapter registered for: ${kind}`);
    }
    return adapter;
  }

  has(kind: ChannelKind): boolean {
    return this.adapters.has(kind);
  }
}

export const channelRegistry = new ChannelRegistry();
