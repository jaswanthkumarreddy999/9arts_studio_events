import { createHash, randomBytes } from 'crypto'

export function generateApplicationId(mobile: string, prefix?: string): string {
  const salt = process.env.APP_ID_SALT ?? 'default-salt'

  // Deterministic component tied to mobile number
  const mHash = createHash('sha256')
    .update(mobile + salt)
    .digest('hex')
    .substring(0, 6)
    .toUpperCase()

  // Random suffix — uniqueness even for same mobile
  const rand = randomBytes(3).toString('hex').toUpperCase()

  const year = new Date().getFullYear()

  // Use provided prefix, or fall back to env var, or default to '9AS'
  const pfx = (prefix ?? process.env.APP_ID_PREFIX ?? '9AS').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

  return `${pfx}${year}-${mHash}-${rand}`
}
