import type { ChannelAdapter, ChannelKey } from './types'

const adapters = new Map<ChannelKey, ChannelAdapter>()

export function registerChannelAdapter(adapter: ChannelAdapter) {
  adapters.set(adapter.key, adapter)
}

export function getChannelAdapter(key: ChannelKey): ChannelAdapter {
  const adapter = adapters.get(key)
  if (!adapter) throw new Error(`Channel adapter not registered: ${key}`)
  return adapter
}

export function hasChannelAdapter(key: ChannelKey) {
  return adapters.has(key)
}
