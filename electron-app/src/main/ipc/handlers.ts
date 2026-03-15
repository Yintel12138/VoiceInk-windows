/**
 * IPC Handlers - Registers all IPC communication channels between main and renderer.
 * Mirrors the communication patterns in the Swift app where:
 * - NotificationCenter.post() → ipcMain.handle() / ipcMain.on()
 * - @EnvironmentObject data flow → ipcRenderer.invoke() / ipcRenderer.on()
 *
 * Uses Electron's contextBridge + ipcMain/ipcRenderer for secure communication.
 */
import { ipcMain, app, shell, clipboard } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { SettingsService } from '../services/settings-service';
import { TranscriptionStore } from '../services/transcription-store';
import { DictionaryService } from '../services/dictionary-service';
import { WindowManager } from '../managers/window-manager';
import { AppDefaultKey } from '../../shared/constants';

export interface IPCDependencies {
  settingsService: SettingsService;
  transcriptionStore: TranscriptionStore;
  dictionaryService: DictionaryService;
  windowManager: WindowManager;
}

export function registerIPCHandlers(deps: IPCDependencies): void {
  const { settingsService, transcriptionStore, dictionaryService, windowManager } = deps;

  // --- Settings ---
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_event, key: AppDefaultKey) => {
    return settingsService.get(key);
  });

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    (_event, key: AppDefaultKey, value: unknown) => {
      settingsService.set(key, value as never);
      // Broadcast change to all windows
      const mainWin = windowManager.getMainWindow();
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, key, value);
      }
      return true;
    }
  );

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, () => {
    return settingsService.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET, (_event, key: AppDefaultKey) => {
    settingsService.reset(key);
    return true;
  });

  // --- Transcriptions ---
  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION_LIST, () => {
    return transcriptionStore.getAll();
  });

  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION_GET, (_event, id: string) => {
    return transcriptionStore.getById(id);
  });

  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION_DELETE, (_event, id: string) => {
    return transcriptionStore.delete(id);
  });

  // --- Dictionary ---
  ipcMain.handle(IPC_CHANNELS.DICTIONARY_GET_WORDS, () => {
    return dictionaryService.getWords();
  });

  ipcMain.handle(IPC_CHANNELS.DICTIONARY_ADD_WORD, (_event, word: string) => {
    return dictionaryService.addWord(word);
  });

  ipcMain.handle(IPC_CHANNELS.DICTIONARY_DELETE_WORD, (_event, id: string) => {
    return dictionaryService.deleteWord(id);
  });

  ipcMain.handle(IPC_CHANNELS.DICTIONARY_GET_REPLACEMENTS, () => {
    return dictionaryService.getReplacements();
  });

  ipcMain.handle(
    IPC_CHANNELS.DICTIONARY_ADD_REPLACEMENT,
    (_event, original: string, replacement: string) => {
      return dictionaryService.addReplacement(original, replacement);
    }
  );

  ipcMain.handle(IPC_CHANNELS.DICTIONARY_DELETE_REPLACEMENT, (_event, id: string) => {
    return dictionaryService.deleteReplacement(id);
  });

  ipcMain.handle(IPC_CHANNELS.DICTIONARY_EXPORT, () => {
    return dictionaryService.exportToJSON();
  });

  ipcMain.handle(IPC_CHANNELS.DICTIONARY_IMPORT, (_event, json: string) => {
    return dictionaryService.importFromJSON(json);
  });

  // --- Window Management ---
  ipcMain.on(IPC_CHANNELS.WINDOW_SHOW_MAIN, () => {
    windowManager.showMainWindow();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_HIDE_MAIN, () => {
    windowManager.hideMainWindow();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_NAVIGATE, (_event, viewType: string) => {
    windowManager.showMainWindow();
    windowManager.navigateTo(viewType);
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_OPEN_HISTORY, () => {
    windowManager.createHistoryWindow();
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_SHOW_MINI_RECORDER, () => {
    windowManager.toggleMiniRecorder(true);
  });

  ipcMain.on(IPC_CHANNELS.WINDOW_HIDE_MINI_RECORDER, () => {
    windowManager.toggleMiniRecorder(false);
  });

  // --- App Lifecycle ---
  ipcMain.handle(IPC_CHANNELS.APP_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.APP_GET_PLATFORM, () => {
    return process.platform;
  });

  ipcMain.on(IPC_CHANNELS.APP_QUIT, () => {
    app.quit();
  });

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, (_event, url: string) => {
    return shell.openExternal(url);
  });
}
