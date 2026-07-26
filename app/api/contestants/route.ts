import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('contestants')
    .select('id, name, tagline, photo_url, category, contestant_category, display_order')
    .order('display_order')

  if (error) return Response.json({ contestants: [] })
  return Response.json({ contestants: data ?? [] })
}
