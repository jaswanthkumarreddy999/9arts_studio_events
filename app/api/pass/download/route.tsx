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
        .select('application_id, full_name, seat_tier, qr_data_url, issued_at')
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

    // Fetch template background — must be a real URL (not data:)
    const host = req.headers.get('host') ?? 'localhost:3000'
    const proto = host.startsWith('localhost') ? 'http' : 'https'
    const templateUrl = `${proto}://${host}/ticket-template.png`

    // Template canvas size — matches the ticket image aspect ratio (landscape)
    const W = 1050
    const H = 650

    const image = new ImageResponse(
      (
        <div style={{ display: 'flex', width: `${W}px`, height: `${H}px`, position: 'relative', overflow: 'hidden' }}>

          {/* Background ticket template */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={templateUrl}
            width={W}
            height={H}
            style={{ position: 'absolute', top: 0, left: 0 }}
            alt="bg"
          />

          {/* ── Data overlays — positions tuned to the template layout ── */}

          {/* Name — right section, after "Name :" label */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 245, left: 560,
            color: '#ffffff', fontSize: 21, fontWeight: 700,
            fontFamily: 'sans-serif', maxWidth: 220,
          }}>
            {pass.full_name}
          </div>

          {/* Application ID */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 301, left: 560,
            color: '#facc15', fontSize: 17, fontWeight: 700,
            fontFamily: 'monospace', letterSpacing: 0.5, maxWidth: 220,
          }}>
            {pass.application_id}
          </div>

          {/* Mobile */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 356, left: 560,
            color: '#ffffff', fontSize: 20, fontWeight: 600,
            fontFamily: 'sans-serif',
          }}>
            {reg?.mobile ?? '—'}
          </div>

          {/* Gender */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 410, left: 560,
            color: '#ffffff', fontSize: 20, fontWeight: 600,
            fontFamily: 'sans-serif',
          }}>
            {genderLabel}
          </div>

          {/* Pass type */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 463, left: 560,
            color: '#fbbf24', fontSize: 20, fontWeight: 700,
            fontFamily: 'sans-serif',
          }}>
            {tierInfo.label} Pass
          </div>

          {/* Amount — over the white amount box bottom right */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 582, left: 834,
            color: '#000000', fontSize: 22, fontWeight: 800,
            fontFamily: 'sans-serif',
          }}>
            {amountLabel}
          </div>

          {/* QR Code — over the white QR placeholder box */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 230, left: 782,
            background: '#ffffff', padding: 4, borderRadius: 6,
          }}>
            {/* @ts-expect-error satori accepts ArrayBuffer for img src */}
            <img src={qrBuffer} width={155} height={155} alt="QR" />
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
