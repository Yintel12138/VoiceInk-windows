/**
 * Transcription model metadata.
 * Mirrors VoiceInk/Models/TranscriptionModel.swift and PredefinedModels.swift.
 */
export interface TranscriptionModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  size: number; // bytes
  downloadURL: string;
  type: TranscriptionModelType;
  language?: string;
  isDownloaded: boolean;
  localPath?: string;
}

export type TranscriptionModelType = 'whisper' | 'parakeet';

/**
 * AI enhancement prompt template.
 * Mirrors VoiceInk/Models/CustomPrompt.swift.
 */
export interface CustomPrompt {
  id: string;
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  isBuiltIn: boolean;
  createdAt: string;
}

/**
 * AI provider configuration.
 * Mirrors VoiceInk/Services/AIEnhancement/AIService providers.
 */
export interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  baseURL: string;
  requiresAPIKey: boolean;
  models: AIModel[];
}

export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  providerId: string;
}

/**
 * Recording state machine.
 * Mirrors VoiceInk/Whisper/RecordingState.swift.
 */
export type RecordingState = 'idle' | 'recording' | 'transcribing' | 'enhancing';

/**
 * Audio device information.
 */
export interface AudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
  isInput: boolean;
}

/**
 * Audio level data for visualization.
 */
export interface AudioLevel {
  averagePower: number; // 0-1 normalized
  peakPower: number; // 0-1 normalized
}

/**
 * Power Mode configuration.
 * Mirrors VoiceInk/PowerMode/PowerModeConfig.swift.
 */
export interface PowerModeConfig {
  id: string;
  name: string;
  emoji: string;
  appIdentifier?: string;
  urlPattern?: string;
  enhancementPromptId?: string;
  languageCode?: string;
  isEnabled: boolean;
  createdAt: string;
}

/**
 * Navigation view types for the main content area.
 * Mirrors ContentView ViewType enum.
 */
export type ViewType =
  | 'metrics'
  | 'transcribeAudio'
  | 'history'
  | 'models'
  | 'enhancement'
  | 'powerMode'
  | 'permissions'
  | 'audioInput'
  | 'dictionary'
  | 'settings'
  | 'license';
