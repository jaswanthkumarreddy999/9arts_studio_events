import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 0

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sponsors')
    .select('id, name, tagline, logo_url, website_url, tier, display_order')
    .order('display_order')

  if (error) return Response.json({ sponsors: [] })
  return Response.json({ sponsors: data ?? [] })
}
