"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TrendingUp, Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/providers/i18n-provider";
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const {
    t,
    lang,
    setLang
  } = useI18n();
  const navigate = useNavigate();
  const toggleLanguage = () => {
    setLang(lang === 'uk' ? 'en' : 'uk');
  };
  return <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-success p-2 rounded-lg shadow-glow">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <span data-testid="header_brand" className="inline-flex items-center px-3 py-1 rounded-md bg-success-light border border-success/20 text-success text-base font-semibold">
            {t('brand_name')}
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          
          
          
          <a href="/docs" className="text-muted-foreground hover:text-primary transition-colors">
            API Docs
          </a>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={toggleLanguage} className="relative">
            <Globe className="h-5 w-5" />
            <span className="sr-only">Toggle language</span>
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => navigate('/user-auth')}>
            {t('nav_login')}
          </Button>
          <Button variant="hero" size="sm" onClick={() => navigate('/user-register')}>
            {t('nav_get_started')}
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={toggleLanguage}>
            <Globe className="h-5 w-5" />
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && <div className="md:hidden border-t bg-background/95 backdrop-blur-lg p-4">
          <nav className="flex flex-col space-y-3">
            <a href="#features" className="text-foreground font-medium py-2">
              {t('nav_features')}
            </a>
            <a href="#how-it-works" className="text-muted-foreground py-2">
              {t('nav_how_it_works')}
            </a>
            <a href="#pricing" className="text-muted-foreground py-2">
              {t('nav_pricing')}
            </a>
            <a href="/docs" className="text-muted-foreground py-2">
              API Docs
            </a>
            <div className="pt-3 space-y-2">
              <Button variant="outline" className="w-full" onClick={() => {
            setIsMenuOpen(false);
            navigate('/user-auth');
          }}>
                {t('nav_login')}
              </Button>
              <Button variant="hero" className="w-full" onClick={() => {
            setIsMenuOpen(false);
            navigate('/user-register');
          }}>
                {t('nav_get_started')}
              </Button>
            </div>
          </nav>
        </div>}
    </header>;
}