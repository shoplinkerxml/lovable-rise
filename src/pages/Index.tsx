import { Header } from "@/components/Header"
import { HeroSection } from "@/components/HeroSection"
import { SolutionsSection } from "@/components/SolutionsSection"
import { ProblemsSection } from "@/components/ProblemsSection"
import { PricingSection } from "@/components/PricingSection"
import { TestimonialsSection } from "@/components/TestimonialsSection"
import { FAQSection } from "@/components/FAQSection"
import { NewsletterSection } from "@/components/NewsletterSection"
import { Footer } from "@/components/Footer"

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <SolutionsSection />
      <ProblemsSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <NewsletterSection />
      <Footer />
    </div>
  )
}

export default Index