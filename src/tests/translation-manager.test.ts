import { describe, it, expect, beforeEach } from 'vitest';
import { TranslationManager } from '../lib/translation-manager';

describe('TranslationManager', () => {
  let translationManager: TranslationManager;

  beforeEach(() => {
    // Reset the singleton instance for testing
    (TranslationManager as any).instance = undefined;
    translationManager = TranslationManager.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TranslationManager.getInstance();
      const instance2 = TranslationManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('locale management', () => {
    it('should set and get locale', () => {
      translationManager.setLocale('uk');
      expect(translationManager.getLocale()).toBe('uk');
    });

    it('should default to English locale', () => {
      expect(translationManager.getLocale()).toBe('en');
    });

    it('should set and get fallback locale', () => {
      translationManager.setFallbackLocale('uk');
      // Access private property for testing
      expect((translationManager as any).fallbackLocale).toBe('uk');
    });
  });

  describe('translation', () => {
    beforeEach(() => {
      translationManager.addTranslations({
        'test_key': {
          en: 'Test English',
          uk: 'Test Ukrainian'
        },
        'english_only': {
          en: 'English Only'
        }
      });
    });

    it('should translate to current locale', () => {
      translationManager.setLocale('en');
      expect(translationManager.translate('test_key')).toBe('Test English');

      translationManager.setLocale('uk');
      expect(translationManager.translate('test_key')).toBe('Test Ukrainian');
    });

    it('should fallback to fallback locale', () => {
      translationManager.setLocale('uk');
      expect(translationManager.translate('english_only')).toBe('English Only');
    });

    it('should return fallback string if provided', () => {
      expect(translationManager.translate('nonexistent_key', 'Fallback Text')).toBe('Fallback Text');
    });

    it('should return key itself if no translation found', () => {
      expect(translationManager.translate('nonexistent_key')).toBe('nonexistent_key');
    });
  });

  describe('addTranslations', () => {
    it('should add new translations', () => {
      translationManager.addTranslations({
        'new_key': {
          en: 'New English',
          uk: 'New Ukrainian'
        }
      });

      expect(translationManager.translate('new_key')).toBe('New English');
    });

    it('should merge with existing translations', () => {
      translationManager.addTranslations({
        'test_key': {
          en: 'Original English'
        }
      });

      translationManager.addTranslations({
        'test_key': {
          uk: 'Added Ukrainian'
        }
      });

      expect(translationManager.translate('test_key')).toBe('Original English');
      translationManager.setLocale('uk');
      expect(translationManager.translate('test_key')).toBe('Added Ukrainian');
    });
  });

  describe('addTranslation', () => {
    it('should add single translation', () => {
      translationManager.addTranslation('single_key', 'en', 'Single English');
      translationManager.addTranslation('single_key', 'uk', 'Single Ukrainian');

      expect(translationManager.translate('single_key')).toBe('Single English');
      translationManager.setLocale('uk');
      expect(translationManager.translate('single_key')).toBe('Single Ukrainian');
    });

    it('should create new entry if key does not exist', () => {
      translationManager.addTranslation('new_single_key', 'uk', 'New Ukrainian');
      
      translationManager.setLocale('uk');
      expect(translationManager.translate('new_single_key')).toBe('New Ukrainian');
      
      translationManager.setLocale('en');
      expect(translationManager.translate('new_single_key')).toBe('new_single_key'); // fallback to key
    });
  });

  describe('getTranslationsForLocale', () => {
    beforeEach(() => {
      translationManager.addTranslations({
        'key1': {
          en: 'English 1',
          uk: 'Ukrainian 1'
        },
        'key2': {
          en: 'English 2'
        }
      });
    });

    it('should get all translations for locale', () => {
      const translations = translationManager.getTranslationsForLocale('en');
      
      expect(translations['key1']).toBe('English 1');
      expect(translations['key2']).toBe('English 2');
    });

    it('should fallback to fallback locale for missing translations', () => {
      const translations = translationManager.getTranslationsForLocale('uk');
      
      expect(translations['key1']).toBe('Ukrainian 1');
      expect(translations['key2']).toBe('English 2'); // fallback
    });
  });

  describe('generateMenuTranslations', () => {
    it('should generate translations for simple path', () => {
      translationManager.generateMenuTranslations('users', 'Users', 'content');

      expect(translationManager.translate('users_title')).toBe('Users');
      expect(translationManager.translate('users_management')).toBe('Users Management');
      expect(translationManager.translate('users_description')).toBe('Manage and configure users');
      expect(translationManager.translate('breadcrumb_users')).toBe('Users');
    });

    it('should generate translations for nested path', () => {
      translationManager.generateMenuTranslations('admin/settings', 'Settings', 'content');

      expect(translationManager.translate('admin_settings_title')).toBe('Settings');
      expect(translationManager.translate('breadcrumb_admin')).toBe('Admin');
      expect(translationManager.translate('breadcrumb_settings')).toBe('Settings');
    });

    it('should include Ukrainian translations', () => {
      translationManager.generateMenuTranslations('users', 'Users', 'content');
      translationManager.setLocale('uk');

      expect(translationManager.translate('users_title')).toBe('Users'); // Basic Ukrainian fallback
      expect(translationManager.translate('users_management')).toBe('Управління users');
    });
  });

  describe('getTranslateFunction', () => {
    it('should return bound translate function', () => {
      translationManager.addTranslation('test_bound', 'en', 'Bound Test');
      
      const t = translationManager.getTranslateFunction();
      expect(t('test_bound')).toBe('Bound Test');
      expect(t('nonexistent', 'fallback')).toBe('fallback');
    });
  });

  describe('getMissingTranslations', () => {
    beforeEach(() => {
      translationManager.addTranslations({
        'complete_key': {
          en: 'Complete English',
          uk: 'Complete Ukrainian'
        },
        'partial_key': {
          en: 'Partial English'
        }
      });
    });

    it('should identify missing translations', () => {
      const missing = translationManager.getMissingTranslations('uk');
      expect(missing).toContain('partial_key');
      expect(missing).not.toContain('complete_key');
    });

    it('should return empty array if no missing translations', () => {
      const missing = translationManager.getMissingTranslations('en');
      expect(missing).toHaveLength(0);
    });
  });

  describe('export and import translations', () => {
    it('should export and import translations', () => {
      translationManager.addTranslations({
        'export_key': {
          en: 'Export Test',
          uk: 'Export Ukrainian'
        }
      });

      const exported = translationManager.exportTranslations();
      expect(exported['export_key'].en).toBe('Export Test');

      translationManager.clearTranslations();
      expect(translationManager.translate('export_key')).toBe('export_key');

      translationManager.importTranslations(exported);
      expect(translationManager.translate('export_key')).toBe('Export Test');
    });
  });

  describe('clearTranslations', () => {
    it('should clear all translations and reload defaults', () => {
      translationManager.addTranslation('custom_key', 'en', 'Custom');
      expect(translationManager.translate('custom_key')).toBe('Custom');

      translationManager.clearTranslations();
      expect(translationManager.translate('custom_key')).toBe('custom_key');
      
      // Should still have default translations
      expect(translationManager.translate('breadcrumb_home')).toBe('Home');
    });
  });

  describe('default translations', () => {
    it('should have default navigation translations', () => {
      expect(translationManager.translate('breadcrumb_home')).toBe('Home');
      expect(translationManager.translate('add_new')).toBe('Add New');
      expect(translationManager.translate('edit_content')).toBe('Edit Content');
    });

    it('should have Ukrainian defaults', () => {
      translationManager.setLocale('uk');
      expect(translationManager.translate('breadcrumb_home')).toBe('Головна');
      expect(translationManager.translate('add_new')).toBe('Додати новий');
      expect(translationManager.translate('users_title')).toBe('Користувачі');
    });
  });
});