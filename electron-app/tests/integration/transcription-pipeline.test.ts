/**
 * Integration tests for the transcription pipeline.
 * Tests the full lifecycle: audio recording → WAV generation → whisper model
 * management → transcription → text formatting.
 *
 * These tests verify that all components work together correctly,
 * especially on Windows where path handling, binary detection, and
 * archive extraction differ from Unix systems.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as zlib from 'zlib';
import {
  WhisperTranscriptionService,
  WhisperTextFormatter,
  PREDEFINED_MODELS,
  getWhisperBinaryName,
  getWhisperReleaseAssetName,
  getPlatformBinarySearchPaths,
  getPlatformBinaryNames,
} from '../../src/main/services/whisper-transcription-service';
import { AudioRecordingService } from '../../src/main/services/audio-recording-service';

// Mock Electron's BrowserWindow for AudioRecordingService
jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: jest.fn().mockReturnValue([]),
  },
  ipcMain: { handle: jest.fn(), on: jest.fn() },
}));

describe('Integration: Transcription Pipeline', () => {
  let tempDir: string;
  let modelsDir: string;
  let recordingsDir: string;
  let whisperService: WhisperTranscriptionService;
  let audioService: AudioRecordingService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voiceink-integration-'));
    modelsDir = path.join(tempDir, 'models');
    recordingsDir = path.join(tempDir, 'recordings');
    whisperService = new WhisperTranscriptionService(modelsDir);
    audioService = new AudioRecordingService(recordingsDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Audio Recording → WAV File', () => {
    it('should record audio chunks and produce a valid WAV file', async () => {
      // Start recording
      const startResult = await audioService.startRecording();
      expect(startResult.outputPath).toBeTruthy();
      expect(audioService.getState()).toBe('recording');

      // Simulate audio data (16kHz, 16-bit mono, 1 second of silence)
      const sampleRate = 16000;
      const bytesPerSample = 2;
      const duration = 1;
      const audioData = Buffer.alloc(sampleRate * bytesPerSample * duration);
      audioService.receiveAudioChunk(audioData);

      // Stop recording
      const result = await audioService.stopRecording();
      expect(result).not.toBeNull();
      expect(result!.filePath).toContain('.wav');
      expect(fs.existsSync(result!.filePath)).toBe(true);

      // Verify WAV format
      const wavData = fs.readFileSync(result!.filePath);
      expect(wavData.length).toBeGreaterThan(44); // WAV header + data
      expect(wavData.toString('ascii', 0, 4)).toBe('RIFF');
      expect(wavData.toString('ascii', 8, 12)).toBe('WAVE');

      // Verify WAV header fields
      const channels = wavData.readUInt16LE(22);
      const sampleRateFromHeader = wavData.readUInt32LE(24);
      const bitsPerSample = wavData.readUInt16LE(34);
      expect(channels).toBe(1); // mono
      expect(sampleRateFromHeader).toBe(16000);
      expect(bitsPerSample).toBe(16);
    });

    it('should produce WAV file compatible with whisper.cpp input format', async () => {
      await audioService.startRecording();

      // Generate 0.5 seconds of a simple sine wave pattern
      const sampleRate = 16000;
      const numSamples = sampleRate / 2;
      const buffer = Buffer.alloc(numSamples * 2); // 16-bit
      for (let i = 0; i < numSamples; i++) {
        const value = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 16000;
        buffer.writeInt16LE(Math.round(value), i * 2);
      }
      audioService.receiveAudioChunk(buffer);

      const result = await audioService.stopRecording();
      expect(result).not.toBeNull();

      // The WAV file should be valid for whisper.cpp consumption
      // whisper.cpp expects: PCM 16-bit mono 16kHz WAV
      const wavData = fs.readFileSync(result!.filePath);
      const audioFormat = wavData.readUInt16LE(20);
      expect(audioFormat).toBe(1); // PCM format
    });

    it('should handle recording lifecycle state transitions', async () => {
      const states: string[] = [];
      audioService.onStateChanged((state) => states.push(state));

      // Idle → Recording
      await audioService.startRecording();
      expect(states).toEqual(['recording']);

      // Recording → Idle
      await audioService.stopRecording();
      expect(states).toEqual(['recording', 'idle']);
    });

    it('should notify complete listeners after recording', async () => {
      let completedPath = '';
      let completedDuration = 0;

      audioService.onComplete((filePath, duration) => {
        completedPath = filePath;
        completedDuration = duration;
      });

      await audioService.startRecording();
      audioService.receiveAudioChunk(Buffer.alloc(3200)); // small chunk
      await audioService.stopRecording();

      expect(completedPath).toBeTruthy();
      expect(fs.existsSync(completedPath)).toBe(true);
      expect(completedDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Model Management', () => {
    it('should list all predefined models with correct metadata', () => {
      const models = whisperService.listModels();
      expect(models.length).toBe(PREDEFINED_MODELS.length);
      expect(models.length).toBeGreaterThan(0);

      // Verify each model has complete metadata
      for (const model of models) {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.displayName).toBeTruthy();
        expect(model.description).toBeTruthy();
        expect(model.size).toBeGreaterThan(0);
        expect(model.downloadURL).toMatch(/^https:\/\//);
        expect(model.type).toBe('whisper');
        expect(model.isDownloaded).toBe(false);
      }
    });

    it('should detect models that are present on disk', () => {
      // Place a fake model file
      const modelPath = path.join(modelsDir, 'ggml-tiny.bin');
      fs.writeFileSync(modelPath, Buffer.alloc(100));

      const models = whisperService.listModels();
      const tiny = models.find((m) => m.id === 'whisper-tiny');
      expect(tiny).toBeDefined();
      expect(tiny!.isDownloaded).toBe(true);

      // Other models should still show as not downloaded
      const small = models.find((m) => m.id === 'whisper-small');
      expect(small).toBeDefined();
      expect(small!.isDownloaded).toBe(false);
    });

    it('should handle model selection and persistence', () => {
      expect(whisperService.getSelectedModelId()).toBe('');

      whisperService.selectModel('whisper-tiny');
      expect(whisperService.getSelectedModelId()).toBe('whisper-tiny');

      whisperService.selectModel('whisper-small');
      expect(whisperService.getSelectedModelId()).toBe('whisper-small');
    });

    it('should delete models and update status', () => {
      // Create a fake model
      const modelPath = path.join(modelsDir, 'ggml-small.bin');
      fs.writeFileSync(modelPath, Buffer.alloc(50));

      expect(whisperService.isModelDownloaded('whisper-small')).toBe(true);

      const result = whisperService.deleteModel('whisper-small');
      expect(result).toBe(true);
      expect(whisperService.isModelDownloaded('whisper-small')).toBe(false);
      expect(fs.existsSync(modelPath)).toBe(false);
    });

    it('should return correct model path for all predefined models', () => {
      for (const model of PREDEFINED_MODELS) {
        const modelPath = whisperService.getModelPath(model.id);
        expect(modelPath).toBe(path.join(modelsDir, `${model.name}.bin`));
      }
    });

    it('should have valid Hugging Face download URLs for all models', () => {
      for (const model of PREDEFINED_MODELS) {
        expect(model.downloadURL).toMatch(/^https:\/\/huggingface\.co\//);
        expect(model.downloadURL).toContain('/resolve/main/');
        expect(model.downloadURL).toContain('.bin');
      }
    });

    it('should reject download of unknown models', async () => {
      await expect(whisperService.downloadModel('nonexistent-model'))
        .rejects.toThrow('Unknown model');
    });

    it('should skip download if model already exists', async () => {
      const modelPath = path.join(modelsDir, 'ggml-tiny.bin');
      fs.writeFileSync(modelPath, Buffer.alloc(100));

      const result = await whisperService.downloadModel('whisper-tiny');
      expect(result).toBe(modelPath);
    });
  });

  describe('Binary Management', () => {
    it('should create bin directory alongside models directory', () => {
      const binDir = whisperService.getBinDir();
      expect(fs.existsSync(binDir)).toBe(true);
      expect(binDir).toContain('bin');
    });

    it('should detect binary when placed in bin directory', () => {
      const binDir = whisperService.getBinDir();
      const binaryName = getWhisperBinaryName();
      const binaryPath = path.join(binDir, binaryName);

      // Initially no binary
      expect(whisperService.isWhisperBinaryAvailable()).toBe(false);

      // Place a fake binary
      fs.writeFileSync(binaryPath, 'fake binary content');

      // Now binary should be detected
      expect(whisperService.isWhisperBinaryAvailable()).toBe(true);
      expect(whisperService.findWhisperBinary()).toBe(binaryPath);
    });

    it('should provide binary info with platform details', () => {
      const info = whisperService.getWhisperBinaryInfo();
      expect(info.platform).toBe(process.platform);
      expect(info.arch).toBe(process.arch);
      expect(info.available).toBe(false);
      expect(info.path).toBeNull();
    });

    it('should find binary by multiple name variants', () => {
      const binDir = whisperService.getBinDir();
      const names = getPlatformBinaryNames();

      // Place a binary with an alternative name
      if (names.length > 1) {
        const altName = names[names.length - 1]; // Use last variant
        const altPath = path.join(binDir, altName);
        fs.writeFileSync(altPath, 'fake binary');

        const found = whisperService.findWhisperBinary();
        expect(found).toBeTruthy();
      }
    });

    it('should search platform-specific paths', () => {
      const searchPaths = getPlatformBinarySearchPaths(tempDir);
      expect(searchPaths.length).toBeGreaterThan(0);

      // Should always include the base bin directory
      expect(searchPaths).toContain(path.join(tempDir, 'bin'));

      // On Windows, should include common install locations
      if (process.platform === 'win32') {
        const hasWindowsPaths = searchPaths.some((p) =>
          p.includes('whisper-cpp') || p.includes('whisper.cpp')
        );
        expect(hasWindowsPaths).toBe(true);
      }
    });

    it('should return correct binary name for current platform', () => {
      const name = getWhisperBinaryName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);

      if (process.platform === 'win32') {
        expect(name).toMatch(/\.exe$/);
      } else {
        expect(name).not.toMatch(/\.exe$/);
      }
    });
  });

  describe('Transcription Error Handling', () => {
    it('should fail gracefully when no model is selected', async () => {
      await expect(whisperService.transcribe('/fake/audio.wav'))
        .rejects.toThrow('No model selected');
    });

    it('should fail gracefully when model is not downloaded', async () => {
      whisperService.selectModel('whisper-tiny');
      await expect(whisperService.transcribe('/fake/audio.wav'))
        .rejects.toThrow('not downloaded');
    });

    it('should fail gracefully when audio file does not exist', async () => {
      whisperService.selectModel('whisper-tiny');
      fs.writeFileSync(path.join(modelsDir, 'ggml-tiny.bin'), 'model data');
      await expect(whisperService.transcribe('/nonexistent/audio.wav'))
        .rejects.toThrow('Audio file not found');
    });

    it('should fail gracefully when no transcription engine is available', async () => {
      whisperService.selectModel('whisper-tiny');
      fs.writeFileSync(path.join(modelsDir, 'ggml-tiny.bin'), 'model data');
      const audioFile = path.join(tempDir, 'test-audio.wav');
      fs.writeFileSync(audioFile, 'fake audio data');

      await expect(whisperService.transcribe(audioFile))
        .rejects.toThrow('No whisper.cpp transcription engine available');
    });

    it('should provide helpful error message for missing engine', async () => {
      whisperService.selectModel('whisper-tiny');
      fs.writeFileSync(path.join(modelsDir, 'ggml-tiny.bin'), 'model data');
      const audioFile = path.join(tempDir, 'test-audio.wav');
      fs.writeFileSync(audioFile, 'fake audio data');

      try {
        await whisperService.transcribe(audioFile);
        fail('Should have thrown');
      } catch (err: unknown) {
        const message = (err as Error).message;
        expect(message).toContain('whisper.cpp');
        expect(message).toContain('engine');
      }
    });
  });

  describe('Text Post-Processing Pipeline', () => {
    it('should format transcribed text through the full pipeline', () => {
      // Simulate raw whisper.cpp output with artifacts
      const rawText = '[BLANK_AUDIO] um hello world. like, this is basically a test. you know';
      const formatted = WhisperTextFormatter.format(rawText, {
        removeFillerWords: true,
      });

      // Should remove artifacts
      expect(formatted).not.toContain('[BLANK_AUDIO]');

      // Should capitalize sentences
      expect(formatted).toMatch(/^[A-Z]/);

      // Should remove filler words
      expect(formatted).not.toMatch(/\bum\b/i);
      expect(formatted).not.toMatch(/\bbasically\b/i);
    });

    it('should handle multi-sentence transcription', () => {
      const text = 'hello world. how are you today. this is a test.';
      const formatted = WhisperTextFormatter.format(text);

      expect(formatted).toBe('Hello world. How are you today. This is a test.');
    });

    it('should handle empty and whitespace-only input', () => {
      expect(WhisperTextFormatter.format('')).toBe('');
      expect(WhisperTextFormatter.format('   ')).toBe('');
      expect(WhisperTextFormatter.format('\n\t')).toBe('');
    });

    it('should remove multiple whisper artifacts', () => {
      const text = '[BLANK_AUDIO] (music) [something] hello [noise]';
      const formatted = WhisperTextFormatter.format(text);
      expect(formatted).toBe('Hello');
    });

    it('should preserve punctuation while formatting', () => {
      const text = 'hello, world! how are you? great.';
      const formatted = WhisperTextFormatter.format(text);
      expect(formatted).toBe('Hello, world! How are you? Great.');
    });

    it('should append trailing space when option is enabled', () => {
      const formatted = WhisperTextFormatter.format('hello', {
        appendTrailingSpace: true,
      });
      expect(formatted).toBe('Hello ');
    });

    it('should handle combined formatting options', () => {
      const text = 'um hello world';
      const formatted = WhisperTextFormatter.format(text, {
        removeFillerWords: true,
        appendTrailingSpace: true,
      });
      expect(formatted).toBe('Hello world ');
    });
  });

  describe('Download Progress Monitoring', () => {
    it('should support registering and unregistering progress listeners', () => {
      const progressEvents: Array<{ modelId: string; progress: number }> = [];
      const unsubscribe = whisperService.onDownloadProgress((progress) => {
        progressEvents.push(progress);
      });

      expect(typeof unsubscribe).toBe('function');

      // Unsubscribe should work without error
      unsubscribe();
    });

    it('should support cancel for non-existent downloads', () => {
      expect(whisperService.cancelDownload('whisper-tiny')).toBe(false);
    });
  });

  describe('Archive Extraction (adm-zip)', () => {
    it('should extract zip files using adm-zip', () => {
      const AdmZip = require('adm-zip');

      // Create a test zip file with some content
      const zip = new AdmZip();
      zip.addFile('test.txt', Buffer.from('hello world'));
      zip.addFile('subdir/nested.txt', Buffer.from('nested content'));

      const zipPath = path.join(tempDir, 'test.zip');
      zip.writeZip(zipPath);

      // Extract to a new directory
      const extractDir = path.join(tempDir, 'extracted');
      fs.mkdirSync(extractDir, { recursive: true });

      const extractZip = new AdmZip(zipPath);
      extractZip.extractAllTo(extractDir, true);

      // Verify extracted files
      expect(fs.existsSync(path.join(extractDir, 'test.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(extractDir, 'test.txt'), 'utf-8')).toBe('hello world');
      expect(fs.existsSync(path.join(extractDir, 'subdir', 'nested.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(extractDir, 'subdir', 'nested.txt'), 'utf-8')).toBe('nested content');
    });

    it('should handle zip files with binary content', () => {
      const AdmZip = require('adm-zip');

      // Create a zip with binary content (simulating a whisper binary)
      const zip = new AdmZip();
      const fakeBinary = Buffer.alloc(1024);
      fakeBinary.fill(0x42);
      zip.addFile('bin/whisper-cli', fakeBinary);

      const zipPath = path.join(tempDir, 'binary.zip');
      zip.writeZip(zipPath);

      const extractDir = path.join(tempDir, 'bin-extract');
      fs.mkdirSync(extractDir, { recursive: true });

      const extractZip = new AdmZip(zipPath);
      extractZip.extractAllTo(extractDir, true);

      const extractedBinary = path.join(extractDir, 'bin', 'whisper-cli');
      expect(fs.existsSync(extractedBinary)).toBe(true);
      expect(fs.readFileSync(extractedBinary).length).toBe(1024);
    });
  });

  describe('Cross-Platform Path Handling', () => {
    it('should construct valid paths on current platform', () => {
      const modelPath = whisperService.getModelPath('whisper-tiny');
      expect(path.isAbsolute(modelPath)).toBe(true);
      expect(modelPath).toBe(path.join(modelsDir, 'ggml-tiny.bin'));
    });

    it('should handle paths with spaces', () => {
      // Create a temp directory with a space in the name
      const spacedDir = path.join(tempDir, 'dir with spaces', 'models');
      const spacedService = new WhisperTranscriptionService(spacedDir);

      expect(fs.existsSync(spacedDir)).toBe(true);
      const modelPath = spacedService.getModelPath('whisper-tiny');
      expect(modelPath).toBe(path.join(spacedDir, 'ggml-tiny.bin'));
    });

    it('should handle bin directory creation alongside models directory', () => {
      // Verify bin dir is created as a sibling of models dir
      const binDir = whisperService.getBinDir();
      expect(fs.existsSync(binDir)).toBe(true);

      // bin dir should be at the same level as models dir
      const parentOfModels = path.dirname(modelsDir);
      expect(path.dirname(binDir)).toBe(parentOfModels);
    });
  });

  describe('Full Pipeline Integration (Mock)', () => {
    it('should handle recording → model check → transcription error flow', async () => {
      // Step 1: Record audio
      await audioService.startRecording();
      audioService.receiveAudioChunk(Buffer.alloc(3200));
      const recording = await audioService.stopRecording();
      expect(recording).not.toBeNull();
      expect(fs.existsSync(recording!.filePath)).toBe(true);

      // Step 2: Select model
      whisperService.selectModel('whisper-tiny');
      expect(whisperService.getSelectedModelId()).toBe('whisper-tiny');

      // Step 3: Model is not downloaded - transcription should fail gracefully
      await expect(whisperService.transcribe(recording!.filePath))
        .rejects.toThrow('not downloaded');

      // Step 4: Place a fake model
      fs.writeFileSync(path.join(modelsDir, 'ggml-tiny.bin'), 'fake model');

      // Step 5: Transcription should fail with "no engine" since no binary
      await expect(whisperService.transcribe(recording!.filePath))
        .rejects.toThrow('No whisper.cpp transcription engine available');
    });

    it('should handle multiple sequential recordings', async () => {
      const recordings: string[] = [];

      for (let i = 0; i < 3; i++) {
        await audioService.startRecording();
        audioService.receiveAudioChunk(Buffer.alloc(1600));
        const result = await audioService.stopRecording();
        expect(result).not.toBeNull();
        recordings.push(result!.filePath);
        // Small delay to ensure unique timestamps in filenames
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // All recordings should exist
      for (const filePath of recordings) {
        expect(fs.existsSync(filePath)).toBe(true);
      }

      // Each recording should be a valid WAV file
      for (const filePath of recordings) {
        const data = fs.readFileSync(filePath);
        expect(data.toString('ascii', 0, 4)).toBe('RIFF');
      }
    });

    it('should handle concurrent model operations', () => {
      // Create multiple model files
      const modelIds = ['whisper-tiny', 'whisper-small', 'whisper-base'];
      for (const id of modelIds) {
        const model = PREDEFINED_MODELS.find((m) => m.id === id);
        if (model) {
          fs.writeFileSync(path.join(modelsDir, `${model.name}.bin`), 'data');
        }
      }

      // All should be detected as downloaded
      for (const id of modelIds) {
        expect(whisperService.isModelDownloaded(id)).toBe(true);
      }

      // Delete one
      whisperService.deleteModel('whisper-small');
      expect(whisperService.isModelDownloaded('whisper-small')).toBe(false);
      expect(whisperService.isModelDownloaded('whisper-tiny')).toBe(true);
      expect(whisperService.isModelDownloaded('whisper-base')).toBe(true);
    });
  });
});
