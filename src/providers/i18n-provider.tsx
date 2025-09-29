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
  // Additional menu translations
  menu_pricing: { uk: "Тарифні плани", en: "Pricing Plans" },
  menu_currency: { uk: "Валюта", en: "Currency" },
  menu_payment: { uk: "Платіжні системи", en: "Payment Systems" },
  
  // Page descriptions
  tariff_plans_description: { uk: "Управління тарифними планами користувачів", en: "Manage user tariff plans" },
  payment_systems_description: { uk: "Управління платіжними системами", en: "Payment systems management" },
  
  // Pricing Section translations
  pricing_title: { uk: "Тарифи для будь-якого масштабу бізнесу", en: "Pricing for any business scale" },
  pricing_subtitle: { uk: "Оберіть план, який допоможе вашому бізнесу заробляти більше вже сьогодні", en: "Choose a plan that will help your business earn more today" },
  pricing_period: { uk: "/місяць", en: "/month" },
  pricing_desc_beginner: { uk: "Для початківців", en: "For beginners" },
  pricing_desc_growing: { uk: "Для ростучого бізнесу", en: "For growing business" },
  pricing_desc_enterprise: { uk: "Для великого бізнесу", en: "For large business" },
  pricing_feature_1000_products: { uk: "До 1,000 товарів на місяць", en: "Up to 1,000 products per month" },
  pricing_feature_3_marketplaces: { uk: "3 маркетплейси", en: "3 marketplaces" },
  pricing_feature_basic_automation: { uk: "Базова автоматизація", en: "Basic automation" },
  pricing_feature_email_support: { uk: "Email підтримка", en: "Email support" },
  pricing_feature_training: { uk: "Навчальні матеріали", en: "Training materials" },
  pricing_feature_10000_products: { uk: "До 10,000 товарів на місяць", en: "Up to 10,000 products per month" },
  pricing_feature_all_marketplaces: { uk: "Всі маркетплейси", en: "All marketplaces" },
  pricing_feature_full_automation: { uk: "Повна автоматизація", en: "Full automation" },
  pricing_feature_priority_support: { uk: "Пріоритетна підтримка", en: "Priority support" },
  pricing_feature_analytics: { uk: "Аналітика та звіти", en: "Analytics and reports" },
  pricing_feature_api: { uk: "API інтеграція", en: "API integration" },
  pricing_feature_manager: { uk: "Персональний менеджер", en: "Personal manager" },
  pricing_feature_unlimited_products: { uk: "Необмежена кількість товарів", en: "Unlimited number of products" },
  pricing_feature_all_features: { uk: "Всі можливості системи", en: "All system features" },
  pricing_feature_custom_integrations: { uk: "Кастомні інтеграції", en: "Custom integrations" },
  pricing_feature_247_support: { uk: "24/7 підтримка", en: "24/7 support" },
  pricing_feature_individual_solutions: { uk: "Індивідуальні рішення", en: "Individual solutions" },
  pricing_feature_team_training: { uk: "Навчання команди", en: "Team training" },
  pricing_feature_sla: { uk: "SLA гарантії", en: "SLA guarantees" },
  pricing_popular: { uk: "Популярний", en: "Popular" },
  pricing_start_earning: { uk: "Почати заробляти", en: "Start earning" },
  pricing_choose_plan: { uk: "Обрати план", en: "Choose plan" },
  pricing_guarantee_title: { uk: "Гарантия результата", en: "Result guarantee" },
  pricing_guarantee_text: { uk: "Якщо протягом першого місяця ви не побачите зростання продажів — повернемо гроші", en: "If within the first month you don't see sales growth - we'll refund your money" },
  pricing_free_trial: { uk: "Безкоштовний пробний період 14 днів", en: "Free trial period 14 days" },
  pricing_refund: { uk: "Повернення коштів протягом 30 днів", en: "Refund within 30 days" },
  pricing_no_hidden: { uk: "Ніяких прихованих платежів", en: "No hidden payments" },
  
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
  tab_login: { uk: "Увйти", en: "Login" },
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
  breadcrumb_elements: { uk: "Елементи", en: "Elements" },
  breadcrumb_layouts: { uk: "Макети", en: "Layouts" },
  breadcrumb_horizontal: { uk: "Горизонтальні", en: "Horizontal" },
  breadcrumb_vertical: { uk: "Вертикальні", en: "Vertical" },
  breadcrumb_custom: { uk: "Користувацькі", en: "Custom" },
  breadcrumb_validation: { uk: "Валідація", en: "Validation" },
  
  // Form Page descriptions
  form_elements_description: { uk: "Додавайте сюди поля вводу, випадаючі списки, перемикачі тощо.", en: "Add inputs, selects, switches, etc. here." },
  form_layouts_description: { uk: "Приклади горизонтальних/вертикальних/двоколонкових макетів форм.", en: "Horizontal/Vertical/Two-column layouts examples." },
  form_horizontal_description: { uk: "Створюйте тут горизонтальні форми.", en: "Build horizontal forms here." },
  form_vertical_description: { uk: "Створюйте тут вертикальні форми.", en: "Build vertical forms here." },
  form_custom_description: { uk: "Ваші користувацькі форми тут.", en: "Your custom forms live here." },
  form_validation_description: { uk: "Демонстрації валідації та допоміжні засоби.", en: "Validation demos and helpers." },
  
  // User Menu Content
  failed_load_menu_item: { uk: "Не вдалося завантажити пункт меню", en: "Failed to load menu item" },
  menu_item_not_found: { uk: "Пункт меню не знайдено", en: "Menu item not found" },
  edit_functionality_coming_soon: { uk: "Функціонал редагування незабаром", en: "Edit functionality coming soon" },
  menu_item_duplicated: { uk: "Пункт меню продубльовано", en: "Menu item duplicated" },
  failed_duplicate_menu_item: { uk: "Не вдалося продублювати пункт меню", en: "Failed to duplicate menu item" },
  menu_item_deleted: { uk: "Пункт меню видалено", en: "Menu item deleted" },
  failed_delete_menu_item: { uk: "Не вдалося видалити пункт меню", en: "Failed to delete menu item" },
  error: { uk: "Помилка", en: "Error" },
  no_description: { uk: "Немає опису", en: "No description" },
  content: { uk: "Вміст", en: "Content" },
  no_content_available: { uk: "Немає доступного вмісту", en: "No content available" },
  form_page_placeholder: { uk: "Це заповнювач для сторінки форми", en: "This is a placeholder for form page" },
  list_page_placeholder: { uk: "Це заповнювач для сторінки списку", en: "This is a placeholder for list page" },
  dashboard_page_placeholder: { uk: "Це заповнювач для сторінки панелі", en: "This is a placeholder for dashboard page" },
  custom_page_placeholder: { uk: "Це заповнювач для користувацької сторінки", en: "This is a placeholder for custom page" },
  edit: { uk: "Редагувати", en: "Edit" },
  duplicate: { uk: "Дублювати", en: "Duplicate" },
  delete: { uk: "Видалити", en: "Delete" },
  // Menu Management
  menu_management: { uk: "Управління меню", en: "Menu Management" },
  add_menu_item: { uk: "Додати пункт меню", en: "Add Menu Item" },
  cancel: { uk: "Скасувати", en: "Cancel" },
  add_new_menu_item: { uk: "Додати новий пункт меню", en: "Add New Menu Item" },
  title: { uk: "Назва", en: "Title" },
  enter_menu_item_title: { uk: "Введіть назву пункту меню", en: "Enter menu item title" },
  path: { uk: "Шлях", en: "Path" },
  enter_path_or_leave_empty: { uk: "Введіть шлях або залиште порожнім", en: "Enter path or leave empty" },
  parent_menu_item: { uk: "Батьківський пункт меню", en: "Parent Menu Item" },
  select_parent_menu_item: { uk: "Оберіть батьківський пункт меню", en: "Select parent menu item" },
  no_parent: { uk: "Немає батьківського", en: "No parent" },
  icon: { uk: "Іконка", en: "Icon" },
  select_icon: { uk: "Оберіть іконку", en: "Select icon" },
  page_type: { uk: "Тип сторінки", en: "Page Type" },
  select_page_type: { uk: "Оберіть тип сторінки", en: "Select page type" },
  content_page: { uk: "Сторінка вмісту", en: "Content Page" },
  form_page: { uk: "Сторінка форми", en: "Form Page" },
  dashboard_page: { uk: "Сторінка панелі", en: "Dashboard Page" },
  list_page: { uk: "Сторінка списку", en: "List Page" },
  custom_page: { uk: "Користувацька сторінка", en: "Custom Page" },
  description: { uk: "Опис", en: "Description" },
  enter_menu_item_description: { uk: "Введіть опис пункту меню", en: "Enter menu item description" },
  enter_page_content: { uk: "Введіть вміст сторінки", en: "Enter page content" },
  save: { uk: "Зберегти", en: "Save" },
  current_menu_items: { uk: "Поточні пункти меню", en: "Current Menu Items" },
  no_menu_items_created: { uk: "Ще не створено жодного пункту меню", en: "No menu items created yet" },
  submenu: { uk: "Підменю", en: "Submenu" },
  
  // Menu Item Actions
  menu_item_created: { uk: "Пункт меню створено", en: "Menu item created" },
  failed_create_menu_item: { uk: "Не вдалося створити пункт меню", en: "Failed to create menu item" },

  // User Profile
  profile_email: { uk: "Електронна пошта", en: "Email" },
  profile_phone: { uk: "Телефон", en: "Phone" },
  profile_member_since: { uk: "Учасник з", en: "Member Since" },
  profile_email_cannot_be_changed: { uk: "Електронну пошту не можна змінити", en: "Email cannot be changed" },
  profile_change_avatar: { uk: "Змінити аватар", en: "Change Avatar" },
  profile_uploading: { uk: "Завантаження...", en: "Uploading..." },
  profile_save_changes: { uk: "Зберегти зміни", en: "Save Changes" },
  profile_loading: { uk: "Завантаження...", en: "Loading..." },
  profile_back_to_dashboard: { uk: "Назад до панелі", en: "Back to Dashboard" },
  profile_personal_information: { uk: "Особиста інформація", en: "Personal Information" },
  profile_update_info: { uk: "Оновіть інформацію профілю та аватар", en: "Update your profile information and avatar" },
  // Currency Management
  currency: { uk: "Валюти", en: "Currency" },
  currency_management: { uk: "Управління валютами", en: "Currency Management" },
  currency_management_description: { uk: "Управління валютами системи", en: "Manage system currencies" },
  currencies: { uk: "Валюти", en: "Currencies" },
  currency_code: { uk: "Код", en: "Code" },
  currency_name: { uk: "Назва", en: "Name" },
  currency_rate: { uk: "Курс", en: "Rate" },
  currency_status: { uk: "Статус", en: "Status" },
  actions: { uk: "Дії", en: "Actions" },
  base_currency: { uk: "Основна", en: "Base" },
  add_currency: { uk: "Додати валюту", en: "Add Currency" },
  edit_currency: { uk: "Редагувати валюту", en: "Edit Currency" },
  delete_currency: { uk: "Видалити валюту", en: "Delete Currency" },
  enter_currency_code: { uk: "Введіть код валюти", en: "Enter currency code" },
  enter_currency_name: { uk: "Введіть назву валюти", en: "Enter currency name" },
  enter_exchange_rate: { uk: "Введіть обмінний курс", en: "Enter exchange rate" },
  base_currency_exists: { uk: "Основна валюта вже існує", en: "Base currency already exists" },
  cannot_delete_base_currency: { uk: "Неможливо видалити основну валюту", en: "Cannot delete base currency" },
  base_currency_cannot_be_changed: { uk: "Основну валюту не можна змінити", en: "Base currency cannot be changed" },
  currency_created: { uk: "Валюта створена", en: "Currency created" },
  currency_updated: { uk: "Валюта оновлена", en: "Currency updated" },
  currency_deleted: { uk: "Валюта видалена", en: "Currency deleted" },
  currency_status_updated: { uk: "Статус валюти оновлено", en: "Currency status updated" },
  failed_create_currency: { uk: "Не вдалося створити валюту", en: "Failed to create currency" },
  failed_update_currency: { uk: "Не вдалося оновити валюту", en: "Failed to update currency" },
  failed_delete_currency: { uk: "Не вдалося видалити валюту", en: "Failed to delete currency" },
  failed_update_currency_status: { uk: "Не вдалося оновити статус валюти", en: "Failed to update currency status" },
  failed_load_currencies: { uk: "Не вдалося завантажити валюти", en: "Failed to load currencies" },
  no_currencies_found: { uk: "Валюти не знайдено", en: "No currencies found" },
  currency_code_exists: { uk: "Валюта з таким кодом вже існує", en: "Currency with this code already exists" },
  // Tariff Management translations
  tariff_management: { uk: "Управління тарифами", en: "Tariff Management" },
  add_new_tariff: { uk: "Додати новий", en: "Add New" },
  export_tariffs: { uk: "Експорт", en: "Export" },
  no_tariffs_found: { uk: "Дані не знайдено", en: "No data found" },
  showing_tariffs: { uk: "Показано", en: "Showing" },
  to_tariff: { uk: "до", en: "to" },
  of_tariff: { uk: "з", en: "of" },
  results_tariff: { uk: "результатів", en: "results" },
  previous_tariff: { uk: "Назад", en: "Previous" },
  next_tariff: { uk: "Вперед", en: "Next" },
  page_tariff: { uk: "Сторінка", en: "Page" },
  days_tariff: { uk: "днів", en: "days" },
  lifetime_tariff: { uk: "Безстроково", en: "Lifetime" },
  free_tariff: { uk: "Безкоштовно", en: "Free" },
  edit_tariff: { uk: "Редагувати", en: "Edit" },
  delete_tariff: { uk: "Видалити", en: "Delete" },
  duplicate_tariff: { uk: "Дублювати", en: "Duplicate" },
  create_new_tariff: { uk: "Створити новий тариф", en: "Create New Tariff" },
  update_tariff: { uk: "Оновити тариф", en: "Update Tariff" },
  create_tariff: { uk: "Створити тариф", en: "Create Tariff" },
  create_tariff_description: { uk: "Створення нового тарифного плану", en: "Create a new tariff plan" },
  tariff_details: { uk: "Деталі тарифу", en: "Tariff Details" },
  basic_information: { uk: "Основна інформація", en: "Basic Information" },
  features: { uk: "Функції", en: "Features" },
  limits: { uk: "Обмеження", en: "Limits" },
  enter_tariff_name: { uk: "Введіть назву тарифу", en: "Enter tariff name" },
  enter_tariff_description: { uk: "Введіть опис тарифу", en: "Enter tariff description" },
  enter_duration_days: { uk: "Введіть тривалість у днях", en: "Enter duration in days" },
  lifetime_access: { uk: "Пожиттєвий доступ", en: "Lifetime Access" },
  back: { uk: "Назад", en: "Back" },
  saving: { uk: "Збереження...", en: "Saving..." },
  tariff_created: { uk: "Тариф створено успішно", en: "Tariff created successfully" },
  failed_create_tariff: { uk: "Не вдалося створити тариф", en: "Failed to create tariff" },
  features_will_be_configured_after_creating_tariff: { uk: "Функції будуть налаштовані після створення тарифу", en: "Features will be configured after creating the tariff" },
  save_tariff_first_to_add_features: { uk: "Спочатку збережіть тариф, щоб додати функції", en: "Save the tariff first to add features" },
  limits_will_be_configured_after_creating_tariff: { uk: "Обмеження будуть налаштовані після створення тарифу", en: "Limits will be configured after creating the tariff" },
  save_tariff_first_to_add_limits: { uk: "Спочатку збережіть тариф, щоб додати обмеження", en: "Save the tariff first to add limits" },
  old_price: { uk: "Стара ціна", en: "Old Price" },
  new_price: { uk: "Нова ціна", en: "New Price" },
  duration_days: { uk: "Тривалість (дні)", en: "Duration (days)" },
  free_plan: { uk: "Безкоштовний план", en: "Free Plan" },
  lifetime: { uk: "Безстроковий", en: "Lifetime" },
  active: { uk: "Активний", en: "Active" },
  cancel_tariff: { uk: "Скасувати", en: "Cancel" },
  manage_tariffs_and_pricing_options: { uk: "Управління тарифними планами та ціновими опціями", en: "Manage your tariff plans and pricing options" },
  tariff_features: { uk: "Функції", en: "Features" },
  tariff_limits: { uk: "Ліміти", en: "Limits" },
  select_tariff_plan_to_manage_features_limits: { uk: "Виберіть тарифний план для управління його функціями та лімітами", en: "Select a tariff plan to manage its features and limits" },
  choose_your_plan: { uk: "Оберіть свій план", en: "Choose Your Plan" },
  select_perfect_plan_for_your_needs: { uk: "Оберіть ідеальний план для ваших потреб", en: "Select the perfect plan for your needs" },
  free: { uk: "Безкоштовно", en: "Free" },
  tariff_page_features: { uk: "Функції", en: "Features" },
  tariff_page_limits: { uk: "Ліміти", en: "Limits" },
  select_plan: { uk: "Обрати план", en: "Select Plan" },
  
  // Tariff Features and Limits translations
  tariff_features_and_limits: { uk: "Функції та ліміти тарифів", en: "Tariff Features and Limits" },
  manage_features_and_limits_for_tariff_plans: { uk: "Управління функціями та лімітами для тарифних планів", en: "Manage features and limits for tariff plans" },
  tariff_plans: { uk: "Тарифні плани", en: "Tariff Plans" },
  add_feature: { uk: "Додати функцію", en: "Add Feature" },
  add_new_feature: { uk: "Додати нову функцію", en: "Add New Feature" },
  add_limit: { uk: "Додати ліміт", en: "Add Limit" },
  add_new_limit: { uk: "Додати новий ліміт", en: "Add New Limit" },
  feature_name: { uk: "Назва функції", en: "Feature Name" },
  limit_name: { uk: "Назва ліміту", en: "Limit Name" },
  value: { uk: "Значення", en: "Value" },
  status: { uk: "Статус", en: "Status" },
  edit_feature: { uk: "Редагувати функцію", en: "Edit Feature" },
  edit_limit: { uk: "Редагувати ліміт", en: "Edit Limit" },
  update_feature: { uk: "Оновити функцію", en: "Update Feature" },
  update_limit: { uk: "Оновити ліміт", en: "Update Limit" },
  feature_status_updated: { uk: "Статус функції оновлено", en: "Feature status updated" },
  limit_status_updated: { uk: "Статус ліміту оновлено", en: "Limit status updated" },
  failed_update_feature_status: { uk: "Не вдалося оновити статус функції", en: "Failed to update feature status" },
  failed_update_limit_status: { uk: "Не вдалося оновити статус ліміту", en: "Failed to update limit status" },
  error_updating_feature_status: { uk: "Помилка оновлення статусу функції", en: "Error updating feature status" },
  error_updating_limit_status: { uk: "Помилка оновлення статусу ліміту", en: "Error updating limit status" },
  
  // Tariff Table Column Headers
  tariff_icon: { uk: "", en: "" },
  tariff_name: { uk: "Назва тарифу", en: "Tariff Name" },
  tariff_price: { uk: "Ціна", en: "Price" },
  tariff_term: { uk: "Термін", en: "Term" },
  tariff_status: { uk: "Статус", en: "Status" },
  tariff_actions: { uk: "Дії", en: "Actions" },
  
  // Additional tariff translations
  pricing_period_monthly: { uk: "Щомісячно", en: "Monthly" },
  pricing_period_yearly: { uk: "Щорічно", en: "Yearly" },
};

// User Statistics
const userStatisticsDictionary = {
  total_users: { uk: "Всього користувачів", en: "Total Users" },
  active_users: { uk: "Активні користувачі", en: "Active Users" },
  registered_users: { uk: "Зареєстровані користувачі", en: "Registered Users" },
  user_statistics: { uk: "Статистика користувачів", en: "User Statistics" },
};

// Error Messages
const errorMessagesDictionary = {
  profile_not_found: { uk: "Профіль користувача не знайдено. Оновіть сторінку та спробуйте ще раз.", en: "User profile not found. Please refresh and try again." },
  profile_creation_failed: { uk: "Не вдалося створити профіль користувача. Спробуйте ще раз.", en: "Failed to create user profile. Please try again." },
  profile_update_failed: { uk: "Не вдалося оновити профіль. Спробуйте ще раз.", en: "Failed to update profile. Please try again." },
  avatar_upload_failed: { uk: "Не вдалося завантажити аватар. Спробуйте ще раз.", en: "Failed to upload avatar. Please try again." },
  validation_error: { uk: "Надано недійсні дані. Перевірте введені дані.", en: "Invalid data provided. Please check your input." },
  permission_denied: { uk: "У вас немає дозволу на виконання цієї дії.", en: "You do not have permission to perform this action." },
  network_error: { uk: "Помилка мережі. Перевірте підключення та спробуйте ще раз.", en: "Network error. Please check your connection and try again." },
  user_exists: { uk: "Обліковий запис з цією електронною поштою вже існує. Увійдіть замість цього.", en: "An account with this email already exists. Please sign in instead." },
  rate_limit_exceeded: { uk: "Занадто багато спроб. Спробуйте ще раз через кілька хвилин.", en: "Too many attempts. Please try again in a few minutes." },
  unknown_error: { uk: "Сталася неочікувана помилка. Спробуйте ще раз.", en: "An unexpected error occurred. Please try again." },
};

// Success Messages
const successMessagesDictionary = {
  profile_created: { uk: "Профіль успішно створено", en: "Profile created successfully" },
  profile_updated: { uk: "Профіль успішно оновлено", en: "Profile updated successfully" },
  avatar_updated: { uk: "Аватар успішно оновлено", en: "Avatar updated successfully" },
  profile_loaded: { uk: "Профіль успішно завантажено", en: "Profile loaded successfully" },
  registration_success: { uk: "Обліковий запис успішно створено! Перевірте електронну пошту для підтвердження.", en: "Account created successfully! Please check your email for confirmation." },
  login_success: { uk: "З поверненням!", en: "Welcome back!" },
  password_reset_sent: { uk: "Електронний лист для скидання пароля надіслано. Перевірте вашу поштову скриньку.", en: "Password reset email sent. Please check your inbox." },
};

// Toast Notifications
const toastDictionary = {
  // Admin Layout notifications
  failed_load_user_profile: { uk: "Не вдалося завантажити профіль користувача. Оновіть сторінку та спробуйте ще раз.", en: "Failed to load user profile. Please refresh and try again." },
  unable_load_profile: { uk: "Неможливо завантажити профіль. Оновіть сторінку та спробуйте ще раз.", en: "Unable to load profile. Please refresh and try again." },
  
  // User Layout notifications
  please_log_in: { uk: "Будь ласка, увійдіть, щоб продовжити", en: "Please log in to continue" },
  failed_load_user_data: { uk: "Не вдалося завантажити дані користувача", en: "Failed to load user data" },
  failed_load_menu_items: { uk: "Не вдалося завантажити пункти меню", en: "Failed to load menu items" },
  
  // User Header notifications
  failed_logout: { uk: "Не вдалося вийти", en: "Failed to logout" },
  logged_out_successfully: { uk: "Вихід успішно виконано", en: "Logged out successfully" },
  
  // API Docs notifications
  script_updated: { uk: "Скрипт оновлено!", en: "Script updated!" },
  script_saved: { uk: "Postman скрипт збережено", en: "Postman script saved" },
  api_key_saved: { uk: "API ключ збережено!", en: "API key saved!" },
  api_key_used: { uk: "API ключ буде використовуватися у всіх запитах", en: "API key will be used in all requests" },
  copied: { uk: "Скопійовано!", en: "Copied!" },
  copied_clipboard: { uk: "Код скопійовано в буфер обміну", en: "Code copied to clipboard" },
  collection_downloaded: { uk: "Колекція завантажена!", en: "Collection downloaded!" },
  collection_ready: { uk: "Postman колекція готова до імпорту", en: "Postman collection ready for import" },
  
  // Form Page notifications
  validation_error: { uk: "Помилка валідації", en: "Validation Error" },
  fill_required_fields: { uk: "Будь ласка, заповніть обов'язкові поля", en: "Please fill in required fields" },
  success: { uk: "Успіх", en: "Success" },
  form_submitted: { uk: "Форму успішно надіслано!", en: "Form submitted successfully!" },
  
  // User Management notifications (from useUsers hook)
  user_created_success: { uk: "Користувача успішно створено", en: "User created successfully" },
  user_updated_success: { uk: "Користувача успішно оновлено", en: "User updated successfully" },
  user_deleted_success: { uk: "Користувача успішно видалено", en: "User deleted successfully" },
  failed_create_user: { uk: "Не вдалося створити користувача", en: "Failed to create user" },
  failed_update_user: { uk: "Не вдалося оновити користувача", en: "Failed to update user" },
  failed_delete_user: { uk: "Не вдалося видалити користувача", en: "Failed to delete user" },
  user_created_desc: { uk: "було створено", en: "has been created" },
  user_updated_desc: { uk: "було оновлено", en: "has been updated" },
  user_deleted_desc: { uk: "було видалено", en: "has been deleted" },
  user_activated_success: { uk: "Користувача успішно активовано", en: "User activated successfully" },
  user_deactivated_success: { uk: "Користувача успішно деактивовано", en: "User deactivated successfully" },
  user_activated_desc: { uk: "було активовано", en: "has been activated" },
  user_deactivated_desc: { uk: "було деактивовано", en: "has been deactivated" },
  
  // Authentication notifications
  login_success_admin: { uk: "Ви успішно увійшли в кабінет адміністратора", en: "You have successfully logged into the administrator dashboard" },
  welcome_back: { uk: "З поверненням!", en: "Welcome back!" },
  auth_failed: { uk: "Помилка автентифікації. Спробуйте ще раз.", en: "Authentication failed. Please try again." },
  email_confirmed: { uk: "Електронну пошту успішно підтверджено!", en: "Email confirmed successfully!" },
  email_confirmed_welcome: { uk: "Електронну пошту успішно підтверджено! Ласкаво просимо до MarketGrow!", en: "Email confirmed successfully! Welcome to MarketGrow!" },
  account_confirmed_setup_failed: { uk: "Обліковий запис підтверджено, але не вдалося налаштувати профіль. Спробуйте увійти ще раз.", en: "Account confirmed but profile setup failed. Please try signing in again." },
  oauth_failed: { uk: "Помилка автентифікації. Спробуйте увійти ще раз.", en: "Authentication failed. Please try signing in again." },
  please_sign_in_complete_registration: { uk: "Будь ласка, увійдіть, щоб завершити реєстрацію.", en: "Please sign in to complete your registration." },
  
  // User Profile notifications
  profile_updated_success: { uk: "Профіль успішно оновлено", en: "Profile updated successfully" },
  failed_update_profile: { uk: "Не вдалося оновити профіль", en: "Failed to update profile" },
  avatar_updated_success: { uk: "Аватар успішно оновлено", en: "Avatar updated successfully" },
  failed_upload_avatar: { uk: "Не вдалося завантажити аватар", en: "Failed to upload avatar" },
  
  // Password Reset notifications
  failed_send_reset_email: { uk: "Не вдалося надіслати електронний лист для скидання", en: "Failed to send reset email" },
  reset_success: { uk: "Електронний лист для скидання пароля надіслано", en: "Password reset email sent" },
  
  // User Sidebar notifications
  feature_not_implemented: { uk: "Ця функція ще не реалізована", en: "This feature is not yet implemented" },
  duplicate_menu_item: { uk: "Дублювати пункт меню", en: "Duplicate menu item" },
  delete_menu_item: { uk: "Видалити пункт меню", en: "Delete menu item" },
};

// Merge dictionaries
Object.assign(dictionary, userStatisticsDictionary, errorMessagesDictionary, successMessagesDictionary, toastDictionary);

type I18nContextType = {
  lang: Lang;
  t: (key: keyof typeof dictionary) => string;
  setLang: (l: Lang) => void;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>("uk");
  const t = (key: keyof typeof dictionary) => {
    const entry = dictionary[key];
    if (!entry) {
      console.error(`Translation key "${key}" not found in dictionary`);
      return `[${key}]`; // Return key wrapped in brackets to make it obvious when a translation is missing
    }
    if (!(lang in entry)) {
      console.error(`Language "${lang}" not found for key "${key}"`, entry);
      return `[${key}]`; // Return key wrapped in brackets to make it obvious when a translation is missing
    }
    const value = entry[lang];
    if (typeof value !== 'string') {
      console.error(`Translation value for key "${key}" and language "${lang}" is not a string:`, value);
      return `[${key}]`;
    }
    return value;
  };
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
    // Predefined common translations for user management (lazy-loaded)
    get common() {
      return {
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
      };
    },
  };
};


