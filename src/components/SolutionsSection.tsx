"use client"

import { Zap, BarChart3, TrendingUp, CheckCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/providers/i18n-provider"

export function SolutionsSection() {
  const { t } = useI18n();
  
  const solutions = [
    {
      icon: Zap,
      titleKey: 'solution_1_title',
      descKey: 'solution_1_desc',
      features: ['solution_1_feature_1', 'solution_1_feature_2', 'solution_1_feature_3']
    },
    {
      icon: BarChart3,
      titleKey: 'solution_2_title',
      descKey: 'solution_2_desc',
      features: ['solution_2_feature_1', 'solution_2_feature_2', 'solution_2_feature_3']
    },
    {
      icon: TrendingUp,
      titleKey: 'solution_3_title',
      descKey: 'solution_3_desc',
      features: ['solution_3_feature_1', 'solution_3_feature_2', 'solution_3_feature_3']
    }
  ]

  return (
    <section id="how-it-works" className="py-20">
      <div className="container">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-success-light border border-success/20 text-success text-sm font-medium mb-6">
            <CheckCircle className="w-4 h-4 mr-2" />
            {t('solutions_badge')}
          </div>
          <h2 className="text-3xl lg:text-5xl font-bold mb-4">
            {t('solutions_title')}{" "}
            <span className="bg-gradient-success bg-clip-text text-transparent">
              {t('solutions_accent')}
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('solutions_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {solutions.map((solution, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-primary transition-all duration-300 hover:scale-105 bg-gradient-to-br from-card to-success-light/10 border-2 border-transparent hover:border-success/20"
            >
              <div className="w-16 h-16 mb-6 bg-gradient-success rounded-xl flex items-center justify-center shadow-glow">
                <solution.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">{t(solution.titleKey)}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                {t(solution.descKey)}
              </p>
              <ul className="space-y-3">
                {solution.features.map((featureKey, idx) => (
                  <li key={idx} className="flex items-center text-sm">
                    <CheckCircle className="w-5 h-5 text-success mr-3 flex-shrink-0" />
                    <span className="text-muted-foreground">{t(featureKey)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* Before/After Comparison */}
        <div className="bg-gradient-to-r from-card via-card to-card p-10 rounded-3xl border-2 border-border/50 shadow-primary">
          <h3 className="text-3xl font-bold text-center mb-10">{t('before_after_title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="text-center p-6 bg-destructive/5 rounded-2xl">
              <h4 className="font-semibold text-destructive mb-6 text-xl">{t('before_title')}</h4>
              <ul className="space-y-3 text-base text-muted-foreground">
                <li>{t('before_1')}</li>
                <li>{t('before_2')}</li>
                <li>{t('before_3')}</li>
                <li>{t('before_4')}</li>
              </ul>
            </div>
            <div className="text-center p-6 bg-success/5 rounded-2xl">
              <h4 className="font-semibold text-success mb-6 text-xl">{t('after_title')}</h4>
              <ul className="space-y-3 text-base text-muted-foreground">
                <li>{t('after_1')}</li>
                <li>{t('after_2')}</li>
                <li>{t('after_3')}</li>
                <li>{t('after_4')}</li>
              </ul>
            </div>
          </div>
          
          <div className="text-center mt-10">
            <Button variant="hero" size="lg" className="text-lg px-8 py-6">
              {t('cta_get_result')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
