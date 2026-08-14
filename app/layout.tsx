import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { getEventSettings } from '@/lib/eventSettings'
import { resolveThemeColor } from '@/lib/themeColors'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export async function generateMetadata(): Promise<Metadata> {
  const s = await getEventSettings()
  return {
    title: s.meta_title,
    description: s.meta_description,
    keywords: [s.event_name, s.organizer_name, 'Nellore', 'registration', s.event_edition],
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico', sizes: '32x32' },
      ],
      apple: '/favicon.svg',
    },
    openGraph: {
      title: s.meta_title,
      description: s.meta_description,
      type: 'website',
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getEventSettings()
  const { primary, light } = resolveThemeColor(s.theme_color ?? 'gold')

  // Inject CSS variable overrides so every accent-* / .shimmer / .glow / .btn-primary
  // class automatically uses the chosen theme color.
  const themeStyle = `
    :root {
      --gold: ${primary};
      --gold-light: ${light};
      --gold-dim: color-mix(in srgb, ${primary} 20%, transparent);
      --gold-muted: color-mix(in srgb, ${primary} 30%, transparent);
      --gold-border: color-mix(in srgb, ${primary} 40%, transparent);
      --gold-border-dim: color-mix(in srgb, ${primary} 20%, transparent);
    }
  `

  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
