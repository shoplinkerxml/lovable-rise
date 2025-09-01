"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { TrendingUp, Menu } from "lucide-react"
import { useState } from "react"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="bg-gradient-success p-2 rounded-lg">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">MarketGrow</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <a href="/" className="text-foreground hover:text-primary transition-colors">
            Главная
          </a>
          <a href="#how-it-works" className="text-muted-foreground hover:text-primary transition-colors">
            Как работает
          </a>
          <a href="#services" className="text-muted-foreground hover:text-primary transition-colors">
            Услуги
          </a>
          <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">
            Контакты
          </a>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm">
            Войти
          </Button>
          <Button variant="hero" size="sm">
            Начать бесплатно
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center space-x-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background p-4">
          <nav className="flex flex-col space-y-3">
            <a href="/" className="text-foreground font-medium">
              Главная
            </a>
            <a href="#how-it-works" className="text-muted-foreground">
              Как работает
            </a>
            <a href="#services" className="text-muted-foreground">
              Услуги
            </a>
            <a href="#contact" className="text-muted-foreground">
              Контакты
            </a>
            <div className="pt-3 space-y-2">
              <Button variant="outline" className="w-full">
                Войти
              </Button>
              <Button variant="hero" className="w-full">
                Начать бесплатно
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}