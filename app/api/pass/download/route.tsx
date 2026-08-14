import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SEAT_TIERS } from '@/lib/types'
import { getEventSettings } from '@/lib/eventSettings'
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

    const [{ data: pass }, { data: reg }, { data: payment }, eventSettings] = await Promise.all([
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
      getEventSettings(),
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

    // Convert QR data URL → ArrayBuffer
    const base64 = pass.qr_data_url.replace(/^data:image\/\w+;base64,/, '')
    const binaryStr = atob(base64)
    const qrBytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) qrBytes[i] = binaryStr.charCodeAt(i)
    const qrBuffer: ArrayBuffer = qrBytes.buffer

    const host = req.headers.get('host') ?? 'localhost:3000'
    const proto = host.startsWith('localhost') ? 'http' : 'https'
    // Use the admin-uploaded template if set, otherwise fall back to the bundled default
    const templateUrl = eventSettings.pass_template_url || `${proto}://${host}/ticket-template.png`

    // Template is 1536×1024px (measured from actual file)
    // Data area is roughly x:700-1100, labels start around x:820
    // Row positions (y) measured from template layout:
    //   Name row    ≈ y:390
    //   App ID row  ≈ y:460
    //   Mobile row  ≈ y:530
    //   Gender row  ≈ y:600
    //   Pass row    ≈ y:670
    //   QR box      ≈ x:1100, y:220, size:240
    //   Amount box  ≈ x:1110, y:870
    const W = 1536
    const H = 1024

    const valueX = 830   // x start for value text (after the ":" in template)
    const fontSize = 28

    const image = new ImageResponse(
      (
        <div style={{ display: 'flex', width: `${W}px`, height: `${H}px`, position: 'relative', overflow: 'hidden' }}>
          {/* Background template */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={templateUrl} width={W} height={H} style={{ position: 'absolute', top: 0, left: 0 }} alt="bg" />

          {/* Name */}
          <div style={{ display: 'flex', position: 'absolute', top: 388, left: valueX, color: '#ffffff', fontSize, fontWeight: 700, fontFamily: 'sans-serif', maxWidth: 260 }}>
            {pass.full_name}
          </div>

          {/* Application ID */}
          <div style={{ display: 'flex', position: 'absolute', top: 458, left: valueX, color: '#facc15', fontSize: 26, fontWeight: 700, fontFamily: 'monospace', maxWidth: 260 }}>
            {pass.application_id}
          </div>

          {/* Mobile */}
          <div style={{ display: 'flex', position: 'absolute', top: 528, left: valueX, color: '#ffffff', fontSize, fontWeight: 600, fontFamily: 'sans-serif' }}>
            {reg?.mobile ?? '—'}
          </div>

          {/* Gender */}
          <div style={{ display: 'flex', position: 'absolute', top: 598, left: valueX, color: '#ffffff', fontSize, fontWeight: 600, fontFamily: 'sans-serif' }}>
            {genderLabel}
          </div>

          {/* Pass type */}
          <div style={{ display: 'flex', position: 'absolute', top: 668, left: valueX, color: '#fbbf24', fontSize, fontWeight: 700, fontFamily: 'sans-serif' }}>
            {tierInfo.label} Pass
          </div>

          {/* Seat label — below QR, above SCAN TO VERIFY (~y 660-720px range) */}
          {(pass.ticket_no || pass.table_number) && (() => {
            const ticket = pass.ticket_no ?? ''
            const table = (pass.table_number ?? '').toUpperCase()
            const seatWord = ticket.startsWith('C') ? 'CHAIR' : 'SEAT'
            const seatIcon = ticket.startsWith('S') ? '🛋️' : ticket.startsWith('C') ? '💺' : '🪑'
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 660, left: 1092, width: 252, textAlign: 'center' }}>
                <div style={{ display: 'flex', color: '#fcd34d', fontSize: 18, fontWeight: 900, fontFamily: 'sans-serif', letterSpacing: 2, textTransform: 'uppercase' }}>
                  {table}
                </div>
                <div style={{ display: 'flex', color: '#ffffff', fontSize: 20, fontWeight: 800, fontFamily: 'sans-serif', letterSpacing: 1 }}>
                  {seatWord} {ticket}
                </div>
                <div style={{ display: 'flex', color: '#9ca3af', fontSize: 14, fontFamily: 'sans-serif' }}>
                  {seatIcon}
                </div>
              </div>
            )
          })()}

          {/* Amount — over the white amount box */}
          <div style={{ display: 'flex', position: 'absolute', top: 880, left: 1130, color: '#000000', fontSize: 30, fontWeight: 900, fontFamily: 'sans-serif' }}>
            {amountLabel}
          </div>

          {/* QR Code — over the white QR placeholder */}
          <div style={{ display: 'flex', position: 'absolute', top: 218, left: 1092, background: '#ffffff', padding: 6, borderRadius: 8 }}>
            {/* @ts-expect-error satori accepts ArrayBuffer */}
            <img src={qrBuffer} width={240} height={240} alt="QR" />
          </div>
        </div>
      ),
      { width: W, height: H }
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
