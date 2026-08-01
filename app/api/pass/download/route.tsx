import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SEAT_TIERS } from '@/lib/types'
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  try {
    // Edge-compatible session read
    const cookieHeader = req.headers.get('cookie') ?? ''
    const match = cookieHeader.match(/mn_session=([^;]+)/)
    const token = match?.[1]
    if (!token) return new Response('Unauthorized', { status: 401 })

    const session = await verifyToken(token)
    if (!session) return new Response('Unauthorized', { status: 401 })

    // Fetch all needed data in parallel
    const [{ data: pass }, { data: reg }, { data: payment }] = await Promise.all([
      supabaseAdmin
        .from('passes')
        .select('application_id, full_name, seat_tier, qr_data_url, issued_at, ticket_no, table_number')
        .eq('application_id', session.sub)
        .maybeSingle(),
      supabaseAdmin
        .from('registrations')
        .select('mobile, gender')
        .eq('application_id', session.sub)
        .maybeSingle(),
      supabaseAdmin
        .from('payments')
        .select('amount')
        .eq('application_id', session.sub)
        .maybeSingle(),
    ])

    if (!pass?.qr_data_url) {
      return new Response('Pass not ready', { status: 404 })
    }

    const tier = pass.seat_tier as keyof typeof SEAT_TIERS
    const tierInfo = SEAT_TIERS[tier]

    const genderLabel =
      reg?.gender === 'male' ? 'Male' :
      reg?.gender === 'female' ? 'Female' :
      reg?.gender === 'other' ? 'Other' : '—'

    const amountLabel = payment?.amount ? `₹${payment.amount}` : `₹${tierInfo.price}`

    // Convert QR data URL → ArrayBuffer (satori doesn't support data: URLs)
    const base64 = pass.qr_data_url.replace(/^data:image\/\w+;base64,/, '')
    const binaryStr = atob(base64)
    const qrBytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) qrBytes[i] = binaryStr.charCodeAt(i)
    const qrBuffer: ArrayBuffer = qrBytes.buffer

    // Template background URL
    const host = req.headers.get('host') ?? 'localhost:3000'
    const proto = host.startsWith('localhost') ? 'http' : 'https'
    const templateUrl = `${proto}://${host}/ticket-template.png`

    // Check if template exists by trying to fetch it
    let useTemplate = false
    try {
      const check = await fetch(templateUrl, { method: 'HEAD' })
      useTemplate = check.ok
    } catch { useTemplate = false }

    const W = 1050
    const H = 650

    const image = new ImageResponse(
      useTemplate ? (
        // ── Branded ticket template overlay ──
        <div style={{ display: 'flex', width: `${W}px`, height: `${H}px`, position: 'relative', overflow: 'hidden' }}>
          {/* Background */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={templateUrl} width={W} height={H} style={{ position: 'absolute', top: 0, left: 0 }} alt="bg" />

          {/* Name */}
          <div style={{ display: 'flex', position: 'absolute', top: 245, left: 562, color: '#ffffff', fontSize: 21, fontWeight: 700, fontFamily: 'sans-serif', maxWidth: 210 }}>
            {pass.full_name}
          </div>
          {/* Application ID */}
          <div style={{ display: 'flex', position: 'absolute', top: 300, left: 562, color: '#facc15', fontSize: 17, fontWeight: 700, fontFamily: 'monospace', maxWidth: 210 }}>
            {pass.application_id}
          </div>
          {/* Mobile */}
          <div style={{ display: 'flex', position: 'absolute', top: 355, left: 562, color: '#ffffff', fontSize: 20, fontWeight: 600, fontFamily: 'sans-serif' }}>
            {reg?.mobile ?? '—'}
          </div>
          {/* Gender */}
          <div style={{ display: 'flex', position: 'absolute', top: 408, left: 562, color: '#ffffff', fontSize: 20, fontWeight: 600, fontFamily: 'sans-serif' }}>
            {genderLabel}
          </div>
          {/* Pass type */}
          <div style={{ display: 'flex', position: 'absolute', top: 460, left: 562, color: '#fbbf24', fontSize: 20, fontWeight: 700, fontFamily: 'sans-serif' }}>
            {tierInfo.label} Pass
          </div>
          {/* Ticket No (if assigned) */}
          {pass.ticket_no && (
            <div style={{ display: 'flex', position: 'absolute', top: 515, left: 562, color: '#86efac', fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>
              # {String(pass.ticket_no)}
            </div>
          )}
          {/* Table No (if assigned) */}
          {pass.table_number && (
            <div style={{ display: 'flex', position: 'absolute', top: 515, left: 700, color: '#93c5fd', fontSize: 18, fontWeight: 700, fontFamily: 'sans-serif' }}>
              Table {String(pass.table_number)}
            </div>
          )}
          {/* Amount */}
          <div style={{ display: 'flex', position: 'absolute', top: 582, left: 836, color: '#000000', fontSize: 22, fontWeight: 800, fontFamily: 'sans-serif' }}>
            {amountLabel}
          </div>
          {/* QR Code */}
          <div style={{ display: 'flex', position: 'absolute', top: 230, left: 782, background: '#ffffff', padding: 4, borderRadius: 6 }}>
            {/* @ts-expect-error satori accepts ArrayBuffer */}
            <img src={qrBuffer} width={155} height={155} alt="QR" />
          </div>
        </div>
      ) : (
        // ── Fallback plain ticket (no template uploaded yet) ──
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '600px', height: '900px', background: tier === 'elite' ? '#1c0a00' : '#100e00', border: `4px solid ${tier === 'elite' ? '#d97706' : '#ca8a04'}`, borderRadius: '28px', padding: '40px 36px', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', fontSize: 48, marginBottom: 8 }}>{tierInfo.badge}</div>
            <div style={{ display: 'flex', color: '#ffffff', fontSize: 28, fontWeight: 700 }}>Miss Nellore 2026</div>
            <div style={{ display: 'flex', color: tier === 'elite' ? '#fbbf24' : '#facc15', fontSize: 13, fontWeight: 600, marginTop: 6, letterSpacing: 3, textTransform: 'uppercase' }}>{tierInfo.label} — {tierInfo.subtitle}</div>
          </div>
          <div style={{ display: 'flex', width: '100%', height: 1, background: '#ffffff33', marginBottom: '24px' }} />
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', background: '#ffffff', padding: 14, borderRadius: 16 }}>
              {/* @ts-expect-error satori accepts ArrayBuffer */}
              <img src={qrBuffer} width={200} height={200} alt="QR" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', background: '#ffffff0a', borderRadius: 16, padding: '18px 20px', border: `1px solid #ffffff22` }}>
            {([
              ['Name', pass.full_name],
              ['Application ID', pass.application_id],
              ['Mobile', reg?.mobile ?? '—'],
              ['Gender', genderLabel],
              ['Pass Type', `${tierInfo.label} — ${tierInfo.subtitle}`],
              ...(pass.ticket_no ? [['Ticket No', String(pass.ticket_no)]] : []),
              ...(pass.table_number ? [['Table No', String(pass.table_number)]] : []),
              ['Amount', amountLabel],
              ['Event Date', 'August 2, 2026'],
              ['Venue', 'DGP Kalyana Mandapam, Nellore'],
            ] as [string, string][]).map(([label, value], i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ display: 'flex', color: '#9ca3af', fontSize: 13 }}>{label}</div>
                <div style={{ display: 'flex', color: '#ffffff', fontSize: 13, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', paddingTop: 20 }}>
            <div style={{ display: 'flex', color: tier === 'elite' ? '#d97706' : '#ca8a04', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Present this pass at the entrance</div>
            <div style={{ display: 'flex', color: '#4b5563', fontSize: 11 }}>One-time use · Non-transferable</div>
          </div>
        </div>
      ),
      { width: useTemplate ? W : 600, height: useTemplate ? H : 900 }
    )

    const imageBuffer = await image.arrayBuffer()

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(imageBuffer.byteLength),
        'Content-Disposition': `attachment; filename="MissNellore2026-Ticket-${pass.application_id}.png"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Ticket download error:', err)
    return new Response(
      `Failed to generate ticket: ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 }
    )
  }
}
