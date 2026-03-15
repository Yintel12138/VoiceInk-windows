/**
 * Application default settings.
 * Mirrors AppDefaults.swift registerDefaults() from the original Swift app.
 */
export const APP_DEFAULTS: AppDefaultsType = {
  // Onboarding
  hasCompletedOnboarding: false,
  enableAnnouncements: true,
  autoUpdateCheck: true,

  // Clipboard
  restoreClipboardAfterPaste: true,
  clipboardRestoreDelay: 2.0,
  useAppleScriptPaste: false,

  // Audio / Media
  isSystemMuteEnabled: true,
  audioResumptionDelay: 0.0,
  isPauseMediaEnabled: false,
  isSoundFeedbackEnabled: true,

  // Recording
  isTextFormattingEnabled: true,
  isVADEnabled: true,
  removeFillerWords: true,
  selectedLanguage: 'en',
  appendTrailingSpace: true,
  recorderType: 'mini' as RecorderType,

  // Cleanup
  isTranscriptionCleanupEnabled: false,
  transcriptionRetentionMinutes: 1440,
  isAudioCleanupEnabled: false,
  audioRetentionPeriod: 7,

  // UI
  isMenuBarOnly: false,
  powerModeAutoRestoreEnabled: false,

  // Hotkey
  isMiddleClickToggleEnabled: false,
  middleClickActivationDelay: 200,
  hotkeyMode1: 'toggle' as HotkeyMode,
  hotkeyMode2: 'toggle' as HotkeyMode,
  selectedHotkey1: 'none' as HotkeyOption,
  selectedHotkey2: 'none' as HotkeyOption,

  // Enhancement
  isToggleEnhancementShortcutEnabled: true,
  isEnhancementEnabled: false,
  selectedAIProvider: 'openai',
  selectedAIModel: '',
  selectedEnhancementPromptId: '',

  // Model
  prewarmModelOnWake: true,
  selectedTranscriptionModelId: '',
};

export interface AppDefaultsType {
  hasCompletedOnboarding: boolean;
  enableAnnouncements: boolean;
  autoUpdateCheck: boolean;
  restoreClipboardAfterPaste: boolean;
  clipboardRestoreDelay: number;
  useAppleScriptPaste: boolean;
  isSystemMuteEnabled: boolean;
  audioResumptionDelay: number;
  isPauseMediaEnabled: boolean;
  isSoundFeedbackEnabled: boolean;
  isTextFormattingEnabled: boolean;
  isVADEnabled: boolean;
  removeFillerWords: boolean;
  selectedLanguage: string;
  appendTrailingSpace: boolean;
  recorderType: RecorderType;
  isTranscriptionCleanupEnabled: boolean;
  transcriptionRetentionMinutes: number;
  isAudioCleanupEnabled: boolean;
  audioRetentionPeriod: number;
  isMenuBarOnly: boolean;
  powerModeAutoRestoreEnabled: boolean;
  isMiddleClickToggleEnabled: boolean;
  middleClickActivationDelay: number;
  hotkeyMode1: HotkeyMode;
  hotkeyMode2: HotkeyMode;
  selectedHotkey1: HotkeyOption;
  selectedHotkey2: HotkeyOption;
  isToggleEnhancementShortcutEnabled: boolean;
  isEnhancementEnabled: boolean;
  selectedAIProvider: string;
  selectedAIModel: string;
  selectedEnhancementPromptId: string;
  prewarmModelOnWake: boolean;
  selectedTranscriptionModelId: string;
}

export type AppDefaultKey = keyof AppDefaultsType;

export type RecorderType = 'mini' | 'notch';
export type HotkeyMode = 'toggle' | 'pushToTalk' | 'hybrid';
export type HotkeyOption = 'capsLock' | 'rightOption' | 'fn' | 'custom' | 'none';
