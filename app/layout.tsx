import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Miss Nellore 2026 — Beauty Pageant',
  description:
    'Register for Miss Nellore 2026 — the most prestigious beauty pageant in Nellore, Andhra Pradesh.',
  keywords: ['Miss Nellore', 'beauty pageant', 'Nellore', 'registration', '2026'],
  openGraph: {
    title: 'Miss Nellore 2026',
    description: 'Register for the most prestigious beauty pageant in Nellore.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
