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
  profile: { uk: "Профіль", en: "Profile" },
  user_profile: { uk: "Профіль користувача", en: "User Profile" },
  menu_profile: { uk: "Мій профіль", en: "My Profile" },
  menu_profile_desc: { uk: "Налаштування облікового запису", en: "Account settings" },
  // Navigation
  nav_features: { uk: "Можливості", en: "Features" },
  nav_how_it_works: { uk: "Як це працює", en: "How it works" },
  nav_pricing: { uk: "Тарифи", en: "Pricing" },
  nav_login: { uk: "Увійти", en: "Log in" },
  nav_get_started: { uk: "Почати безкоштовно", en: "Get started free" },
  brand_name: { uk: "MarketGrow", en: "MarketGrow" },
  
  // Hero Section - updated
  hero_badge: { uk: "Автоматизація бізнесу на маркетплейсах", en: "Marketplace Business Automation" },
  hero_title_1: { uk: "Збільшуйте продажі на", en: "Boost your" },
  hero_title_accent: { uk: "маркетплейсах", en: "marketplace sales" },
  hero_title_2: { uk: "на автопілоті", en: "on autopilot" },
  hero_subtitle: { uk: "Автоматизуємо роботу з прайсами та постачальниками. Перетворюємо складні дані в простий прибуток. Економимо ваш час для росту бізнесу.", en: "Automate price lists and supplier management. Turn complex data into simple profit. Save your time for business growth." },
  hero_cta_primary: { uk: "Спробувати безкоштовно", en: "Try for free" },
  hero_cta_secondary: { uk: "Дізнатися більше", en: "Learn more" },
  hero_stat_1: { uk: "Зростання прибутку", en: "Profit growth" },
  hero_stat_2: { uk: "Економія часу", en: "Time saved" },
  hero_stat_3: { uk: "Задоволених клієнтів", en: "Happy clients" },
  
  // Solutions Section - new
  solutions_badge: { uk: "Наше рішення", en: "Our solution" },
  solutions_title: { uk: "Перетворюємо проблеми в", en: "Turn problems into" },
  solutions_accent: { uk: "можливості", en: "opportunities" },
  solutions_subtitle: { uk: "Повна автоматизація обробки прайсів від завантаження до розміщення на маркетплейсах", en: "Complete automation of price list processing from upload to marketplace deployment" },
  
  solution_1_title: { uk: "Автоматизуємо рутину", en: "Automate routine" },
  solution_1_desc: { uk: "Завантажуєте файл — отримуєте готові картки товарів за хвилини, а не години", en: "Upload a file — get ready product cards in minutes, not hours" },
  solution_1_feature_1: { uk: "Підтримка всіх форматів", en: "All formats supported" },
  solution_1_feature_2: { uk: "Розумне розпізнавання", en: "Smart recognition" },
  solution_1_feature_3: { uk: "Автоматична категоризація", en: "Auto categorization" },
  
  solution_2_title: { uk: "Готуємо дані для продажу", en: "Prepare data for sales" },
  solution_2_desc: { uk: "Оптимізуємо описи, ціни та характеристики під кожен маркетплейс", en: "Optimize descriptions, prices and specs for each marketplace" },
  solution_2_feature_1: { uk: "SEO-оптимізація", en: "SEO optimization" },
  solution_2_feature_2: { uk: "Аналіз конкурентів", en: "Competitor analysis" },
  solution_2_feature_3: { uk: "Динамічне ціноутворення", en: "Dynamic pricing" },
  
  solution_3_title: { uk: "Збільшуємо прибуток", en: "Increase profit" },
  solution_3_desc: { uk: "Знижуємо витрати часу на 90% і підвищуємо конверсію продажів на 30%", en: "Reduce time costs by 90% and increase sales conversion by 30%" },
  solution_3_feature_1: { uk: "Миттєве завантаження", en: "Instant upload" },
  solution_3_feature_2: { uk: "Аналітика продажів", en: "Sales analytics" },
  solution_3_feature_3: { uk: "Рекомендації по зростанню", en: "Growth recommendations" },
  
  before_after_title: { uk: "До → Після", en: "Before → After" },
  before_title: { uk: "❌ Було", en: "❌ Before" },
  before_1: { uk: "20 годин обробки прайсів", en: "20 hours of price list processing" },
  before_2: { uk: "Постійні помилки в даних", en: "Constant data errors" },
  before_3: { uk: "Низька швидкість завантаження товарів", en: "Low product upload speed" },
  before_4: { uk: "Втрати прибутку до 30%", en: "Profit loss up to 30%" },
  
  after_title: { uk: "✅ Стало", en: "✅ After" },
  after_1: { uk: "2 години на повну автоматизацію", en: "2 hours for full automation" },
  after_2: { uk: "99.9% точність обробки", en: "99.9% processing accuracy" },
  after_3: { uk: "Миттєве завантаження на маркетплейси", en: "Instant marketplace upload" },
  after_4: { uk: "Зростання прибутку на 30-50%", en: "Profit growth 30-50%" },
  
  cta_get_result: { uk: "Отримати результат зараз", en: "Get results now" },
  
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
  menu: { uk: "Меню", en: "Menu" },
  // Additional menu translations
  menu_pricing: { uk: "Тарифні плани", en: "Pricing Plans" },
  menu_currency: { uk: "Валюта", en: "Currency" },
  menu_payment: { uk: "Платіжні системи", en: "Payment Systems" },
  menu_tariff_features: { uk: "Функції тарифів", en: "Tariff Features" },
  menu_stores: { uk: "Магазини", en: "Stores" },
  stores: { uk: "Магазини", en: "Stores" },
  add_to_stores: { uk: "Додати до магазинів", en: "Add to stores" },
  select_stores: { uk: "Виберіть магазини", en: "Select stores" },
  no_active_stores: { uk: "Немає активних магазинів", en: "No active stores" },
  add_product_to_stores: { uk: "Додати товар", en: "Add product" },
  product_added_to_stores: { uk: "Товар додано до вибраних магазинів", en: "Product added to selected stores" },
  products_already_linked: { uk: "Товари вже прив'язані або додані", en: "Products are already linked or added" },
  failed_add_product_to_stores: { uk: "Не вдалося додати товар до магазинів", en: "Failed to add product to stores" },
  product_added_to_store: { uk: "Товар додано до магазину", en: "Product added to store" },
  failed_add_to_store: { uk: "Помилка додавання", en: "Add failed" },
  product_removed_from_store: { uk: "Товар видалено з магазину", en: "Product removed from store" },
  failed_remove_from_store: { uk: "Помилка видалення", en: "Remove failed" },
  operation_failed: { uk: "Збій операції", en: "Operation failed" },
  loading: { uk: "Завантаження...", en: "Loading..." },
  menu_suppliers: { uk: "Постачальники", en: "Suppliers" },
  menu_store_templates: { uk: "Шаблони XML", en: "XML Templates" },
  
  // Suppliers
  suppliers_title: { uk: "Постачальники", en: "Suppliers" },
  suppliers_description: { uk: "Керування вашими постачальниками", en: "Manage your suppliers" },
  create_supplier: { uk: "Додати постачальника", en: "Add Supplier" },
  create_supplier_description: { uk: "Створення нового постачальника", en: "Create new supplier" },
  edit_supplier: { uk: "Редагувати постачальника", en: "Edit Supplier" },
  edit_supplier_description: { uk: "Редагування інформації про постачальника", en: "Edit supplier information" },
  add_supplier: { uk: "Додати постачальника", en: "Add Supplier" },
  back_to_suppliers: { uk: "Назад до постачальників", en: "Back to Suppliers" },
  no_suppliers: { uk: "Немає постачальників", en: "No Suppliers" },
  no_suppliers_description: { uk: "Додайте першого постачальника для початку роботи", en: "Add your first supplier to get started" },
  supplier_name: { uk: "Назва постачальника", en: "Supplier Name" },
  supplier_name_placeholder: { uk: "Введіть назву постачальника", en: "Enter supplier name" },
  website: { uk: "Сайт", en: "Website" },
  website_placeholder: { uk: "https://example.com", en: "https://example.com" },
  xml_feed_url: { uk: "Посилання на прайс", en: "Price Feed URL" },
  xml_feed_url_placeholder: { uk: "https://example.com/price.xml", en: "https://example.com/price.xml" },
  phone: { uk: "Телефон", en: "Phone" },
  phone_placeholder: { uk: "+380 XX XXX XX XX", en: "+380 XX XXX XX XX" },
  supplier_created: { uk: "Постачальника створено", en: "Supplier created" },
  supplier_updated: { uk: "Постачальника оновлено", en: "Supplier updated" },
  supplier_deleted: { uk: "Постачальника видалено", en: "Supplier deleted" },
  failed_save_supplier: { uk: "Помилка збереження постачальника", en: "Failed to save supplier" },
  failed_load_suppliers: { uk: "Помилка завантаження постачальників", en: "Failed to load suppliers" },
  failed_delete_supplier: { uk: "Помилка видалення постачальника", en: "Failed to delete supplier" },
  delete_supplier_confirm: { uk: "Видалити постачальника?", en: "Delete Supplier?" },
  suppliers_limit: { uk: "Постачальники", en: "Suppliers" },
  suppliers_limit_reached: { uk: "Досягнуто ліміту постачальників", en: "Supplier limit reached" },
  save_changes: { uk: "Зберегти зміни", en: "Save Changes" },
  
  // Shops
  shops_title: { uk: "Магазини", en: "Shops" },
  shops_description: { uk: "Керування вашими магазинами", en: "Manage your shops" },
  create_shop: { uk: "Створити магазин", en: "Create Shop" },
  create_shop_description: { uk: "Створення нового магазину", en: "Create new shop" },
  edit_shop: { uk: "Редагувати магазин", en: "Edit Shop" },
  edit_shop_description: { uk: "Редагування інформації про магазин", en: "Edit shop information" },
  add_shop: { uk: "Створити магазин", en: "Create Shop" },
  back_to_shops: { uk: "Назад до магазинів", en: "Back to Shops" },
  no_shops: { uk: "Немає магазинів", en: "No Shops" },
  no_shops_description: { uk: "Створіть перший магазин для початку роботи", en: "Create your first shop to get started" },
  shop_products: { uk: "Товарів", en: "Products" },
  shop_categories: { uk: "Категорій", en: "Categories" },
  shop_name: { uk: "Назва магазину", en: "Shop Name" },
  shop_name_placeholder: { uk: "Введіть назву магазину", en: "Enter shop name" },
  shop_created: { uk: "Магазин створено", en: "Shop created" },
  shop_updated: { uk: "Магазин оновлено", en: "Shop updated" },
  shop_deleted: { uk: "Магазин видалено", en: "Shop deleted" },
  failed_save_shop: { uk: "Помилка збереження магазину", en: "Failed to save shop" },
  failed_load_shops: { uk: "Помилка завантаження магазинів", en: "Failed to load shops" },
  failed_delete_shop: { uk: "Помилка видалення магазину", en: "Failed to delete shop" },
  delete_shop_confirm: { uk: "Видалити магазин?", en: "Delete Shop?" },
  shops_limit: { uk: "Магазини", en: "Shops" },
  shops_limit_reached: { uk: "Досягнуто ліміту магазинів", en: "Shop limit reached" },
  upgrade_plan: { uk: "Оновіть тарифний план для створення додаткових магазинів", en: "Upgrade plan to create more shops" },
  create: { uk: "Створити", en: "Create" },
  
  // Products → Товари
  products_title: { uk: "Товари", en: "Products" },
  products_description: { uk: "Керування вашими товарами", en: "Manage your products" },
  create_product: { uk: "Створити товар", en: "Create Product" },
  create_product_description: { uk: "Створення нового товару", en: "Create new product" },
  edit_product: { uk: "Редагувати товар", en: "Edit Product" },
  edit_product_description: { uk: "Редагування інформації про товар", en: "Edit product information" },
  add_product: { uk: "Створити товар", en: "Create Product" },
  back_to_products: { uk: "Назад до товарів", en: "Back to Products" },
  no_products: { uk: "Немає товарів", en: "No Products" },
  no_products_description: { uk: "Перейдіть у розділ «Товари» і додайте товар до магазину", en: "Go to the products section and add a product to the store" },
  description_placeholder: { uk: "Введіть опис товару", en: "Enter product description" },
  product_created: { uk: "Товар створено", en: "Product created" },
  product_updated: { uk: "Товар оновлено", en: "Product updated" },
  product_deleted: { uk: "Товар видалено", en: "Product deleted" },
  // Products duplication flow
  product_copying: { uk: "Триває копіювання товару…", en: "Copying product…" },
  failed_duplicate_product: { uk: "Не вдалося скопіювати товар", en: "Failed to duplicate product" },
  failed_save_product: { uk: "Помилка збереження товару", en: "Failed to save product" },
  failed_load_products: { uk: "Помилка завантаження товарів", en: "Failed to load products" },
  failed_delete_product: { uk: "Помилка видалення товару", en: "Failed to delete product" },
  failed_create_product: { uk: "Помилка створення товару", en: "Failed to create product" },
  delete_product_confirm: { uk: "Видалити товар?", en: "Delete Product?" },
  deleting_product_title: { uk: "Видалення товару", en: "Deleting product" },
  deleting_product: { uk: "Йде видалення", en: "Deleting" },
  products_limit: { uk: "Товари", en: "Products" },
  products_limit_reached: { uk: "Досягнуто ліміту товарів", en: "Product limit reached" },
  table_active: { uk: "Активний", en: "Active" },
  
  // Limits
  limits_title: { uk: "Обмеження тарифів", en: "Tariff Limits" },
  limits_description: { uk: "Керування обмеженнями для тарифних планів", en: "Manage limits for tariff plans" },
  create_limit: { uk: "Додати обмеження", en: "Add Limit" },
  create_limit_description: { uk: "Створення нового обмеження", en: "Create new limit" },
  edit_limit_main: { uk: "Редагувати обмеження", en: "Edit Limit" },
  edit_limit_description: { uk: "Редагування обмеження", en: "Edit limit information" },
  add_limit_btn: { uk: "Додати обмеження", en: "Add Limit" },
  back_to_limits: { uk: "Назад до обмежень", en: "Back to Limits" },
  no_limits: { uk: "Немає обмежень", en: "No Limits" },
  no_limits_description: { uk: "Додайте перше обмеження для тарифних планів", en: "Add your first limit for tariff plans" },
  limit_name_field: { uk: "Назва обмеження", en: "Limit Name" },
  limit_name_placeholder: { uk: "Введіть назву обмеження", en: "Enter limit name" },
  limit_name_required: { uk: "Назва обмеження обов'язкова", en: "Limit name is required" },
  limit_code_field: { uk: "Системне ім'я", en: "System Code" },
  limit_code_placeholder: { uk: "max_products", en: "max_products" },
  limit_code_required: { uk: "Системне ім'я обов'язкове", en: "System code is required" },
  limit_code_hint: { uk: "Використовуйте формат snake_case (малі літери, цифри та _)", en: "Use snake_case format (lowercase letters, numbers and _)" },
  limit_code_format_error: { uk: "Системне ім'я має бути в форматі snake_case", en: "System code must be in snake_case format" },
  limit_path_field: { uk: "Шлях до сторінки", en: "Page Path" },
  limit_path_placeholder: { uk: "/admin/products", en: "/admin/products" },
  limit_path_hint: { uk: "Вкажіть шлях до сторінки, якщо обмеження пов'язане з певним розділом", en: "Specify page path if limit is related to a specific section" },
  limit_description_field: { uk: "Опис обмеження", en: "Limit Description" },
  limit_description_placeholder: { uk: "Опишіть призначення обмеження", en: "Describe the purpose of the limit" },
  select_limit: { uk: "Виберіть обмеження", en: "Select limit" },
  limit_created: { uk: "Обмеження створено", en: "Limit created" },
  limit_updated: { uk: "Обмеження оновлено", en: "Limit updated" },
  limit_deleted: { uk: "Обмеження видалено", en: "Limit deleted" },
  failed_save_limit: { uk: "Помилка збереження обмеження", en: "Failed to save limit" },
  failed_load_limits: { uk: "Помилка завантаження обмежень", en: "Failed to load limits" },
  failed_load_limit: { uk: "Помилка завантаження ліміту", en: "Failed to load limit" },
  failed_delete_limit: { uk: "Помилка видалення обмеження", en: "Failed to delete limit" },
  delete_limit_confirm: { uk: "Видалити обмеження?", en: "Delete Limit?" },
  limits_order_updated: { uk: "Порядок обмежень оновлено", en: "Limits order updated" },
  failed_update_limits_order: { uk: "Помилка оновлення порядку обмежень", en: "Failed to update limits order" },
  
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
  
  // Common actions
  save: { uk: "Зберегти", en: "Save" },
  update: { uk: "Оновити", en: "Update" },
  "delete": { uk: "Видалити", en: "Delete" },
  edit: { uk: "Редагувати", en: "Edit" },
  back: { uk: "Назад", en: "Back" },
  cancel: { uk: "Скасувати", en: "Cancel" },
  saving: { uk: "Збереження...", en: "Saving..." },
  duplicate: { uk: "Дублювати", en: "Duplicate" },
  
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
  available_tariffs: { uk: "Доступні тарифи", en: "Available Tariffs" },
  manage_user_subscriptions: { uk: "Керування підписками користувача", en: "Manage User Subscriptions" },
  view_details: { uk: "Переглянути деталі", en: "View Details" },
  active_tariff: { uk: "Активний тариф", en: "Active Tariff" },
  no_tariff: { uk: "Немає тарифу", en: "No Tariff" },
  subscription_history: { uk: "Історія підписок", en: "Subscription History" },
  subscription_history_desc: { uk: "Всі підписки користувача", en: "All user subscriptions" },
  something_went_wrong: { uk: "Щось пішло не так", en: "Something went wrong" },
  price: { uk: "Ціна", en: "Price" },
  start_date: { uk: "Дата початку", en: "Start Date" },
  end_date: { uk: "Дата закінчення", en: "End Date" },
  status: { uk: "Статус", en: "Status" },
  no_subscriptions: { uk: "Немає підписок", en: "No Subscriptions" },
  free: { uk: "Безкоштовно", en: "Free" },
  lifetime: { uk: "Безстроково", en: "Lifetime" },
  days: { uk: "днів", en: "days" },
  tariff_name: { uk: "Назва тарифу", en: "Tariff Name" },
  active_tariff_title: { uk: "Активний тарифний план", en: "Active Tariff Plan" },
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
  
  // Product Table
  table_product: { uk: "Назва товару", en: "Product Name" },
  table_price: { uk: "Ціна", en: "Price" },
  table_stock: { uk: "Кількість", en: "Stock" },
  photo: { uk: "Фото", en: "Photo" },
  
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
  prev: { uk: "Попередня", en: "Previous" },
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
  breadcrumb_storetemplates: { uk: "Шаблони XML", en: "XML Templates" },
  
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
  // Menu Management
  menu_management: { uk: "Управління меню", en: "Menu Management" },
  add_menu_item: { uk: "Додати пункт меню", en: "Add Menu Item" },
  add_new_menu_item: { uk: "Додати новий пункт меню", en: "Add New Menu Item" },
  title: { uk: "Назва", en: "Title" },
  enter_menu_item_title: { uk: "Введіть назву пункту меню", en: "Enter menu item title" },
  path: { uk: "Шлях", en: "Path" },
  enter_path_or_leave_empty: { uk: "Введіть шлях або залиште порожнім", en: "Enter path or leave empty" },
  parent_menu_item: { uk: "Батьківський пункт пункт меню", en: "Parent Menu Item" },
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
  create_sample_data: { uk: "Створити зразки даних", en: "Create Sample Data" },
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
  confirm_delete_tariff: { uk: "Підтвердити видалення тарифу", en: "Confirm Delete Tariff" },
  delete_tariff_warning: { uk: "Ця дія безповоротна. Тариф буде видалено назавжди.", en: "This action cannot be undone. The tariff will be permanently deleted." },
  tariff_deleted_successfully: { uk: "Тариф успішно видалено", en: "Tariff deleted successfully" },
  failed_to_delete_tariff: { uk: "Не вдалося видалити тариф", en: "Failed to delete tariff" },
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
  tariff_created: { uk: "Тариф створено успішно", en: "Tariff created successfully" },
  failed_create_tariff: { uk: "Не вдалося створити тариф", en: "Failed to create tariff" },
  features_will_be_configured_after_creating_tariff: { uk: "Функції будуть налаштовані після створення тарифу", en: "Features will be configured after creating the tariff" },
  save_tariff_first_to_add_features: { uk: "Спочатку збережіть тариф, щоб додати функції", en: "Save the tariff first to add features" },
  limits_will_be_configured_after_creating_tariff: { uk: "Обмеження будуть налаштовані після створення тарифу", en: "Limits will be configured after creating the tariff" },
  save_tariff_first_to_add_limits: { uk: "Спочатку збережіть тариф, щоб додати обмеження", en: "Save the tariff first to add limits" },
  
  // Features and Limits Management
  add_feature: { uk: "Додати функцію", en: "Add Feature" },
  delete_feature: { uk: "Видалити функцію", en: "Delete Feature" },
  feature_name: { uk: "Назва функції", en: "Feature Name" },
  enter_feature_name: { uk: "Введіть назву функції", en: "Enter feature name" },
  
  add_limit: { uk: "Додати обмеження", en: "Add Limit" },
  delete_limit: { uk: "Видалити обмеження", en: "Delete Limit" },
  limit_name: { uk: "Назва обмеження", en: "Limit Name" },
  limit_value: { uk: "Значення", en: "Value" },
  enter_limit_name: { uk: "Введіть назву обмеження", en: "Enter limit name" },
  enter_limit_value: { uk: "Введіть значення", en: "Enter value" },
  
  // Sample data for testing
  xml_files_upload: { uk: "Завантаження XML файлів", en: "XML Files Upload" },
  data_processing_cleaning: { uk: "Обробка та очищення даних", en: "Data Processing and Cleaning" },
  excel_csv_export: { uk: "Експорт в Excel/CSV", en: "Export to Excel/CSV" },
  
  store_count_limit: { uk: "Кількість магазинів", en: "Number of Stores" },
  supplier_count_limit: { uk: "Кількість постачальників", en: "Number of Suppliers" },
  product_count_limit: { uk: "Кількість товарів", en: "Number of Products" },
  old_price: { uk: "Стара ціна", en: "Old Price" },
  new_price: { uk: "Нова ціна", en: "New Price" },
  duration_days: { uk: "Тривалість (дні)", en: "Duration (days)" },
  free_plan: { uk: "Безкоштовний план", en: "Free Plan" },
  active: { uk: "Активний", en: "Active" },
  cancel_tariff: { uk: "Скасувати", en: "Cancel" },
  manage_tariffs_and_pricing_options: { uk: "Управління тарифними планами та ціновими опціями", en: "Manage your tariff plans and pricing options" },
  tariff_features: { uk: "Функції", en: "Features" },
  tariff_limits: { uk: "Ліміти", en: "Limits" },
  select_tariff_plan_to_manage_features_limits: { uk: "Виберіть тарифний план для управління його функціями та лімітами", en: "Select a tariff plan to manage its features and limits" },
  choose_your_plan: { uk: "Оберіть свій план", en: "Choose Your Plan" },
  select_perfect_plan_for_your_needs: { uk: "Оберіть ідеальний план для ваших потреб", en: "Select the perfect plan for your needs" },
  choose_your_plan_description: { uk: "Оберіть тарифний план, який найкраще відповідає вашим потребам", en: "Choose a tariff plan that best fits your needs" },
  tariff_page_features: { uk: "Функції", en: "Features" },
  tariff_page_limits: { uk: "Ліміти", en: "Limits" },
  select_plan: { uk: "Обрати план", en: "Select Plan" },
  active_tariff_button: { uk: "Активний тариф", en: "Active Plan" },
  sort_order: { uk: "Порядковий номер", en: "Sort Order" },
  enter_sort_order: { uk: "Введіть порядковий номер", en: "Enter sort order" },
  discount: { uk: "Знижка", en: "Discount" },
  per_month: { uk: "/міс.", en: "/mo" },
  
  // Demo trial alert
  demo_trial_title_prefix: { uk: "Розпочніть", en: "Start your" },
  demo_trial_title_suffix: { uk: "-денний безкоштовний пробний період", en: "-day free trial" },
  demo_trial_desc: { uk: "Під час якого діють певні обмеження", en: "During which certain limitations apply" },
  
  // Tariff selection alert
  tariff_select_title_prefix: { uk: "Обрано", en: "Selected" },
  tariff_select_title_suffix: { uk: "-денний план", en: "-day plan" },
  tariff_select_desc: { uk: "Цей план має наступні обмеження", en: "This plan has the following limits" },
  
  // Tariff Features and Limits translations
  tariff_features_and_limits: { uk: "Функції та ліміти тарифів", en: "Tariff Features and Limits" },
  manage_features_and_limits_for_tariff_plans: { uk: "Управління функціями та лімітами для тарифних планів", en: "Manage features and limits for tariff plans" },
  tariff_plans: { uk: "Тарифні плани", en: "Tariff Plans" },
  add_new_feature: { uk: "Додати нову функцію", en: "Add New Feature" },
  add_new_limit: { uk: "Додати новий ліміт", en: "Add New Limit" },
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
  tariff_price: { uk: "Ціна", en: "Price" },
  tariff_term: { uk: "Термін", en: "Term" },
  tariff_status: { uk: "Статус", en: "Status" },
  tariff_actions: { uk: "Дії", en: "Actions" },
  
  // Additional tariff translations
  pricing_period_monthly: { uk: "Щомісячно", en: "Monthly" },
  pricing_period_yearly: { uk: "Щорічно", en: "Yearly" },
  
  // Edit tariff translations
  edit_tariff_description: { uk: "Редагування тарифного плану", en: "Edit tariff plan" },
  tariff_updated_successfully: { uk: "Тариф успішно оновлено", en: "Tariff updated successfully" },
  tariff_deactivated_successfully: { uk: "Тариф успішно деактивовано", en: "Tariff deactivated successfully" },
  failed_update_tariff: { uk: "Не вдалося оновити тариф", en: "Failed to update tariff" },
  cannot_delete_active_subscription: { uk: "Не можна видалити активну підписку", en: "Cannot delete active subscription" },
  failed_delete_subscription: { uk: "Не вдалося видалити підписку", en: "Failed to delete subscription" },
  subscription_deleted_successfully: { uk: "Підписку успішно видалено", en: "Subscription deleted successfully" },
  tariff_not_found: { uk: "Тариф не знайдено", en: "Tariff not found" },
  tariff_not_found_description: { uk: "Тариф з вказаним ID не існує або був видалений", en: "The tariff with the specified ID does not exist or has been deleted" },
  back_to_tariffs: { uk: "Повернутися до тарифів", en: "Back to Tariffs" },
  failed_load_tariff: { uk: "Не вдалося завантажити тариф", en: "Failed to load tariff" },
  no_features_configured: { uk: "Функції не налаштовані", en: "No features configured" },
  no_limits_configured: { uk: "Ліміти не налаштовані", en: "No limits configured" },
  feature_added_successfully: { uk: "Функцію успішно додано", en: "Feature added successfully" },
  failed_add_feature: { uk: "Не вдалося додати функцію", en: "Failed to add feature" },
  feature_removed_successfully: { uk: "Функцію успішно видалено", en: "Feature removed successfully" },
  failed_remove_feature: { uk: "Не вдалося видалити функцію", en: "Failed to remove feature" },
  limit_added_successfully: { uk: "Ліміт успішно додано", en: "Limit added successfully" },
  failed_add_limit: { uk: "Не вдалося додати ліміт", en: "Failed to add limit" },
  limit_removed_successfully: { uk: "Ліміт успішно видалено", en: "Limit removed successfully" },
  failed_remove_limit: { uk: "Не вдалося видалити ліміт", en: "Failed to remove limit" },
  inactive: { uk: "Неактивний", en: "Inactive" },
  are_you_sure_you_want_to_delete_this_feature: { uk: "Ви впевнені, що хочете видалити цю функцію", en: "Are you sure you want to delete this feature" },
  feature_deleted_successfully: { uk: "Функцію успішно видалено", en: "Feature deleted successfully" },
  failed_to_delete_feature: { uk: "Не вдалося видалити функцію", en: "Failed to delete feature" },
  confirm_delete_feature: { uk: "Підтвердити видалення функції", en: "Confirm Delete Feature" },
  
  select_currency: { uk: "Оберіть валюту", en: "Select Currency" },
  is_free: { uk: "Безкоштовний", en: "Free" },
  is_lifetime: { uk: "Довічний", en: "Lifetime" },
  is_active: { uk: "Активний", en: "Active" },
  
  // Additional validation and permission messages
  admin_access_required: { uk: "Необхідні права адміністратора", en: "Admin access required" },
  please_fix_validation_errors: { uk: "Будь ласка, виправте помилки валідації", en: "Please fix validation errors" },
  currency_required: { uk: "Валюта обов'язкова", en: "Currency is required" },
  new_price_required: { uk: "Нова ціна обов'язкова для платних тарифів", en: "New price is required for paid tariffs" },
  price_must_be_non_negative: { uk: "Ціна повинна бути невід'ємною", en: "Price must be non-negative" },
  duration_must_be_non_negative: { uk: "Тривалість повинна бути невід'ємною", en: "Duration must be non-negative" },
  invalid_currency_selected: { uk: "Обрано недійсну валюту", en: "Invalid currency selected" },
  read_only_mode: { uk: "Режим лише для читання", en: "Read-only mode" },
  user_role_read_only: { uk: "Користувачі можуть лише переглядати дані", en: "Users can only view data" },
  
  // XML Templates translations
  store_templates_title: { uk: "Шаблони маркетплейсів", en: "Marketplace Templates" },
  create_template: { uk: "Створити шаблон", en: "Create Template" },
  edit_template: { uk: "Редагувати шаблон", en: "Edit Template" },
  back_to_templates: { uk: "Назад до шаблонів", en: "Back to Templates" },
  
  // Upload tab
  upload_xml: { uk: "Загрузка XML", en: "Upload XML" },
  xml_file: { uk: "XML файл", en: "XML file" },
  xml_url: { uk: "URL адреса XML", en: "XML URL" },
  load_xml: { uk: "Завантажити XML", en: "Load XML" },
  upload_xml_file: { uk: "Завантажити XML файл", en: "Upload XML file" },
  or_enter_url: { uk: "або введіть URL", en: "or enter URL" },
  enter_xml_url: { uk: "Введіть URL адресу XML файлу", en: "Enter XML file URL" },
  parse_xml: { uk: "Парсити XML", en: "Parse XML" },
  drag_drop_xml: { uk: "Перетягніть XML файл сюди або натисніть для вибору", en: "Drag & drop XML file here or click to select" },
  
  // Structure tab
  xml_structure: { uk: "Структура XML", en: "XML Structure" },
  root_element: { uk: "Кореневий елемент", en: "Root Element" },
  total_fields: { uk: "Всього полів", en: "Total Fields" },
  fields_found: { uk: "полів знайдено", en: "fields found" },
  
  // Mapping tab
  field_mapping: { uk: "Маппінг полей", en: "Field Mapping" },
  configure_mapping: { uk: "Налаштування відповідності полей", en: "Configure Field Mapping" },
  required_fields_configured: { uk: "обов'язкових полів налаштовано", en: "required fields configured" },
  xml_fields: { uk: "Поля XML", en: "XML Fields" },
  system_fields: { uk: "Системні поля", en: "System Fields" },
  mapping_rules: { uk: "Правила маппінгу", en: "Mapping Rules" },
  
  // Preview tab
  mapping_preview: { uk: "Предпросмотр маппінгу", en: "Mapping Preview" },
  save_template: { uk: "Зберегти шаблон", en: "Save Template" },
  template_saved: { uk: "Шаблон збережено", en: "Template saved" },
  failed_save_template: { uk: "Не вдалося зберегти шаблон", en: "Failed to save template" },
  
  // Messages
  xml_loaded: { uk: "XML успішно завантажено", en: "XML loaded successfully" },
  xml_parse_error: { uk: "Помилка парсингу XML", en: "XML parsing error" },
  items_found: { uk: "елементів знайдено", en: "items found" },
  parsing_xml: { uk: "Парсинг XML...", en: "Parsing XML..." },
  loading_xml: { uk: "Завантаження XML...", en: "Loading XML..." },
  
  // Template list
  no_templates: { uk: "Шаблони не знайдено", en: "No templates found" },
  template_name: { uk: "Назва шаблону", en: "Template Name" },
  template_description: { uk: "Опис шаблону", en: "Template Description" },
  enter_template_name: { uk: "Введіть назву шаблону", en: "Enter template name" },
  enter_template_description: { uk: "Введіть опис шаблону", en: "Enter template description" },
  
  // Tabs
  tab_upload: { uk: "Загрузка XML", en: "Upload XML" },
  tab_structure: { uk: "Структура", en: "Structure" },
  tab_mapping: { uk: "Маппінг полей", en: "Field Mapping" },
  tab_preview: { uk: "Предпросмотр", en: "Preview" },
  
  // Template settings
  template_settings: { uk: "Налаштування шаблону", en: "Template Settings" },
  loading_admin_dashboard: { uk: "Завантаження панелі адміністратора...", en: "Loading admin dashboard..." },
  
  // Stats
  parse_time: { uk: "Час парсингу", en: "Parse Time" },
  file_size: { uk: "Розмір файлу", en: "File Size" },
  items_count: { uk: "Кількість елементів", en: "Items Count" },
  
  // Field types
  field_type_string: { uk: "Рядок", en: "String" },
  field_type_number: { uk: "Число", en: "Number" },
  field_type_array: { uk: "Масив", en: "Array" },
  field_type_object: { uk: "Об'єкт", en: "Object" },
  field_type_boolean: { uk: "Логічний", en: "Boolean" },
  
  // Transformation types
  transformation_direct: { uk: "Пряме", en: "Direct" },
  transformation_concat: { uk: "Об'єднання", en: "Concatenate" },
  transformation_split: { uk: "Розділення", en: "Split" },
  transformation_custom: { uk: "Довільне", en: "Custom" },
  
  // Store Templates specific
  marketplace: { uk: "Маркетплейс", en: "Marketplace" },
  enter_marketplace_name: { uk: "Введіть назву маркетплейсу", en: "Enter marketplace name" },
};

// User Statistics
const userStatisticsDictionary = {
  total_users: { uk: "Всього користувачів", en: "Total Users" },
  active_users: { uk: "Активні користувачі", en: "Active Users" },
  registered_users: { uk: "Зареєстровані користувачі", en: "Registered Users" },
  user_statistics: { uk: "Статистика користувачів", en: "User Statistics" },
};

// Tariff Statistics
const tariffStatisticsDictionary = {
  active_tariffs: { uk: "Активні тарифи", en: "Active Tariffs" },
  tariff_plans: { uk: "тарифних планів", en: "tariff plans" },
  error_fetch_tariffs: { uk: "Помилка завантаження тарифів", en: "Error fetching tariffs" },
  tariff_duplicated_successfully: { uk: "Тариф успішно продубльовано", en: "Tariff duplicated successfully" },
  failed_to_duplicate_tariff: { uk: "Не вдалося продублювати тариф", en: "Failed to duplicate tariff" },
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
  success: { uk: "Успіх", en: "Success" },
  form_submitted: { uk: "Форму успішно надіслано!", en: "Form submitted successfully!" },
  
  // User Management notifications (from useUsers hook)
  user_created_success: { uk: "Користувача успішно створено", en: "User created successfully" },
  user_updated_success: { uk: "Користувача успішно оновлено", en: "User updated successfully" },
  user_deleted_success: { uk: "Користувача успішно видалено", en: "User deleted successfully" },
  user_fully_deleted: { uk: "Користувача повністю видалено з системи", en: "User completely removed from system" },
  user_profile_deleted: { uk: "Профіль користувача видалено", en: "User profile deleted" },
  user_auth_deleted: { uk: "Авторизацію користувача видалено", en: "User authentication deleted" },
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
  
  // Product Form Tabs
  product_tab_main: { uk: "Основні дані", en: "Main Data" },
  product_tab_description: { uk: "Опис", en: "Description" },
  product_tab_images: { uk: "Зображення", en: "Images" },
  // Rename tab from "Параметри" to "Характеристики" (uk/en)
  product_tab_parameters: { uk: "Характеристики", en: "Characteristics" },
  product_tab_seo: { uk: "SEO", en: "SEO" },

  // Image Upload notifications
  image_added_successfully: { uk: "Зображення додано успішно", en: "Image added successfully" },
  invalid_image_format: { uk: "Невірний формат зображення", en: "Invalid image format" },
  invalid_file_type: { uk: "Неприпустимий тип файлу", en: "Invalid file type" },
  unauthorized_upload: { uk: "Помилка авторизації при завантаженні", en: "Unauthorized upload" },
  file_too_large: { uk: "Файл занадто великий", en: "File too large" },
  file_too_large_5mb: { uk: "Файл занадто великий (максимум 5 МБ)", en: "File too large (max 5MB)" },
  choose_image_file: { uk: "Виберіть файл зображення", en: "Choose an image file" },
  upload_unauthorized: { uk: "Завантаження неавторизоване", en: "Upload unauthorized" },
  upload_server_error: { uk: "Помилка сервера під час завантаження", en: "Server error during upload" },
  
  // Product Form Fields
  product_main_data: { uk: "Основні дані", en: "Main Data" },
  product_names_description: { uk: "Назви та опис", en: "Names and Description" },
  product_category_prices: { uk: "Категорія та ціни", en: "Category and Prices" },
  product_additional_info: { uk: "Додаткова інформація", en: "Additional Information" },
  
  // Form Field Labels
  store: { uk: "Магазин", en: "Store" },
  select_store: { uk: "Оберіть магазин", en: "Select store" },
  supplier: { uk: "Постачальник", en: "Supplier" },
  select_supplier: { uk: "Оберіть постачальника", en: "Select supplier" },
  external_id: { uk: "Зовнішній ID", en: "External ID" },
  external_id_placeholder: { uk: "Введіть зовнішній ID", en: "Enter external ID" },
  article: { uk: "Артикул", en: "Article" },
  article_placeholder: { uk: "Введіть артикул", en: "Enter article" },
  product_name_uk: { uk: "Назва (українська)", en: "Name (Ukrainian)" },
  product_name_uk_placeholder: { uk: "Введіть назву українською", en: "Enter name in Ukrainian" },
  product_name_en: { uk: "Назва (англійська)", en: "Name (English)" },
  product_name_en_placeholder: { uk: "Введіть назву англійською", en: "Enter name in English" },
  description_uk: { uk: "Опис (українська)", en: "Description (Ukrainian)" },
  description_uk_placeholder: { uk: "Введіть опис українською", en: "Enter description in Ukrainian" },
  description_en: { uk: "Опис (англійська)", en: "Description (English)" },
  description_en_placeholder: { uk: "Введіть опис англійською", en: "Enter description in English" },
  manufacturer: { uk: "Виробник", en: "Manufacturer" },
  manufacturer_placeholder: { uk: "Введіть виробника", en: "Enter manufacturer" },
  vendor: { uk: "Виробник", en: "Vendor" },
  category: { uk: "Категорія", en: "Category" },
  select_category: { uk: "Оберіть категорію", en: "Select category" },
  currency: { uk: "Валюта", en: "Currency" },
  select_currency: { uk: "Оберіть валюту", en: "Select currency" },
  purchase_price: { uk: "Закупівельна ціна", en: "Purchase Price" },
  purchase_price_placeholder: { uk: "0.00", en: "0.00" },
  selling_price: { uk: "Продажна ціна", en: "Selling Price" },
  selling_price_placeholder: { uk: "0.00", en: "0.00" },
  weight: { uk: "Вага (кг)", en: "Weight (kg)" },
  weight_placeholder: { uk: "0.00", en: "0.00" },
  dimensions: { uk: "Розміри (см)", en: "Dimensions (cm)" },
  dimensions_placeholder: { uk: "Д x Ш x В", en: "L x W x H" },
  
  // Product form placeholders
  product_photos: { uk: "Фото товару", en: "Product Photos" },
  add_product_photo: { uk: "Додати фото товару", en: "Add product photo" },
  click_to_upload: { uk: "Натисніть для завантаження", en: "Click to upload" },
  main_image: { uk: "Головне", en: "Main" },
  set_as_main: { uk: "Зробити головним", en: "Set as main" },
  
  // Additional missing keys for ProductFormTabs
  product_main_info: { uk: "Основна інформація про товар", en: "Main Product Information" },
  product_name_ru: { uk: "Назва товару (рос.)", en: "Product Name (Russian)" },
  product_name_ru_placeholder: { uk: "Введіть назву товару російською", en: "Enter product name in Russian" },
  product_description_ru: { uk: "Опис товару (рос.)", en: "Product Description (Russian)" },
  product_description_ru_placeholder: { uk: "Введіть опис товару російською", en: "Enter product description in Russian" },
  product_description_uk: { uk: "Опис товару (укр.)", en: "Product Description (Ukrainian)" },
  product_description_uk_placeholder: { uk: "Введіть опис товару українською", en: "Enter product description in Ukrainian" },
  product_url: { uk: "URL товару", en: "Product URL" },
  product_url_placeholder: { uk: "Введіть URL товару", en: "Enter product URL" },
  // Category editor
  category_editor_title: { uk: "Редактор категорій", en: "Category Editor" },
  categories_title: { uk: "Категорії", en: "Categories" },
  new_category: { uk: "Нова категорія", en: "New Category" },
  create_category_modal_title: { uk: "Створити категорію", en: "Create Category" },
  add_subcategory: { uk: "Додати підкатегорію", en: "Add subcategory" },
  rename_category: { uk: "Перейменувати категорію", en: "Rename category" },
  delete_category: { uk: "Видалити категорію", en: "Delete category" },
  confirm_delete_category: { uk: "Підтвердьте видалення категорії", en: "Confirm category deletion" },
  parent_category: { uk: "Батьківська категорія", en: "Parent Category" },
  select_parent_category: { uk: "Оберіть батьківську категорію", en: "Select parent category" },
  category_name: { uk: "Назва категорії", en: "Category Name" },
  category_name_placeholder: { uk: "Введіть назву категорії", en: "Enter category name" },
  loading_creating: { uk: "Створення...", en: "Creating..." },
  create_category: { uk: "Створити категорію", en: "Create Category" },
  category_created: { uk: "Категорію створено", en: "Category created" },
  category_deleted: { uk: "Категорію видалено", en: "Category deleted" },
  deleting_category_title: { uk: "Видалення категорії", en: "Deleting category" },
  deleting_category: { uk: "Йде видалення", en: "Deleting" },
  failed_create_category: { uk: "Не вдалося створити категорію", en: "Failed to create category" },
  failed_delete_category: { uk: "Не вдалося видалити категорію", en: "Failed to delete category" },
  external_id_exists: { uk: "Такий зовнішній ID вже існує для цього постачальника", en: "This external ID already exists for this supplier" },
  fill_required_fields: { uk: "Заповніть обов'язкові поля", en: "Fill required fields" },
  select_supplier_error: { uk: "Оберіть постачальника", en: "Select a supplier" },
  no_categories_title: { uk: "Немає категорій", en: "No Categories" },
  no_categories_description: { uk: "Додайте першу категорію, щоб почати", en: "Add your first category to get started" },
  // Placeholders for numeric inputs
  price_placeholder: { uk: "0.00", en: "0.00" },
  stock_quantity_placeholder: { uk: "0", en: "0" },
  // File picker button
  choose_file: { uk: "Вибрати файл", en: "Choose file" },
  store_supplier: { uk: "Магазин та постачальник", en: "Store and Supplier" },
  prices_stock: { uk: "Ціни та склад", en: "Prices and Stock" },
  
  // Button texts
  btn_update: { uk: "Оновити", en: "Update" },
  btn_create: { uk: "Створити", en: "Create" },
  btn_cancel: { uk: "Скасувати", en: "Cancel" },
  
  // Product form additional translations
  current_price: { uk: "Поточна ціна", en: "Current Price" },
  old_price: { uk: "Стара ціна", en: "Old Price" },
  promo_price: { uk: "Акційна ціна", en: "Promo Price" },
  stock_quantity: { uk: "Кількість", en: "Stock" },
  product_available: { uk: "Товар доступний", en: "Product Available" },
  product_images: { uk: "Зображення товару", en: "Product Images" },
  add_image_url: { uk: "Додати зображення по URL", en: "Add Image by URL" },
  image_url_placeholder: { uk: "Введіть URL зображення", en: "Enter image URL" },
  add: { uk: "Додати", en: "Add" },
  upload_file: { uk: "Завантажити файл", en: "Upload File" },
  upload: { uk: "Завантажити", en: "Upload" },
  file_upload_later: { uk: "Завантаження файлів буде реалізовано пізніше", en: "File upload will be implemented later" },
  no_images_added: { uk: "Зображення не додані", en: "No Images Added" },
  add_images_instruction: { uk: "Додайте зображення по URL або натисніть/перетягніть у зону", en: "Add images by URL or click/drag into the drop zone" },
  drop_image_here: { uk: "Перетягніть зображення сюди", en: "Drop image here" },
  image_types_and_limit: { uk: "Формати: JPEG, PNG, WebP, AVIF, GIF, SVG • Макс. 5 МБ", en: "Formats: JPEG, PNG, WebP, AVIF, GIF, SVG • Max 5MB" },
  added_images: { uk: "Додані зображення", en: "Added Images" },
  main_photo: { uk: "Головне", en: "Main" },
  set_as_main_photo: { uk: "Зробити головним", en: "Set as main" },
  product_characteristics: { uk: "Характеристики товару", en: "Product Characteristics" },
  add_characteristic: { uk: "Додати характеристику", en: "Add Characteristic" },
  no_characteristics_added: { uk: "Характеристики не додані", en: "No Characteristics Added" },
  add_characteristics_instruction: { uk: "Додайте характеристики для детального опису товару", en: "Add characteristics for detailed product description" },
  characteristic_name: { uk: "Назва характеристики", en: "Characteristic Name" },
  value: { uk: "Значення", en: "Value" },
  characteristic_name_placeholder: { uk: "Назва характеристики", en: "Characteristic name" },
  characteristic_value_placeholder: { uk: "Значення характеристики", en: "Characteristic value" },
  param_id_placeholder: { uk: "ID параметра", en: "Parameter ID" },
  value_id_placeholder: { uk: "ID значення", en: "Value ID" },
  edit_characteristic: { uk: "Редагувати характеристику", en: "Edit Characteristic" },
  param_id_optional: { uk: "Param ID (необов'язково)", en: "Param ID (optional)" },
  value_id_optional: { uk: "Value ID (необов'язково)", en: "Value ID (optional)" },
  // Parameters data table
  param_id: { uk: "Param ID", en: "Param ID" },
  value_id: { uk: "Value ID", en: "Value ID" },
  order: { uk: "Порядок", en: "Order" },
  actions: { uk: "Дії", en: "Actions" },
  select_all: { uk: "Вибрати все", en: "Select all" },
  select_row: { uk: "Вибрати рядок", en: "Select row" },
  filter: { uk: "Фільтр", en: "Filter" },
  search_placeholder: { uk: "Пошук за назвою", en: "Search by name" },
  delete_selected: { uk: "Видалити вибране", en: "Delete selected" },
  customize_columns: { uk: "Налаштувати колонки", en: "Customize Columns" },
  columns_short: { uk: "Колонки", en: "Columns" },
  no_results: { uk: "Немає результатів", en: "No results" },
  clear: { uk: "Очистити", en: "Clear" },
  sort_asc: { uk: "Сортувати за зростанням", en: "Sort ascending" },
  sort_desc: { uk: "Сортувати за спаданням", en: "Sort descending" },
  rows_selected: { uk: "Вибрано", en: "Selected" },
  // ParametersDataTable toolbar
  page_size: { uk: "Кількість рядків", en: "Rows per page" },
  page_of: { uk: "Сторінка", en: "Page" },
  page_of_connector: { uk: "з", en: "of" },
  first_page: { uk: "Перша сторінка", en: "First page" },
  previous_page: { uk: "Попередня сторінка", en: "Previous page" },
  next_page: { uk: "Наступна сторінка", en: "Next page" },
  last_page: { uk: "Остання сторінка", en: "Last page" },
  btn_delete_selected: { uk: "Видалити вибране", en: "Delete selected" },
  view_options: { uk: "Опції перегляду", en: "View options" },
  toggle_columns: { uk: "Перемикання колонок", en: "Toggle columns" },
  
  // Currency translations
  currency_uah: { uk: "UAH - Гривня", en: "UAH - Hryvnia" },
  currency_usd: { uk: "USD - Долар", en: "USD - Dollar" },
  currency_eur: { uk: "EUR - Євро", en: "EUR - Euro" },
  
  // Additional product form translations
  failed_load_data: { uk: "Помилка завантаження даних", en: "Failed to load data" },
  failed_load_product_data: { uk: "Помилка завантаження даних товару", en: "Failed to load product data" },
  product_name_required: { uk: "Назва товару обов'язкова", en: "Product name is required" },
  product_saved_successfully: { uk: "Товар успішно збережено", en: "Product saved successfully" },
  image_uploaded_successfully: { uk: "Зображення завантажено", en: "Image uploaded successfully" },
  failed_upload_image: { uk: "Помилка завантаження зображення", en: "Failed to upload image" },
  image_deleted_successfully: { uk: "Зображення видалено", en: "Image deleted successfully" },
  failed_delete_image: { uk: "Не вдалося видалити зображення", en: "Failed to delete image" },
  create_new_product: { uk: "Створити новий товар", en: "Create New Product" },
  product_status: { uk: "Статус", en: "Status" },
  select_status: { uk: "Оберіть статус", en: "Select Status" },
  status_new: { uk: "Новий", en: "New" },
  status_stock: { uk: "Уцінений", en: "Stock" },
  status_used: { uk: "Вживаний", en: "Used" },
  status_refurbished: { uk: "Відновлений", en: "Refurbished" },
  status_active: { uk: "Активний", en: "Active" },
  status_inactive: { uk: "Неактивний", en: "Inactive" },
  status_archived: { uk: "Архівний", en: "Archived" },
  add_image_by_url: { uk: "Додати зображення по URL", en: "Add Image by URL" },
  name: { uk: "Назва", en: "Name" },
  value_example: { uk: "Наприклад: Червоний, XL, Бавовна", en: "Example: Red, XL, Cotton" },
  
  // Product form field translations
  product_name_ua: { uk: "Назва товару", en: "Product Name" },
  product_name_ua_placeholder: { uk: "Введіть назву товару українською", en: "Enter product name in Ukrainian" },
  product_description_ua: { uk: "Опис товару", en: "Product Description" },
  product_description_ua_placeholder: { uk: "Введіть опис товару українською", en: "Enter product description in Ukrainian" },
  product_description_en: { uk: "Опис товару (англійською)", en: "Product Description (English)" },
  product_description_en_placeholder: { uk: "Введіть опис товару англійською", en: "Enter product description in English" },
  category_prices: { uk: "Ціна товару", en: "Product Price" },
  
  // Language tabs for product names and descriptions
  product_name_ukrainian_tab: { uk: "Назва товару", en: "Product Name" },
  product_name_russian_tab: { uk: "Назва товару (російською)", en: "Product Name (Russian)" },
  short_name: { uk: "Коротка назва", en: "Short Name" },
  short_name_ua: { uk: "Коротка назва", en: "Short Name UA" },
  short_name_placeholder: { uk: "Введіть коротку назву", en: "Enter short name" },
  product_name: { uk: "Назва товару", en: "Product Name" },
  product_name_placeholder: { uk: "Введіть назву товару", en: "Enter product name" },
  product_description: { uk: "Опис товару", en: "Product Description" },
  product_description_placeholder: { uk: "Введіть опис товару", en: "Enter product description" },
  
  // Dev diagnostics
  dev_title: { uk: "Діагностика (Dev)", en: "Diagnostics (Dev)" },
  dev_indicator: { uk: "Dev", en: "Dev" },
  dev_toggle: { uk: "Показати/сховати діагностику", en: "Toggle diagnostics" },
  dev_clear: { uk: "Очистити", en: "Clear" },
  dev_close: { uk: "Закрити", en: "Close" },
  dev_empty: { uk: "Логи відсутні", en: "No logs yet" },
  dev_total_label: { uk: "Записів", en: "Logs" },
};

// Merge dictionaries
Object.assign(dictionary, userStatisticsDictionary, tariffStatisticsDictionary, errorMessagesDictionary, successMessagesDictionary, toastDictionary);

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
