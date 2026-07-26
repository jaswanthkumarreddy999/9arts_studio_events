import { supabaseAdmin } from '@/lib/supabase'
import type { Contestant } from '@/lib/types'

// Sample contestants for display when DB is not yet configured
const SAMPLE_CONTESTANTS: Contestant[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  name: ['Priya Reddy', 'Anjali Sharma', 'Divya Krishna', 'Meghana Rao', 'Sunitha Verma', 'Kavya Nair', 'Rekha Pillai', 'Sravani Devi'][i],
  tagline: ['Grace & Elegance', 'Confidence Personified', 'Beauty with Brains', 'Nellore Pride', 'The Star', 'Rising Talent', 'Natural Beauty', 'Future Leader'][i],
  category: ['Miss Elegance', 'Miss Confidence', 'Miss Talented', 'Miss Charming', 'Miss Radiant', 'Miss Vibrant', 'Miss Natural', 'Miss Dynamic'][i],
  photo_url: undefined,
  display_order: i + 1,
}))

async function getContestants(): Promise<Contestant[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('contestants')
      .select('id, name, tagline, photo_url, category, display_order')
      .order('display_order')

    if (error || !data?.length) return SAMPLE_CONTESTANTS
    return data
  } catch {
    return SAMPLE_CONTESTANTS
  }
}

function ContestantCard({ contestant }: { contestant: Contestant }) {
  return (
    <div className="group bg-white/5 border border-white/10 hover:border-yellow-700/50 rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-900/20">
      {/* Photo */}
      <div className="relative aspect-[3/4] bg-gradient-to-br from-purple-900/50 to-yellow-900/20 flex items-center justify-center overflow-hidden">
        {contestant.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contestant.photo_url}
            alt={contestant.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="text-center p-6">
            <div className="text-6xl mb-3 float">👸</div>
            <div className="text-yellow-600/50 text-xs">Photo Coming Soon</div>
          </div>
        )}
        {/* Category badge */}
        {contestant.category && (
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm border border-yellow-700/40 text-yellow-400 text-xs px-2 py-1 rounded-full">
            {contestant.category}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-white text-base">{contestant.name}</h3>
        {contestant.tagline && (
          <p className="text-zinc-400 text-sm mt-1 italic">&ldquo;{contestant.tagline}&rdquo;</p>
        )}
      </div>
    </div>
  )
}

export default async function ContestantsSection() {
  const contestants = await getContestants()

  return (
    <section id="contestants" className="py-20 sm:py-28 bg-black/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-yellow-500 text-sm font-semibold uppercase tracking-widest mb-3">
            Meet The Contestants
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Our <span className="shimmer">Shining Stars</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Meet the talented and beautiful contestants competing for the Miss Nellore 2026 crown.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {contestants.map((c) => (
            <ContestantCard key={c.id} contestant={c} />
          ))}
        </div>

        <p className="text-center text-zinc-600 text-sm mt-8">
          More contestants to be announced. Stay tuned!
        </p>
      </div>
    </section>
  )
}
