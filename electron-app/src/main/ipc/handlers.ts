/**
 * IPC Handlers - Registers all IPC communication channels between main and renderer.
 * Mirrors the communication patterns in the Swift app where:
 * - NotificationCenter.post() → ipcMain.handle() / ipcMain.on()
 * - @EnvironmentObject data flow → ipcRenderer.invoke() / ipcRenderer.on()
 *
 * Uses Electron's contextBridge + ipcMain/ipcRenderer for secure communication.
 */
import { ipcMain, app, shell } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import { SettingsService } from '../services/settings-service';
import { TranscriptionStore } from '../services/transcription-store';
import { DictionaryService } from '../services/dictionary-service';
import { AudioRecordingService } from '../services/audio-recording-service';
import { WhisperTranscriptionService } from '../services/whisper-transcription-service';
import { AIEnhancementService } from '../services/ai-enhancement-service';
import { HotkeyService } from '../services/hotkey-service';
import { TranscriptionPipeline } from '../services/transcription-pipeline';
import { PowerModeService } from '../services/power-mode-service';
import { WindowManager } from '../managers/window-manager';
import { AppDefaultKey } from '../../shared/constants';
import type { PowerModeConfig } from '../../shared/types';

export interface IPCDependencies {
  settingsService: SettingsService;
  transcriptionStore: TranscriptionStore;
  dictionaryService: DictionaryService;
  audioService: AudioRecordingService;
  whisperService: WhisperTranscriptionService;
  aiService: AIEnhancementService;
  hotkeyService: HotkeyService;
  pipeline: TranscriptionPipeline;
  windowManager: WindowManager;
  powerModeService: PowerModeService;
}

export function registerIPCHandlers(deps: IPCDependencies): void {
  const {
    settingsService,
    transcriptionStore,
    dictionaryService,
    audioService,
    whisperService,
    aiService,
    hotkeyService,
    pipeline,
    windowManager,
    powerModeService,
  } = deps;

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

  // --- Recording ---
  ipcMain.handle(IPC_CHANNELS.RECORDER_TOGGLE, async () => {
    await pipeline.toggleRecording();
    return audioService.getState();
  });

  ipcMain.handle(IPC_CHANNELS.RECORDER_START, async () => {
    await pipeline.startRecording();
    return audioService.getState();
  });

  ipcMain.handle(IPC_CHANNELS.RECORDER_STOP, async () => {
    await pipeline.stopAndProcess();
    return audioService.getState();
  });

  // --- Audio Devices ---
  ipcMain.handle(IPC_CHANNELS.AUDIO_DEVICES_LIST, async () => {
    return audioService.listDevices();
  });

  ipcMain.handle(IPC_CHANNELS.AUDIO_DEVICE_SELECT, (_event, deviceId: string) => {
    audioService.selectDevice(deviceId);
    // Persist device selection to settings
    settingsService.set('selectedAudioDeviceId', deviceId);
    return true;
  });

  ipcMain.handle('audio:getSelectedDevice', () => {
    return audioService.getCurrentDeviceId();
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

  ipcMain.handle(IPC_CHANNELS.TRANSCRIPTION_START, async (_event, filePath: string, language?: string) => {
    try {
      const result = await pipeline.transcribeFile(filePath, language);
      return { success: true, ...result };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // --- AI Models ---
  ipcMain.handle(IPC_CHANNELS.MODEL_LIST, () => {
    return whisperService.listModels();
  });

  ipcMain.handle(IPC_CHANNELS.MODEL_DOWNLOAD, async (_event, modelId: string) => {
    try {
      const modelPath = await whisperService.downloadModel(modelId);
      return { success: true, path: modelPath };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MODEL_DELETE, (_event, modelId: string) => {
    return whisperService.deleteModel(modelId);
  });

  ipcMain.handle(IPC_CHANNELS.MODEL_SELECT, (_event, modelId: string) => {
    whisperService.selectModel(modelId);
    settingsService.set('selectedTranscriptionModelId', modelId);
    return true;
  });

  // --- Whisper Binary Management ---
  ipcMain.handle('whisper:binaryInfo', () => {
    return whisperService.getWhisperBinaryInfo();
  });

  ipcMain.handle('whisper:downloadBinary', async (_event, releaseTag?: string) => {
    try {
      const binaryPath = await whisperService.downloadWhisperBinary(releaseTag);
      return { success: true, path: binaryPath };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle('whisper:isBinaryAvailable', () => {
    return whisperService.isWhisperBinaryAvailable();
  });

  // --- AI Enhancement ---
  ipcMain.handle(IPC_CHANNELS.ENHANCEMENT_TOGGLE, (_event, enabled?: boolean) => {
    if (enabled !== undefined) {
      aiService.setEnabled(enabled);
      settingsService.set('isEnhancementEnabled', enabled);
    } else {
      const current = aiService.getEnabled();
      aiService.setEnabled(!current);
      settingsService.set('isEnhancementEnabled', !current);
    }
    return aiService.getEnabled();
  });

  ipcMain.handle(IPC_CHANNELS.ENHANCEMENT_SET_PROMPT, (_event, promptId: string) => {
    aiService.setActivePrompt(promptId);
    settingsService.set('selectedEnhancementPromptId', promptId);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.ENHANCEMENT_SET_PROVIDER, (_event, providerId: string) => {
    aiService.setProvider(providerId);
    settingsService.set('selectedAIProvider', providerId);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.ENHANCEMENT_SET_MODEL, (_event, modelId: string) => {
    aiService.setModel(modelId);
    settingsService.set('selectedAIModel', modelId);
    return true;
  });

  // --- Enhancement Prompt CRUD (using extension channels) ---
  ipcMain.handle('enhancement:getProviders', () => {
    return aiService.getProviders();
  });

  ipcMain.handle('enhancement:getPrompts', () => {
    return aiService.getPrompts();
  });

  ipcMain.handle('enhancement:addPrompt', (_event, prompt: { name: string; systemPrompt: string; userPromptTemplate: string }) => {
    return aiService.addPrompt(prompt);
  });

  ipcMain.handle('enhancement:updatePrompt', (_event, id: string, updates: Record<string, unknown>) => {
    return aiService.updatePrompt(id, updates as never);
  });

  ipcMain.handle('enhancement:deletePrompt', (_event, id: string) => {
    return aiService.deletePrompt(id);
  });

  // --- API Key Management ---
  ipcMain.handle('enhancement:saveApiKey', (_event, providerId: string, apiKey: string) => {
    aiService.saveApiKey(providerId, apiKey);
    return true;
  });

  ipcMain.handle('enhancement:getApiKey', (_event, providerId: string) => {
    return aiService.getApiKey(providerId);
  });

  ipcMain.handle('enhancement:hasApiKey', (_event, providerId: string) => {
    return aiService.hasApiKey(providerId);
  });

  ipcMain.handle('enhancement:verifyApiKey', async (_event, providerId: string, apiKey: string) => {
    return aiService.verifyApiKey(providerId, apiKey);
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

  // --- Power Mode ---
  ipcMain.handle(IPC_CHANNELS.POWER_MODE_GET_CONFIGS, () => {
    return powerModeService.getConfigs();
  });

  ipcMain.handle(IPC_CHANNELS.POWER_MODE_SAVE_CONFIG, (_event, config: PowerModeConfig) => {
    return powerModeService.saveConfig(config);
  });

  ipcMain.handle(IPC_CHANNELS.POWER_MODE_DELETE_CONFIG, (_event, id: string) => {
    return powerModeService.deleteConfig(id);
  });

  ipcMain.handle('powerMode:getActiveMode', () => {
    return powerModeService.getActiveMode();
  });

  ipcMain.handle('powerMode:setActiveMode', (_event, id: string | null) => {
    powerModeService.setActiveMode(id);
    // Broadcast change to all windows
    const mainWin = windowManager.getMainWindow();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send(IPC_CHANNELS.POWER_MODE_ACTIVE_CHANGED, id);
    }
    return true;
  });

  ipcMain.handle('powerMode:detectAndActivate', (_event, context?: { appIdentifier?: string; url?: string }) => {
    return powerModeService.detectAndActivateMode(context);
  });

  ipcMain.handle('powerMode:toggleEnabled', (_event, id: string) => {
    return powerModeService.toggleEnabled(id);
  });

  ipcMain.handle('powerMode:reorder', (_event, orderedIds: string[]) => {
    return powerModeService.reorderConfigs(orderedIds);
  });

  ipcMain.handle('powerMode:export', () => {
    return powerModeService.exportConfigs();
  });

  ipcMain.handle('powerMode:import', (_event, json: string) => {
    return powerModeService.importConfigs(json);
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

  // --- Model Download Progress ---
  whisperService.onDownloadProgress((progress) => {
    const mainWin = windowManager.getMainWindow();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, progress);
    }
  });

  // --- Audio Level Updates ---
  audioService.onAudioLevel((level) => {
    const mainWin = windowManager.getMainWindow();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send(IPC_CHANNELS.RECORDER_AUDIO_LEVEL, level);
    }
    const miniWin = windowManager.getMiniRecorderWindow();
    if (miniWin && !miniWin.isDestroyed()) {
      miniWin.webContents.send(IPC_CHANNELS.RECORDER_AUDIO_LEVEL, level);
    }
  });
}
