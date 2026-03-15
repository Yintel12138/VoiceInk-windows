/**
 * HotkeyService - Global hotkey registration and management.
 * Mirrors VoiceInk/HotkeyManager.swift.
 *
 * Uses Electron's globalShortcut API to register system-wide keyboard shortcuts.
 *
 * Supports:
 * - Two configurable hotkey slots
 * - Three modes: toggle, push-to-talk, hybrid
 * - Common shortcuts (CapsLock, Right Option, Fn, custom)
 * - Middle-click toggle (via renderer IPC)
 *
 * Platform differences:
 * - macOS: Can intercept modifier-only keys via CGEvent taps
 * - Windows/Linux: Uses Electron globalShortcut for key combinations
 * - Some modifier-only keys (CapsLock, Fn) require platform-specific handling
 */
import { globalShortcut, BrowserWindow } from 'electron';
import { HotkeyMode, HotkeyOption } from '../../shared/constants/app-defaults';

export interface HotkeyBinding {
  slot: 1 | 2;
  hotkeyOption: HotkeyOption;
  mode: HotkeyMode;
  customAccelerator?: string; // Electron accelerator string for custom hotkeys
}

export interface HotkeyConfig {
  selectedHotkey1: HotkeyOption;
  selectedHotkey2: HotkeyOption;
  hotkeyMode1: HotkeyMode;
  hotkeyMode2: HotkeyMode;
  isMiddleClickToggleEnabled: boolean;
  middleClickActivationDelay: number;
  customAccelerator1?: string;
  customAccelerator2?: string;
}

export class HotkeyService {
  private config: HotkeyConfig;
  private toggleCallback: (() => void) | null = null;
  private startCallback: (() => void) | null = null;
  private stopCallback: (() => void) | null = null;
  private registeredAccelerators: string[] = [];
  private isRecording: boolean = false;
  private holdTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private holdStartTimes: Map<string, number> = new Map();

  // Hybrid mode threshold: >500ms = push-to-talk, <500ms = toggle
  private static readonly HYBRID_HOLD_THRESHOLD = 500;

  constructor(config?: Partial<HotkeyConfig>) {
    this.config = {
      selectedHotkey1: 'none',
      selectedHotkey2: 'none',
      hotkeyMode1: 'toggle',
      hotkeyMode2: 'toggle',
      isMiddleClickToggleEnabled: false,
      middleClickActivationDelay: 200,
      ...config,
    };
  }

  /**
   * Set the callback for toggling recording.
   */
  onToggleRecording(callback: () => void): void {
    this.toggleCallback = callback;
  }

  /**
   * Set the callback for starting recording (push-to-talk).
   */
  onStartRecording(callback: () => void): void {
    this.startCallback = callback;
  }

  /**
   * Set the callback for stopping recording (push-to-talk release).
   */
  onStopRecording(callback: () => void): void {
    this.stopCallback = callback;
  }

  /**
   * Update recording state (used for push-to-talk mode).
   */
  setRecordingState(isRecording: boolean): void {
    this.isRecording = isRecording;
  }

  /**
   * Register all configured hotkeys.
   */
  registerAll(): void {
    this.unregisterAll();

    // Register Slot 1
    if (this.config.selectedHotkey1 !== 'none') {
      this.registerHotkey(
        this.config.selectedHotkey1,
        this.config.hotkeyMode1,
        this.config.customAccelerator1
      );
    }

    // Register Slot 2
    if (this.config.selectedHotkey2 !== 'none') {
      this.registerHotkey(
        this.config.selectedHotkey2,
        this.config.hotkeyMode2,
        this.config.customAccelerator2
      );
    }
  }

  /**
   * Unregister all hotkeys.
   */
  unregisterAll(): void {
    for (const accel of this.registeredAccelerators) {
      try {
        globalShortcut.unregister(accel);
      } catch {
        // Ignore unregistration errors
      }
    }
    this.registeredAccelerators = [];

    // Clear any hold timers
    for (const timer of this.holdTimers.values()) {
      clearTimeout(timer);
    }
    this.holdTimers.clear();
    this.holdStartTimes.clear();
  }

  /**
   * Update hotkey configuration.
   */
  updateConfig(config: Partial<HotkeyConfig>): void {
    this.config = { ...this.config, ...config };
    this.registerAll();
  }

  /**
   * Get current hotkey configuration.
   */
  getConfig(): HotkeyConfig {
    return { ...this.config };
  }

  /**
   * Check if a specific accelerator is registered.
   */
  isRegistered(accelerator: string): boolean {
    return globalShortcut.isRegistered(accelerator);
  }

  /**
   * Handle middle-click toggle (called from renderer via IPC).
   */
  handleMiddleClick(): void {
    if (!this.config.isMiddleClickToggleEnabled) return;

    // Debounce middle-click
    const timer = this.holdTimers.get('middleClick');
    if (timer) {
      clearTimeout(timer);
    }

    this.holdTimers.set('middleClick', setTimeout(() => {
      this.handleToggle();
      this.holdTimers.delete('middleClick');
    }, this.config.middleClickActivationDelay));
  }

  /**
   * Clean up on app quit.
   */
  destroy(): void {
    this.unregisterAll();
  }

  // --- Private Methods ---

  /**
   * Register a single hotkey with the specified mode.
   */
  private registerHotkey(
    option: HotkeyOption,
    mode: HotkeyMode,
    customAccelerator?: string
  ): void {
    const accelerator = this.getAccelerator(option, customAccelerator);
    if (!accelerator) return;

    try {
      const success = globalShortcut.register(accelerator, () => {
        switch (mode) {
          case 'toggle':
            this.handleToggle();
            break;
          case 'pushToTalk':
            this.handlePushToTalk(accelerator);
            break;
          case 'hybrid':
            this.handleHybrid(accelerator);
            break;
        }
      });

      if (success) {
        this.registeredAccelerators.push(accelerator);
      }
    } catch {
      // Failed to register hotkey - may be already in use by another app
    }
  }

  /**
   * Handle toggle mode: press to start/stop.
   */
  private handleToggle(): void {
    this.toggleCallback?.();
  }

  /**
   * Handle push-to-talk mode: hold to record, release to stop.
   * Since Electron's globalShortcut doesn't support key-up events,
   * we simulate hold detection using repeated trigger events.
   */
  private handlePushToTalk(accelerator: string): void {
    if (!this.isRecording) {
      // First press → start recording
      this.startCallback?.();
      this.holdStartTimes.set(accelerator, Date.now());

      // Set a timer to auto-stop after max duration (safety)
      const timer = setTimeout(() => {
        if (this.isRecording) {
          this.stopCallback?.();
        }
        this.holdStartTimes.delete(accelerator);
      }, 300000); // 5 minute max
      this.holdTimers.set(accelerator, timer);
    } else {
      // Subsequent press → stop recording
      this.stopCallback?.();
      this.holdStartTimes.delete(accelerator);
      const timer = this.holdTimers.get(accelerator);
      if (timer) {
        clearTimeout(timer);
        this.holdTimers.delete(accelerator);
      }
    }
  }

  /**
   * Handle hybrid mode: tap = toggle, hold = push-to-talk.
   * Since Electron doesn't support key-up events via globalShortcut,
   * we use a timer-based approach:
   * - First press: start a timer
   * - If pressed again within threshold: it was a tap → toggle
   * - If timer expires: it was a hold → push-to-talk start
   */
  private handleHybrid(accelerator: string): void {
    const existingTimer = this.holdTimers.get(accelerator);

    if (existingTimer) {
      // Second press within threshold → this was a quick tap
      clearTimeout(existingTimer);
      this.holdTimers.delete(accelerator);

      if (this.isRecording) {
        // Stop recording (was in push-to-talk hold)
        this.stopCallback?.();
      } else {
        // Toggle
        this.handleToggle();
      }
    } else {
      // First press → start timer for hold detection
      this.holdStartTimes.set(accelerator, Date.now());

      const timer = setTimeout(() => {
        this.holdTimers.delete(accelerator);
        // Timer expired → this was a hold → start recording
        if (!this.isRecording) {
          this.startCallback?.();
        }
      }, HotkeyService.HYBRID_HOLD_THRESHOLD);

      this.holdTimers.set(accelerator, timer);
    }
  }

  /**
   * Convert HotkeyOption to Electron accelerator string.
   *
   * Electron accelerator format: https://www.electronjs.org/docs/latest/api/accelerator
   *
   * Platform-specific mappings:
   * - macOS: Uses Option/Command modifier keys
   * - Windows: Uses Alt/Win modifier keys
   * - Linux: Uses Alt/Super modifier keys
   *
   * Note: Some modifier-only keys (CapsLock, Fn) cannot be directly registered
   * with Electron's globalShortcut and require alternative approaches.
   */
  private getAccelerator(option: HotkeyOption, customAccelerator?: string): string | null {
    switch (option) {
      case 'capsLock':
        // CapsLock cannot be registered as a global shortcut directly.
        // Use platform-specific workarounds.
        if (process.platform === 'darwin') {
          return 'Alt+CapsLock';
        } else if (process.platform === 'win32') {
          return 'Alt+CapsLock';
        } else {
          // Linux: Alt+CapsLock
          return 'Alt+CapsLock';
        }
      case 'rightOption':
        // Right Option/Alt key - platform-specific combinations
        if (process.platform === 'darwin') {
          // macOS: Right Option + V
          return 'Alt+Shift+V';
        } else if (process.platform === 'win32') {
          // Windows: Right Alt + V (AltGr on some keyboards)
          return 'Alt+Shift+V';
        } else {
          // Linux: Alt+Shift+V
          return 'Alt+Shift+V';
        }
      case 'fn':
        // Fn key is not directly accessible on most platforms.
        if (process.platform === 'darwin') {
          // macOS: F13 as alternative
          return 'F13';
        } else if (process.platform === 'win32') {
          // Windows: F13 (available on extended keyboards)
          return 'F13';
        } else {
          // Linux: F13
          return 'F13';
        }
      case 'custom':
        return customAccelerator || null;
      case 'none':
        return null;
      default:
        return null;
    }
  }
}
