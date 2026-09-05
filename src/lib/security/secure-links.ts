import { createHash, randomBytes } from 'node:crypto'

export function createSecureToken() {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}
export function hashToken(token: string) { return createHash('sha256').update(token).digest('hex') }
export function isLinkUsable(expiresAt: Date, revokedAt?: Date | null) { return !revokedAt && expiresAt.getTime() > Date.now() }
