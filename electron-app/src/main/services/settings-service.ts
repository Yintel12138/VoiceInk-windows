/**
 * SettingsService - Manages application preferences/settings.
 * Mirrors VoiceInk/Services/UserDefaultsManager.swift and AppDefaults.swift.
 *
 * Uses a simple JSON file store (electron-store pattern) for cross-platform
 * persistence, replacing macOS UserDefaults.
 */
import * as fs from 'fs';
import * as path from 'path';
import { APP_DEFAULTS, AppDefaultKey, AppDefaultsType } from '../../shared/constants';

export class SettingsService {
  private settings: Record<string, unknown>;
  private filePath: string;
  private listeners: Map<string, Array<(value: unknown) => void>> = new Map();

  constructor(filePath: string) {
    this.filePath = filePath;
    this.settings = {};
    this.loadFromDisk();
  }

  /**
   * Get a setting value by key, falling back to app defaults.
   */
  get<K extends AppDefaultKey>(key: K): AppDefaultsType[K] {
    if (key in this.settings) {
      return this.settings[key] as AppDefaultsType[K];
    }
    return APP_DEFAULTS[key];
  }

  /**
   * Set a setting value and persist to disk.
   */
  set<K extends AppDefaultKey>(key: K, value: AppDefaultsType[K]): void {
    const oldValue = this.get(key);
    this.settings[key] = value;
    this.saveToDisk();

    if (oldValue !== value) {
      this.notifyListeners(key, value);
    }
  }

  /**
   * Get all current settings merged with defaults.
   */
  getAll(): AppDefaultsType {
    return { ...APP_DEFAULTS, ...this.settings } as AppDefaultsType;
  }

  /**
   * Reset a specific setting to its default value.
   */
  reset(key: AppDefaultKey): void {
    delete this.settings[key];
    this.saveToDisk();
    this.notifyListeners(key, APP_DEFAULTS[key]);
  }

  /**
   * Reset all settings to defaults.
   */
  resetAll(): void {
    this.settings = {};
    this.saveToDisk();
  }

  /**
   * Register a listener for setting changes.
   */
  onChange(key: string, listener: (value: unknown) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Check if a setting has been explicitly set (not using default).
   */
  has(key: AppDefaultKey): boolean {
    return key in this.settings;
  }

  private notifyListeners(key: string, value: unknown): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      for (const listener of listeners) {
        listener(value);
      }
    }
  }

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.settings = JSON.parse(data);
      }
    } catch {
      // If file is corrupted, start fresh
      this.settings = {};
    }
  }

  private saveToDisk(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch {
      // Silently fail on write errors - settings will still work in memory
    }
  }
}
