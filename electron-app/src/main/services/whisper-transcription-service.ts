/**
 * WhisperTranscriptionService - Local speech-to-text using whisper.cpp.
 * Mirrors VoiceInk/Whisper/VoiceInkEngine.swift + LibWhisper.swift.
 *
 * Architecture:
 * - Downloads GGML model files from Hugging Face
 * - Uses whisper-node (native N-API addon wrapping whisper.cpp) for inference
 * - Falls back to a subprocess-based approach if addon is unavailable
 *
 * The service manages the full lifecycle:
 * 1. Model management (download, list, delete, select)
 * 2. Transcription (audio file → text)
 * 3. Text post-processing (formatting, filler word removal)
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { TranscriptionModel, TranscriptionModelType } from '../../shared/types';

/** Predefined Whisper models available for download. */
export const PREDEFINED_MODELS: TranscriptionModel[] = [
  {
    id: 'whisper-tiny',
    name: 'ggml-tiny',
    displayName: 'Whisper Tiny',
    description: 'Fastest, least accurate. ~75MB. Good for quick drafts.',
    size: 75_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    type: 'whisper',
    language: 'multilingual',
    isDownloaded: false,
  },
  {
    id: 'whisper-tiny-en',
    name: 'ggml-tiny.en',
    displayName: 'Whisper Tiny (English)',
    description: 'English-only tiny model. ~75MB.',
    size: 75_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin',
    type: 'whisper',
    language: 'en',
    isDownloaded: false,
  },
  {
    id: 'whisper-base',
    name: 'ggml-base',
    displayName: 'Whisper Base',
    description: 'Good balance of speed and accuracy. ~142MB.',
    size: 142_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    type: 'whisper',
    language: 'multilingual',
    isDownloaded: false,
  },
  {
    id: 'whisper-base-en',
    name: 'ggml-base.en',
    displayName: 'Whisper Base (English)',
    description: 'English-only base model. ~142MB.',
    size: 142_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    type: 'whisper',
    language: 'en',
    isDownloaded: false,
  },
  {
    id: 'whisper-small',
    name: 'ggml-small',
    displayName: 'Whisper Small',
    description: 'Recommended for most users. ~466MB.',
    size: 466_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    type: 'whisper',
    language: 'multilingual',
    isDownloaded: false,
  },
  {
    id: 'whisper-small-en',
    name: 'ggml-small.en',
    displayName: 'Whisper Small (English)',
    description: 'English-only small model. ~466MB.',
    size: 466_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
    type: 'whisper',
    language: 'en',
    isDownloaded: false,
  },
  {
    id: 'whisper-medium',
    name: 'ggml-medium',
    displayName: 'Whisper Medium',
    description: 'High accuracy. ~1.5GB. Requires more RAM.',
    size: 1_500_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    type: 'whisper',
    language: 'multilingual',
    isDownloaded: false,
  },
  {
    id: 'whisper-large-v3',
    name: 'ggml-large-v3',
    displayName: 'Whisper Large v3',
    description: 'Best accuracy. ~3GB. Requires significant RAM.',
    size: 3_000_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin',
    type: 'whisper',
    language: 'multilingual',
    isDownloaded: false,
  },
  {
    id: 'whisper-large-v3-turbo',
    name: 'ggml-large-v3-turbo',
    displayName: 'Whisper Large v3 Turbo',
    description: 'Optimized large model. ~1.6GB. Fast + accurate.',
    size: 1_600_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    type: 'whisper',
    language: 'multilingual',
    isDownloaded: false,
  },
];

export interface TranscriptionResult {
  text: string;
  duration: number; // seconds taken to transcribe
  language?: string;
}

export interface DownloadProgress {
  modelId: string;
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
}

export class WhisperTranscriptionService {
  private modelsDir: string;
  private selectedModelId: string = '';
  private downloadProgressListeners: Array<(progress: DownloadProgress) => void> = [];
  private activeDownloads: Map<string, { abort: () => void }> = new Map();

  constructor(modelsDir: string) {
    this.modelsDir = modelsDir;
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  /**
   * List all available models with download status.
   */
  listModels(): TranscriptionModel[] {
    return PREDEFINED_MODELS.map((model) => ({
      ...model,
      isDownloaded: this.isModelDownloaded(model.id),
      localPath: this.getModelPath(model.id),
    }));
  }

  /**
   * Check if a model is downloaded locally.
   */
  isModelDownloaded(modelId: string): boolean {
    const modelPath = this.getModelPath(modelId);
    return fs.existsSync(modelPath);
  }

  /**
   * Get the local file path for a model.
   */
  getModelPath(modelId: string): string {
    const model = PREDEFINED_MODELS.find((m) => m.id === modelId);
    const filename = model ? `${model.name}.bin` : `${modelId}.bin`;
    return path.join(this.modelsDir, filename);
  }

  /**
   * Download a model from Hugging Face.
   */
  async downloadModel(modelId: string): Promise<string> {
    const model = PREDEFINED_MODELS.find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    if (this.isModelDownloaded(modelId)) {
      return this.getModelPath(modelId);
    }

    const outputPath = this.getModelPath(modelId);
    const tempPath = outputPath + '.download';

    return new Promise<string>((resolve, reject) => {
      const handleResponse = (response: http.IncomingMessage) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            https.get(redirectUrl, handleResponse).on('error', reject);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;

        const fileStream = fs.createWriteStream(tempPath);

        const abortController = {
          abort: () => {
            response.destroy();
            fileStream.close();
            try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
          },
        };
        this.activeDownloads.set(modelId, abortController);

        response.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;
          const progress = totalBytes > 0
            ? Math.round((downloadedBytes / totalBytes) * 100)
            : 0;

          this.notifyDownloadProgress({
            modelId,
            progress,
            downloadedBytes,
            totalBytes,
          });
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          this.activeDownloads.delete(modelId);

          // Rename temp file to final path
          try {
            fs.renameSync(tempPath, outputPath);
            resolve(outputPath);
          } catch (err) {
            reject(err);
          }
        });

        fileStream.on('error', (err) => {
          this.activeDownloads.delete(modelId);
          try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
          reject(err);
        });
      };

      https.get(model.downloadURL, handleResponse).on('error', (err) => {
        this.activeDownloads.delete(modelId);
        reject(err);
      });
    });
  }

  /**
   * Cancel an active download.
   */
  cancelDownload(modelId: string): boolean {
    const download = this.activeDownloads.get(modelId);
    if (download) {
      download.abort();
      this.activeDownloads.delete(modelId);
      return true;
    }
    return false;
  }

  /**
   * Delete a downloaded model.
   */
  deleteModel(modelId: string): boolean {
    const modelPath = this.getModelPath(modelId);
    if (fs.existsSync(modelPath)) {
      fs.unlinkSync(modelPath);
      return true;
    }
    return false;
  }

  /**
   * Select a model for transcription.
   */
  selectModel(modelId: string): void {
    this.selectedModelId = modelId;
  }

  /**
   * Get the currently selected model ID.
   */
  getSelectedModelId(): string {
    return this.selectedModelId;
  }

  /**
   * Transcribe an audio file using whisper.cpp.
   *
   * This method attempts to use:
   * 1. whisper-node native addon (if installed)
   * 2. whisper.cpp CLI subprocess (if binary exists)
   * 3. Fallback placeholder for development
   *
   * @param audioFilePath Path to the WAV audio file (16kHz mono PCM)
   * @param language Target language code (e.g., 'en', 'zh', 'auto')
   * @returns Transcription result with text and timing
   */
  async transcribe(
    audioFilePath: string,
    language: string = 'auto'
  ): Promise<TranscriptionResult> {
    const modelId = this.selectedModelId;
    if (!modelId) {
      throw new Error('No model selected. Please select a transcription model.');
    }

    if (!this.isModelDownloaded(modelId)) {
      throw new Error(`Model ${modelId} is not downloaded. Please download it first.`);
    }

    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found: ${audioFilePath}`);
    }

    const modelPath = this.getModelPath(modelId);
    const startTime = Date.now();

    try {
      // Try whisper-node native addon
      const text = await this.transcribeWithWhisperNode(modelPath, audioFilePath, language);
      const duration = (Date.now() - startTime) / 1000;
      return { text, duration, language };
    } catch {
      try {
        // Try whisper.cpp CLI
        const text = await this.transcribeWithCLI(modelPath, audioFilePath, language);
        const duration = (Date.now() - startTime) / 1000;
        return { text, duration, language };
      } catch {
        // Development fallback - return placeholder
        const duration = (Date.now() - startTime) / 1000;
        return {
          text: '[Transcription placeholder - whisper.cpp native addon not yet installed. Install whisper-node for real transcription.]',
          duration,
          language,
        };
      }
    }
  }

  /**
   * Transcribe a file for the TranscribeAudio view (file-based transcription).
   */
  async transcribeFile(
    filePath: string,
    language: string = 'auto'
  ): Promise<TranscriptionResult> {
    // For non-WAV files, we would need to convert first
    // For now, pass through to the main transcribe method
    return this.transcribe(filePath, language);
  }

  /**
   * Register download progress listener.
   */
  onDownloadProgress(listener: (progress: DownloadProgress) => void): () => void {
    this.downloadProgressListeners.push(listener);
    return () => {
      const idx = this.downloadProgressListeners.indexOf(listener);
      if (idx >= 0) this.downloadProgressListeners.splice(idx, 1);
    };
  }

  // --- Private transcription methods ---

  /**
   * Attempt transcription using whisper-node native N-API addon.
   */
  private async transcribeWithWhisperNode(
    modelPath: string,
    audioFilePath: string,
    language: string
  ): Promise<string> {
    try {
      // Dynamic import to avoid build-time dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const whisper = require('whisper-node');
      const result = await whisper.whisper(audioFilePath, {
        modelPath,
        language: language === 'auto' ? undefined : language,
      });

      if (Array.isArray(result)) {
        return result.map((segment: { speech: string }) => segment.speech).join(' ').trim();
      }
      return String(result || '');
    } catch (err) {
      throw new Error(`whisper-node not available: ${err}`);
    }
  }

  /**
   * Attempt transcription using whisper.cpp CLI binary.
   */
  private async transcribeWithCLI(
    modelPath: string,
    audioFilePath: string,
    language: string
  ): Promise<string> {
    const { execFile } = require('child_process');
    const util = require('util');
    const execFileAsync = util.promisify(execFile);

    // Look for whisper binary in common locations
    const binaryNames = ['whisper', 'whisper-cpp', 'main'];
    const searchPaths = [
      path.join(this.modelsDir, '..', 'bin'),
      '/usr/local/bin',
      '/usr/bin',
      path.join(process.resourcesPath || '', 'bin'),
    ];

    let binaryPath: string | null = null;
    for (const dir of searchPaths) {
      for (const name of binaryNames) {
        const candidate = path.join(dir, name);
        if (fs.existsSync(candidate)) {
          binaryPath = candidate;
          break;
        }
      }
      if (binaryPath) break;
    }

    if (!binaryPath) {
      throw new Error('whisper.cpp binary not found');
    }

    const args = [
      '-m', modelPath,
      '-f', audioFilePath,
      '--no-timestamps',
      '--output-txt',
    ];

    if (language !== 'auto') {
      args.push('-l', language);
    }

    const { stdout } = await execFileAsync(binaryPath, args, {
      timeout: 300000, // 5 minute timeout
    });

    return (stdout as string).trim();
  }

  private notifyDownloadProgress(progress: DownloadProgress): void {
    for (const listener of this.downloadProgressListeners) {
      listener(progress);
    }
  }
}

/**
 * WhisperTextFormatter - Post-processes transcription output.
 * Mirrors VoiceInk/Whisper/WhisperTextFormatter.swift.
 */
export class WhisperTextFormatter {
  /**
   * Format transcribed text with proper capitalization and cleanup.
   */
  static format(text: string, options: FormatOptions = {}): string {
    let result = text.trim();

    if (!result) return result;

    // Remove whisper artifacts like [BLANK_AUDIO], (music), etc.
    result = result
      .replace(/\[BLANK_AUDIO\]/gi, '')
      .replace(/\(music\)/gi, '')
      .replace(/\(applause\)/gi, '')
      .replace(/\(laughter\)/gi, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    // Capitalize first letter of each sentence
    if (options.capitalizeFirstLetter !== false) {
      result = result.replace(/(^|[.!?]\s+)([a-z])/g, (_match, prefix, letter) =>
        prefix + letter.toUpperCase()
      );
    }

    // Remove filler words if enabled
    if (options.removeFillerWords) {
      result = WhisperTextFormatter.removeFillerWords(result);
    }

    // Ensure proper spacing
    result = result.replace(/\s+/g, ' ').trim();

    // Append trailing space if enabled
    if (options.appendTrailingSpace) {
      result += ' ';
    }

    return result;
  }

  /**
   * Remove common filler words from transcribed text.
   * Mirrors VoiceInk/Services/FillerWordManager.swift.
   */
  static removeFillerWords(text: string): string {
    const fillerWords = [
      'um', 'uh', 'er', 'ah', 'like', 'you know', 'i mean',
      'sort of', 'kind of', 'basically', 'actually', 'literally',
      'right', 'okay so', 'well',
    ];

    let result = text;
    for (const filler of fillerWords) {
      // Remove filler words at word boundaries, case-insensitive
      const regex = new RegExp(`\\b${filler}\\b[,]?\\s*`, 'gi');
      result = result.replace(regex, '');
    }

    // Clean up extra whitespace
    result = result.replace(/\s+/g, ' ').trim();

    // Re-capitalize after removal
    result = result.replace(/(^|[.!?]\s+)([a-z])/g, (_match, prefix, letter) =>
      prefix + letter.toUpperCase()
    );

    return result;
  }
}

export interface FormatOptions {
  capitalizeFirstLetter?: boolean;
  removeFillerWords?: boolean;
  appendTrailingSpace?: boolean;
}
