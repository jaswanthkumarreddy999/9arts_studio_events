import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SEAT_TIERS, DEFAULT_EVENT_SETTINGS } from '@/lib/types'
import { getEventSettings } from '@/lib/eventSettings'
import Link from 'next/link'
import PassActions from './PassActions'
import VoteSection from './VoteSection'
import PaymentSubmit from './PaymentSubmit'
import DownloadPassButton from './DownloadPassButton'

// Always fetch fresh — so template/position changes from admin show immediately
export const revalidate = 0

export default async function MyPassPage() {
  const session = await getSession()
  if (!session) return null // middleware handles redirect

  const [{ data: pass }, { data: payment }, { data: reg }, settings] = await Promise.all([
    supabaseAdmin
      .from('passes')
      .select('application_id, full_name, seat_tier, qr_data_url, issued_at, ticket_no, table_number')
      .eq('application_id', session.sub)
      .maybeSingle(),
    supabaseAdmin
      .from('payments')
      .select('status, rejection_reason, amount, utr_number, screenshot_path')
      .eq('application_id', session.sub)
      .maybeSingle(),
    supabaseAdmin
      .from('registrations')
      .select('seat_tier, mobile, gender, extra_data')
      .eq('application_id', session.sub)
      .maybeSingle(),
    getEventSettings(),
  ])

  const tier = (pass?.seat_tier ?? reg?.seat_tier ?? 'gold') as keyof typeof SEAT_TIERS
  const tierInfo = SEAT_TIERS[tier]

  // Merge saved field positions with defaults — safe even if DB column doesn't exist yet
  const pos = { ...DEFAULT_EVENT_SETTINGS.pass_field_positions, ...(settings.pass_field_positions ?? {}) }

  return (
    <div className="min-h-screen px-4 py-12"
      style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0f 100%)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">{settings.event_icon}</span>
            <span className="font-bold shimmer">{settings.event_name}</span>
          </Link>
          <PassActions hasPass={!!pass?.qr_data_url} />
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">My Pass</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Welcome back, <span className="text-white">{session.name}</span>
        </p>

        {/* Application ID */}
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wide">Application ID</div>
            <div className="text-white font-mono font-bold text-sm mt-0.5">{session.sub}</div>
          </div>
          <span className="text-xl">{tierInfo.badge}</span>
        </div>

        {/* Payment status */}
        {payment && (
          <div className={`rounded-xl px-4 py-3 mb-2 ${
            payment.status === 'approved' ? 'bg-green-900/20 border border-green-700/40' :
            payment.status === 'rejected' ? 'bg-red-900/20 border border-red-700/40' :
            'bg-yellow-900/20 border border-yellow-700/40'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {payment.status === 'approved' ? '✅' : payment.status === 'rejected' ? '❌' : '⏳'}
              </span>
              <div>
                <div className={`text-sm font-semibold ${
                  payment.status === 'approved' ? 'text-green-400' :
                  payment.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  Payment {payment.status === 'approved' ? 'Verified' : payment.status === 'rejected' ? 'Rejected' : 'Pending Verification'}
                </div>
                {payment.status === 'pending' && (
                  <div className="text-zinc-400 text-xs mt-0.5">
                    {payment.utr_number
                      ? `UTR ${payment.utr_number} submitted — usually verified within 24 hours`
                      : 'No payment details yet — complete your payment below'}
                  </div>
                )}
                {payment.status === 'rejected' && payment.rejection_reason && (
                  <div className="text-red-300 text-xs mt-0.5">Reason: {payment.rejection_reason}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment completion — shown when payment is pending (no QR yet) */}
        {payment?.status === 'pending' && !pass?.qr_data_url && (
          <div className="mb-6">
            <PaymentSubmit
              applicationId={session.sub}
              amount={payment.amount ?? tierInfo.price}
              utrNumber={payment.utr_number ?? null}
              hasScreenshot={!!payment.screenshot_path}
            />
          </div>
        )}

        {/* QR Pass */}
        {pass?.qr_data_url ? (
          <>
            {/* Branded ticket — template background with data overlaid */}
            <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl" style={{ aspectRatio: '1536/1024' }}>
              {/* Background template */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.pass_template_url || '/ticket-template.png'} alt="ticket" className="absolute inset-0 w-full h-full object-fill" />

              {/* QR — positioned from settings */}
              <div className="absolute flex items-center justify-center"
                style={{ top: `${pos.qr.top}%`, left: `${pos.qr.left}%`, width: `${pos.qr.width}%`, height: `${pos.qr.height}%` }}>
                <div className="w-[86%] h-[86%] flex items-center justify-center bg-white p-[2%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pass.qr_data_url} alt="QR" className="w-full h-full object-contain" />
                </div>
              </div>

              {/* Name */}
              <div className="absolute text-white font-bold leading-tight"
                style={{ top: `${pos.name.top}%`, left: `${pos.name.left}%`, maxWidth: '34%', fontSize: 'clamp(5px,0.9vw,13px)', wordBreak: 'break-word', lineHeight: 1.25 }}>
                {pass.full_name}
              </div>

              {/* Application ID */}
              <div className="absolute text-yellow-300 font-mono font-bold leading-tight"
                style={{ top: `${pos.application_id.top}%`, left: `${pos.application_id.left}%`, maxWidth: '34%', fontSize: 'clamp(4px,0.75vw,11px)', wordBreak: 'break-all', lineHeight: 1.25 }}>
                {pass.application_id}
              </div>

              {/* Mobile */}
              <div className="absolute text-white font-semibold"
                style={{ top: `${pos.mobile.top}%`, left: `${pos.mobile.left}%`, maxWidth: '34%', fontSize: 'clamp(5px,0.9vw,13px)', whiteSpace: 'nowrap' }}>
                {reg?.mobile ?? '—'}
              </div>

              {/* Gender */}
              <div className="absolute text-white font-semibold"
                style={{ top: `${pos.gender.top}%`, left: `${pos.gender.left}%`, maxWidth: '34%', fontSize: 'clamp(5px,0.9vw,13px)' }}>
                {reg?.gender === 'male' ? 'Male' : reg?.gender === 'female' ? 'Female' : reg?.gender === 'other' ? 'Other' : '—'}
              </div>

              {/* Pass type */}
              <div className="absolute text-yellow-400 font-bold"
                style={{ top: `${pos.pass_type.top}%`, left: `${pos.pass_type.left}%`, maxWidth: '34%', fontSize: 'clamp(5px,0.9vw,13px)' }}>
                {tierInfo.label}
              </div>

              {/* Seat label — in white space below QR, above SCAN TO VERIFY */}
              {(pass.ticket_no || pass.table_number) && (() => {
                const ticket = pass.ticket_no ?? ''
                const table = pass.table_number ?? ''
                const seatNum = ticket.includes('-') ? ticket.split('-').slice(1).join('-') : ticket.replace(/^[A-Z]+/, '')
                const seatWord = ticket.startsWith('C') ? 'CHAIR' : 'SEAT'
                const seatIcon = ticket.startsWith('S') ? '🛋️ ' : ticket.startsWith('C') ? '💺 ' : '🪑 '
                return (
                  <div className="absolute flex items-center justify-center text-center whitespace-nowrap"
                    style={{ top: '61.5%', left: '69.7%', width: '23.4%' }}>
                    <span style={{ color: '#ffffff', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', textShadow: '0 1px 4px rgba(0,0,0,1)', fontSize: 'clamp(5px,1vw,14px)' }}>
                      {seatIcon}{table.toUpperCase()} · {seatWord} {seatNum}
                    </span>
                  </div>
                )
              })()}

              {/* Amount */}
              <div className="absolute text-black font-black"
                style={{ top: `${pos.amount.top}%`, left: `${pos.amount.left}%`, fontSize: 'clamp(7px,1.5vw,22px)' }}>
                ₹{payment?.amount ?? tierInfo.price}
              </div>

              {/* Custom overlay fields */}
              {(settings.pass_custom_fields ?? []).map(cf => {
                const cfPos = pos[cf.id]
                if (!cfPos) return null
                const text = cf.source === 'static'
                  ? (cf.staticText ?? '')
                  : ((reg?.extra_data as Record<string, string> | null)?.[cf.extraDataKey ?? ''] ?? '')
                if (!text) return null
                const fs = cfPos.fontSize ?? 28
                const mw = cfPos.maxWidth ?? 34
                return (
                  <div key={cf.id} className="absolute font-semibold"
                    style={{
                      top: `${cfPos.top}%`, left: `${cfPos.left}%`,
                      color: cf.color,
                      fontSize: `clamp(5px,${(fs / 1536 * 100).toFixed(3)}vw,${fs}px)`,
                      maxWidth: `${mw}%`,
                      transform: 'translateY(-50%)',
                    }}>
                    {text}
                  </div>
                )
              })}
            </div>

            {/* Download button */}
            <DownloadPassButton />
          </>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4 float">⏳</div>
            <h3 className="text-white font-semibold mb-2">QR Pass Not Ready Yet</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {payment?.status === 'rejected'
                ? 'Your payment was rejected. Please contact us to resolve this.'
                : 'Your QR pass will be generated once your payment is verified. Check back after 24 hours.'}
            </p>
            {payment?.status === 'rejected' && (
              <a href="/#contact" className="inline-block mt-4 text-yellow-400 text-sm hover:text-yellow-300 transition-colors">
                Contact Us →
              </a>
            )}
          </div>
        )}

        <VoteSection />
      </div>
    </div>
  )
}
