"use client"

import { Zap, BarChart3, TrendingUp, CheckCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function SolutionsSection() {
  const solutions = [
    {
      icon: Zap,
      title: "Автоматизируем рутину",
      description: "Загружаете файл — получаете готовые карточки товаров за минуты, а не часы",
      features: ["Поддержка всех форматов", "Умное распознавание", "Автоматическая категоризация"]
    },
    {
      icon: BarChart3,
      title: "Готовим данные для продаж",
      description: "Оптимизируем описания, цены и характеристики под каждый маркетплейс",
      features: ["SEO-оптимизация", "Анализ конкурентов", "Динамическое ценообразование"]
    },
    {
      icon: TrendingUp,
      title: "Увеличиваем прибыль",
      description: "Снижаем затраты времени на 90% и повышаем конверсию продаж на 30%",
      features: ["Мгновенная загрузка", "Аналитика продаж", "Рекомендации по росту"]
    }
  ]

  return (
    <section id="how-it-works" className="py-20">
      <div className="container">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-success-light text-success text-sm font-medium mb-6">
            <CheckCircle className="w-4 h-4 mr-2" />
            Наше решение
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Превращаем проблемы в{" "}
            <span className="bg-gradient-success bg-clip-text text-transparent">
              возможности
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Полная автоматизация обработки прайсов от загрузки до размещения на маркетплейсах
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {solutions.map((solution, index) => (
            <Card key={index} className="p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-card to-success-light/5">
              <div className="w-16 h-16 mb-6 bg-gradient-success rounded-xl flex items-center justify-center">
                <solution.icon className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4">{solution.title}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {solution.description}
              </p>
              <ul className="space-y-2">
                {solution.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-success mr-2 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* Before/After Comparison */}
        <div className="bg-gradient-to-r from-destructive/5 via-background to-success/5 p-8 rounded-2xl">
          <h3 className="text-2xl font-bold text-center mb-8">До → После</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <h4 className="font-semibold text-destructive mb-4">❌ Было</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>20 часов обработки прайсов</li>
                <li>Постоянные ошибки в данных</li>
                <li>Низкая скорость загрузки товаров</li>
                <li>Потери прибыли до 30%</li>
              </ul>
            </div>
            <div className="text-center">
              <h4 className="font-semibold text-success mb-4">✅ Стало</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>2 часа на полную автоматизацию</li>
                <li>99.9% точность обработки</li>
                <li>Мгновенная загрузка на маркетплейсы</li>
                <li>Рост прибыли на 30-50%</li>
              </ul>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Button variant="hero" size="lg">
              Получить результат сейчас
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}