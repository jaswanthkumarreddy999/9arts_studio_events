import { supabaseAdmin } from '@/lib/supabase'
import { getEventSettings } from '@/lib/eventSettings'

type SponsorTier = 'title' | 'gold' | 'silver' | 'bronze'

interface Sponsor {
  id: string
  name: string
  tagline?: string
  logo_url?: string
  website_url?: string
  tier: SponsorTier
  display_order: number
}

const TIER_META: Record<SponsorTier, { label: string; icon: string; cardClass: string; nameClass: string }> = {
  title:  { label: 'Title Sponsor',  icon: '👑', cardClass: 'border-amber-500/40 bg-amber-900/10',  nameClass: 'text-amber-300' },
  gold:   { label: 'Gold Sponsor',   icon: '🥇', cardClass: 'border-yellow-500/30 bg-yellow-900/10', nameClass: 'text-yellow-400' },
  silver: { label: 'Silver Sponsor', icon: '🥈', cardClass: 'border-zinc-400/20 bg-white/5',         nameClass: 'text-zinc-300' },
  bronze: { label: 'Bronze Sponsor', icon: '🥉', cardClass: 'border-amber-700/20 bg-amber-900/5',    nameClass: 'text-amber-600' },
}

// Minimum card count per tier to keep grid structure
const MIN_CARDS: Record<SponsorTier, number> = { title: 1, gold: 2, silver: 3, bronze: 3 }

async function getSponsors(): Promise<Sponsor[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('sponsors')
      .select('id, name, tagline, logo_url, website_url, tier, display_order')
      .order('display_order')
    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

function SponsorCard({ sponsor }: { sponsor: Sponsor }) {
  const meta = TIER_META[sponsor.tier]
  const card = (
    <div className={`group border rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg ${meta.cardClass}`}>
      <div className="aspect-[16/7] flex items-center justify-center bg-white/5 overflow-hidden px-6 py-4">
        {sponsor.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sponsor.logo_url}
            alt={sponsor.name}
            className="max-w-full max-h-full object-contain transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-1">🤝</div>
            <div className="text-zinc-600 text-xs">Logo Coming Soon</div>
          </div>
        )}
      </div>
      <div className="px-4 py-3">
        <div className={`font-bold text-sm ${meta.nameClass}`}>{sponsor.name}</div>
        {sponsor.tagline && <div className="text-zinc-500 text-xs mt-0.5">{sponsor.tagline}</div>}
      </div>
    </div>
  )

  if (sponsor.website_url) {
    return (
      <a href={sponsor.website_url} target="_blank" rel="noopener noreferrer" className="block">
        {card}
      </a>
    )
  }
  return card
}

function EmptyCard({ tier }: { tier: SponsorTier }) {
  const meta = TIER_META[tier]
  return (
    <div className={`border border-dashed rounded-2xl overflow-hidden opacity-30 ${meta.cardClass}`}>
      <div className="aspect-[16/7] flex flex-col items-center justify-center gap-1">
        <span className="text-2xl">{meta.icon}</span>
        <span className="text-zinc-600 text-xs">{meta.label}</span>
      </div>
    </div>
  )
}

export default async function SponsorsSection() {
  const sponsors = await getSponsors()
  const settings = await getEventSettings()
  const tiers: SponsorTier[] = ['title', 'gold', 'silver', 'bronze']

  // Check if any sponsor exists at all
  const hasAny = sponsors.length > 0

  const bgStyle = settings.sponsors_bg_image
    ? { backgroundImage: `url(${settings.sponsors_bg_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0a1a 50%, #0a0a0f 100%)' }

  return (
    <section id="sponsors" className="py-16 sm:py-24" style={bgStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-yellow-500 text-sm font-semibold uppercase tracking-widest mb-3">
            Our Partners
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Proud <span className="shimmer">Sponsors</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            {hasAny
              ? (settings.sponsors_description || `Thank you to our generous sponsors who make ${settings.event_name} possible.`)
              : (settings.sponsors_description || `Sponsorship opportunities are open. Be part of ${settings.event_name}.`)}
          </p>
        </div>

        <div className="space-y-10">
          {tiers.map(tier => {
            const tierSponsors = sponsors.filter(s => s.tier === tier)
            const meta = TIER_META[tier]
            const minCards = MIN_CARDS[tier]
            const emptyCount = Math.max(0, minCards - tierSponsors.length)
            // Columns per tier
            const gridCols =
              tier === 'title'  ? 'grid-cols-1 sm:grid-cols-1 max-w-sm mx-auto' :
              tier === 'gold'   ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' :
              tier === 'silver' ? 'grid-cols-2 sm:grid-cols-3' :
                                  'grid-cols-2 sm:grid-cols-4'

            return (
              <div key={tier}>
                {/* Tier label */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className={`text-xs font-bold uppercase tracking-widest ${meta.nameClass}`}>
                    {meta.icon} {meta.label}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                <div className={`grid gap-4 ${gridCols}`}>
                  {tierSponsors.map(s => <SponsorCard key={s.id} sponsor={s} />)}
                  {/* Empty placeholder cards */}
                  {Array.from({ length: emptyCount }).map((_, i) => (
                    <EmptyCard key={`empty-${i}`} tier={tier} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
