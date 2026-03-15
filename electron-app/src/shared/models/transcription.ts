/**
 * Transcription data model.
 * Mirrors VoiceInk/Models/Transcription.swift (@Model class).
 */
export interface Transcription {
  id: string;
  text: string;
  enhancedText?: string;
  timestamp: string; // ISO 8601 date string
  duration: number; // seconds
  audioFileURL?: string;
  transcriptionModelName?: string;
  aiEnhancementModelName?: string;
  promptName?: string;
  transcriptionDuration?: number; // seconds
  enhancementDuration?: number; // seconds
  aiRequestSystemMessage?: string;
  aiRequestUserMessage?: string;
  powerModeName?: string;
  powerModeEmoji?: string;
  transcriptionStatus: TranscriptionStatus;
}

export type TranscriptionStatus = 'pending' | 'completed' | 'failed';

/**
 * Creates a new Transcription with defaults.
 */
export function createTranscription(
  text: string,
  overrides: Partial<Transcription> = {}
): Transcription {
  return {
    id: overrides.id ?? generateId(),
    text,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
    duration: overrides.duration ?? 0,
    transcriptionStatus: overrides.transcriptionStatus ?? 'pending',
    ...overrides,
  };
}

function generateId(): string {
  // Simple UUID v4 generation without external dependency for shared module
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
