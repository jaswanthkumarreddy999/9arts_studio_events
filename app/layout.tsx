import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { getEventSettings } from '@/lib/eventSettings'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
