export type ChannelType = 'whatsapp' | 'instagram' | 'messenger'

export type ChannelStatus =
  | 'connected'
  | 'disconnected'
  | 'pending'
  | 'error'
  | 'disabled'

export interface ChannelAccount {
  id: string
  accountId: string
  channelType: ChannelType
  provider: string
  displayName: string
  externalAccountId?: string | null
  externalPhoneNumberId?: string | null
  externalUsername?: string | null
  status: ChannelStatus
  isDefault: boolean
  capabilities: Record<string, boolean>
  metadata: Record<string, unknown>
  connectedAt?: string | null
  lastHealthCheckAt?: string | null
}

export interface CustomerIdentity {
  id: string
  accountId: string
  contactId: string
  channelAccountId?: string | null
  channelType: ChannelType
  externalIdentityId: string
  displayName?: string | null
  username?: string | null
  phone?: string | null
  profileData: Record<string, unknown>
  verifiedAt?: string | null
}

export interface NormalizedInboundMessage {
  channelType: ChannelType
  channelAccountId: string
  externalIdentityId: string
  externalMessageId: string
  text?: string | null
  contentType: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'interactive' | 'unknown'
  media?: {
    url?: string | null
    mimeType?: string | null
    fileName?: string | null
  }
  receivedAt: string
  raw: unknown
}

export interface ChannelAdapter {
  readonly type: ChannelType
  normalizeInbound(payload: unknown, channelAccount: ChannelAccount): NormalizedInboundMessage[]
}
