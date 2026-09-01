import type { ChannelAdapter, ChannelAccount, ChannelKind } from "./types";

export class ChannelRegistry {
  private readonly adapters = new Map<ChannelKind, ChannelAdapter>();
  private readonly accounts = new Map<string, ChannelAccount>();

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

  registerAccount(account: ChannelAccount): void {
    if (this.accounts.has(account.id)) {
      throw new Error(`Channel account already registered: ${account.id}`);
    }
    this.accounts.set(account.id, account);
  }

  getAccount(id: string): ChannelAccount {
    const account = this.accounts.get(id);
    if (!account) throw new Error(`Unknown channel account: ${id}`);
    return account;
  }

  listAccounts(kind?: ChannelKind): ChannelAccount[] {
    const accounts = [...this.accounts.values()];
    return kind ? accounts.filter((account) => account.channel === kind) : accounts;
  }
}

export const channelRegistry = new ChannelRegistry();
