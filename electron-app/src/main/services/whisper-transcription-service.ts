/**
 * WhisperTranscriptionService - Local speech-to-text using whisper.cpp.
 * Mirrors VoiceInk/Whisper/VoiceInkEngine.swift + LibWhisper.swift.
 *
 * Cross-platform architecture (macOS, Windows, Linux):
 * - Downloads GGML model files from Hugging Face
 * - Downloads pre-built whisper.cpp CLI binaries from GitHub releases per platform
 * - Falls back to whisper-node native N-API addon if available
 * - Automatically selects the correct binary for the current OS/architecture
 *
 * The service manages the full lifecycle:
 * 1. whisper.cpp binary management (download, detect, update)
 * 2. Model management (download, list, delete, select)
 * 3. Transcription (audio file → text)
 * 4. Text post-processing (formatting, filler word removal)
 */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { TranscriptionModel, TranscriptionModelType } from '../../shared/types';

// Platform detection helpers
const PLATFORM = process.platform; // 'darwin' | 'win32' | 'linux'
const ARCH = process.arch;         // 'x64' | 'arm64' | 'ia32'

/**
 * Get the whisper.cpp binary filename for the current platform.
 */
export function getWhisperBinaryName(): string {
  if (PLATFORM === 'win32') return 'whisper-cli.exe';
  return 'whisper-cli';
}

/**
 * Get the whisper.cpp release asset name for the current platform.
 * Maps to the pre-built binary archive names on GitHub releases.
 */
export function getWhisperReleaseAssetName(): string {
  switch (PLATFORM) {
    case 'darwin':
      return ARCH === 'arm64'
        ? 'whisper-bin-darwin-arm64.zip'
        : 'whisper-bin-darwin-x64.zip';
    case 'win32':
      return ARCH === 'arm64'
        ? 'whisper-bin-win-arm64.zip'
        : 'whisper-bin-win-x64.zip';
    case 'linux':
      return ARCH === 'arm64'
        ? 'whisper-bin-linux-arm64.tar.gz'
        : 'whisper-bin-linux-x64.tar.gz';
    default:
      return `whisper-bin-${PLATFORM}-${ARCH}.tar.gz`;
  }
}

/**
 * Get platform-specific search paths for the whisper.cpp binary.
 */
export function getPlatformBinarySearchPaths(baseDir: string): string[] {
  const binDir = path.join(baseDir, 'bin');
  const paths = [binDir];

  // Add app resources directory (for packaged apps)
  if (process.resourcesPath) {
    paths.push(path.join(process.resourcesPath, 'bin'));
  }

  switch (PLATFORM) {
    case 'darwin':
      paths.push('/usr/local/bin', '/opt/homebrew/bin');
      break;
    case 'linux':
      paths.push('/usr/local/bin', '/usr/bin', '/snap/bin');
      break;
    case 'win32':
      // On Windows, also check common install locations
      if (process.env.LOCALAPPDATA) {
        paths.push(path.join(process.env.LOCALAPPDATA, 'whisper-cpp', 'bin'));
      }
      if (process.env.ProgramFiles) {
        paths.push(path.join(process.env.ProgramFiles, 'whisper-cpp', 'bin'));
      }
      break;
  }

  return paths;
}

/**
 * Get all candidate binary names for the current platform.
 */
export function getPlatformBinaryNames(): string[] {
  if (PLATFORM === 'win32') {
    return ['whisper-cli.exe', 'whisper.exe', 'main.exe'];
  }
  return ['whisper-cli', 'whisper', 'whisper-cpp', 'main'];
}

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

/** Maximum number of retry attempts for downloads */
const MAX_DOWNLOAD_RETRIES = 3;

/** Maximum number of HTTP redirects to follow */
const MAX_REDIRECTS = 5;

export class WhisperTranscriptionService {
  private modelsDir: string;
  private binDir: string;
  private selectedModelId: string = '';
  private downloadProgressListeners: Array<(progress: DownloadProgress) => void> = [];
  private activeDownloads: Map<string, { abort: () => void }> = new Map();

  constructor(modelsDir: string) {
    this.modelsDir = modelsDir;
    this.binDir = path.join(path.dirname(modelsDir), 'bin');
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true });
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
   * Get the bin directory path for whisper.cpp binaries.
   */
  getBinDir(): string {
    return this.binDir;
  }

  /**
   * Check if the whisper.cpp CLI binary is available.
   */
  isWhisperBinaryAvailable(): boolean {
    return this.findWhisperBinary() !== null;
  }

  /**
   * Get info about the whisper.cpp binary status.
   */
  getWhisperBinaryInfo(): { available: boolean; path: string | null; platform: string; arch: string } {
    const binaryPath = this.findWhisperBinary();
    return {
      available: binaryPath !== null,
      path: binaryPath,
      platform: PLATFORM,
      arch: ARCH,
    };
  }

  /**
   * Download a file from a URL with retry logic and redirect handling.
   * Used for both model files and whisper.cpp binaries.
   *
   * @param url The URL to download from
   * @param outputPath The destination file path
   * @param progressId An identifier for progress tracking (e.g., modelId)
   * @param retries Number of retry attempts remaining
   */
  async downloadFile(
    url: string,
    outputPath: string,
    progressId: string,
    retries: number = MAX_DOWNLOAD_RETRIES
  ): Promise<string> {
    const tempPath = outputPath + '.download';

    // Check for partial download to support resume
    let startByte = 0;
    if (fs.existsSync(tempPath)) {
      const stat = fs.statSync(tempPath);
      startByte = stat.size;
    }

    return new Promise<string>((resolve, reject) => {
      const attemptDownload = (downloadUrl: string, redirectCount: number = 0) => {
        if (redirectCount > MAX_REDIRECTS) {
          reject(new Error('Too many redirects'));
          return;
        }

        const parsedUrl = new URL(downloadUrl);
        const isHTTPS = parsedUrl.protocol === 'https:';
        const httpModule = isHTTPS ? https : http;

        const requestOptions: https.RequestOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHTTPS ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': 'VoiceInk-Desktop/1.0',
            ...(startByte > 0 ? { 'Range': `bytes=${startByte}-` } : {}),
          },
          timeout: 30000,
        };

        const req = httpModule.request(requestOptions, (response) => {
          // Follow redirects (301, 302, 303, 307, 308)
          const statusCode = response.statusCode || 0;
          if ([301, 302, 303, 307, 308].includes(statusCode)) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              const absoluteUrl = redirectUrl.startsWith('http')
                ? redirectUrl
                : new URL(redirectUrl, downloadUrl).toString();
              attemptDownload(absoluteUrl, redirectCount + 1);
              return;
            }
          }

          // Handle range response (206) or full response (200)
          if (statusCode !== 200 && statusCode !== 206) {
            reject(new Error(`Download failed with status ${statusCode}`));
            return;
          }

          // If server doesn't support range, restart from beginning
          if (statusCode === 200 && startByte > 0) {
            startByte = 0;
          }

          const contentLength = response.headers['content-length'];
          const totalBytes = contentLength
            ? parseInt(contentLength, 10) + startByte
            : 0;
          let downloadedBytes = startByte;

          const fileStream = fs.createWriteStream(tempPath, {
            flags: startByte > 0 && statusCode === 206 ? 'a' : 'w',
          });

          const abortController = {
            abort: () => {
              response.destroy();
              fileStream.close();
            },
          };
          this.activeDownloads.set(progressId, abortController);

          response.on('data', (chunk: Buffer) => {
            downloadedBytes += chunk.length;
            const progress = totalBytes > 0
              ? Math.round((downloadedBytes / totalBytes) * 100)
              : 0;

            this.notifyDownloadProgress({
              modelId: progressId,
              progress,
              downloadedBytes,
              totalBytes,
            });
          });

          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            this.activeDownloads.delete(progressId);

            // Rename temp file to final path
            try {
              fs.renameSync(tempPath, outputPath);
              resolve(outputPath);
            } catch (err) {
              reject(err);
            }
          });

          fileStream.on('error', (err) => {
            this.activeDownloads.delete(progressId);
            reject(err);
          });

          response.on('error', (err) => {
            this.activeDownloads.delete(progressId);
            fileStream.close();
            reject(err);
          });
        });

        req.on('error', (err) => {
          this.activeDownloads.delete(progressId);
          reject(err);
        });

        req.on('timeout', () => {
          req.destroy();
          this.activeDownloads.delete(progressId);
          reject(new Error('Download request timed out'));
        });

        req.end();
      };

      attemptDownload(url);
    }).catch(async (err) => {
      // Retry logic
      if (retries > 0) {
        const delay = (MAX_DOWNLOAD_RETRIES - retries + 1) * 2000;
        await new Promise((r) => setTimeout(r, delay));
        return this.downloadFile(url, outputPath, progressId, retries - 1);
      }
      // Clean up temp file on final failure
      try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
      throw err;
    });
  }

  /**
   * Download a model from Hugging Face with retry support.
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
    return this.downloadFile(model.downloadURL, outputPath, modelId);
  }

  /**
   * Download the whisper.cpp CLI binary for the current platform.
   * Downloads from the whisper.cpp GitHub releases and extracts the binary.
   *
   * @param releaseTag GitHub release tag (e.g., 'v1.7.3'). Defaults to latest.
   */
  async downloadWhisperBinary(releaseTag: string = 'v1.7.3'): Promise<string> {
    const binaryName = getWhisperBinaryName();
    const binaryPath = path.join(this.binDir, binaryName);

    if (fs.existsSync(binaryPath)) {
      return binaryPath;
    }

    // Construct the download URL for the pre-built binary archive
    const assetName = getWhisperReleaseAssetName();
    const downloadUrl = `https://github.com/ggerganov/whisper.cpp/releases/download/${releaseTag}/${assetName}`;

    const archivePath = path.join(this.binDir, assetName);

    // Download the archive
    await this.downloadFile(downloadUrl, archivePath, 'whisper-binary');

    // Extract the binary
    await this.extractWhisperBinary(archivePath, this.binDir);

    // Set executable permission on Unix-like systems
    if (PLATFORM !== 'win32') {
      try {
        fs.chmodSync(binaryPath, 0o755);
      } catch {
        // May fail if file doesn't exist at expected path
      }
      // Also try chmod on alternative binary names
      for (const name of getPlatformBinaryNames()) {
        const altPath = path.join(this.binDir, name);
        if (fs.existsSync(altPath)) {
          try { fs.chmodSync(altPath, 0o755); } catch { /* ignore */ }
        }
      }
    }

    // Clean up the archive
    try { fs.unlinkSync(archivePath); } catch { /* ignore */ }

    // Verify the binary exists
    const foundBinary = this.findWhisperBinary();
    if (!foundBinary) {
      throw new Error(`Failed to extract whisper.cpp binary for ${PLATFORM}/${ARCH}`);
    }

    return foundBinary;
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
   * Cross-platform transcription strategy:
   * 1. whisper.cpp CLI binary (cross-platform, preferred)
   * 2. whisper-node native addon (if installed, platform-specific)
   * 3. Error with instructions for setup
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

    // Strategy 1: Try whisper.cpp CLI binary (cross-platform)
    try {
      const text = await this.transcribeWithCLI(modelPath, audioFilePath, language);
      const duration = (Date.now() - startTime) / 1000;
      return { text, duration, language };
    } catch {
      // CLI not available, try next strategy
    }

    // Strategy 2: Try whisper-node native addon
    try {
      const text = await this.transcribeWithWhisperNode(modelPath, audioFilePath, language);
      const duration = (Date.now() - startTime) / 1000;
      return { text, duration, language };
    } catch {
      // Addon not available
    }

    // No transcription engine available - provide actionable error
    const duration = (Date.now() - startTime) / 1000;
    const binaryInfo = this.getWhisperBinaryInfo();
    throw new Error(
      `No whisper.cpp transcription engine available on ${binaryInfo.platform}/${binaryInfo.arch}. ` +
      `Please download the whisper.cpp binary using the "Download Engine" button, ` +
      `or install whisper-node: npm install whisper-node`
    );
  }

  /**
   * Transcribe a file for the TranscribeAudio view (file-based transcription).
   */
  async transcribeFile(
    filePath: string,
    language: string = 'auto'
  ): Promise<TranscriptionResult> {
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
   * Find the whisper.cpp CLI binary on the system.
   * Searches platform-specific paths and common binary names.
   */
  findWhisperBinary(): string | null {
    const searchPaths = getPlatformBinarySearchPaths(path.dirname(this.modelsDir));
    const binaryNames = getPlatformBinaryNames();

    for (const dir of searchPaths) {
      for (const name of binaryNames) {
        const candidate = path.join(dir, name);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }

    return null;
  }

  /**
   * Attempt transcription using whisper.cpp CLI binary.
   * Works cross-platform (macOS, Windows, Linux).
   */
  private async transcribeWithCLI(
    modelPath: string,
    audioFilePath: string,
    language: string
  ): Promise<string> {
    const { execFile } = require('child_process');
    const util = require('util');
    const execFileAsync = util.promisify(execFile);

    const binaryPath = this.findWhisperBinary();
    if (!binaryPath) {
      throw new Error('whisper.cpp binary not found');
    }

    const args = [
      '-m', modelPath,
      '-f', audioFilePath,
      '--no-timestamps',
    ];

    if (language !== 'auto') {
      args.push('-l', language);
    }

    // Platform-specific exec options
    const execOptions: Record<string, unknown> = {
      timeout: 300000, // 5 minute timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB output buffer
    };

    // On Windows, set shell option for proper .exe execution
    if (PLATFORM === 'win32') {
      execOptions.windowsHide = true;
    }

    const { stdout, stderr } = await execFileAsync(binaryPath, args, execOptions);

    const output = (stdout as string).trim();
    if (!output && stderr) {
      throw new Error(`whisper.cpp CLI error: ${(stderr as string).trim()}`);
    }

    return output;
  }

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
   * Extract whisper.cpp binary from downloaded archive.
   * Handles both .zip (macOS/Windows) and .tar.gz (Linux) archives.
   */
  private async extractWhisperBinary(archivePath: string, destDir: string): Promise<void> {
    const { execFile } = require('child_process');
    const util = require('util');
    const execFileAsync = util.promisify(execFile);

    if (archivePath.endsWith('.zip')) {
      // Use platform-appropriate unzip
      if (PLATFORM === 'win32') {
        // PowerShell's Expand-Archive on Windows
        await execFileAsync('powershell', [
          '-Command',
          `Expand-Archive -Path "${archivePath}" -DestinationPath "${destDir}" -Force`,
        ], { timeout: 60000 });
      } else {
        // unzip on macOS/Linux
        await execFileAsync('unzip', ['-o', archivePath, '-d', destDir], {
          timeout: 60000,
        });
      }
    } else if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
      // tar on macOS/Linux (and Windows with Git Bash)
      await execFileAsync('tar', ['xzf', archivePath, '-C', destDir], {
        timeout: 60000,
      });
    } else {
      throw new Error(`Unsupported archive format: ${path.basename(archivePath)}`);
    }
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
