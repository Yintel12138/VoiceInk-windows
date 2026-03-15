/**
 * TranscriptionPipeline - Orchestrates the full recording → transcription → enhancement flow.
 * Mirrors VoiceInk/Whisper/TranscriptionPipeline.swift.
 *
 * Pipeline steps:
 * 1. Record audio (AudioRecordingService)
 * 2. Transcribe with Whisper (WhisperTranscriptionService)
 * 3. Format text (WhisperTextFormatter)
 * 4. Apply dictionary replacements (DictionaryService)
 * 5. AI Enhancement if enabled (AIEnhancementService)
 * 6. Save to history (TranscriptionStore)
 * 7. Copy to clipboard / paste
 * 8. Notify completion
 */
import { clipboard, BrowserWindow } from 'electron';
import { AudioRecordingService } from './audio-recording-service';
import { WhisperTranscriptionService, WhisperTextFormatter } from './whisper-transcription-service';
import { AIEnhancementService } from './ai-enhancement-service';
import { DictionaryService } from './dictionary-service';
import { TranscriptionStore } from './transcription-store';
import { SettingsService } from './settings-service';
import { RecordingState } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';

export class TranscriptionPipeline {
  private audioService: AudioRecordingService;
  private whisperService: WhisperTranscriptionService;
  private aiService: AIEnhancementService;
  private dictionaryService: DictionaryService;
  private transcriptionStore: TranscriptionStore;
  private settingsService: SettingsService;

  private stateListeners: Array<(state: RecordingState) => void> = [];

  constructor(deps: {
    audioService: AudioRecordingService;
    whisperService: WhisperTranscriptionService;
    aiService: AIEnhancementService;
    dictionaryService: DictionaryService;
    transcriptionStore: TranscriptionStore;
    settingsService: SettingsService;
  }) {
    this.audioService = deps.audioService;
    this.whisperService = deps.whisperService;
    this.aiService = deps.aiService;
    this.dictionaryService = deps.dictionaryService;
    this.transcriptionStore = deps.transcriptionStore;
    this.settingsService = deps.settingsService;
  }

  /**
   * Toggle recording: start if idle, process if recording.
   * This is the main entry point called from hotkey/tray/UI.
   */
  async toggleRecording(): Promise<void> {
    const currentState = this.audioService.getState();

    if (currentState === 'recording') {
      await this.stopAndProcess();
    } else if (currentState === 'idle') {
      await this.startRecording();
    }
    // If transcribing or enhancing, ignore
  }

  /**
   * Start recording.
   */
  async startRecording(): Promise<void> {
    try {
      await this.audioService.startRecording();
      this.broadcastState('recording');
    } catch (err) {
      this.broadcastError(`Failed to start recording: ${err}`);
    }
  }

  /**
   * Stop recording and run the processing pipeline.
   */
  async stopAndProcess(): Promise<void> {
    try {
      // Step 1: Stop recording
      const result = await this.audioService.stopRecording();
      if (!result) {
        this.broadcastState('idle');
        return;
      }

      const { filePath, duration: recordingDuration } = result;

      // Step 2: Transcribe
      this.broadcastState('transcribing');
      const language = this.settingsService.get('selectedLanguage');
      const transcriptionResult = await this.whisperService.transcribe(filePath, language);

      let processedText = transcriptionResult.text;

      // Step 3: Format text
      const isFormattingEnabled = this.settingsService.get('isTextFormattingEnabled');
      const removeFillerWords = this.settingsService.get('removeFillerWords');
      const appendTrailingSpace = this.settingsService.get('appendTrailingSpace');

      if (isFormattingEnabled) {
        processedText = WhisperTextFormatter.format(processedText, {
          capitalizeFirstLetter: true,
          removeFillerWords,
          appendTrailingSpace,
        });
      }

      // Step 4: Apply dictionary replacements
      processedText = this.dictionaryService.applyReplacements(processedText);

      // Step 5: AI Enhancement (if enabled)
      let enhancedText: string | undefined;
      let enhancementDuration: number | undefined;
      let aiModelName: string | undefined;

      if (this.aiService.getEnabled()) {
        this.broadcastState('enhancing');
        try {
          const enhancementResult = await this.aiService.enhance(processedText);
          enhancedText = enhancementResult.enhancedText;
          enhancementDuration = enhancementResult.duration;
          aiModelName = enhancementResult.model;
        } catch (err) {
          // Enhancement failed - use unenhanced text
          this.broadcastError(`Enhancement failed: ${err}`);
        }
      }

      // Step 6: Save to history
      const finalText = enhancedText || processedText;
      const selectedModelId = this.whisperService.getSelectedModelId();

      const transcription = this.transcriptionStore.add(processedText, {
        enhancedText,
        duration: recordingDuration,
        transcriptionModelName: selectedModelId,
        aiEnhancementModelName: aiModelName,
        transcriptionDuration: transcriptionResult.duration,
        enhancementDuration,
        transcriptionStatus: 'completed',
      });

      // Step 7: Copy to clipboard
      const previousClipboard = clipboard.readText();
      clipboard.writeText(finalText);

      // Restore clipboard after delay if enabled
      const restoreClipboard = this.settingsService.get('restoreClipboardAfterPaste');
      const restoreDelay = this.settingsService.get('clipboardRestoreDelay');

      if (restoreClipboard && restoreDelay > 0) {
        setTimeout(() => {
          clipboard.writeText(previousClipboard);
        }, restoreDelay * 1000);
      }

      // Step 8: Notify completion
      this.broadcastCompletion(transcription);
      this.broadcastState('idle');

    } catch (err) {
      this.broadcastError(`Pipeline error: ${err}`);
      this.broadcastState('idle');
    }
  }

  /**
   * Cancel current recording.
   */
  cancelRecording(): void {
    this.audioService.cancelRecording();
    this.broadcastState('idle');
  }

  /**
   * Register state change listener.
   */
  onStateChanged(listener: (state: RecordingState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      const idx = this.stateListeners.indexOf(listener);
      if (idx >= 0) this.stateListeners.splice(idx, 1);
    };
  }

  /**
   * Transcribe an existing audio/video file (for TranscribeAudio view).
   */
  async transcribeFile(filePath: string, language?: string): Promise<{
    text: string;
    enhancedText?: string;
    duration: number;
  }> {
    const lang = language || this.settingsService.get('selectedLanguage');
    const result = await this.whisperService.transcribeFile(filePath, lang);

    let processedText = result.text;

    // Format
    if (this.settingsService.get('isTextFormattingEnabled')) {
      processedText = WhisperTextFormatter.format(processedText, {
        capitalizeFirstLetter: true,
        removeFillerWords: this.settingsService.get('removeFillerWords'),
      });
    }

    // Dictionary replacements
    processedText = this.dictionaryService.applyReplacements(processedText);

    // AI Enhancement
    let enhancedText: string | undefined;
    if (this.aiService.getEnabled()) {
      try {
        const enhResult = await this.aiService.enhance(processedText);
        enhancedText = enhResult.enhancedText;
      } catch {
        // Skip enhancement on error
      }
    }

    return {
      text: processedText,
      enhancedText,
      duration: result.duration,
    };
  }

  // --- Private ---

  private broadcastState(state: RecordingState): void {
    for (const listener of this.stateListeners) {
      listener(state);
    }

    // Broadcast to all renderer windows
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.RECORDER_STATE_CHANGED, state);
      }
    }
  }

  private broadcastCompletion(transcription: unknown): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TRANSCRIPTION_COMPLETE, transcription);
      }
    }
  }

  private broadcastError(error: string): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.TRANSCRIPTION_ERROR, error);
      }
    }
  }
}
