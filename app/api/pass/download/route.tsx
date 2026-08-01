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

    const { data: pass } = await supabaseAdmin
      .from('passes')
      .select('application_id, full_name, seat_tier, qr_data_url, issued_at')
      .eq('application_id', session.sub)
      .maybeSingle()

    if (!pass?.qr_data_url) {
      return new Response('Pass not ready', { status: 404 })
    }

    const { data: reg } = await supabaseAdmin
      .from('registrations')
      .select('mobile, gender')
      .eq('application_id', session.sub)
      .maybeSingle()

    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('application_id', session.sub)
      .maybeSingle()

    const tier = pass.seat_tier as keyof typeof SEAT_TIERS
    const tierInfo = SEAT_TIERS[tier]

    // Convert QR data URL → ArrayBuffer for satori
    const base64 = pass.qr_data_url.replace(/^data:image\/\w+;base64,/, '')
    const binaryStr = atob(base64)
    const qrBytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) qrBytes[i] = binaryStr.charCodeAt(i)
    const qrBuffer: ArrayBuffer = qrBytes.buffer

    // Fetch template from public folder via absolute URL
    const host = req.headers.get('host') ?? 'localhost:3000'
    const proto = host.includes('localhost') ? 'http' : 'https'
    const templateUrl = `${proto}://${host}/ticket-template.png`

    const genderLabel =
      reg?.gender === 'male' ? 'Male' :
      reg?.gender === 'female' ? 'Female' :
      reg?.gender === 'other' ? 'Other' : '—'

    const amountLabel = payment?.amount ? `₹${payment.amount}` : `₹${tierInfo.price}`

    // Canvas size matches the template aspect ratio (landscape ticket ~1050×650)
    const W = 1050
    const H = 650

    const image = new ImageResponse(
      (
        <div style={{ display: 'flex', width: `${W}px`, height: `${H}px`, position: 'relative' }}>

          {/* Background template image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={templateUrl}
            width={W}
            height={H}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            alt="ticket"
          />

          {/* ── Overlay data fields ── */}
          {/* Positioned to match the template layout */}

          {/* Name */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 248, left: 530,
            color: '#ffffff', fontSize: 22, fontWeight: 700,
            fontFamily: 'sans-serif', letterSpacing: 0.5,
          }}>
            {pass.full_name}
          </div>

          {/* Application ID */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 305, left: 530,
            color: '#facc15', fontSize: 18, fontWeight: 700,
            fontFamily: 'monospace', letterSpacing: 1,
          }}>
            {pass.application_id}
          </div>

          {/* Mobile */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 362, left: 530,
            color: '#ffffff', fontSize: 20, fontWeight: 600,
            fontFamily: 'sans-serif',
          }}>
            {reg?.mobile ?? '—'}
          </div>

          {/* Gender */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 418, left: 530,
            color: '#ffffff', fontSize: 20, fontWeight: 600,
            fontFamily: 'sans-serif',
          }}>
            {genderLabel}
          </div>

          {/* Pass type */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 472, left: 530,
            color: '#fbbf24', fontSize: 20, fontWeight: 700,
            fontFamily: 'sans-serif',
          }}>
            {tierInfo.badge} {tierInfo.label}
          </div>

          {/* Amount */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 578, left: 830,
            color: '#000000', fontSize: 22, fontWeight: 800,
            fontFamily: 'sans-serif',
          }}>
            {amountLabel}
          </div>

          {/* QR Code — positioned over the white QR box in the template */}
          <div style={{
            display: 'flex', position: 'absolute',
            top: 238, left: 790,
            background: '#ffffff', padding: 6, borderRadius: 8,
          }}>
            {/* @ts-expect-error satori accepts ArrayBuffer */}
            <img src={qrBuffer} width={150} height={150} alt="QR" />
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
