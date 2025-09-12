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
  
  // User Management
  users_title: { uk: "Користувачі", en: "Users" },
  users_subtitle: { uk: "Управління системними користувачами та їх дозволами", en: "Manage system users and their permissions" },
  add_user: { uk: "Додати користувача", en: "Add User" },
  edit_user: { uk: "Редагувати користувача", en: "Edit User" },
  delete_user: { uk: "Видалити користувача", en: "Delete User" },
  export_users: { uk: "Експорт", en: "Export" },
  
  // User Table
  table_customer: { uk: "Клієнт", en: "Customer" },
  table_status: { uk: "Статус", en: "Status" },
  table_email: { uk: "Електронна пошта", en: "Email Address" },
  table_phone: { uk: "Телефон", en: "Phone" },
  table_created: { uk: "Створено", en: "Created" },
  table_actions: { uk: "Дії", en: "Actions" },
  
  // User Status
  status_active: { uk: "Активний", en: "Active" },
  status_inactive: { uk: "Неактивний", en: "Inactive" },
  activate_user: { uk: "Активувати користувача", en: "Activate User" },
  deactivate_user: { uk: "Деактивувати користувача", en: "Deactivate User" },
  
  // User Actions
  edit_action: { uk: "Редагувати", en: "Edit User" },
  delete_action: { uk: "Видалити", en: "Delete User" },
  send_email: { uk: "Надіслати email", en: "Send Email" },
  call_user: { uk: "Зателефонувати", en: "Call User" },
  
  // User Forms
  form_full_name: { uk: "Повне ім'я", en: "Full Name" },
  form_email_address: { uk: "Електронна пошта", en: "Email Address" },
  form_password: { uk: "Пароль", en: "Password" },
  form_phone_number: { uk: "Номер телефону (необов'язково)", en: "Phone Number (Optional)" },
  form_notify_email: { uk: "Надіслати облікові дані на пошту", en: "Send credentials by email" },
  
  // Form Placeholders
  placeholder_full_name: { uk: "Введіть повне ім'я користувача", en: "Enter user's full name" },
  placeholder_email: { uk: "user@example.com", en: "user@example.com" },
  placeholder_password: { uk: "Мінімум 8 символів", en: "Minimum 8 characters" },
  placeholder_phone: { uk: "+38 (050) 123-45-67", en: "+1 (555) 123-4567" },
  
  // Form Descriptions
  desc_password: { uk: "Пароль має бути не менше 8 символів", en: "Password must be at least 8 characters long" },
  desc_email_notify: { uk: "Користувач отримає облікові дані на електронну пошту", en: "User will receive login credentials via email" },
  desc_email_readonly: { uk: "Електронну пошту неможливо змінити", en: "Email address cannot be changed" },
  
  // Dialog Messages
  create_user_title: { uk: "Додати нового користувача", en: "Add New User" },
  create_user_desc: { uk: "Створити новий обліковий запис користувача. Користувач отримає облікові дані на електронну пошту.", en: "Create a new user account. The user will receive login credentials via email." },
  edit_user_title: { uk: "Редагувати користувача", en: "Edit User" },
  edit_user_desc: { uk: "Оновити інформацію користувача. Електронну пошту неможливо змінити.", en: "Update user information. Email address cannot be changed." },
  delete_user_title: { uk: "Видалити обліковий запис користувача", en: "Delete User Account" },
  delete_user_desc: { uk: "Цю дію неможливо скасувати.", en: "This action cannot be undone." },
  
  // Status Change Confirmations
  confirm_activate: { uk: "Ви впевнені, що хочете активувати цього користувача? Він отримає доступ до системи.", en: "Are you sure you want to activate this user? They will regain access to the system." },
  confirm_deactivate: { uk: "Ви впевнені, що хочете деактивувати цього користувача? Він втратить доступ до системи.", en: "Are you sure you want to deactivate this user? They will lose access to the system." },
  
  // Delete Consequences
  delete_consequences_title: { uk: "Що станеться при видаленні користувача:", en: "What happens when you delete this user:" },
  delete_consequence_1: { uk: "• Обліковий запис користувача буде назавжди деактивований", en: "• User account will be permanently deactivated" },
  delete_consequence_2: { uk: "• Користувач негайно втратить доступ до системи", en: "• User will lose access to the system immediately" },
  delete_consequence_3: { uk: "• Дані користувача будуть позначені як видалені, але збережені для аудиту", en: "• User data will be marked as deleted but retained for audit purposes" },
  delete_consequence_4: { uk: "• Цю дію неможливо скасувати", en: "• This action cannot be undone" },
  
  // Filters and Search
  filters_title: { uk: "Фільтри", en: "Filters" },
  search_placeholder: { uk: "Пошук користувачів за ім'ям або email...", en: "Search users by name or email..." },
  filter_all_status: { uk: "Всі статуси", en: "All Status" },
  filter_all_roles: { uk: "Всі ролі", en: "All Roles" },
  role_user: { uk: "Користувач", en: "User" },
  role_admin: { uk: "Адміністратор", en: "Admin" },
  role_manager: { uk: "Менеджер", en: "Manager" },
  sort_newest_first: { uk: "Спочатку нові", en: "Newest First" },
  sort_oldest_first: { uk: "Спочатку старі", en: "Oldest First" },
  sort_name_az: { uk: "Ім'я А-Я", en: "Name A-Z" },
  sort_name_za: { uk: "Ім'я Я-А", en: "Name Z-A" },
  sort_email_az: { uk: "Email А-Я", en: "Email A-Z" },
  sort_email_za: { uk: "Email Я-А", en: "Email Z-A" },
  refresh: { uk: "Оновити", en: "Refresh" },
  
  // Pagination
  showing_users: { uk: "Показано з", en: "Showing" },
  to: { uk: "до", en: "to" },
  of: { uk: "з", en: "of" },
  users_total: { uk: "користувачів", en: "users" },
  previous: { uk: "Попередня", en: "Previous" },
  next: { uk: "Наступна", en: "Next" },
  
  // Empty States
  no_users_found: { uk: "Користувачів не знайдено", en: "No users found" },
  
  // Buttons
  btn_cancel: { uk: "Скасувати", en: "Cancel" },
  btn_create: { uk: "Створити користувача", en: "Create User" },
  btn_update: { uk: "Оновити користувача", en: "Update User" },
  btn_delete: { uk: "Видалити користувача", en: "Delete User" },
  btn_activate: { uk: "Активувати", en: "Activate" },
  btn_deactivate: { uk: "Деактивувати", en: "Deactivate" },
  
  // Loading States
  loading_creating: { uk: "Створення...", en: "Creating..." },
  loading_updating: { uk: "Оновлення...", en: "Updating..." },
  loading_deleting: { uk: "Видалення...", en: "Deleting..." },
  
  // Success Messages
  success_user_created: { uk: "Користувача успішно створено", en: "User created successfully" },
  success_user_updated: { uk: "Користувача успішно оновлено", en: "User updated successfully" },
  success_user_deleted: { uk: "Користувача успішно видалено", en: "User deleted successfully" },
  success_user_activated: { uk: "Користувача успішно активовано", en: "User activated successfully" },
  success_user_deactivated: { uk: "Користувача успішно деактивовано", en: "User deactivated successfully" },
  
  // Error Messages
  error_create_user: { uk: "Не вдалося створити користувача", en: "Failed to create user" },
  error_update_user: { uk: "Не вдалося оновити користувача", en: "Failed to update user" },
  error_delete_user: { uk: "Не вдалося видалити користувача", en: "Failed to delete user" },
  error_fetch_users: { uk: "Не вдалося завантажити користувачів", en: "Failed to fetch users" },
  error_update_status: { uk: "Не вдалося оновити статус користувача", en: "Failed to update user status" },
  error_try_again: { uk: "Будь ласка, спробуйте ще раз", en: "Please try again later" },
  
  // Breadcrumb Navigation
  breadcrumb_home: { uk: "Головна", en: "Home" },
  breadcrumb_dashboard: { uk: "Панель управління", en: "Dashboard" },
  breadcrumb_users: { uk: "Користувачі", en: "Users" },
  breadcrumb_forms: { uk: "Форми", en: "Forms" },
  breadcrumb_settings: { uk: "Налаштування", en: "Settings" },
  breadcrumb_personal: { uk: "Особистий кабінет", en: "Personal" },
  breadcrumb_profile: { uk: "Профіль", en: "Profile" },
  breadcrumb_elements: { uk: "Елементи", en: "Elements" },
  breadcrumb_layouts: { uk: "Макети", en: "Layouts" },
  breadcrumb_horizontal: { uk: "Горизонтальні", en: "Horizontal" },
  breadcrumb_vertical: { uk: "Вертикальні", en: "Vertical" },
  breadcrumb_custom: { uk: "Користувацькі", en: "Custom" },
  breadcrumb_validation: { uk: "Валідація", en: "Validation" },
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

// Helper hook for user management translations
export const useUserTranslations = () => {
  const { t, lang } = useI18n();
  
  return {
    t: (key: keyof typeof dictionary) => t(key),
    lang,
    // Predefined common translations for user management
    common: {
      users: t("users_title"),
      addUser: t("add_user"),
      editUser: t("edit_user"),
      deleteUser: t("delete_user"),
      active: t("status_active"),
      inactive: t("status_inactive"),
      cancel: t("btn_cancel"),
      save: t("btn_update"),
      create: t("btn_create"),
      delete: t("btn_delete"),
    },
  };
};


