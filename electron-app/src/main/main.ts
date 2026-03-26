/**
 * Main process entry point for VoiceInk Electron app.
 * Mirrors VoiceInk/VoiceInk.swift @main app initialization.
 *
 * Initialization flow (matching Swift app):
 * 1. Register default settings (AppDefaults.registerDefaults)
 * 2. Initialize data stores (SwiftData ModelContainer → JSON stores)
 * 3. Initialize backend services (audio, whisper, AI, hotkeys)
 * 4. Create window manager
 * 5. Set up IPC handlers
 * 6. Create tray/menu bar
 * 7. Show main window or stay in tray (based on isMenuBarOnly)
 */
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { SettingsService } from './services/settings-service';
import { TranscriptionStore } from './services/transcription-store';
import { DictionaryService } from './services/dictionary-service';
import { AudioRecordingService } from './services/audio-recording-service';
import { WhisperTranscriptionService } from './services/whisper-transcription-service';
import { AIEnhancementService } from './services/ai-enhancement-service';
import { HotkeyService } from './services/hotkey-service';
import { TranscriptionPipeline } from './services/transcription-pipeline';
import { PowerModeService } from './services/power-mode-service';
import { CustomSpeechApiService } from './services/custom-speech-api-service';
import { WindowManager } from './managers/window-manager';
import { TrayManager } from './managers/tray-manager';
import { registerIPCHandlers } from './ipc/handlers';

// Determine environment
const isDev = !app.isPackaged;

// Data directory for persistent storage
const userDataPath = app.getPath('userData');

// Initialize data services
const settingsService = new SettingsService(
  path.join(userDataPath, 'settings.json')
);

const transcriptionStore = new TranscriptionStore(
  path.join(userDataPath, 'transcriptions.json')
);

const dictionaryService = new DictionaryService(
  path.join(userDataPath, 'dictionary.json')
);

// Initialize backend services
const audioService = new AudioRecordingService(
  path.join(userDataPath, 'recordings')
);

const whisperService = new WhisperTranscriptionService(
  path.join(userDataPath, 'models')
);

const aiService = new AIEnhancementService(
  path.join(userDataPath, 'ai')
);

const powerModeService = new PowerModeService();

// Initialize custom speech API service (WebSocket streaming support)
const customSpeechApiService = new CustomSpeechApiService({
  enabled: settingsService.get('customSpeechApiEnabled'),
  type: settingsService.get('customSpeechApiType'),
  url: settingsService.get('customSpeechApiUrl'),
  apiKey: settingsService.get('customSpeechApiKey'),
});

const hotkeyService = new HotkeyService({
  selectedHotkey1: settingsService.get('selectedHotkey1'),
  selectedHotkey2: settingsService.get('selectedHotkey2'),
  hotkeyMode1: settingsService.get('hotkeyMode1'),
  hotkeyMode2: settingsService.get('hotkeyMode2'),
  isMiddleClickToggleEnabled: settingsService.get('isMiddleClickToggleEnabled'),
  middleClickActivationDelay: settingsService.get('middleClickActivationDelay'),
});

// Initialize transcription pipeline
const pipeline = new TranscriptionPipeline({
  audioService,
  whisperService,
  aiService,
  dictionaryService,
  transcriptionStore,
  settingsService,
  customSpeechApiService,
});

// Restore AI service state from settings
aiService.setEnabled(settingsService.get('isEnhancementEnabled'));
aiService.setProvider(settingsService.get('selectedAIProvider'));
aiService.setModel(settingsService.get('selectedAIModel'));
const savedPromptId = settingsService.get('selectedEnhancementPromptId');
if (savedPromptId) {
  aiService.setActivePrompt(savedPromptId);
}

// Restore whisper model selection
const savedModelId = settingsService.get('selectedTranscriptionModelId');
if (savedModelId) {
  whisperService.selectModel(savedModelId);
}

// Restore audio device selection
const savedDeviceId = settingsService.get('selectedAudioDeviceId');
if (savedDeviceId) {
  audioService.selectDevice(savedDeviceId);
}

// Wire hotkey service to pipeline
hotkeyService.onToggleRecording(() => {
  pipeline.toggleRecording().catch(() => {
    // Error is broadcast via pipeline
  });
});

hotkeyService.onStartRecording(() => {
  pipeline.startRecording().catch(() => {
    // Error is broadcast via pipeline
  });
});

hotkeyService.onStopRecording(() => {
  pipeline.stopAndProcess().catch(() => {
    // Error is broadcast via pipeline
  });
});

// Track recording state for hotkey push-to-talk mode
pipeline.onStateChanged((state) => {
  hotkeyService.setRecordingState(state === 'recording');
});

// Initialize managers
const windowManager = new WindowManager(settingsService, isDev);

let trayManager: TrayManager;

function createTray(): void {
  trayManager = new TrayManager(settingsService, {
    onToggleRecording: () => {
      pipeline.toggleRecording().catch(() => {
        // Error is broadcast via pipeline
      });
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
      aiService.setEnabled(!current);
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
    audioService,
    whisperService,
    aiService,
    hotkeyService,
    pipeline,
    windowManager,
    powerModeService,
    customSpeechApiService,
  });

  // Register audio IPC handlers for receiving audio data from renderer
  audioService.registerIPCHandlers();

  // Create tray
  createTray();

  // Register global hotkeys
  hotkeyService.registerAll();

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
  hotkeyService.destroy();
  windowManager.closeAll();
  trayManager?.destroy();
});
