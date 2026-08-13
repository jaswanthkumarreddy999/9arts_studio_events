// Public (no auth) — used by client components (RegistrationForm, Navbar)
import { getEventSettings } from '@/lib/eventSettings'

export const revalidate = 0

export async function GET() {
  const settings = await getEventSettings()
  return Response.json({ settings })
}
