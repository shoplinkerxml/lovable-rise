import type { Dictionary } from "../types";

export const commonDictionary: Dictionary = {
  store_templates_title: { uk: "Шаблони XML", en: "XML Templates" },
  store_templates_description: { uk: "Керування шаблонами XML для маркетплейсів", en: "Manage XML templates for marketplaces" },
  create_template: { uk: "Створити шаблон", en: "Create template" },
  edit_template: { uk: "Редагувати шаблон", en: "Edit template" },
  back_to_templates: { uk: "Назад до шаблонів", en: "Back to templates" },
  tab_upload: { uk: "Завантаження XML", en: "Upload XML" },
  tab_structure: { uk: "Структура XML", en: "XML Structure" },
  tab_mapping: { uk: "Перевірка парсингу", en: "Mapping review" },
  fields_found: { uk: "полів знайдено", en: "fields found" },
  enter_template_name: { uk: "Введіть назву шаблону", en: "Enter template name" },
  xml_parse_error: { uk: "Помилка парсингу XML", en: "XML parsing error" },
  template_saved: { uk: "Шаблон збережено", en: "Template saved" },
  failed_save_template: { uk: "Не вдалося зберегти шаблон", en: "Failed to save template" },
  no_templates: { uk: "Немає шаблонів", en: "No templates" },
  no_templates_description: {
    uk: "Створіть перший XML шаблон для маркетплейсу",
    en: "Create the first XML template for a marketplace",
  },
  template_deleted: { uk: "Шаблон видалено", en: "Template deleted" },
  failed_delete_template: {
    uk: "Помилка видалення шаблону",
    en: "Failed to delete template",
  },
  delete_template_confirm: {
    uk: "Видалити шаблон?",
    en: "Delete template?",
  },
  delete_template_warning: {
    uk: "Цю дію неможливо скасувати.",
    en: "This action cannot be undone.",
  },
  delete_template_name_prefix: {
    uk: "Шаблон",
    en: "Template",
  },

  limits_title: { uk: "Ліміти", en: "Limits" },
  limits_description: { uk: "Керування системними лімітами", en: "Manage system limits" },
  create_limit: { uk: "Створити ліміт", en: "Create limit" },
  create_limit_description: { uk: "Створення нового ліміту", en: "Create a new limit" },
  edit_limit_main: { uk: "Редагувати ліміт", en: "Edit limit" },
  edit_limit_description: { uk: "Редагування параметрів ліміту", en: "Edit limit parameters" },
  back_to_limits: { uk: "Назад до лімітів", en: "Back to limits" },
  no_limits: { uk: "Немає лімітів", en: "No limits" },
  no_limits_description: { uk: "Додайте перший ліміт", en: "Add your first limit" },
  add_limit_btn: { uk: "Створити ліміт", en: "Create limit" },
  limit_name_field: { uk: "Назва ліміту", en: "Limit name" },
  limit_code_field: { uk: "Код", en: "Code" },
  limit_description_field: { uk: "Опис", en: "Description" },
  limit_path_field: { uk: "Шлях", en: "Path" },
  limit_name_placeholder: {
    uk: "Введіть назву ліміту",
    en: "Enter limit name",
  },
  limit_code_placeholder: {
    uk: "Наприклад, products_limit_per_shop",
    en: "For example, products_limit_per_shop",
  },
  limit_code_hint: {
    uk: "Використовуйте тільки малі літери, цифри та підкреслення",
    en: "Use only lowercase letters, digits and underscores",
  },
  limit_name_required: {
    uk: "Введіть назву ліміту",
    en: "Enter limit name",
  },
  limit_code_required: {
    uk: "Введіть код ліміту",
    en: "Enter limit code",
  },
  limit_code_format_error: {
    uk: "Код має бути у форматі snake_case",
    en: "Code must be in snake_case format",
  },
  limit_path_placeholder: {
    uk: "Наприклад, /functions/v1/get-product-limit",
    en: "For example, /functions/v1/get-product-limit",
  },
  limit_path_hint: {
    uk: "Необов'язково. Використовується для документації або внутрішніх посилань",
    en: "Optional. Used for documentation or internal links",
  },
  limit_description_placeholder: {
    uk: "Короткий опис призначення ліміту",
    en: "Short description of the limit purpose",
  },
  limit_created: { uk: "Ліміт створено", en: "Limit created" },
  limit_updated: { uk: "Ліміт оновлено", en: "Limit updated" },
  limit_deleted: { uk: "Ліміт видалено", en: "Limit deleted" },
  failed_save_limit: {
    uk: "Не вдалося зберегти ліміт",
    en: "Failed to save limit",
  },
  failed_load_limits: {
    uk: "Не вдалося завантажити ліміти",
    en: "Failed to load limits",
  },
  failed_delete_limit: {
    uk: "Помилка видалення ліміту",
    en: "Failed to delete limit",
  },
  limits_order_updated: {
    uk: "Порядок лімітів оновлено",
    en: "Limits order updated",
  },
  failed_update_limits_order: {
    uk: "Помилка оновлення порядку лімітів",
    en: "Failed to update limits order",
  },
  delete_limit_confirm: {
    uk: "Видалити ліміт?",
    en: "Delete limit?",
  },
  delete_limit_warning: {
    uk: "Цю дію неможливо скасувати.",
    en: "This action cannot be undone.",
  },
  delete_limit_name_prefix: {
    uk: "Обмеження",
    en: "Limit",
  },
  form_validation_description: {
    uk: "Демонстрації валідації та допоміжні засоби.",
    en: "Validation demos and helpers.",
  },
  nav_features: { uk: "Можливості", en: "Features" },
  nav_how_it_works: { uk: "Як це працює", en: "How it works" },
  nav_pricing: { uk: "Тарифи", en: "Pricing" },
  brand_name: { uk: "MarketGrow", en: "MarketGrow" },
  hero_badge: {
    uk: "Автоматизація бізнесу на маркетплейсах",
    en: "Marketplace Business Automation",
  },
  hero_title_1: { uk: "Збільшуйте продажі на", en: "Boost your" },
  hero_title_accent: { uk: "маркетплейсах", en: "marketplace sales" },
  hero_title_2: { uk: "на автопілоті", en: "on autopilot" },
  hero_subtitle: {
    uk: "Автоматизуємо роботу з прайсами та постачальниками. Перетворюємо складні дані в простий прибуток. Економимо ваш час для росту бізнесу.",
    en: "Automate price lists and supplier management. Turn complex data into simple profit. Save your time for business growth.",
  },
  hero_cta_primary: {
    uk: "Спробувати безкоштовно",
    en: "Try for free",
  },
  hero_cta_secondary: {
    uk: "Дізнатися більше",
    en: "Learn more",
  },
  hero_stat_1: { uk: "Зростання прибутку", en: "Profit growth" },
  hero_stat_2: { uk: "Економія часу", en: "Time saved" },
  hero_stat_3: { uk: "Задоволених клієнтів", en: "Happy clients" },
  solutions_badge: { uk: "Наше рішення", en: "Our solution" },
  solutions_title: {
    uk: "Перетворюємо проблеми в",
    en: "Turn problems into",
  },
  solutions_accent: { uk: "можливості", en: "opportunities" },
  solutions_subtitle: {
    uk: "Повна автоматизація обробки прайсів від завантаження до розміщення на маркетплейсах",
    en: "Complete automation of price list processing from upload to marketplace deployment",
  },
  solution_1_title: {
    uk: "Автоматизуємо рутину",
    en: "Automate routine",
  },
  solution_1_desc: {
    uk: "Завантажуєте файл — отримуєте готові картки товарів за хвилини, а не години",
    en: "Upload a file — get ready product cards in minutes, not hours",
  },
  solution_1_feature_1: {
    uk: "Підтримка всіх форматів",
    en: "All formats supported",
  },
  solution_1_feature_2: {
    uk: "Розумне розпізнавання",
    en: "Smart recognition",
  },
  solution_1_feature_3: {
    uk: "Автоматична категоризація",
    en: "Auto categorization",
  },
  solution_2_title: {
    uk: "Готуємо дані для продажу",
    en: "Prepare data for sales",
  },
  solution_2_desc: {
    uk: "Оптимізуємо описи, ціни та характеристики під кожен маркетплейс",
    en: "Optimize descriptions, prices and specs for each marketplace",
  },
  solution_2_feature_1: { uk: "SEO-оптимізація", en: "SEO optimization" },
  solution_2_feature_2: {
    uk: "Аналіз конкурентів",
    en: "Competitor analysis",
  },
  solution_2_feature_3: {
    uk: "Динамічне ціноутворення",
    en: "Dynamic pricing",
  },
  solution_3_title: { uk: "Збільшуємо прибуток", en: "Increase profit" },
  solution_3_desc: {
    uk: "Знижуємо витрати часу на 90% і підвищуємо конверсію продажів на 30%",
    en: "Reduce time costs by 90% and increase sales conversion by 30%",
  },
  solution_3_feature_1: { uk: "Миттєве завантаження", en: "Instant upload" },
  solution_3_feature_2: { uk: "Аналітика продажів", en: "Sales analytics" },
  solution_3_feature_3: {
    uk: "Рекомендації по зростанню",
    en: "Growth recommendations",
  },
  before_after_title: { uk: "До → Після", en: "Before → After" },
  before_title: { uk: "❌ Було", en: "❌ Before" },
  before_1: {
    uk: "20 годин обробки прайсів",
    en: "20 hours of price list processing",
  },
  before_2: {
    uk: "Постійні помилки в даних",
    en: "Constant data errors",
  },
  before_3: {
    uk: "Низька швидкість завантаження товарів",
    en: "Low product upload speed",
  },
  before_4: {
    uk: "Втрати прибутку до 30%",
    en: "Profit loss up to 30%",
  },
  after_title: { uk: "✅ Стало", en: "✅ After" },
  after_1: {
    uk: "2 години на повну автоматизацію",
    en: "2 hours for full automation",
  },
  after_2: {
    uk: "99.9% точність обробки",
    en: "99.9% processing accuracy",
  },
  after_3: {
    uk: "Миттєве завантаження на маркетплейси",
    en: "Instant marketplace upload",
  },
  after_4: {
    uk: "Зростання прибутку на 30-50%",
    en: "Profit growth 30-50%",
  },
  cta_get_result: {
    uk: "Отримати результат зараз",
    en: "Get results now",
  },
  hero_title: {
    uk: "Допомагаємо бізнесу на маркетплейсах",
    en: "We help businesses on marketplaces",
  },
  hero_desc: {
    uk: "Перетворюємо складні прайси постачальників на акуратний каталог. Автоматизуємо обробку Excel/CSV/XML, пришвидшуємо запуск карток і підвищуємо продажі завдяки якісним даним.",
    en: "We turn complex supplier price lists into a clean catalog. We automate Excel/CSV/XML processing, speed up product launches, and increase sales with high‑quality data.",
  },
  features_title: { uk: "Що всередині", en: "What’s inside" },
  features_subtitle: {
    uk: "Ключові можливості платформи",
    en: "Key platform capabilities",
  },
  feat_integrations: {
    uk: "Інтеграції з постачальниками",
    en: "Supplier integrations",
  },
  feat_convert: {
    uk: "Конвертація Excel/CSV/XML",
    en: "Excel/CSV/XML conversion",
  },
  feat_mapping: {
    uk: "Автозіставлення категорій",
    en: "Automatic category mapping",
  },
  feat_enrichment: {
    uk: "Збагачення та чистка даних",
    en: "Data enrichment and cleaning",
  },
  feat_export: {
    uk: "Експорт на маркетплейси",
    en: "Export to marketplaces",
  },
  feat_analytics: { uk: "Єдина аналітика", en: "Unified analytics" },
  loading: { uk: "Завантаження...", en: "Loading..." },
  saving: { uk: "Збереження...", en: "Saving..." },
  operation_failed: {
    uk: "Збій операції",
    en: "Operation failed",
  },
  script_updated: { uk: "Скрипт оновлено!", en: "Script updated!" },
  script_saved: {
    uk: "Postman скрипт збережено",
    en: "Postman script saved",
  },
  api_key_saved: { uk: "API ключ збережено!", en: "API key saved!" },
  api_key_used: {
    uk: "API ключ буде використовуватися у всіх запитах",
    en: "API key will be used in all requests",
  },
  copied: { uk: "Скопійовано!", en: "Copied!" },
  copied_clipboard: {
    uk: "Код скопійовано в буфер обміну",
    en: "Code copied to clipboard",
  },
  collection_downloaded: {
    uk: "Колекція завантажена!",
    en: "Collection downloaded!",
  },
  collection_ready: {
    uk: "Postman колекція готова до імпорту",
    en: "Postman collection ready for import",
  },
  breadcrumb_home: { uk: "Головна", en: "Home" },
  menu_main: { uk: "Головна", en: "Home" },
  menu_dashboard: { uk: "Панель управління", en: "Dashboard" },
  menu_forms: { uk: "Форми", en: "Forms" },
  menu_settings: { uk: "Налаштування", en: "Settings" },
  menu_users: { uk: "Користувачі", en: "Users" },
  menu_analytics: { uk: "Аналітика", en: "Analytics" },
  menu_reports: { uk: "Звіти", en: "Reports" },
  menu_content: { uk: "Контент", en: "Content" },
  menu_categories: { uk: "Категорії", en: "Categories" },
  menu_products: { uk: "Товари", en: "Products" },
  menu_pricing: { uk: "Тарифні плани", en: "Pricing Plans" },
  menu_currency: { uk: "Валюта", en: "Currency" },
  menu_payment: { uk: "Платіжні системи", en: "Payment Systems" },
  menu_tariff_features: { uk: "Функції тарифів", en: "Tariff Features" },
  duplicate_menu_item: {
    uk: "Дублювати пункт меню",
    en: "Duplicate menu item",
  },
  delete_menu_item: {
    uk: "Видалити пункт меню",
    en: "Delete menu item",
  },
  feature_not_implemented: {
    uk: "Функція ще не реалізована",
    en: "This feature is not implemented yet",
  },
  edit: { uk: "Редагувати", en: "Edit" },
  delete: { uk: "Видалити", en: "Delete" },
  duplicate: { uk: "Дублювати", en: "Duplicate" },
  content: { uk: "Контент", en: "Content" },
  no_content_available: {
    uk: "Контент ще не додано",
    en: "No content available yet",
  },
  add_content: { uk: "Додати контент", en: "Add content" },
  configure_form_fields_in_admin: {
    uk: "Налаштуйте поля форми в адмін‑панелі",
    en: "Configure form fields in the admin panel",
  },
  submit: { uk: "Надіслати", en: "Submit" },
  no_form_fields_defined: {
    uk: "Поля форми ще не налаштовані",
    en: "Form fields are not configured yet",
  },
  configure_form: {
    uk: "Налаштувати форму",
    en: "Configure form",
  },
  displaying_data_from_api_source: {
    uk: "Відображення даних з API‑джерела",
    en: "Displaying data from API source",
  },
  sample_data: { uk: "Приклад даних", en: "Sample data" },
  no_columns_defined: {
    uk: "Колонки таблиці ще не налаштовані",
    en: "Table columns are not configured yet",
  },
  configure_table: {
    uk: "Налаштувати таблицю",
    en: "Configure table",
  },
  widget_content_placeholder: {
    uk: "Місце для вмісту віджета",
    en: "Placeholder for widget content",
  },
  custom_page_with_custom_components: {
    uk: "Користувацька сторінка з кастомними компонентами",
    en: "Custom page with custom components",
  },
  no_description: {
    uk: "Опис відсутній",
    en: "No description provided",
  },
  cancel: { uk: "Скасувати", en: "Cancel" },
};
