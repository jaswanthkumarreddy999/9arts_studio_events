import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import AboutSection from '@/components/AboutSection'
import ContestantsSection from '@/components/ContestantsSection'
import RegisterSection from '@/components/RegisterSection'
import ContactSection from '@/components/ContactSection'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <ContestantsSection />
        <RegisterSection />
        <ContactSection />
      </main>
    </>
  )
}
