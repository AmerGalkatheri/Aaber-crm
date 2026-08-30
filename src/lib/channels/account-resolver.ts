export type Channel = 'whatsapp' | 'instagram' | 'messenger'

export interface ChannelAccount {
  id: string
  channel: Channel
  display_name: string
  external_account_id: string | null
  external_phone_number_id: string | null
  status: 'active' | 'inactive' | 'error'
}

export interface ChannelAccountRepository {
  findByExternalIdentity(input: {
    channel: Channel
    externalAccountId?: string | null
    externalPhoneNumberId?: string | null
  }): Promise<ChannelAccount | null>
}

export async function resolveInboundChannelAccount(
  repository: ChannelAccountRepository,
  input: {
    channel: Channel
    externalAccountId?: string | null
    externalPhoneNumberId?: string | null
  }
): Promise<ChannelAccount> {
  if (input.channel === 'whatsapp' && !input.externalPhoneNumberId) {
    throw new Error('WhatsApp inbound events require phone_number_id')
  }

  const account = await repository.findByExternalIdentity(input)

  if (!account) {
    throw new Error('No channel account matches the inbound event')
  }

  if (account.status !== 'active') {
    throw new Error('Channel account is not active')
  }

  return account
}
