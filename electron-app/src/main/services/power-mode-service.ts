/**
 * PowerModeService - Manages context-aware power mode configurations.
 * Mirrors VoiceInk/PowerMode/PowerModeSessionManager.swift and PowerModeStateProvider.swift.
 *
 * Features:
 * - Power mode configuration CRUD operations
 * - Persistence with electron-store
 * - Active mode tracking and context detection
 * - Auto-activation based on app identifier or URL pattern
 */
import Store from 'electron-store';
import type { PowerModeConfig } from '../../shared/types';

interface PowerModeStore {
  configs: PowerModeConfig[];
  activeModeId: string | null;
}

export class PowerModeService {
  private store: Store<PowerModeStore>;
  private activeModeId: string | null = null;
  private contextCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.store = new Store<PowerModeStore>({
      name: 'power-modes',
      defaults: {
        configs: [],
        activeModeId: null,
      },
    });

    this.activeModeId = this.store.get('activeModeId');
  }

  /**
   * Get all power mode configurations
   */
  getConfigs(): PowerModeConfig[] {
    return this.store.get('configs');
  }

  /**
   * Get a specific power mode by ID
   */
  getConfigById(id: string): PowerModeConfig | undefined {
    const configs = this.getConfigs();
    return configs.find(c => c.id === id);
  }

  /**
   * Save a new or updated power mode configuration
   */
  saveConfig(config: PowerModeConfig): PowerModeConfig {
    const configs = this.getConfigs();
    const existingIndex = configs.findIndex(c => c.id === config.id);

    if (existingIndex >= 0) {
      // Update existing config
      configs[existingIndex] = config;
    } else {
      // Add new config
      configs.push(config);
    }

    this.store.set('configs', configs);
    return config;
  }

  /**
   * Delete a power mode configuration by ID
   */
  deleteConfig(id: string): boolean {
    const configs = this.getConfigs();
    const filtered = configs.filter(c => c.id !== id);

    if (filtered.length === configs.length) {
      return false; // ID not found
    }

    this.store.set('configs', filtered);

    // Clear active mode if it was deleted
    if (this.activeModeId === id) {
      this.setActiveMode(null);
    }

    return true;
  }

  /**
   * Get the currently active power mode
   */
  getActiveMode(): PowerModeConfig | null {
    if (!this.activeModeId) {
      return null;
    }
    return this.getConfigById(this.activeModeId) || null;
  }

  /**
   * Set the active power mode by ID
   */
  setActiveMode(id: string | null): void {
    this.activeModeId = id;
    this.store.set('activeModeId', id);
  }

  /**
   * Detect and activate power mode based on current context (app or URL)
   * This is a simplified version - full implementation would require
   * native modules to detect foreground app on Windows/Linux/macOS
   */
  detectAndActivateMode(context?: { appIdentifier?: string; url?: string }): PowerModeConfig | null {
    if (!context) {
      return null;
    }

    const configs = this.getConfigs().filter(c => c.isEnabled);

    // Try to match by app identifier first
    if (context.appIdentifier) {
      const matchedByApp = configs.find(c =>
        c.appIdentifier &&
        context.appIdentifier!.toLowerCase().includes(c.appIdentifier.toLowerCase())
      );
      if (matchedByApp) {
        this.setActiveMode(matchedByApp.id);
        return matchedByApp;
      }
    }

    // Try to match by URL pattern
    if (context.url) {
      const matchedByUrl = configs.find(c =>
        c.urlPattern &&
        context.url!.toLowerCase().includes(c.urlPattern.toLowerCase())
      );
      if (matchedByUrl) {
        this.setActiveMode(matchedByUrl.id);
        return matchedByUrl;
      }
    }

    // No match found, fallback to default (first enabled mode)
    const defaultMode = configs[0];
    if (defaultMode) {
      this.setActiveMode(defaultMode.id);
      return defaultMode;
    }

    return null;
  }

  /**
   * Get the default power mode (first enabled mode)
   */
  getDefaultMode(): PowerModeConfig | null {
    const configs = this.getConfigs().filter(c => c.isEnabled);
    return configs[0] || null;
  }

  /**
   * Toggle a power mode's enabled state
   */
  toggleEnabled(id: string): boolean {
    const config = this.getConfigById(id);
    if (!config) {
      return false;
    }

    config.isEnabled = !config.isEnabled;
    this.saveConfig(config);

    // If we disabled the active mode, clear it
    if (!config.isEnabled && this.activeModeId === id) {
      this.setActiveMode(null);
    }

    return config.isEnabled;
  }

  /**
   * Reorder configurations
   */
  reorderConfigs(orderedIds: string[]): boolean {
    const configs = this.getConfigs();
    const reordered: PowerModeConfig[] = [];

    // Build new array based on ordered IDs
    for (const id of orderedIds) {
      const config = configs.find(c => c.id === id);
      if (config) {
        reordered.push(config);
      }
    }

    // Add any configs that weren't in the ordered list
    for (const config of configs) {
      if (!orderedIds.includes(config.id)) {
        reordered.push(config);
      }
    }

    this.store.set('configs', reordered);
    return true;
  }

  /**
   * Start context detection (if we have native modules)
   * For now, this is a placeholder for future native integration
   */
  startContextDetection(): void {
    // TODO: Implement with native modules to detect foreground app
    // On Windows: Use EnumWindows + GetForegroundWindow
    // On macOS: Use NSWorkspace.shared.frontmostApplication
    // On Linux: Use X11 or Wayland APIs

    // For now, we don't auto-detect to avoid errors
    console.log('PowerModeService: Context detection not yet implemented');
  }

  /**
   * Stop context detection
   */
  stopContextDetection(): void {
    if (this.contextCheckInterval) {
      clearInterval(this.contextCheckInterval);
      this.contextCheckInterval = null;
    }
  }

  /**
   * Export all configurations as JSON
   */
  exportConfigs(): string {
    const configs = this.getConfigs();
    return JSON.stringify(configs, null, 2);
  }

  /**
   * Import configurations from JSON
   */
  importConfigs(json: string): boolean {
    try {
      const configs = JSON.parse(json) as PowerModeConfig[];

      // Validate the structure
      if (!Array.isArray(configs)) {
        return false;
      }

      for (const config of configs) {
        if (!config.id || !config.name || !config.emoji) {
          return false;
        }
      }

      this.store.set('configs', configs);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopContextDetection();
  }
}
