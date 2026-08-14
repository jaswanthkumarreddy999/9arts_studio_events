import type { CustomSection } from '@/lib/types'

export default function CustomSectionsRenderer({ sections }: { sections: CustomSection[] }) {
  const visible = [...sections]
    .filter(s => s.visible)
    .sort((a, b) => a.display_order - b.display_order)

  if (visible.length === 0) return null

  return (
    <>
      {visible.map(s => {
        const bgStyle = s.bg_image
          ? {
              backgroundImage: `url(${s.bg_image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : { backgroundColor: s.bg_color || '#0a0a0f' }

        return (
          <section
            key={s.id}
            id={`section-${s.id}`}
            className="py-16 sm:py-24 relative"
            style={bgStyle}
          >
            {/* Dark overlay when bg image is set */}
            {s.bg_image && <div className="absolute inset-0 bg-black/50" />}

            <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
              {s.subtitle && (
                <span className="inline-block text-yellow-500 text-sm font-semibold uppercase tracking-widest mb-3">
                  {s.subtitle}
                </span>
              )}
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                <span className="shimmer">{s.title}</span>
              </h2>
              {s.content && (
                <p className="text-zinc-300 text-lg leading-relaxed max-w-2xl mx-auto whitespace-pre-line">
                  {s.content}
                </p>
              )}
            </div>
          </section>
        )
      })}
    </>
  )
}
