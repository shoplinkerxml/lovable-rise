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
  
  // User Registration & Authentication
  register_title: { uk: "Реєстрація в MarketGrow", en: "Sign up to MarketGrow" },
  register_desc: { uk: "Створіть акаунт для доступу до платформи", en: "Create account to access the platform" },
  register_button: { uk: "Зареєструватися", en: "Sign up" },
  full_name: { uk: "Повне ім'я", en: "Full name" },
  confirm_password: { uk: "Підтвердіть пароль", en: "Confirm password" },
  
  // Login for Users
  login_title_user: { uk: "Вхід в MarketGrow", en: "Sign in to MarketGrow" },
  login_desc_user: { uk: "Доступ до вашого особистого кабінету", en: "Access your personal dashboard" },
  login_button_user: { uk: "Увійти", en: "Sign in" },
  
  // Password Reset
  reset_title: { uk: "Відновлення паролю", en: "Reset password" },
  reset_desc: { uk: "Введіть email для відновлення доступу", en: "Enter email to reset access" },
  reset_button: { uk: "Відправити", en: "Send reset link" },
  reset_success: { uk: "Лист надіслано на пошту", en: "Email sent successfully" },
  reset_email_placeholder: { uk: "Ваш email", en: "Your email" },
  
  // Social Auth (disabled)
  google_signup: { uk: "Google", en: "Google" },
  facebook_signup: { uk: "Facebook", en: "Facebook" },
  google_signin: { uk: "Google", en: "Google" },
  facebook_signin: { uk: "Увійти через Facebook", en: "Sign in with Facebook" },
  social_disabled: { uk: "Незабаром", en: "Coming soon" },
  
  // Updated separator text
  or_sign_in_with: { uk: "або увійдіть за допомогою", en: "or sign in with" },
  
  // Navigation & Tabs
  tab_register: { uk: "Реєстрація", en: "Register" },
  tab_login: { uk: "Увійти", en: "Login" },
  tab_reset: { uk: "Відновлення", en: "Reset" },
  already_account: { uk: "Вже є акаунт?", en: "Already have account?" },
  no_account_user: { uk: "Немає акаунта?", en: "No account?" },
  forgot_password: { uk: "Забули пароль?", en: "Forgot password?" },
  back_to_login: { uk: "Повернутися до входу", en: "Back to login" },
  
  // Form Validation Messages
  name_required: { uk: "Ім'я обов'язкове", en: "Name is required" },
  name_min_length: { uk: "Ім'я має бути не менше 2 символів", en: "Name must be at least 2 characters" },
  email_invalid: { uk: "Невірний email", en: "Invalid email" },
  email_required: { uk: "Email обов'язковий", en: "Email is required" },
  password_required: { uk: "Пароль обов'язковий", en: "Password is required" },
  password_min: { uk: "Мінімум 8 символів", en: "Minimum 8 characters" },
  passwords_match: { uk: "Паролі не співпадають", en: "Passwords don't match" },
  confirm_password_required: { uk: "Підтвердження паролю обов'язкове", en: "Password confirmation is required" },
  
  // Authentication Messages
  registration_success: { uk: "Реєстрація успішна!", en: "Registration successful!" },
  login_success: { uk: "Успішний вхід!", en: "Login successful!" },
  registration_failed: { uk: "Помилка реєстрації. Спробуйте ще раз", en: "Registration failed. Please try again" },
  login_failed: { uk: "Помилка входу. Перевірте дані", en: "Login failed. Check your credentials" },
  invalid_credentials: { uk: "Невірний email або пароль", en: "Invalid email or password" },
  email_exists: { uk: "Користувач з таким email вже існує", en: "User with this email already exists" },
  weak_password: { uk: "Пароль занадто слабкий", en: "Password is too weak" },
  network_error: { uk: "Помилка мережі. Спробуйте пізніше", en: "Network error. Please try again later" },
  
  // User Dashboard
  user_dashboard_title: { uk: "Особистий кабінет", en: "Personal Dashboard" },
  user_dashboard_welcome: { uk: "Ласкаво просимо", en: "Welcome" },
  user_profile_title: { uk: "Мій профіль", en: "My Profile" },
  user_settings: { uk: "Налаштування", en: "Settings" },
  
  // Form placeholders
  name_placeholder: { uk: "Введіть ваше ім'я", en: "Enter your name" },
  email_placeholder: { uk: "example@email.com", en: "example@email.com" },
  password_placeholder: { uk: "••••••••", en: "••••••••" },
  
  // Terms and conditions
  accept_terms: { uk: "Я погоджуюся з умовами політики конфіденційності", en: "I agree to the terms of use and privacy policy" },
  terms_required: { uk: "Необхідно прийняти умови", en: "You must accept the terms" },
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


