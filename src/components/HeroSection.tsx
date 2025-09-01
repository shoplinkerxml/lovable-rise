"use client";

import { Button } from "@/components/ui/button";
import { Play, ArrowRight, TrendingUp } from "lucide-react";
import heroImage from "@/assets/hero-business.jpg";
import { useState, useEffect } from "react";
export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    setIsVisible(true);
  }, []);
  return <section className="relative py-20 lg:py-32 overflow-hidden bg-gradient-hero">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="absolute top-10 right-10 w-20 h-20 bg-success/10 rounded-full blur-xl" />
      <div className="absolute bottom-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

      <div className="container relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className={`space-y-8 ${isVisible ? 'animate-fade-slide-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-success-light text-success text-sm font-medium">
              <TrendingUp className="w-4 h-4 mr-2" />
              Увеличиваем прибыль на 30-50%
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Помогаем бизнесу{" "}
              {" "}
              на маркетплейсах
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed">
              Мы решаем проблемы с прайсами и поставщиками, превращая сложные данные 
              в простую прибыль. Автоматизируем рутину — освобождаем время для роста.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="group">
                Начать зарабатывать
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg" className="group">
                <Play className="mr-2 h-4 w-4" />
                Посмотреть демо
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">30%</div>
                <div className="text-sm text-muted-foreground">Рост продаж</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">20 ч</div>
                <div className="text-sm text-muted-foreground">Экономии в неделю</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">1000+</div>
                <div className="text-sm text-muted-foreground">Довольных клиентов</div>
              </div>
            </div>
          </div>

          {/* Image */}
          <div className={`relative ${isVisible ? 'animate-fade-slide-up' : 'opacity-0'}`} style={{
          animationDelay: '0.3s'
        }}>
            <div className="relative">
              <img src={heroImage} alt="Автоматизация бизнеса и рост продаж" className="w-full h-auto rounded-2xl shadow-2xl" />
              
              {/* Floating elements */}
              <div className="absolute -top-6 -right-6 bg-card p-4 rounded-xl shadow-lg animate-bounce-gentle">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <span className="text-sm font-medium">+47% продаж</span>
                </div>
              </div>
              
              <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-xl shadow-lg animate-bounce-gentle" style={{
              animationDelay: '1s'
            }}>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">Автопилот ON</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
}