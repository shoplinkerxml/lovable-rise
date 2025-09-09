import { createContext, useContext, useMemo, useState, ReactNode } from "react";

type Lang = "uk" | "en";

type Dictionary = Record<string, Record<Lang, string>>;

const dictionary: Dictionary = {
  login_title: { uk: "Вхід до MarketGrow", en: "Sign in to MarketGrow" },
  login_desc: { uk: "Доступ до адмін‑панелі керування даними", en: "Access the data admin panel" },
  email: { uk: "Ел. пошта", en: "Email" },
  password: { uk: "Пароль", en: "Password" },
  sign_in: { uk: "Увійти", en: "Sign in" },
  no_account: { uk: "Немає акаунта?", en: "No account?" },
  sign_up: { uk: "Зареєструватись", en: "Sign up" },
  sidebar_dashboard: { uk: "Панель", en: "Dashboard" },
  sidebar_forms: { uk: "Форми", en: "Forms" },
  search: { uk: "Пошук", en: "Search" },
  logout: { uk: "Вийти", en: "Logout" },
  user_profile: { uk: "Профіль користувача", en: "User Profile" },
  menu_profile: { uk: "Мій профіль", en: "My Profile" },
  menu_profile_desc: { uk: "Налаштування облікового запису", en: "Account settings" },
  hero_badge: { uk: "Збільшуємо прибуток на 30–50%", en: "Increase profit by 30–50%" },
  hero_title: { uk: "Допомагаємо бізнесу на маркетплейсах", en: "We help businesses on marketplaces" },
  hero_desc: {
    uk: "Перетворюємо складні прайси постачальників на акуратний каталог. Автоматизуємо обробку Excel/CSV/XML, пришвидшуємо запуск карток і підвищуємо продажі завдяки якісним даним.",
    en: "We turn complex supplier price lists into a clean catalog. We automate Excel/CSV/XML processing, speed up product launches, and increase sales with high‑quality data."
  },
  features_title: { uk: "Що всередині", en: "What’s inside" },
  features_subtitle: { uk: "Ключові можливості платформи", en: "Key platform capabilities" },
  feat_integrations: { uk: "Інтеграції з постачальниками", en: "Supplier integrations" },
  feat_convert: { uk: "Конвертація Excel/CSV/XML", en: "Excel/CSV/XML conversion" },
  feat_mapping: { uk: "Автозіставлення категорій", en: "Automatic category mapping" },
  feat_enrichment: { uk: "Збагачення та чистка даних", en: "Data enrichment and cleaning" },
  feat_export: { uk: "Експорт на маркетплейси", en: "Export to marketplaces" },
  feat_analytics: { uk: "Єдина аналітика", en: "Unified analytics" },
  
  // New translations for menu items
  menu_forms: { uk: "Форми", en: "Forms" },
  menu_settings: { uk: "Налаштування", en: "Settings" },
  menu_users: { uk: "Користувачі", en: "Users" },
  menu_dashboard: { uk: "Панель управління", en: "Dashboard" },
  menu_analytics: { uk: "Аналітика", en: "Analytics" },
  menu_reports: { uk: "Звіти", en: "Reports" },
  menu_content: { uk: "Контент", en: "Content" },
  menu_categories: { uk: "Категорії", en: "Categories" },
  menu_products: { uk: "Товари", en: "Products" },
  menu_main: { uk: "Головна", en: "Main" },
  auth_logout: { uk: "Вийти", en: "Logout" },
};

type I18nContextType = {
  lang: Lang;
  t: (key: keyof typeof dictionary) => string;
  setLang: (l: Lang) => void;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>("uk");
  const t = (key: keyof typeof dictionary) => dictionary[key][lang];
  const value = useMemo(() => ({ lang, t, setLang }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};


