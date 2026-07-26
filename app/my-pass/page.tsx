import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { SEAT_TIERS } from '@/lib/types'
import Link from 'next/link'
import PassActions from './PassActions'
import VoteSection from './VoteSection'

export default async function MyPassPage() {
  const session = await getSession()
  if (!session) return null // middleware handles redirect

  const [{ data: pass }, { data: payment }] = await Promise.all([
    supabaseAdmin
      .from('passes')
      .select('application_id, full_name, seat_tier, qr_data_url, issued_at')
      .eq('application_id', session.sub)
      .maybeSingle(),
    supabaseAdmin
      .from('payments')
      .select('status, rejection_reason, amount, utr_number')
      .eq('application_id', session.sub)
      .maybeSingle(),
  ])

  const tier = (pass?.seat_tier ?? 'gold') as keyof typeof SEAT_TIERS
  const tierInfo = SEAT_TIERS[tier]

  return (
    <div className="min-h-screen px-4 py-12"
      style={{ background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0f 100%)' }}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">👑</span>
            <span className="font-bold shimmer">Miss Nellore 2026</span>
          </Link>
          <PassActions />
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
          <div className={`rounded-xl px-4 py-3 mb-6 ${
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
                  <div className="text-zinc-400 text-xs mt-0.5">Usually verified within 24 hours</div>
                )}
                {payment.status === 'rejected' && payment.rejection_reason && (
                  <div className="text-red-300 text-xs mt-0.5">Reason: {payment.rejection_reason}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QR Pass */}
        {pass?.qr_data_url ? (
          <div className={`rounded-2xl p-6 border-2 ${tier === 'elite' ? 'border-amber-500 bg-amber-900/10' : 'border-yellow-600 bg-yellow-900/10'}`}>
            {/* Pass header */}
            <div className="text-center mb-6">
              <div className="text-3xl mb-1">{tierInfo.badge}</div>
              <div className="text-xl font-bold text-white">Miss Nellore 2026</div>
              <div className={`text-sm font-semibold mt-1 ${tier === 'elite' ? 'text-amber-400' : 'text-yellow-400'}`}>
                {tierInfo.label} — {tierInfo.subtitle}
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="bg-white p-3 rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pass.qr_data_url} alt="QR Code" className="w-48 h-48" />
              </div>
            </div>

            {/* Pass details */}
            <div className="space-y-2 text-sm">
              {[
                { label: 'Name', value: pass.full_name },
                { label: 'Application ID', value: pass.application_id },
                { label: 'Event', value: 'August 2, 2026' },
                { label: 'Venue', value: 'DGP kalyana mandapam, Nellore' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-start gap-4">
                  <span className="text-zinc-500">{row.label}</span>
                  <span className="text-white font-medium text-right">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-center text-zinc-500 text-xs">
              Present this QR at the event entrance • One-time use
            </div>
          </div>
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
