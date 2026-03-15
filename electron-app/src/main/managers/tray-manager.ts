/**
 * TrayManager - Manages the system tray (menu bar) icon and context menu.
 * Mirrors VoiceInk/MenuBarManager.swift and VoiceInk/Views/MenuBarView.swift.
 *
 * Provides quick access to:
 * - Toggle recording
 * - Model selection
 * - AI enhancement settings
 * - Language selection
 * - Audio input device
 * - History, Settings, Quit
 *
 * Platform differences:
 * - macOS: Shows as a menu bar extra (status item) in the top menu bar
 * - Windows: Shows in the system tray (notification area)
 * - Both platforms use Electron's Tray API
 */
import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
import { SettingsService } from '../services/settings-service';
import { RecordingState } from '../../shared/types';

export interface TrayManagerCallbacks {
  onToggleRecording: () => void;
  onShowMainWindow: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
  onCheckUpdate: () => void;
  onToggleEnhancement: () => void;
  onSelectLanguage: (lang: string) => void;
}

export class TrayManager {
  private tray: Tray | null = null;
  private settingsService: SettingsService;
  private callbacks: TrayManagerCallbacks;
  private currentState: RecordingState = 'idle';

  constructor(settingsService: SettingsService, callbacks: TrayManagerCallbacks) {
    this.settingsService = settingsService;
    this.callbacks = callbacks;
  }

  /**
   * Create the system tray icon and context menu.
   */
  create(): void {
    // Use a simple icon - in production, this would be the app icon
    const iconPath = path.join(__dirname, '../../public/tray-icon.png');
    let icon: Electron.NativeImage;
    try {
      icon = nativeImage.createFromPath(iconPath);
    } catch {
      // Fallback: create a small empty icon if icon file doesn't exist
      icon = nativeImage.createEmpty();
    }

    // Resize for tray (16x16 on most platforms)
    if (!icon.isEmpty()) {
      icon = icon.resize({ width: 16, height: 16 });
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip('VoiceInk');
    this.updateContextMenu();

    // On macOS, clicking the tray icon should show the menu
    // On Windows, left-click typically shows the main window
    this.tray.on('click', () => {
      if (process.platform === 'win32') {
        this.callbacks.onShowMainWindow();
      }
    });
  }

  /**
   * Update the context menu based on current state.
   * Mirrors the MenuBarView.swift menu structure.
   */
  updateContextMenu(): void {
    if (!this.tray) return;

    const isEnhancementEnabled = this.settingsService.get('isEnhancementEnabled');
    const selectedLanguage = this.settingsService.get('selectedLanguage');

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: this.getRecordingLabel(),
        click: () => this.callbacks.onToggleRecording(),
        accelerator: 'CommandOrControl+Shift+R',
      },
      { type: 'separator' },
      {
        label: 'AI Enhancement',
        type: 'checkbox',
        checked: isEnhancementEnabled,
        click: () => this.callbacks.onToggleEnhancement(),
      },
      { type: 'separator' },
      {
        label: 'Language',
        submenu: this.buildLanguageSubmenu(selectedLanguage),
      },
      { type: 'separator' },
      {
        label: 'History',
        click: () => this.callbacks.onOpenHistory(),
        accelerator: 'CommandOrControl+Shift+H',
      },
      {
        label: 'Settings',
        click: () => this.callbacks.onOpenSettings(),
        accelerator: 'CommandOrControl+,',
      },
      { type: 'separator' },
      {
        label: 'Show Main Window',
        click: () => this.callbacks.onShowMainWindow(),
      },
      {
        label: 'Check for Updates',
        click: () => this.callbacks.onCheckUpdate(),
      },
      { type: 'separator' },
      {
        label: 'Quit VoiceInk',
        click: () => this.callbacks.onQuit(),
        accelerator: 'CommandOrControl+Q',
      },
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(contextMenu);
  }

  /**
   * Update the recording state and refresh the tray menu.
   */
  updateRecordingState(state: RecordingState): void {
    this.currentState = state;
    this.updateContextMenu();
  }

  /**
   * Destroy the tray icon.
   */
  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }

  private getRecordingLabel(): string {
    switch (this.currentState) {
      case 'recording':
        return '⏹ Stop Recording';
      case 'transcribing':
        return '⏳ Transcribing...';
      case 'enhancing':
        return '✨ Enhancing...';
      default:
        return '🎙 Start Recording';
    }
  }

  private buildLanguageSubmenu(
    selectedLanguage: string
  ): Electron.MenuItemConstructorOptions[] {
    const languages = [
      { code: 'en', name: 'English' },
      { code: 'zh', name: 'Chinese' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'it', name: 'Italian' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
    ];

    return languages.map((lang) => ({
      label: lang.name,
      type: 'radio' as const,
      checked: selectedLanguage === lang.code,
      click: () => this.callbacks.onSelectLanguage(lang.code),
    }));
  }
}
