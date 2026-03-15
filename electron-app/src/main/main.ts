/**
 * Main process entry point for VoiceInk Electron app.
 * Mirrors VoiceInk/VoiceInk.swift @main app initialization.
 *
 * Initialization flow (matching Swift app):
 * 1. Register default settings (AppDefaults.registerDefaults)
 * 2. Initialize data stores (SwiftData ModelContainer → JSON stores)
 * 3. Create window manager
 * 4. Set up IPC handlers
 * 5. Create tray/menu bar
 * 6. Show main window or stay in tray (based on isMenuBarOnly)
 */
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { SettingsService } from './services/settings-service';
import { TranscriptionStore } from './services/transcription-store';
import { DictionaryService } from './services/dictionary-service';
import { WindowManager } from './managers/window-manager';
import { TrayManager } from './managers/tray-manager';
import { registerIPCHandlers } from './ipc/handlers';

// Determine environment
const isDev = !app.isPackaged;

// Data directory for persistent storage
const userDataPath = app.getPath('userData');

// Initialize services
const settingsService = new SettingsService(
  path.join(userDataPath, 'settings.json')
);

const transcriptionStore = new TranscriptionStore(
  path.join(userDataPath, 'transcriptions.json')
);

const dictionaryService = new DictionaryService(
  path.join(userDataPath, 'dictionary.json')
);

// Initialize managers
const windowManager = new WindowManager(settingsService, isDev);

let trayManager: TrayManager;

function createTray(): void {
  trayManager = new TrayManager(settingsService, {
    onToggleRecording: () => {
      // Recording toggle - will be implemented with audio recording service
      const mainWin = windowManager.getMainWindow();
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send('recorder:toggle');
      }
    },
    onShowMainWindow: () => windowManager.showMainWindow(),
    onOpenHistory: () => windowManager.createHistoryWindow(),
    onOpenSettings: () => {
      windowManager.showMainWindow();
      windowManager.navigateTo('settings');
    },
    onQuit: () => app.quit(),
    onCheckUpdate: () => {
      // Auto-update check - placeholder for future implementation
    },
    onToggleEnhancement: () => {
      const current = settingsService.get('isEnhancementEnabled');
      settingsService.set('isEnhancementEnabled', !current);
      trayManager.updateContextMenu();
    },
    onSelectLanguage: (lang: string) => {
      settingsService.set('selectedLanguage', lang);
      trayManager.updateContextMenu();
    },
  });

  trayManager.create();
}

// App lifecycle
app.whenReady().then(() => {
  // Register IPC handlers
  registerIPCHandlers({
    settingsService,
    transcriptionStore,
    dictionaryService,
    windowManager,
  });

  // Create tray
  createTray();

  // Show main window unless menu-bar-only mode
  if (!settingsService.get('isMenuBarOnly')) {
    windowManager.createMainWindow();
  }

  // macOS: Re-create window when dock icon is clicked (no windows open)
  // Mirrors AppDelegate.applicationShouldHandleReopen
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow();
    }
  });
});

// Quit when all windows are closed on non-macOS platforms
// On macOS, app stays alive in menu bar (mirrors applicationShouldTerminateAfterLastWindowClosed = false)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // On Windows/Linux, only quit if not in menu-bar-only mode
    if (!settingsService.get('isMenuBarOnly')) {
      app.quit();
    }
  }
});

app.on('before-quit', () => {
  windowManager.closeAll();
  trayManager?.destroy();
});
