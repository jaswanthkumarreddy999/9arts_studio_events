import { z } from 'zod'

// Strips all spaces, dashes, dots, parentheses and the +91 / 0 prefix
// then validates it's a 10-digit Indian mobile number
export function normalizeMobile(raw: string): string {
  return raw
    .replace(/[\s\-().]/g, '')
    .replace(/^\+91/, '')
    .replace(/^91(?=\d{10}$)/, '')
    .replace(/^0/, '')
}

const mobileSchema = z
  .string()
  .transform(normalizeMobile)
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'))

// Single person registration
export const registrationSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  mobile: mobileSchema,
  gender: z.enum(['male', 'female', 'other'], { error: 'Please select your gender' }),
  seat_tier: z.enum(['elite', 'gold']),
})

// One ticket in a group booking
export const ticketSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  mobile: mobileSchema,
  gender: z.enum(['male', 'female', 'other'], { error: 'Please select gender' }),
  seat_tier: z.enum(['elite', 'gold']),
})

// Group booking — array of tickets
export const groupRegistrationSchema = z.object({
  tickets: z.array(ticketSchema).min(2, 'Group booking needs at least 2 people').max(20),
})

export const loginSchema = z.object({
  application_id: z.string().min(5, 'Enter your Application ID'),
  mobile: mobileSchema,
})

// Step 1 of forgot-ID: mobile → get masked names
export const mobileLookupSchema = z.object({
  mobile: mobileSchema,
})

// Step 2 of forgot-ID: mobile + name → confirm and login
export const lookupSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  mobile: mobileSchema,
})

export type RegistrationInput = z.infer<typeof registrationSchema>
export type TicketInput = z.infer<typeof ticketSchema>
export type GroupRegistrationInput = z.infer<typeof groupRegistrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type LookupInput = z.infer<typeof lookupSchema>
export type MobileLookupInput = z.infer<typeof mobileLookupSchema>
