import { describe, expect, it, vi } from 'vitest'
import { resolveInboundChannelAccount } from './account-resolver'

describe('resolveInboundChannelAccount', () => {
  it('resolves WhatsApp by phone_number_id', async () => {
    const repository = {
      findByExternalIdentity: vi.fn().mockResolvedValue({
        id: 'wa-1',
        channel: 'whatsapp',
        display_name: 'عابر للسفر والسياحة – المبيعات',
        external_account_id: 'waba-1',
        external_phone_number_id: 'phone-1',
        status: 'active',
      }),
    }

    const result = await resolveInboundChannelAccount(repository, {
      channel: 'whatsapp',
      externalPhoneNumberId: 'phone-1',
    })

    expect(result.id).toBe('wa-1')
    expect(result.display_name).toContain('عابر')
    expect(repository.findByExternalIdentity).toHaveBeenCalledWith({
      channel: 'whatsapp',
      externalPhoneNumberId: 'phone-1',
    })
  })

  it('rejects an unknown WhatsApp phone_number_id', async () => {
    const repository = {
      findByExternalIdentity: vi.fn().mockResolvedValue(null),
    }

    await expect(
      resolveInboundChannelAccount(repository, {
        channel: 'whatsapp',
        externalPhoneNumberId: 'unknown',
      })
    ).rejects.toThrow('No channel account matches')
  })

  it('rejects inactive accounts', async () => {
    const repository = {
      findByExternalIdentity: vi.fn().mockResolvedValue({
        id: 'wa-2',
        channel: 'whatsapp',
        display_name: 'عابر – خدمة العملاء',
        external_account_id: 'waba-2',
        external_phone_number_id: 'phone-2',
        status: 'inactive',
      }),
    }

    await expect(
      resolveInboundChannelAccount(repository, {
        channel: 'whatsapp',
        externalPhoneNumberId: 'phone-2',
      })
    ).rejects.toThrow('not active')
  })

  it('requires phone_number_id for WhatsApp', async () => {
    const repository = { findByExternalIdentity: vi.fn() }

    await expect(
      resolveInboundChannelAccount(repository, { channel: 'whatsapp' })
    ).rejects.toThrow('phone_number_id')
    expect(repository.findByExternalIdentity).not.toHaveBeenCalled()
  })
})
