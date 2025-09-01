"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Crown, Zap, Rocket } from "lucide-react"

export function PricingSection() {
  const plans = [
    {
      name: "Start",
      icon: Zap,
      price: "₽9,900",
      period: "/месяц",
      description: "Для начинающих продавцов",
      features: [
        "До 1,000 товаров в месяц",
        "3 маркетплейса",
        "Базовая автоматизация",
        "Email поддержка",
        "Обучающие материалы"
      ],
      popular: false
    },
    {
      name: "Grow",
      icon: Rocket,
      price: "₽19,900", 
      period: "/месяц",
      description: "Для растущего бизнеса",
      features: [
        "До 10,000 товаров в месяц",
        "Все маркетплейсы",
        "Полная автоматизация",
        "Приоритетная поддержка",
        "Аналитика и отчёты",
        "API интеграция",
        "Персональный менеджер"
      ],
      popular: true
    },
    {
      name: "Pro",
      icon: Crown,
      price: "₽49,900",
      period: "/месяц", 
      description: "Для крупного бизнеса",
      features: [
        "Безлимитное количество товаров",
        "Все возможности системы",
        "Кастомные интеграции",
        "24/7 поддержка",
        "Индивидуальные решения",
        "Обучение команды",
        "SLA гарантии"
      ],
      popular: false
    }
  ]

  return (
    <section className="py-20">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Тарифы для любого масштаба бизнеса
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Выберите план, который поможет вашему бизнесу зарабатывать больше уже сегодня
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative p-8 ${
                plan.popular 
                  ? 'border-primary shadow-xl scale-105 bg-gradient-to-br from-card to-primary-light/10' 
                  : 'hover:shadow-lg'
              } transition-all duration-300`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-success text-primary-foreground px-4 py-2 rounded-full text-sm font-medium">
                  Популярный
                </div>
              )}

              <div className="text-center mb-8">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center ${
                  plan.popular ? 'bg-gradient-success' : 'bg-muted'
                }`}>
                  <plan.icon className={`w-8 h-8 ${
                    plan.popular ? 'text-primary-foreground' : 'text-foreground'
                  }`} />
                </div>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-success mr-3 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={plan.popular ? "hero" : "outline"} 
                className="w-full"
                size="lg"
              >
                {plan.popular ? "Начать зарабатывать" : "Выбрать план"}
              </Button>
            </Card>
          ))}
        </div>

        {/* Money Back Guarantee */}
        <div className="text-center bg-success-light p-8 rounded-2xl">
          <h3 className="text-xl font-semibold mb-4">💰 Гарантия результата</h3>
          <p className="text-muted-foreground mb-6">
            Если в течение первого месяца вы не увидите роста продаж — вернём деньги
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div>✅ Бесплатный пробный период 14 дней</div>
            <div>✅ Возврат средств в течение 30 дней</div>
            <div>✅ Никаких скрытых платежей</div>
          </div>
        </div>
      </div>
    </section>
  )
}