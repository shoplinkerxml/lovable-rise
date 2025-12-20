"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import spreadsheetMockup from "@/assets/spreadsheet-mockup.jpg";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";
export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeBulletIndex, setActiveBulletIndex] = useState(0);
  const [isBulletsHovered, setIsBulletsHovered] = useState(false);
  const {
    t
  } = useI18n();
  const navigate = useNavigate();
  useEffect(() => {
    setIsVisible(true);
  }, []);
  const bullets = [{
    key: "hero_bullet_1"
  }, {
    key: "hero_bullet_2"
  }, {
    key: "hero_bullet_3"
  }];
  useEffect(() => {
    if (isBulletsHovered) return;
    const id = window.setInterval(() => {
      setActiveBulletIndex(prev => (prev + 1) % bullets.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [isBulletsHovered, bullets.length]);
  return <section className="relative flex items-center overflow-hidden bg-background min-h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-3xl animate-blob-slow" />
        <div className="absolute top-1/3 -right-32 h-[30rem] w-[30rem] rounded-full bg-gradient-to-br from-success/25 via-primary/10 to-transparent blur-3xl animate-blob-slower" />
        <div className="absolute -bottom-40 left-1/3 h-[34rem] w-[34rem] rounded-full bg-gradient-to-br from-primary/20 via-success/10 to-transparent blur-3xl animate-blob-slowest" />
        <div className="absolute inset-0 opacity-[0.35] dark:opacity-[0.22] bg-[radial-gradient(closest-side_at_50%_50%,hsl(var(--primary)/0.14),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.08] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_70%)]" />
      </div>

      <div className="container relative z-10">
        <div className={`mx-auto flex max-w-5xl flex-col items-center py-10 text-center md:py-14 ${isVisible ? 'animate-fade-slide-up' : 'opacity-0'}`}>
          <div className="inline-block">
            <div className="px-4 py-2 rounded-md bg-background/40 border border-primary/25 backdrop-blur-md shadow-[0_0_0_1px_hsl(var(--border))_inset]">
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {t('hero_badge')}
              </span>
            </div>
          </div>

          <h1 className="mt-7 text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
            {t('hero_title_1')}{" "}
            <span className="relative text-primary">
              {t('hero_title_accent')}
              <span className="pointer-events-none absolute -bottom-2 left-0 h-[10px] w-full bg-primary/15 blur-xl" />
            </span>{" "}
            {t('hero_title_2')}
          </h1>

          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl md:text-xl">
            {t('hero_subtitle')}
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Button variant="hero" size="lg" className="text-lg px-8 py-7 rounded-lg group" onClick={() => navigate('/user-register')}>
              {t('hero_cta_primary')}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <div onMouseEnter={() => setIsBulletsHovered(true)} onMouseLeave={() => setIsBulletsHovered(false)} className="relative mt-8 flex flex-wrap items-center justify-center gap-2">
            <div className="pointer-events-none absolute -inset-x-10 -inset-y-4 bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-2xl opacity-60 motion-reduce:hidden" />
            {bullets.map((b, idx) => {
            const isActive = idx === activeBulletIndex;
            return <button key={b.key} type="button" onClick={() => setActiveBulletIndex(idx)} className={`relative inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm backdrop-blur-md transition-all ${isActive ? 'border-primary/30 bg-primary/10 text-foreground shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)]' : 'border-border/60 bg-background/30 text-muted-foreground hover:bg-background/45 hover:text-foreground hover:border-primary/20'}`}>
                  <span className="relative flex h-2 w-2 items-center justify-center">
                    <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                    {isActive ? <span className="absolute inset-0 rounded-full bg-primary/40 motion-reduce:hidden animate-ping" /> : null}
                  </span>
                  <span>{t(b.key)}</span>
                </button>;
          })}
          </div>

          <div className={`relative mt-10 w-full ${isVisible ? 'animate-fade-slide-up' : 'opacity-0'}`} style={{
          animationDelay: '0.2s'
        }}>
            <div className="relative group">
              <div className="absolute -inset-8 rounded-[2.25rem] bg-gradient-to-r from-primary/35 via-success/15 to-primary/15 blur-3xl opacity-80 group-hover:opacity-100 transition-opacity motion-reduce:hidden" />
              <div className="relative rounded-[1.75rem] overflow-hidden border border-primary/20 shadow-[0_24px_90px_-32px_rgba(0,0,0,0.45)] bg-background/40 backdrop-blur-md">
                <div className="pointer-events-none absolute -inset-px rounded-[1.75rem] bg-gradient-to-b from-white/20 via-transparent to-black/10 opacity-80" />
                <div className="relative [transform-style:preserve-3d] transition-transform duration-700 ease-out will-change-transform [transform:perspective(1200px)_rotateX(0deg)_rotateY(0deg)_translateY(0px)] group-hover:[transform:perspective(1200px)_rotateX(7deg)_rotateY(-10deg)_translateY(-6px)]">
                  <img src={spreadsheetMockup} alt={t("hero_mockup_alt")} className="w-full h-auto" />
                </div>
                <div className="pointer-events-none absolute -left-1/3 top-0 h-full w-2/3 rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shimmer-slow motion-reduce:hidden" />
              </div>

              <div className="pointer-events-none absolute left-6 top-6 hidden md:block">
                <div className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm bg-background/40 backdrop-blur-md shadow-[0_18px_50px_-30px_rgba(0,0,0,0.55)] transition-all motion-reduce:animate-none animate-float-slow ${activeBulletIndex === 0 ? 'border-primary/30 text-foreground' : 'border-border/60 text-muted-foreground'}`} style={{
              animationDelay: '0.15s'
            }} onMouseEnter={() => setActiveBulletIndex(0)}>
                  <span className={`h-2 w-2 rounded-full ${activeBulletIndex === 0 ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                  <span>{t("hero_bullet_1")}</span>
                </div>
              </div>
              <div className="pointer-events-none absolute right-6 top-14 hidden md:block">
                <div className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm bg-background/40 backdrop-blur-md shadow-[0_18px_50px_-30px_rgba(0,0,0,0.55)] transition-all motion-reduce:animate-none animate-float-slower ${activeBulletIndex === 1 ? 'border-primary/30 text-foreground' : 'border-border/60 text-muted-foreground'}`} style={{
              animationDelay: '0.45s'
            }} onMouseEnter={() => setActiveBulletIndex(1)}>
                  <span className={`h-2 w-2 rounded-full ${activeBulletIndex === 1 ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                  <span>{t("hero_bullet_2")}</span>
                </div>
              </div>
              <div className="pointer-events-none absolute left-10 bottom-8 hidden md:block">
                <div className={`pointer-events-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm bg-background/40 backdrop-blur-md shadow-[0_18px_50px_-30px_rgba(0,0,0,0.55)] transition-all motion-reduce:animate-none animate-float-slow ${activeBulletIndex === 2 ? 'border-primary/30 text-foreground' : 'border-border/60 text-muted-foreground'}`} style={{
              animationDelay: '0.75s'
            }} onMouseEnter={() => setActiveBulletIndex(2)}>
                  <span className={`h-2 w-2 rounded-full ${activeBulletIndex === 2 ? 'bg-primary' : 'bg-muted-foreground/50'}`} />
                  <span>{t("hero_bullet_3")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
}
