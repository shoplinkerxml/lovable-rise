import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { useI18n } from "@/providers/i18n-provider"

const Index = () => {
  const { t } = useI18n();
  
  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            MarketGrow
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional business management platform
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Index