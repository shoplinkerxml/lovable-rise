---
trigger: manual
---
# ==========================
# QODER RULES CONFIGURATION
# ==========================
# Project: Marketplace SaaS
# Stack: React + TypeScript + Supabase + TailwindCSS + shadcn/ui
# Purpose: Управление тарифами, лимитами и доступом пользователя к функционалу

# ==========================
# QODER RULES CONFIGURATION
# ==========================

project:
  name: marketplace-saas
  description: Веб-платформа для продажи на маркетплейсах с системой тарифов и лимитов
  tech_stack:
    - React
    - TypeScript
    - Supabase
    - TailwindCSS
    - shadcn/ui

communication:
  default_language: ru
  developer_language: ru
  code_language: en
  behavior:
    - Всегда общайся с пользователем на русском языке
    - Объясняй логику и действия простыми словами
    - Имена файлов, функций и переменных — только на английском
    - Комментарии в коде допускаются на русском, если улучшают понимание
    - Всегда соблюдай чистую архитектуру и принцип разделения логики (services/hooks/ui)
    - Проверяй работу после внесения изменений

coding_guidelines:
  structure:
    - services: для бизнес-логики и работы с Supabase
    - context: для глобальных состояний (например, подписка)
    - hooks: для пользовательских хуков (например, проверка доступа)
    - components: только для UI
  formatting:
    - Используй Prettier/ESLint стиль
    - Импорты сортируй логически (внешние, внутренние, локальные)
    - В коде не используй console.log, только Supabase error handling
    - не пиши длиные обьяснения после выполнения задачи написал код и не нужно много описывать
  database:
    - Используй существующие таблицы: tariffs, tariff_limits, user_subscriptions
    - Не создавай новые без необходимости
    - Все foreign key и связи должны соблюдаться


# --------------------------
# GENERAL PRINCIPLES
# --------------------------
rules:
  - Следуй принципам SOLID, DRY и KISS
  - Используй только функциональные компоненты
  - Не используй any без необходимости
  - Обрабатывай ошибки в каждом асинхронном запросе (try/catch)
  - Не используй console.log в продакшене
  - Все имена файлов, переменных и функций — camelCase
  - Используй хуки для работы с Supabase
  - Не делай запросов к базе из UI-компонентов напрямую
  - Структура проекта должна оставаться чистой и предсказуемой
  - Приоритет — читаемость и масштабируемость

# --------------------------
# FILE STRUCTURE
# --------------------------
structure:
  src:
    - components: "Переиспользуемые UI-компоненты (Button, Modal, Input)"
    - pages: "Страницы с маршрутизацией"
    - layouts: "Макеты страниц"
    - hooks: "Пользовательские хуки (useAuth, useSubscription)"
    - lib: "Интеграции (Supabase client, helpers)"
    - context: "Глобальные контексты (AuthContext, SubscriptionContext)"
    - services: "Сервисный слой (tariffService, limitService)"
    - utils: "Вспомогательные функции"
    - types: "TypeScript типы"

# --------------------------
# SUPABASE INTEGRATION
# --------------------------
supabase:
  client: /src/lib/supabaseClient.ts
  best_practices:
    - Используй RLS (Row Level Security)
    - Храни приватные ключи только на сервере
    - Каждый запрос должен обрабатываться через сервисный слой
    - Включай обработку ошибок и возврат понятных сообщений
    - Оптимизируй количество запросов (fetch only what you need)

# --------------------------
# UI / UX RULES
# --------------------------
ui:
  library: shadcn/ui
  style: minimal, adaptive, clean
  responsive: true
  accessibility: required
  design:
    - Используй Tailwind для всех стилей
    - Избегай инлайновых CSS
    - Добавляй hover/active состояния для интерактивных элементов
    - Применяй Framer Motion для лёгких анимаций

# --------------------------
# STATE MANAGEMENT
# --------------------------
state:
  method: React Context + custom hooks
  notes:
    - Не храни бизнес-логику в UI
    - Используй Context только для глобальных состояний
    - Для сложных кейсов — Zustand

# --------------------------
# CODE STYLE
# --------------------------
style:
  prettier: true
  eslint: true
  typescript:
    strict_mode: true
    no_implicit_any: true
  import_order:
    - React / external libs
    - UI components
    - internal modules
    - styles

# --------------------------
# FEATURE: TARIFF SYSTEM
# --------------------------
features:
  tariffs_system:
    description: "User access and limits are defined by selected tariff plan."
    tables:
      - tariffs
      - tariff_limits
      - user_subscriptions
    services:
      - src/services/tariffService.ts
      - src/services/limitService.ts
    context:
      - src/context/SubscriptionContext.tsx
    ui_pages:
      - src/pages/PricingPage.tsx
    rules:
      - У каждого пользователя может быть только один активный тариф
      - Все лимиты определяются в таблице tariff_limits
      - Перед выполнением действия проверяй доступ через hasAccess()
      - При истечении срока тарифа перенаправляй на /pricing
      - UI-элементы с превышенным лимитом должны быть заблокированы или скрыты
    functions:
      - getActiveTariffs()
      - activateTariff(userId, tariffId)
      - getUserActiveTariff(userId)
      - checkTariffValidity(userId)
      - getTariffLimits(tariffId)
      - checkLimit(userId, limitName, currentValue)
      - hasAccess(limitName)

# --------------------------
# SECURITY
# --------------------------
security:
  - Никогда не сохраняй Supabase ключи на клиенте
  - Используй environment variables (.env)
  - Проверяй user_id в каждом запросе к Supabase
  - Все запросы должны иметь серверную проверку RLS

# --------------------------
# EXAMPLE: hasAccess hook pattern
# --------------------------
examples:
  useAccessExample: |
    import { useContext } from 'react'
    import { SubscriptionContext } from '@/context/SubscriptionContext'

    export const useAccess = (limitName: string) => {
      const { hasAccess } = useContext(SubscriptionContext)
      return hasAccess(limitName)
    }

# --------------------------
# END OF FILE
# --------------------------

