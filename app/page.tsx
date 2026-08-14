import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import AboutSection from '@/components/AboutSection'
import SponsorsSection from '@/components/SponsorsSection'
import ContestantsSection from '@/components/ContestantsSection'
import RegisterSection from '@/components/RegisterSection'
import ContactSection from '@/components/ContactSection'
import CustomSectionsRenderer from '@/components/CustomSectionsRenderer'
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
        {/* Admin-managed custom sections */}
        {settings.custom_sections && settings.custom_sections.length > 0 && (
          <CustomSectionsRenderer sections={settings.custom_sections} />
        )}
        <RegisterSection settings={settings} />
        <ContactSection settings={settings} />
      </main>
    </>
  )
}
