import { createHash, randomBytes } from 'crypto'

export function generateApplicationId(mobile: string): string {
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

  return `MN${year}-${mHash}-${rand}`
}
