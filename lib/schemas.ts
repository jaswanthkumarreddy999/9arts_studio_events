import { z } from 'zod'

// Strips all spaces, dashes, dots, parentheses and the +91 / 0 prefix
// then validates it's a 10-digit Indian mobile number
export function normalizeMobile(raw: string): string {
  return raw
    .replace(/[\s\-().]/g, '')   // remove spaces, dashes, dots, parens
    .replace(/^\+91/, '')         // strip +91 prefix
    .replace(/^91(?=\d{10}$)/, '') // strip 91 prefix if followed by exactly 10 digits
    .replace(/^0/, '')             // strip leading 0
}

const mobileSchema = z
  .string()
  .transform(normalizeMobile)
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'))

export const registrationSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  mobile: mobileSchema,
  gender: z.enum(['male', 'female', 'other'], { error: 'Please select your gender' }),
  seat_tier: z.enum(['elite', 'gold']),
})

export const loginSchema = z.object({
  application_id: z.string().min(5, 'Enter your Application ID'),
  mobile: mobileSchema,
})

export const lookupSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  mobile: mobileSchema,
})

export type RegistrationInput = z.infer<typeof registrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type LookupInput = z.infer<typeof lookupSchema>
