/**
 * Tests for SettingsService.
 * Validates the settings persistence layer that replaces macOS UserDefaults.
 *
 * Covers:
 * - Default values (mirroring AppDefaults.registerDefaults)
 * - Get/Set operations
 * - Persistence to disk
 * - Change listeners
 * - Reset operations
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SettingsService } from '../../../../src/main/services/settings-service';
import { APP_DEFAULTS } from '../../../../src/shared/constants/app-defaults';

describe('SettingsService', () => {
  let service: SettingsService;
  let testFilePath: string;

  beforeEach(() => {
    // Create a temp file for each test
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voiceink-test-'));
    testFilePath = path.join(tmpDir, 'settings.json');
    service = new SettingsService(testFilePath);
  });

  afterEach(() => {
    // Cleanup
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
      const dir = path.dirname(testFilePath);
      if (fs.existsSync(dir)) {
        fs.rmdirSync(dir);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('default values', () => {
    it('should return default values for all AppDefaults keys', () => {
      expect(service.get('hasCompletedOnboarding')).toBe(false);
      expect(service.get('isSoundFeedbackEnabled')).toBe(true);
      expect(service.get('selectedLanguage')).toBe('en');
      expect(service.get('recorderType')).toBe('mini');
      expect(service.get('isMenuBarOnly')).toBe(false);
      expect(service.get('clipboardRestoreDelay')).toBe(2.0);
      expect(service.get('isVADEnabled')).toBe(true);
      expect(service.get('removeFillerWords')).toBe(true);
    });

    it('should return all defaults via getAll()', () => {
      const all = service.getAll();
      expect(all).toEqual(expect.objectContaining(APP_DEFAULTS));
    });
  });

  describe('get/set operations', () => {
    it('should set and retrieve a string value', () => {
      service.set('selectedLanguage', 'fr');
      expect(service.get('selectedLanguage')).toBe('fr');
    });

    it('should set and retrieve a boolean value', () => {
      service.set('hasCompletedOnboarding', true);
      expect(service.get('hasCompletedOnboarding')).toBe(true);
    });

    it('should set and retrieve a number value', () => {
      service.set('clipboardRestoreDelay', 5.0);
      expect(service.get('clipboardRestoreDelay')).toBe(5.0);
    });

    it('should override default value with set value', () => {
      expect(service.get('isSoundFeedbackEnabled')).toBe(true);
      service.set('isSoundFeedbackEnabled', false);
      expect(service.get('isSoundFeedbackEnabled')).toBe(false);
    });

    it('getAll should merge defaults with set values', () => {
      service.set('selectedLanguage', 'ja');
      const all = service.getAll();
      expect(all.selectedLanguage).toBe('ja');
      expect(all.isSoundFeedbackEnabled).toBe(true); // unchanged default
    });
  });

  describe('persistence', () => {
    it('should persist settings to disk', () => {
      service.set('selectedLanguage', 'de');
      expect(fs.existsSync(testFilePath)).toBe(true);

      const data = JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
      expect(data.selectedLanguage).toBe('de');
    });

    it('should load settings from disk on initialization', () => {
      service.set('selectedLanguage', 'ko');
      service.set('isSoundFeedbackEnabled', false);

      // Create a new service instance pointing to same file
      const service2 = new SettingsService(testFilePath);
      expect(service2.get('selectedLanguage')).toBe('ko');
      expect(service2.get('isSoundFeedbackEnabled')).toBe(false);
    });

    it('should handle corrupted settings file gracefully', () => {
      fs.writeFileSync(testFilePath, 'not valid json!!!', 'utf-8');
      const service2 = new SettingsService(testFilePath);
      // Should fall back to defaults
      expect(service2.get('selectedLanguage')).toBe('en');
    });

    it('should handle missing settings file gracefully', () => {
      const missingPath = path.join(os.tmpdir(), 'nonexistent', 'settings.json');
      const service2 = new SettingsService(missingPath);
      expect(service2.get('selectedLanguage')).toBe('en');
    });
  });

  describe('change listeners', () => {
    it('should notify listener when a value changes', () => {
      const listener = jest.fn();
      service.onChange('selectedLanguage', listener);

      service.set('selectedLanguage', 'fr');
      expect(listener).toHaveBeenCalledWith('fr');
    });

    it('should not notify listener when value stays the same', () => {
      const listener = jest.fn();
      service.onChange('selectedLanguage', listener);

      service.set('selectedLanguage', 'en'); // Same as default
      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for same key', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      service.onChange('selectedLanguage', listener1);
      service.onChange('selectedLanguage', listener2);

      service.set('selectedLanguage', 'ja');
      expect(listener1).toHaveBeenCalledWith('ja');
      expect(listener2).toHaveBeenCalledWith('ja');
    });

    it('should allow unsubscribing from listener', () => {
      const listener = jest.fn();
      const unsubscribe = service.onChange('selectedLanguage', listener);

      unsubscribe();
      service.set('selectedLanguage', 'fr');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('reset operations', () => {
    it('should reset a specific setting to its default', () => {
      service.set('selectedLanguage', 'fr');
      expect(service.get('selectedLanguage')).toBe('fr');

      service.reset('selectedLanguage');
      expect(service.get('selectedLanguage')).toBe('en');
    });

    it('should reset all settings to defaults', () => {
      service.set('selectedLanguage', 'fr');
      service.set('isSoundFeedbackEnabled', false);
      service.set('recorderType', 'notch');

      service.resetAll();
      expect(service.get('selectedLanguage')).toBe('en');
      expect(service.get('isSoundFeedbackEnabled')).toBe(true);
      expect(service.get('recorderType')).toBe('mini');
    });

    it('should notify listeners on reset', () => {
      const listener = jest.fn();
      service.onChange('selectedLanguage', listener);

      service.set('selectedLanguage', 'fr');
      listener.mockClear();

      service.reset('selectedLanguage');
      expect(listener).toHaveBeenCalledWith('en');
    });
  });

  describe('has() method', () => {
    it('should return false for unset keys', () => {
      expect(service.has('selectedLanguage')).toBe(false);
    });

    it('should return true for explicitly set keys', () => {
      service.set('selectedLanguage', 'en');
      expect(service.has('selectedLanguage')).toBe(true);
    });
  });
});
