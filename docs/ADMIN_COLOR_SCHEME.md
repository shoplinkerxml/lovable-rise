# Система цветовой схемы админ-панели / Admin Panel Color Scheme System

## Обзор / Overview

Все цвета админ-панели теперь управляются через CSS-переменные, что позволяет легко изменить всю цветовую схему в одном месте.

All admin panel colors are now managed through CSS variables, allowing you to easily change the entire color scheme in one place.

## Основные переменные / Main Variables

### Расположение / Location
Файл: `/src/index.css`

### Переменные для светлой темы / Light Mode Variables
```css
:root {
  /* Admin Layout Colors */
  --admin-page-bg: 151.8 81% 95.9%;      /* Фон страницы / Page background */
  --admin-sidebar-bg: 151.8 81% 95.9%;   /* Фон сайдбара / Sidebar background */
  --admin-header-bg: 0 0% 100%;          /* Фон хедера / Header background */
  --admin-content-bg: 0 0% 100%;         /* Фон контента / Content background */
}
```

### Переменные для темной темы / Dark Mode Variables
```css
.dark {
  /* Admin Layout Colors - Dark Mode */
  --admin-page-bg: 158 30% 8%;           /* Фон страницы / Page background */
  --admin-sidebar-bg: 158 30% 8%;        /* Фон сайдбара / Sidebar background */
  --admin-header-bg: 158 30% 12%;        /* Фон хедера / Header background */
  --admin-content-bg: 158 30% 12%;       /* Фон контента / Content background */
}
```

## Использование в компонентах / Usage in Components

### Tailwind классы / Tailwind Classes
Вместо встроенных стилей используйте эти классы:
Instead of inline styles, use these classes:

```tsx
// Фон страницы / Page background
className="bg-admin-page"

// Фон сайдбара / Sidebar background
className="bg-admin-sidebar"

// Фон хедера / Header background
className="bg-admin-header"

// Фон контента / Content background
className="bg-admin-content"
```

### Доступные через Tailwind / Available via Tailwind
Также доступны через цветовую палитру Tailwind:
Also available through Tailwind color palette:

```tsx
className="bg-admin-page-bg"
className="bg-admin-sidebar-bg"
className="bg-admin-header-bg"
className="bg-admin-content-bg"
```

## Как изменить цветовую схему / How to Change Color Scheme

### Шаг 1 / Step 1: Изменить переменные / Change Variables
Откройте `/src/index.css` и измените значения HSL в разделе `:root` и `.dark`:

Open `/src/index.css` and change the HSL values in the `:root` and `.dark` sections:

```css
:root {
  /* Пример: голубая схема / Example: blue scheme */
  --admin-page-bg: 210 80% 95%;
  --admin-sidebar-bg: 210 80% 95%;
  --admin-header-bg: 0 0% 100%;
  --admin-content-bg: 0 0% 100%;
}
```

### Шаг 2 / Step 2: Сохранить и проверить / Save and Test
Все компоненты автоматически обновятся.
All components will automatically update.

## Формат HSL / HSL Format

HSL означает: Hue (оттенок), Saturation (насыщенность), Lightness (яркость)
HSL stands for: Hue, Saturation, Lightness

- **Hue** (0-360): цветовой тон (0=красный, 120=зеленый, 240=синий)
- **Saturation** (0-100%): насыщенность цвета
- **Lightness** (0-100%): яркость (0=черный, 100=белый)

Примеры / Examples:
- `158 62% 30%` - темно-зеленый / dark green
- `151.8 81% 95.9%` - очень светло-зеленый / very light green
- `210 80% 95%` - очень светло-голубой / very light blue
- `0 0% 100%` - белый / white

## Измененные файлы / Modified Files

1. **`/src/index.css`**
   - Добавлены переменные `--admin-*`
   - Добавлены utility классы `.bg-admin-*`

2. **`/src/components/AdminLayout.tsx`**
   - Заменены inline styles на `bg-admin-*` классы
   - `style={{ backgroundColor: 'hsl(151.8, 81%, 95.9%)' }}` → `className="bg-admin-page"`

3. **`/src/components/AdminSidebar.tsx`**
   - Заменены inline styles на `bg-admin-sidebar`

4. **`/tailwind.config.ts`**
   - Добавлена цветовая палитра `admin.*` для Tailwind

## Преимущества / Benefits

✅ **Единая точка управления** / Single source of truth
✅ **Легко менять схему** / Easy to change scheme
✅ **Поддержка темной темы** / Dark mode support
✅ **Консистентность** / Consistency across components
✅ **Нет дублирования кода** / No code duplication
✅ **Типобезопасность** / Type-safe with Tailwind
