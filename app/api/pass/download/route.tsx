import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SEAT_TIERS } from '@/lib/types'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') ?? ''
    const match = cookieHeader.match(/mn_session=([^;]+)/)
    const token = match?.[1]
    if (!token) return new Response('Unauthorized', { status: 401 })

    const session = await verifyToken(token)
    if (!session) return new Response('Unauthorized', { status: 401 })

    const { data: pass } = await supabaseAdmin
      .from('passes')
      .select('application_id, full_name, seat_tier, qr_data_url, issued_at')
      .eq('application_id', session.sub)
      .maybeSingle()

    if (!pass?.qr_data_url) {
      return new Response('Pass not ready', { status: 404 })
    }

    const tier = pass.seat_tier as keyof typeof SEAT_TIERS
    const tierInfo = SEAT_TIERS[tier]
    const isElite = tier === 'elite'

    const bgColor     = isElite ? '#1c0a00' : '#100e00'
    const borderColor = isElite ? '#d97706' : '#ca8a04'
    const accentColor = isElite ? '#fbbf24' : '#facc15'
    const badgeEmoji  = isElite ? '👑' : '⭐'

    // Convert data URL → ArrayBuffer (satori doesn't support data: URLs)
    const base64 = pass.qr_data_url.replace(/^data:image\/\w+;base64,/, '')
    const binaryStr = atob(base64)
    const qrBytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) qrBytes[i] = binaryStr.charCodeAt(i)
    const qrBuffer: ArrayBuffer = qrBytes.buffer

    const rows: [string, string][] = [
      ['Name',           pass.full_name],
      ['Application ID', pass.application_id],
      ['Event Date',     'August 2, 2026'],
      ['Venue',          'DGP Kalyana Mandapam, Nellore'],
      ['Pass Type',      `${tierInfo.label} — ${tierInfo.subtitle}`],
    ]

    const image = new ImageResponse(
      (
        // Root — satori requires display:flex on every multi-child element
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '600px', height: '900px', background: bgColor, border: `4px solid ${borderColor}`, borderRadius: '28px', padding: '40px 36px', fontFamily: 'system-ui, sans-serif' }}>

          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', fontSize: 48, marginBottom: 8 }}>{badgeEmoji}</div>
            <div style={{ display: 'flex', color: '#ffffff', fontSize: 28, fontWeight: 700 }}>Miss Nellore 2026</div>
            <div style={{ display: 'flex', color: accentColor, fontSize: 13, fontWeight: 600, marginTop: 6, letterSpacing: 3, textTransform: 'uppercase' }}>{tierInfo.label} — {tierInfo.subtitle}</div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', width: '100%', height: 1, background: `${borderColor}55`, marginBottom: '24px' }} />

          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', background: '#ffffff', padding: 14, borderRadius: 16 }}>
              {/* @ts-expect-error satori accepts ArrayBuffer for img src */}
              <img src={qrBuffer} width={200} height={200} alt="QR" />
            </div>
          </div>

          {/* Details box */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', background: '#ffffff0a', borderRadius: 16, padding: '18px 20px', border: `1px solid ${borderColor}44` }}>
            {rows.map(([label, value], i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: i < rows.length - 1 ? 12 : 0 }}>
                <div style={{ display: 'flex', color: '#9ca3af', fontSize: 13 }}>{label}</div>
                <div style={{ display: 'flex', color: '#ffffff', fontSize: 13, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', paddingTop: 20 }}>
            <div style={{ display: 'flex', color: borderColor, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Present this pass at the entrance</div>
            <div style={{ display: 'flex', color: '#4b5563', fontSize: 11 }}>One-time use · Non-transferable</div>
          </div>

        </div>
      ),
      { width: 600, height: 900 }
    )

    const imageBuffer = await image.arrayBuffer()

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(imageBuffer.byteLength),
        'Content-Disposition': `attachment; filename="MissNellore2026-Pass-${pass.application_id}.png"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Pass download error:', err)
    return new Response(
      `Failed to generate pass: ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 }
    )
  }
}
