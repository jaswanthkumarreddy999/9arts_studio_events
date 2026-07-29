import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SEAT_TIERS } from '@/lib/types'
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  const session = await getSession()
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

  // Colours
  const bg         = isElite ? '#1c0a00' : '#0f0c00'
  const border     = isElite ? '#d97706' : '#ca8a04'
  const accent     = isElite ? '#fbbf24' : '#facc15'
  const accentDim  = isElite ? '#92400e' : '#854d0e'
  const badge      = isElite ? '👑' : '⭐'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '600px',
          height: '900px',
          background: bg,
          border: `3px solid ${border}`,
          borderRadius: '24px',
          padding: '40px',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background shimmer circles */}
        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: `radial-gradient(circle, ${accentDim}22 0%, transparent 70%)`, display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: `radial-gradient(circle, ${accentDim}22 0%, transparent 70%)`, display: 'flex' }} />

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>{badge}</div>
          <div style={{ color: '#ffffff', fontSize: '26px', fontWeight: 'bold', letterSpacing: '1px' }}>Miss Nellore 2026</div>
          <div style={{ color: accent, fontSize: '15px', fontWeight: '600', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '2px' }}>
            {tierInfo.label} — {tierInfo.subtitle}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', height: '1px', background: `${border}66`, marginBottom: '28px', display: 'flex' }} />

        {/* QR Code */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{ background: '#ffffff', padding: '16px', borderRadius: '16px', display: 'flex' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pass.qr_data_url} width={220} height={220} alt="QR" />
          </div>
        </div>

        {/* Pass details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff08', borderRadius: '16px', padding: '20px', border: `1px solid ${border}44` }}>
          {[
            { label: 'Name',           value: pass.full_name },
            { label: 'Application ID', value: pass.application_id },
            { label: 'Event Date',     value: 'August 2, 2026' },
            { label: 'Venue',          value: 'DGP Kalyana Mandapam, Nellore' },
            { label: 'Pass Type',      value: `${tierInfo.label} — ${tierInfo.subtitle}` },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#9ca3af', fontSize: '13px' }}>{row.label}</span>
              <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: '600', textAlign: 'right', maxWidth: '320px' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{ color: `${border}`, fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Present this pass at the entrance
          </div>
          <div style={{ color: '#4b5563', fontSize: '11px' }}>One-time use · Non-transferable</div>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 900,
    }
  )
}
