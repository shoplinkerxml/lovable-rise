export interface TranslationEntry {
  key: string;
  en: string;
  uk?: string;
  [locale: string]: string | undefined;
}

export interface TranslationDict {
  [key: string]: TranslationEntry;
}

export type SupportedLocale = 'en' | 'uk';

export class TranslationManager {
  private static instance: TranslationManager;
  private translations: TranslationDict = {};
  private currentLocale: SupportedLocale = 'en';
  private fallbackLocale: SupportedLocale = 'en';

  private constructor() {
    // Initialize with default translations
    this.loadDefaultTranslations();
  }

  static getInstance(): TranslationManager {
    if (!TranslationManager.instance) {
      TranslationManager.instance = new TranslationManager();
    }
    return TranslationManager.instance;
  }

  /**
   * Set the current locale for translations
   */
  setLocale(locale: SupportedLocale): void {
    this.currentLocale = locale;
  }

  /**
   * Get the current locale
   */
  getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  /**
   * Set the fallback locale
   */
  setFallbackLocale(locale: SupportedLocale): void {
    this.fallbackLocale = locale;
  }

  /**
   * Translate a key to the current locale
   */
  translate(key: string, fallback?: string): string {
    const entry = this.translations[key];
    
    if (entry) {
      // Try current locale first
      const translation = entry[this.currentLocale];
      if (translation) {
        return translation;
      }
      
      // Fallback to fallback locale
      const fallbackTranslation = entry[this.fallbackLocale];
      if (fallbackTranslation) {
        return fallbackTranslation;
      }
    }
    
    // Return fallback or key itself
    return fallback || key;
  }

  /**
   * Add or update translation entries
   */
  addTranslations(translations: Record<string, Partial<TranslationEntry>>): void {
    Object.entries(translations).forEach(([key, entry]) => {
      if (this.translations[key]) {
        // Merge with existing entry
        this.translations[key] = { ...this.translations[key], ...entry, key };
      } else {
        // Create new entry
        this.translations[key] = { key, en: key, ...entry };
      }
    });
  }

  /**
   * Add translation for a specific locale
   */
  addTranslation(key: string, locale: SupportedLocale, translation: string): void {
    if (!this.translations[key]) {
      this.translations[key] = { key, en: key };
    }
    this.translations[key][locale] = translation;
  }

  /**
   * Get all translations for a locale
   */
  getTranslationsForLocale(locale: SupportedLocale): Record<string, string> {
    const result: Record<string, string> = {};
    Object.entries(this.translations).forEach(([key, entry]) => {
      result[key] = entry[locale] || entry[this.fallbackLocale] || key;
    });
    return result;
  }

  /**
   * Generate dynamic translation keys for menu items
   */
  generateMenuTranslations(path: string, title: string, pageType: string): void {
    const normalizedPath = path.replace(/\//g, '_').replace(/^_/, '');
    const pathSegments = path.split('/').filter(Boolean);
    
    // Generate title translations
    const titleTranslations: Record<string, Partial<TranslationEntry>> = {
      [`${normalizedPath}_title`]: {
        en: title,
        uk: this.generateUkrainianTranslation(title)
      },
      [`${normalizedPath}_management`]: {
        en: `${title} Management`,
        uk: `Управління ${this.generateUkrainianTranslation(title).toLowerCase()}`
      },
      [`${normalizedPath}_dashboard`]: {
        en: `${title} Dashboard`,
        uk: `Дашборд ${this.generateUkrainianTranslation(title).toLowerCase()}`
      }
    };

    // Generate description translations
    const descriptionTranslations: Record<string, Partial<TranslationEntry>> = {
      [`${normalizedPath}_description`]: {
        en: `Manage and configure ${title.toLowerCase()}`,
        uk: `Управляйте та налаштовуйте ${this.generateUkrainianTranslation(title).toLowerCase()}`
      },
      [`${normalizedPath}_overview_description`]: {
        en: `Overview of ${title.toLowerCase()} data and analytics`,
        uk: `Огляд даних та аналітики ${this.generateUkrainianTranslation(title).toLowerCase()}`
      },
      [`manage_${normalizedPath}_description`]: {
        en: `Manage and organize ${title.toLowerCase()}`,
        uk: `Керуйте та організовуйте ${this.generateUkrainianTranslation(title).toLowerCase()}`
      }
    };

    // Generate breadcrumb translations
    const breadcrumbTranslations: Record<string, Partial<TranslationEntry>> = {};
    pathSegments.forEach(segment => {
      breadcrumbTranslations[`breadcrumb_${segment}`] = {
        en: segment.charAt(0).toUpperCase() + segment.slice(1),
        uk: this.generateUkrainianTranslation(segment.charAt(0).toUpperCase() + segment.slice(1))
      };
    });

    // Add all translations
    this.addTranslations({
      ...titleTranslations,
      ...descriptionTranslations,
      ...breadcrumbTranslations
    });
  }

  /**
   * Generate Ukrainian translation (basic implementation)
   */
  private generateUkrainianTranslation(text: string): string {
    const commonTranslations: Record<string, string> = {
      'Dashboard': 'Дашборд',
      'Management': 'Управління',
      'Settings': 'Налаштування',
      'Profile': 'Профіль',
      'Users': 'Користувачі',
      'User': 'Користувач',
      'Tariff': 'Тариф',
      'Pricing': 'Ціноутворення',
      'Reports': 'Звіти',
      'Forms': 'Форми',
      'Content': 'Контент',
      'Menu': 'Меню',
      'Home': 'Головна',
      'Admin': 'Адміністратор',
      'Add New': 'Додати новий',
      'Edit': 'Редагувати',
      'Delete': 'Видалити',
      'Save': 'Зберегти',
      'Cancel': 'Скасувати',
      'Export': 'Експорт',
      'Import': 'Імпорт',
      'Filter': 'Фільтр',
      'Search': 'Пошук',
      'Refresh': 'Оновити'
    };

    return commonTranslations[text] || text;
  }

  /**
   * Load default system translations
   */
  private loadDefaultTranslations(): void {
    const defaultTranslations: Record<string, Partial<TranslationEntry>> = {
      // Navigation
      'breadcrumb_home': {
        en: 'Home',
        uk: 'Головна'
      },
      'breadcrumb_admin': {
        en: 'Admin',
        uk: 'Адміністратор'
      },
      
      // Common actions
      'add_new': {
        en: 'Add New',
        uk: 'Додати новий'
      },
      'edit_content': {
        en: 'Edit Content',
        uk: 'Редагувати контент'
      },
      'configure_form': {
        en: 'Configure Form',
        uk: 'Налаштувати форму'
      },
      'test_form': {
        en: 'Test Form',
        uk: 'Тестувати форму'
      },
      'refresh_data': {
        en: 'Refresh Data',
        uk: 'Оновити дані'
      },
      'export_data': {
        en: 'Export Data',
        uk: 'Експортувати дані'
      },
      'import_data': {
        en: 'Import Data',
        uk: 'Імпортувати дані'
      },
      'dashboard_settings': {
        en: 'Settings',
        uk: 'Налаштування'
      },
      'filter': {
        en: 'Filter',
        uk: 'Фільтр'
      },

      // Page types
      'dashboard_title': {
        en: 'Dashboard',
        uk: 'Дашборд'
      },
      'users_title': {
        en: 'Users',
        uk: 'Користувачі'
      },
      'users_management': {
        en: 'User Management',
        uk: 'Управління користувачами'
      },
      'tariff_title': {
        en: 'Pricing',
        uk: 'Тарифи'
      },
      'menu_pricing': {
        en: 'Pricing',
        uk: 'Тарифи'
      },

      // Descriptions
      'users_description': {
        en: 'Manage user accounts and permissions',
        uk: 'Керування обліковими записами користувачів та дозволами'
      },
      'tariff_description': {
        en: 'Manage pricing and billing information',
        uk: 'Управління цінами та біллінговою інформацією'
      },
      'dashboard_description': {
        en: 'Overview of system metrics and analytics',
        uk: 'Огляд системних метрик та аналітики'
      }
    };

    this.addTranslations(defaultTranslations);
  }

  /**
   * Get translation function bound to current instance
   */
  getTranslateFunction(): (key: string, fallback?: string) => string {
    return (key: string, fallback?: string) => this.translate(key, fallback);
  }

  /**
   * Clear all translations
   */
  clearTranslations(): void {
    this.translations = {};
    this.loadDefaultTranslations();
  }

  /**
   * Export translations for backup or sharing
   */
  exportTranslations(): TranslationDict {
    return { ...this.translations };
  }

  /**
   * Import translations from backup
   */
  importTranslations(translations: TranslationDict): void {
    this.translations = { ...translations };
  }

  /**
   * Get missing translations for a locale
   */
  getMissingTranslations(locale: SupportedLocale): string[] {
    const missing: string[] = [];
    Object.entries(this.translations).forEach(([key, entry]) => {
      if (!entry[locale]) {
        missing.push(key);
      }
    });
    return missing;
  }
}