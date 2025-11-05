"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useI18n } from "@/providers/i18n-provider";

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useI18n();
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-hero">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-success/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className={`inline-flex items-center px-4 py-2 rounded-full bg-success-light border border-success/20 text-success text-sm font-medium mb-8 ${isVisible ? 'animate-fade-slide-up' : 'opacity-0'}`}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t('hero_badge')}
          </div>

          {/* Main Heading */}
          <h1 className={`text-5xl md:text-7xl font-bold leading-tight mb-6 ${isVisible ? 'animate-fade-slide-up' : 'opacity-0'}`} style={{ animationDelay: '0.1s' }}>
            {t('hero_title_1')}{" "}
            <span className="bg-gradient-success bg-clip-text text-transparent">
              {t('hero_title_accent')}
            </span>{" "}
            {t('hero_title_2')}
          </h1>

          {/* Subtitle */}
          <p className={`text-xl md:text-2xl text-muted-foreground leading-relaxed mb-10 max-w-3xl mx-auto ${isVisible ? 'animate-fade-slide-up' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
            {t('hero_subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 justify-center mb-16 ${isVisible ? 'animate-fade-slide-up' : 'opacity-0'}`} style={{ animationDelay: '0.3s' }}>
            <Button variant="hero" size="lg" className="group text-lg px-8 py-6">
              {t('hero_cta_primary')}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-2">
              {t('hero_cta_secondary')}
            </Button>
          </div>

          {/* Stats */}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto ${isVisible ? 'animate-fade-slide-up' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-success mr-2" />
                <div className="text-4xl font-bold text-success">30-50%</div>
              </div>
              <div className="text-muted-foreground">{t('hero_stat_1')}</div>
            </div>
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50">
              <div className="text-4xl font-bold text-success mb-2">90%</div>
              <div className="text-muted-foreground">{t('hero_stat_2')}</div>
            </div>
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50">
              <div className="text-4xl font-bold text-success mb-2">500+</div>
              <div className="text-muted-foreground">{t('hero_stat_3')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
