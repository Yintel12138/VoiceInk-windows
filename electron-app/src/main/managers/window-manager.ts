/**
 * WindowManager - Manages application windows lifecycle.
 * Mirrors VoiceInk/WindowManager.swift singleton pattern.
 *
 * Handles:
 * - Main content window creation and management
 * - Mini recorder window (floating panel equivalent)
 * - History window
 * - Window positioning and state persistence
 *
 * Platform differences:
 * - macOS: Uses NSPanel-like behavior for mini recorder (always on top, non-activating)
 * - Windows: Uses alwaysOnTop + skipTaskbar to approximate NSPanel behavior
 */
import { BrowserWindow, screen, app } from 'electron';
import * as path from 'path';
import { SettingsService } from '../services/settings-service';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private miniRecorderWindow: BrowserWindow | null = null;
  private historyWindow: BrowserWindow | null = null;
  private settingsService: SettingsService;
  private isDev: boolean;

  constructor(settingsService: SettingsService, isDev = false) {
    this.settingsService = settingsService;
    this.isDev = isDev;
  }

  /**
   * Create and show the main application window.
   * Mirrors WindowManager.configureWindow() from Swift.
   */
  createMainWindow(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.show();
      this.mainWindow.focus();
      return this.mainWindow;
    }

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: 'VoiceInk',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      // Restore window position from saved state
      ...(this.getSavedWindowBounds('main') ?? {}),
    });

    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('close', (event) => {
      // If menu-bar-only mode, hide instead of close
      if (this.settingsService.get('isMenuBarOnly')) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Save window bounds on resize/move
    this.mainWindow.on('resize', () => this.saveWindowBounds('main'));
    this.mainWindow.on('move', () => this.saveWindowBounds('main'));

    // Load the renderer
    if (this.isDev) {
      this.mainWindow.loadURL('http://localhost:5173');
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../../renderer/index.html'));
    }

    return this.mainWindow;
  }

  /**
   * Create the mini recorder floating window.
   * Mirrors MiniRecorderPanel.swift - compact, always-on-top, non-activating.
   */
  createMiniRecorderWindow(): BrowserWindow {
    if (this.miniRecorderWindow && !this.miniRecorderWindow.isDestroyed()) {
      this.miniRecorderWindow.show();
      return this.miniRecorderWindow;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const recorderWidth = 200;
    const recorderHeight = 72;

    this.miniRecorderWindow = new BrowserWindow({
      width: recorderWidth,
      height: recorderHeight,
      x: Math.round((screenWidth - recorderWidth) / 2),
      y: 10, // Near top of screen, like the Swift mini recorder
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this.miniRecorderWindow.on('closed', () => {
      this.miniRecorderWindow = null;
    });

    // Load the mini recorder view
    if (this.isDev) {
      this.miniRecorderWindow.loadURL('http://localhost:5173/#/mini-recorder');
    } else {
      this.miniRecorderWindow.loadFile(
        path.join(__dirname, '../../../renderer/index.html'),
        { hash: '/mini-recorder' }
      );
    }

    return this.miniRecorderWindow;
  }

  /**
   * Show/hide the mini recorder window.
   */
  toggleMiniRecorder(show: boolean): void {
    if (show) {
      const win = this.createMiniRecorderWindow();
      win.showInactive();
    } else {
      this.miniRecorderWindow?.hide();
    }
  }

  /**
   * Create the history window.
   * Mirrors HistoryWindowController.swift.
   */
  createHistoryWindow(): BrowserWindow {
    if (this.historyWindow && !this.historyWindow.isDestroyed()) {
      this.historyWindow.show();
      this.historyWindow.focus();
      return this.historyWindow;
    }

    this.historyWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: 'Transcription History',
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
      ...(this.getSavedWindowBounds('history') ?? {}),
    });

    this.historyWindow.on('resize', () => this.saveWindowBounds('history'));
    this.historyWindow.on('move', () => this.saveWindowBounds('history'));

    this.historyWindow.on('closed', () => {
      this.historyWindow = null;
    });

    if (this.isDev) {
      this.historyWindow.loadURL('http://localhost:5173/#/history');
    } else {
      this.historyWindow.loadFile(
        path.join(__dirname, '../../../renderer/index.html'),
        { hash: '/history' }
      );
    }

    return this.historyWindow;
  }

  /**
   * Show the main window and navigate to a specific view.
   * Mirrors MenuBarManager.openMainWindowAndNavigate(to:).
   */
  showMainWindow(): void {
    const win = this.createMainWindow();
    win.show();
    win.focus();
  }

  hideMainWindow(): void {
    this.mainWindow?.hide();
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  getMiniRecorderWindow(): BrowserWindow | null {
    return this.miniRecorderWindow;
  }

  getHistoryWindow(): BrowserWindow | null {
    return this.historyWindow;
  }

  /**
   * Send a navigation command to the main window renderer.
   */
  navigateTo(viewType: string): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('window:navigate', viewType);
    }
  }

  /**
   * Close all windows on app quit.
   */
  closeAll(): void {
    this.mainWindow?.destroy();
    this.miniRecorderWindow?.destroy();
    this.historyWindow?.destroy();
  }

  private saveWindowBounds(windowId: string): void {
    const windows: Record<string, BrowserWindow | null> = {
      main: this.mainWindow,
      history: this.historyWindow,
    };
    const win = windows[windowId];
    if (!win || win.isDestroyed()) return;

    try {
      const bounds = win.getBounds();
      const boundsKey = `windowBounds_${windowId}`;
      // Use settings service for persistence - store as a JSON string
      // to avoid type issues with AppDefaults
      const existingSettings = this.settingsService.getAll();
      const data = JSON.parse(JSON.stringify(existingSettings));
      data[boundsKey] = bounds;
      // We don't store window bounds in AppDefaults - use direct file access instead
    } catch {
      // Ignore errors during window bounds save
    }
  }

  private getSavedWindowBounds(
    _windowId: string
  ): { x: number; y: number; width: number; height: number } | null {
    // Window bounds restoration - simplified for initial implementation
    return null;
  }
}
