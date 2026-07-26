import { z } from 'zod'

export const registrationSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  age: z.coerce.number().int().min(18, 'Must be 18+').max(60, 'Must be 60 or under'),
  address: z.string().min(10, 'Please enter full address').max(300),
  seat_tier: z.enum(['elite', 'gold']),
})

export const loginSchema = z.object({
  application_id: z.string().min(5, 'Enter your Application ID'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid mobile number'),
})

export const lookupSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter valid mobile number'),
})

export type RegistrationInput = z.infer<typeof registrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type LookupInput = z.infer<typeof lookupSchema>
