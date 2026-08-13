import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import AboutSection from '@/components/AboutSection'
import SponsorsSection from '@/components/SponsorsSection'
import ContestantsSection from '@/components/ContestantsSection'
import RegisterSection from '@/components/RegisterSection'
import ContactSection from '@/components/ContactSection'
import { getEventSettings } from '@/lib/eventSettings'

export const revalidate = 0

export default async function HomePage() {
  const settings = await getEventSettings()

  return (
    <>
      <Navbar settings={settings} />
      <main>
        <HeroSection settings={settings} />
        <AboutSection settings={settings} />
        {settings.show_sponsors && <SponsorsSection />}
        {settings.show_contestants && <ContestantsSection />}
        <RegisterSection settings={settings} />
        <ContactSection settings={settings} />
      </main>
    </>
  )
}
