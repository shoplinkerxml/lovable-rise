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
  
  // Password Reset Page
  reset_password_title: { uk: "Скинути пароль", en: "Reset Your Password" },
  reset_password_desc: { uk: "Введіть новий пароль нижче", en: "Enter your new password below" },
  new_password: { uk: "Новий пароль", en: "New Password" },
  confirm_new_password: { uk: "Підтвердіть новий пароль", en: "Confirm New Password" },
  password_updated: { uk: "Пароль успішно оновлено", en: "Password updated successfully" },
  update_password_button: { uk: "Оновити пароль", en: "Update Password" },
  continue_to_login: { uk: "Перейти до входу", en: "Continue to Login" },
  request_new_reset: { uk: "Запросити нове посилання", en: "Request new reset link" },
  session_expired: { uk: "Сесія закінчилася", en: "Session expired" },
  session_invalid: { uk: "Недійсна сесія", en: "Invalid session" },
  validating_session: { uk: "Перевірка сесії...", en: "Validating session..." },
  security_features_title: { uk: "Безпечне скидання", en: "Secure Reset" },
  security_features_subtitle: { uk: "Безпека вашого акаунта - наш пріоритет", en: "Your account security is our priority" },
  feat_secure_reset: { uk: "Безпечний процес скидання паролю", en: "Secure password reset process" },
  feat_token_validation: { uk: "Валідація на основі токену", en: "Token-based validation" },
  feat_session_timeout: { uk: "Автоматичне закінчення сесії", en: "Automatic session timeout" },
  feat_password_requirements: { uk: "Вимоги до надійного паролю", en: "Strong password requirements" },
  
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
  registration_success: { uk: "Реєстрація успішна! Перенаправляємо на сторінку входу...", en: "Registration successful! Redirecting to login page..." },
  login_success: { uk: "Успішний вхід!", en: "Login successful!" },
  registration_failed: { uk: "Помилка реєстрації. Спробуйте ще раз", en: "Registration failed. Please try again" },
  login_failed: { uk: "Помилка входу. Перевірте ваші дані.", en: "Login failed. Please check your credentials." },
  invalid_credentials: { uk: "Неправильний email або пароль", en: "Invalid email or password" },
  email_exists: { uk: "Користувач з таким email вже зареєстрований. Спробуйте увійти.", en: "User with this email is already registered. Try signing in." },
  weak_password: { uk: "Пароль занадто слабкий", en: "Password is too weak" },
  network_error: { uk: "Помилка мережі. Спробуйте пізніше.", en: "Network error. Please try again later." },
  
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
  accept_terms: { uk: "Я погоджуюся з Умовами користування та Політикою конфіденційності", en: "I agree to the Terms of Service and Privacy Policy" },
  terms_required: { uk: "Необхідно прийняти умови", en: "You must accept the terms" },
  
  // Email continuation text
  continue_with_email: { uk: "або продовжити з email", en: "or continue with email" },
  continue_with_signin: { uk: "або увійдіть за допомогою", en: "or sign in with" },
  
  // Enhanced error messages for registration
  profile_creation_failed: { uk: "Не вдалося створити профіль", en: "Failed to create profile" },
  email_confirmation_required: { uk: "Підтвердження email обов'язкове", en: "Email confirmation required" },
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


