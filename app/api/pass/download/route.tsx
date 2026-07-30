import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SEAT_TIERS } from '@/lib/types'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    // Manually read session cookie (edge-compatible)
    const cookieHeader = req.headers.get('cookie') ?? ''
    const match = cookieHeader.match(/mn_session=([^;]+)/)
    const token = match?.[1]
    
    if (!token) {
      return new Response('Unauthorized', { status: 401 })
    }

    const session = await verifyToken(token)
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

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

    const bgColor    = isElite ? '#1c0a00' : '#100e00'
    const borderColor = isElite ? '#d97706' : '#ca8a04'
    const accentColor = isElite ? '#fbbf24' : '#facc15'
    const dimColor   = isElite ? '#92400e' : '#854d0e'
    const badgeEmoji = isElite ? '👑' : '⭐'

    // qr_data_url is already a data: URL — ImageResponse supports it directly
    const qrSrc = pass.qr_data_url

    const image = new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '600px',
            height: '900px',
            background: bgColor,
            border: `4px solid ${borderColor}`,
            borderRadius: '28px',
            padding: '40px 36px',
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Glow circle top-right */}
          <div
            style={{
              position: 'absolute', top: -100, right: -100,
              width: 300, height: 300, borderRadius: '50%',
              background: `radial-gradient(circle, ${dimColor}40 0%, transparent 70%)`,
              display: 'flex',
            }}
          />
          {/* Glow circle bottom-left */}
          <div
            style={{
              position: 'absolute', bottom: -80, left: -80,
              width: 250, height: 250, borderRadius: '50%',
              background: `radial-gradient(circle, ${dimColor}30 0%, transparent 70%)`,
              display: 'flex',
            }}
          />

          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{badgeEmoji}</div>
            <div style={{ color: '#ffffff', fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>
              Miss Nellore 2026
            </div>
            <div style={{ color: accentColor, fontSize: 14, fontWeight: 600, marginTop: 6, letterSpacing: 3, textTransform: 'uppercase' }}>
              {tierInfo.label} — {tierInfo.subtitle}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: 1, background: `${borderColor}55`, marginBottom: '24px', display: 'flex' }} />

          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 16, display: 'flex' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} width={200} height={200} alt="QR" style={{ display: 'block' }} />
            </div>
          </div>

          {/* Details box */}
          <div
            style={{
              display: 'flex', flexDirection: 'column', width: '100%',
              background: '#ffffff0a', borderRadius: 16, padding: '18px 20px',
              border: `1px solid ${borderColor}44`, gap: 12,
            }}
          >
            {[
              { label: 'Name',            value: pass.full_name },
              { label: 'Application ID',  value: pass.application_id },
              { label: 'Event Date',      value: 'August 2, 2026' },
              { label: 'Venue',           value: 'DGP Kalyana Mandapam, Nellore' },
              { label: 'Pass Type',       value: `${tierInfo.label} — ${tierInfo.subtitle}` },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: 13 }}>{row.label}</span>
                <span style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, textAlign: 'right', maxWidth: 320 }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', paddingTop: 20, gap: 4 }}>
            <div style={{ color: borderColor, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
              Present this pass at the entrance
            </div>
            <div style={{ color: '#4b5563', fontSize: 11 }}>One-time use · Non-transferable</div>
          </div>
        </div>
      ),
      { width: 600, height: 900 }
    )

    // Read the full image body into a buffer first — avoids stream loss
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
    return new Response('Failed to generate pass', { status: 500 })
  }
}
