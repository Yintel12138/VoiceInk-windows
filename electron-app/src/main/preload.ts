/**
 * Preload script - Exposes a safe, typed API to the renderer process.
 * Uses contextBridge to create the `window.voiceink` API.
 *
 * This bridges the gap between the main process services and the
 * renderer process React components, similar to how SwiftUI's
 * @EnvironmentObject injects services into views.
 */
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/ipc-channels';

const api = {
  // --- Settings ---
  settings: {
    get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key: string, value: unknown) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
    reset: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_RESET, key),
    onChange: (callback: (key: string, value: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, key: string, value: unknown) => {
        callback(key, value);
      };
      ipcRenderer.on(IPC_CHANNELS.SETTINGS_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.SETTINGS_CHANGED, listener);
    },
  },

  // --- Transcriptions ---
  transcriptions: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIPTION_LIST),
    get: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIPTION_GET, id),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIPTION_DELETE, id),
    start: (filePath: string, language?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIPTION_START, filePath, language),
    onComplete: (callback: (transcription: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, transcription: unknown) => {
        callback(transcription);
      };
      ipcRenderer.on(IPC_CHANNELS.TRANSCRIPTION_COMPLETE, listener);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.TRANSCRIPTION_COMPLETE, listener);
    },
    onError: (callback: (error: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, error: unknown) => {
        callback(error);
      };
      ipcRenderer.on(IPC_CHANNELS.TRANSCRIPTION_ERROR, listener);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.TRANSCRIPTION_ERROR, listener);
    },
  },

  // --- Recorder ---
  recorder: {
    toggle: () => ipcRenderer.invoke(IPC_CHANNELS.RECORDER_TOGGLE),
    start: () => ipcRenderer.invoke(IPC_CHANNELS.RECORDER_START),
    stop: () => ipcRenderer.invoke(IPC_CHANNELS.RECORDER_STOP),
    onStateChanged: (callback: (state: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: string) => {
        callback(state);
      };
      ipcRenderer.on(IPC_CHANNELS.RECORDER_STATE_CHANGED, listener);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.RECORDER_STATE_CHANGED, listener);
    },
    onAudioLevel: (callback: (level: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, level: unknown) => {
        callback(level);
      };
      ipcRenderer.on(IPC_CHANNELS.RECORDER_AUDIO_LEVEL, listener);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.RECORDER_AUDIO_LEVEL, listener);
    },
  },

  // --- Models ---
  models: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.MODEL_LIST),
    download: (modelId: string) => ipcRenderer.invoke(IPC_CHANNELS.MODEL_DOWNLOAD, modelId),
    delete: (modelId: string) => ipcRenderer.invoke(IPC_CHANNELS.MODEL_DELETE, modelId),
    select: (modelId: string) => ipcRenderer.invoke(IPC_CHANNELS.MODEL_SELECT, modelId),
    onDownloadProgress: (callback: (progress: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, progress: unknown) => {
        callback(progress);
      };
      ipcRenderer.on(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, listener);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.MODEL_DOWNLOAD_PROGRESS, listener);
    },
  },

  // --- Whisper Binary ---
  whisper: {
    getBinaryInfo: () => ipcRenderer.invoke('whisper:binaryInfo'),
    downloadBinary: (releaseTag?: string) =>
      ipcRenderer.invoke('whisper:downloadBinary', releaseTag),
    isBinaryAvailable: () => ipcRenderer.invoke('whisper:isBinaryAvailable'),
  },

  // --- AI Enhancement ---
  enhancement: {
    toggle: (enabled?: boolean) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENHANCEMENT_TOGGLE, enabled),
    setPrompt: (promptId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENHANCEMENT_SET_PROMPT, promptId),
    setProvider: (providerId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENHANCEMENT_SET_PROVIDER, providerId),
    setModel: (modelId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.ENHANCEMENT_SET_MODEL, modelId),
    getProviders: () => ipcRenderer.invoke('enhancement:getProviders'),
    getPrompts: () => ipcRenderer.invoke('enhancement:getPrompts'),
    addPrompt: (prompt: { name: string; systemPrompt: string; userPromptTemplate: string }) =>
      ipcRenderer.invoke('enhancement:addPrompt', prompt),
    updatePrompt: (id: string, updates: Record<string, unknown>) =>
      ipcRenderer.invoke('enhancement:updatePrompt', id, updates),
    deletePrompt: (id: string) =>
      ipcRenderer.invoke('enhancement:deletePrompt', id),
    saveApiKey: (providerId: string, apiKey: string) =>
      ipcRenderer.invoke('enhancement:saveApiKey', providerId, apiKey),
    getApiKey: (providerId: string) =>
      ipcRenderer.invoke('enhancement:getApiKey', providerId),
    hasApiKey: (providerId: string) =>
      ipcRenderer.invoke('enhancement:hasApiKey', providerId),
    verifyApiKey: (providerId: string, apiKey: string) =>
      ipcRenderer.invoke('enhancement:verifyApiKey', providerId, apiKey),
    onResult: (callback: (result: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, result: unknown) => {
        callback(result);
      };
      ipcRenderer.on(IPC_CHANNELS.ENHANCEMENT_RESULT, listener);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.ENHANCEMENT_RESULT, listener);
    },
  },

  // --- Audio Devices ---
  audio: {
    listDevices: () => ipcRenderer.invoke(IPC_CHANNELS.AUDIO_DEVICES_LIST),
    selectDevice: (deviceId: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUDIO_DEVICE_SELECT, deviceId),
    sendChunk: (chunk: ArrayBuffer) =>
      ipcRenderer.send('audio:chunk', Buffer.from(chunk)),
    sendLevel: (level: { averagePower: number; peakPower: number }) =>
      ipcRenderer.send('audio:level', level),
    onDevicesChanged: (callback: (devices: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, devices: unknown) => {
        callback(devices);
      };
      ipcRenderer.on(IPC_CHANNELS.AUDIO_DEVICES_CHANGED, listener);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.AUDIO_DEVICES_CHANGED, listener);
    },
  },

  // --- Dictionary ---
  dictionary: {
    getWords: () => ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_GET_WORDS),
    addWord: (word: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_ADD_WORD, word),
    deleteWord: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_DELETE_WORD, id),
    getReplacements: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_GET_REPLACEMENTS),
    addReplacement: (original: string, replacement: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_ADD_REPLACEMENT, original, replacement),
    deleteReplacement: (id: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_DELETE_REPLACEMENT, id),
    export: () => ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_EXPORT),
    import: (json: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_IMPORT, json),
  },

  // --- Window ---
  window: {
    showMain: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_SHOW_MAIN),
    hideMain: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_HIDE_MAIN),
    navigate: (viewType: string) =>
      ipcRenderer.send(IPC_CHANNELS.WINDOW_NAVIGATE, viewType),
    openHistory: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_OPEN_HISTORY),
    showMiniRecorder: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_SHOW_MINI_RECORDER),
    hideMiniRecorder: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_HIDE_MINI_RECORDER),
    onNavigate: (callback: (viewType: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, viewType: string) => {
        callback(viewType);
      };
      ipcRenderer.on(IPC_CHANNELS.WINDOW_NAVIGATE, listener);
      return () =>
        ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_NAVIGATE, listener);
    },
  },

  // --- App ---
  app: {
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_VERSION),
    getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_PLATFORM),
    quit: () => ipcRenderer.send(IPC_CHANNELS.APP_QUIT),
    openExternal: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_EXTERNAL, url),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('voiceink', api);

// Type declaration for the exposed API
export type VoiceInkAPI = typeof api;
