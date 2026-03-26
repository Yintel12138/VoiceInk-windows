/**
 * IPC channel names for communication between main and renderer processes.
 * Mirrors the notification-based communication in the original Swift app.
 */
export const IPC_CHANNELS = {
  // Settings / Preferences
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:getAll',
  SETTINGS_RESET: 'settings:reset',
  SETTINGS_CHANGED: 'settings:changed',

  // Recording
  RECORDER_START: 'recorder:start',
  RECORDER_STOP: 'recorder:stop',
  RECORDER_TOGGLE: 'recorder:toggle',
  RECORDER_STATE_CHANGED: 'recorder:stateChanged',
  RECORDER_AUDIO_LEVEL: 'recorder:audioLevel',
  RECORDER_DEVICE_CHANGED: 'recorder:deviceChanged',

  // Transcription
  TRANSCRIPTION_START: 'transcription:start',
  TRANSCRIPTION_PROGRESS: 'transcription:progress',
  TRANSCRIPTION_COMPLETE: 'transcription:complete',
  TRANSCRIPTION_ERROR: 'transcription:error',
  TRANSCRIPTION_LIST: 'transcription:list',
  TRANSCRIPTION_DELETE: 'transcription:delete',
  TRANSCRIPTION_GET: 'transcription:get',

  // Streaming transcription (WebSocket real-time)
  TRANSCRIPTION_STREAMING_PARTIAL: 'transcription:streamingPartial',
  TRANSCRIPTION_STREAMING_STATUS: 'transcription:streamingStatus',

  // Custom Speech API configuration
  CUSTOM_SPEECH_GET_CONFIG: 'customSpeech:getConfig',
  CUSTOM_SPEECH_SET_CONFIG: 'customSpeech:setConfig',
  CUSTOM_SPEECH_TEST_CONNECTION: 'customSpeech:testConnection',

  // AI Enhancement
  ENHANCEMENT_TOGGLE: 'enhancement:toggle',
  ENHANCEMENT_SET_PROMPT: 'enhancement:setPrompt',
  ENHANCEMENT_SET_PROVIDER: 'enhancement:setProvider',
  ENHANCEMENT_SET_MODEL: 'enhancement:setModel',
  ENHANCEMENT_RESULT: 'enhancement:result',

  // Models
  MODEL_LIST: 'model:list',
  MODEL_DOWNLOAD: 'model:download',
  MODEL_DELETE: 'model:delete',
  MODEL_SELECT: 'model:select',
  MODEL_DOWNLOAD_PROGRESS: 'model:downloadProgress',

  // Window management
  WINDOW_SHOW_MAIN: 'window:showMain',
  WINDOW_HIDE_MAIN: 'window:hideMain',
  WINDOW_NAVIGATE: 'window:navigate',
  WINDOW_OPEN_HISTORY: 'window:openHistory',
  WINDOW_SHOW_MINI_RECORDER: 'window:showMiniRecorder',
  WINDOW_HIDE_MINI_RECORDER: 'window:hideMiniRecorder',

  // Menu bar / Tray
  TRAY_UPDATE: 'tray:update',
  TRAY_TOGGLE_DOCK: 'tray:toggleDock',

  // Audio devices
  AUDIO_DEVICES_LIST: 'audio:devicesList',
  AUDIO_DEVICES_CHANGED: 'audio:devicesChanged',
  AUDIO_DEVICE_SELECT: 'audio:deviceSelect',

  // Dictionary
  DICTIONARY_GET_WORDS: 'dictionary:getWords',
  DICTIONARY_ADD_WORD: 'dictionary:addWord',
  DICTIONARY_DELETE_WORD: 'dictionary:deleteWord',
  DICTIONARY_GET_REPLACEMENTS: 'dictionary:getReplacements',
  DICTIONARY_ADD_REPLACEMENT: 'dictionary:addReplacement',
  DICTIONARY_DELETE_REPLACEMENT: 'dictionary:deleteReplacement',
  DICTIONARY_IMPORT: 'dictionary:import',
  DICTIONARY_EXPORT: 'dictionary:export',

  // Power Mode
  POWER_MODE_GET_CONFIGS: 'powerMode:getConfigs',
  POWER_MODE_SAVE_CONFIG: 'powerMode:saveConfig',
  POWER_MODE_DELETE_CONFIG: 'powerMode:deleteConfig',
  POWER_MODE_ACTIVE_CHANGED: 'powerMode:activeChanged',

  // License
  LICENSE_CHECK: 'license:check',
  LICENSE_ACTIVATE: 'license:activate',
  LICENSE_STATUS: 'license:status',

  // App lifecycle
  APP_QUIT: 'app:quit',
  APP_VERSION: 'app:version',
  APP_CHECK_UPDATE: 'app:checkUpdate',
  APP_OPEN_EXTERNAL: 'app:openExternal',
  APP_GET_PLATFORM: 'app:getPlatform',
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
