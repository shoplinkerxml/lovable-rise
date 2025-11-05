"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import spreadsheetMockup from "@/assets/spreadsheet-mockup.jpg";
import { useState, useEffect } from "react";
import { useI18n } from "@/providers/i18n-provider";

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useI18n();
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background">
      {/* Gradient glow effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className={`space-y-8 ${isVisible ? 'animate-fade-slide-up' : 'opacity-0'}`}>
            {/* Badge */}
            <div className="inline-block">
              <div className="px-4 py-2 rounded-md bg-primary/10 border border-primary/20">
                <span className="text-sm font-medium text-primary uppercase tracking-wider">
                  {t('hero_badge')}
                </span>
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
              {t('hero_title_1')}{" "}
              <span className="text-primary">
                {t('hero_title_accent')}
              </span>{" "}
              {t('hero_title_2')}
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              {t('hero_subtitle')}
            </p>

            {/* CTA Button */}
            <div>
              <Button 
                variant="hero" 
                size="lg" 
                className="text-lg px-8 py-7 rounded-lg group"
              >
                {t('hero_cta_primary')}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Right: Mockup Image */}
          <div className={`relative ${isVisible ? 'animate-fade-slide-up' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              {/* Glow effect behind image */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/10 rounded-2xl blur-3xl" />
              
              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-2xl">
                <img 
                  src={spreadsheetMockup} 
                  alt="Business data spreadsheet mockup" 
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
