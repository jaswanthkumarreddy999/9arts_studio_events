import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SEAT_TIERS } from '@/lib/types'
import Link from 'next/link'
import PassActions from './PassActions'
import VoteSection from './VoteSection'
import PaymentSubmit from './PaymentSubmit'
import DownloadPassButton from './DownloadPassButton'

export default async function MyPassPage() {
  const session = await getSession()
  if (!session) return null // middleware handles redirect

  const [{ data: pass }, { data: payment }, { data: reg }] = await Promise.all([
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
      .select('seat_tier, mobile, gender')
      .eq('application_id', session.sub)
      .maybeSingle(),
  ])

  const tier = (pass?.seat_tier ?? reg?.seat_tier ?? 'gold') as keyof typeof SEAT_TIERS
  const tierInfo = SEAT_TIERS[tier]

  return (
    <div className="min-h-screen px-4 py-12"
      style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0f 100%)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">👑</span>
            <span className="font-bold shimmer">Miss Nellore 2026</span>
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
              <img src="/ticket-template.png" alt="ticket" className="absolute inset-0 w-full h-full object-fill" />

              {/* QR — x:70.2 y:70 → left:70.2% top:30% */}
              <div className="absolute flex items-center justify-center"
                style={{ top: '30%', left: '70.2%', width: '23.4%', height: '33%' }}>
                <div className="w-[86%] h-[86%] flex items-center justify-center bg-white p-[2%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pass.qr_data_url} alt="QR" className="w-full h-full object-contain" />
                </div>
              </div>

              {/* Name — x:52 y:78.5 → left:52% top:21.5% */}
              <div className="absolute text-white font-bold leading-tight"
                style={{ top: '21.5%', left: '52%', maxWidth: '34%', fontSize: 'clamp(5px,0.9vw,13px)', wordBreak: 'break-word', lineHeight: 1.25 }}>
                {pass.full_name}
              </div>

              {/* Application ID — x:45 y:62 → left:45% top:38% */}
              <div className="absolute text-yellow-300 font-mono font-bold leading-tight"
                style={{ top: '38%', left: '45%', maxWidth: '34%', fontSize: 'clamp(4px,0.75vw,11px)', wordBreak: 'break-all', lineHeight: 1.25 }}>
                {pass.application_id}
              </div>

              {/* Mobile — x:55 y:51.5 → left:55% top:48.5% */}
              <div className="absolute text-white font-semibold"
                style={{ top: '48.5%', left: '55%', maxWidth: '34%', fontSize: 'clamp(5px,0.9vw,13px)', whiteSpace: 'nowrap' }}>
                {reg?.mobile ?? '—'}
              </div>

              {/* Gender — x:55 y:40.8 → left:55% top:59.2% */}
              <div className="absolute text-white font-semibold"
                style={{ top: '59.2%', left: '55%', maxWidth: '34%', fontSize: 'clamp(5px,0.9vw,13px)' }}>
                {reg?.gender === 'male' ? 'Male' : reg?.gender === 'female' ? 'Female' : reg?.gender === 'other' ? 'Other' : '—'}
              </div>

              {/* Pass — x:55 y:30.5 → left:55% top:69.5% */}
              <div className="absolute text-yellow-400 font-bold"
                style={{ top: '69.5%', left: '55%', maxWidth: '34%', fontSize: 'clamp(5px,0.9vw,13px)' }}>
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
                    style={{ top: '62%', left: '70.2%', width: '23.4%' }}>
                    <span style={{ color: '#ffffff', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', textShadow: '0 1px 4px rgba(0,0,0,1)', fontSize: 'clamp(5px,1vw,14px)' }}>
                      {seatIcon}{table.toUpperCase()} · {seatWord} {seatNum}
                    </span>
                  </div>
                )
              })()}

              {/* Amount — x:77 y:14 → left:77% top:86% */}
              <div className="absolute text-black font-black"
                style={{ top: '86%', left: '77%', fontSize: 'clamp(7px,1.5vw,22px)' }}>
                ₹{payment?.amount ?? tierInfo.price}
              </div>
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
