/**
 * Type declaration for the VoiceInk API exposed via preload script.
 * Provides type safety for renderer process IPC calls.
 */

interface VoiceInkSettingsAPI {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<boolean>;
  getAll: () => Promise<Record<string, unknown>>;
  reset: (key: string) => Promise<boolean>;
  onChange: (callback: (key: string, value: unknown) => void) => () => void;
}

interface VoiceInkTranscriptionsAPI {
  list: () => Promise<unknown[]>;
  get: (id: string) => Promise<unknown>;
  delete: (id: string) => Promise<boolean>;
  onComplete: (callback: (transcription: unknown) => void) => () => void;
  onError: (callback: (error: unknown) => void) => () => void;
}

interface VoiceInkRecorderAPI {
  toggle: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  onStateChanged: (callback: (state: string) => void) => () => void;
  onAudioLevel: (callback: (level: unknown) => void) => () => void;
}

interface VoiceInkDictionaryAPI {
  getWords: () => Promise<unknown[]>;
  addWord: (word: string) => Promise<unknown>;
  deleteWord: (id: string) => Promise<boolean>;
  getReplacements: () => Promise<unknown[]>;
  addReplacement: (original: string, replacement: string) => Promise<unknown>;
  deleteReplacement: (id: string) => Promise<boolean>;
  export: () => Promise<string>;
  import: (json: string) => Promise<{ wordsAdded: number; replacementsAdded: number }>;
}

interface VoiceInkWindowAPI {
  showMain: () => void;
  hideMain: () => void;
  navigate: (viewType: string) => void;
  openHistory: () => void;
  showMiniRecorder: () => void;
  hideMiniRecorder: () => void;
  onNavigate: (callback: (viewType: string) => void) => () => void;
}

interface VoiceInkAppAPI {
  getVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;
  quit: () => void;
  openExternal: (url: string) => Promise<void>;
}

interface VoiceInkAPI {
  settings: VoiceInkSettingsAPI;
  transcriptions: VoiceInkTranscriptionsAPI;
  recorder: VoiceInkRecorderAPI;
  dictionary: VoiceInkDictionaryAPI;
  window: VoiceInkWindowAPI;
  app: VoiceInkAppAPI;
}

declare global {
  interface Window {
    voiceink: VoiceInkAPI;
  }
}

export {};
