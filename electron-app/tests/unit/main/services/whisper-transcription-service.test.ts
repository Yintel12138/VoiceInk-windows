/**
 * Unit tests for WhisperTranscriptionService and WhisperTextFormatter.
 * Tests model management, transcription (with fallback), and text formatting.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  WhisperTranscriptionService,
  WhisperTextFormatter,
  PREDEFINED_MODELS,
} from '../../../../src/main/services/whisper-transcription-service';

describe('WhisperTranscriptionService', () => {
  let service: WhisperTranscriptionService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voiceink-whisper-test-'));
    service = new WhisperTranscriptionService(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create models directory', () => {
      const newDir = path.join(tempDir, 'nested', 'models');
      new WhisperTranscriptionService(newDir);
      expect(fs.existsSync(newDir)).toBe(true);
    });
  });

  describe('PREDEFINED_MODELS', () => {
    it('should contain expected model definitions', () => {
      expect(PREDEFINED_MODELS.length).toBeGreaterThan(0);

      const tiny = PREDEFINED_MODELS.find((m) => m.id === 'whisper-tiny');
      expect(tiny).toBeDefined();
      expect(tiny!.name).toBe('ggml-tiny');
      expect(tiny!.type).toBe('whisper');
      expect(tiny!.downloadURL).toContain('huggingface.co');
    });

    it('should include both English and multilingual models', () => {
      const englishModels = PREDEFINED_MODELS.filter((m) => m.language === 'en');
      const multiModels = PREDEFINED_MODELS.filter((m) => m.language === 'multilingual');
      expect(englishModels.length).toBeGreaterThan(0);
      expect(multiModels.length).toBeGreaterThan(0);
    });

    it('should have all required fields', () => {
      for (const model of PREDEFINED_MODELS) {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.displayName).toBeTruthy();
        expect(model.description).toBeTruthy();
        expect(model.size).toBeGreaterThan(0);
        expect(model.downloadURL).toBeTruthy();
        expect(model.type).toBe('whisper');
      }
    });
  });

  describe('listModels', () => {
    it('should return all predefined models with download status', () => {
      const models = service.listModels();
      expect(models.length).toBe(PREDEFINED_MODELS.length);
      for (const model of models) {
        expect(model.isDownloaded).toBe(false);
      }
    });

    it('should detect downloaded models', () => {
      // Create a fake model file
      const modelPath = path.join(tempDir, 'ggml-tiny.bin');
      fs.writeFileSync(modelPath, 'fake model data');

      const models = service.listModels();
      const tiny = models.find((m) => m.id === 'whisper-tiny');
      expect(tiny!.isDownloaded).toBe(true);
    });
  });

  describe('isModelDownloaded', () => {
    it('should return false for non-downloaded models', () => {
      expect(service.isModelDownloaded('whisper-tiny')).toBe(false);
    });

    it('should return true for downloaded models', () => {
      fs.writeFileSync(path.join(tempDir, 'ggml-tiny.bin'), 'data');
      expect(service.isModelDownloaded('whisper-tiny')).toBe(true);
    });
  });

  describe('getModelPath', () => {
    it('should return correct path for known models', () => {
      const modelPath = service.getModelPath('whisper-tiny');
      expect(modelPath).toBe(path.join(tempDir, 'ggml-tiny.bin'));
    });

    it('should return fallback path for unknown models', () => {
      const modelPath = service.getModelPath('unknown-model');
      expect(modelPath).toBe(path.join(tempDir, 'unknown-model.bin'));
    });
  });

  describe('deleteModel', () => {
    it('should delete a downloaded model file', () => {
      const modelPath = path.join(tempDir, 'ggml-tiny.bin');
      fs.writeFileSync(modelPath, 'data');

      const result = service.deleteModel('whisper-tiny');
      expect(result).toBe(true);
      expect(fs.existsSync(modelPath)).toBe(false);
    });

    it('should return false if model is not downloaded', () => {
      const result = service.deleteModel('whisper-tiny');
      expect(result).toBe(false);
    });
  });

  describe('selectModel / getSelectedModelId', () => {
    it('should select and return model ID', () => {
      service.selectModel('whisper-small');
      expect(service.getSelectedModelId()).toBe('whisper-small');
    });

    it('should default to empty string', () => {
      expect(service.getSelectedModelId()).toBe('');
    });
  });

  describe('transcribe', () => {
    it('should throw error when no model is selected', async () => {
      await expect(service.transcribe('/fake/audio.wav')).rejects.toThrow(
        'No model selected'
      );
    });

    it('should throw error when model is not downloaded', async () => {
      service.selectModel('whisper-tiny');
      await expect(service.transcribe('/fake/audio.wav')).rejects.toThrow(
        'not downloaded'
      );
    });

    it('should throw error when audio file does not exist', async () => {
      service.selectModel('whisper-tiny');
      fs.writeFileSync(path.join(tempDir, 'ggml-tiny.bin'), 'data');
      await expect(service.transcribe('/nonexistent/audio.wav')).rejects.toThrow(
        'Audio file not found'
      );
    });

    it('should return placeholder text when no native addon is available', async () => {
      service.selectModel('whisper-tiny');
      fs.writeFileSync(path.join(tempDir, 'ggml-tiny.bin'), 'model data');

      const audioFile = path.join(tempDir, 'test-audio.wav');
      fs.writeFileSync(audioFile, 'fake audio data');

      const result = await service.transcribe(audioFile);
      expect(result.text).toContain('placeholder');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('downloadModel', () => {
    it('should throw error for unknown model', async () => {
      await expect(service.downloadModel('nonexistent')).rejects.toThrow(
        'Unknown model'
      );
    });

    it('should return path if model is already downloaded', async () => {
      const modelPath = path.join(tempDir, 'ggml-tiny.bin');
      fs.writeFileSync(modelPath, 'data');

      const result = await service.downloadModel('whisper-tiny');
      expect(result).toBe(modelPath);
    });
  });

  describe('cancelDownload', () => {
    it('should return false when no download is active', () => {
      expect(service.cancelDownload('whisper-tiny')).toBe(false);
    });
  });

  describe('onDownloadProgress', () => {
    it('should support progress listeners', () => {
      const listener = jest.fn();
      const unsubscribe = service.onDownloadProgress(listener);
      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });
});

describe('WhisperTextFormatter', () => {
  describe('format', () => {
    it('should trim whitespace', () => {
      expect(WhisperTextFormatter.format('  hello world  ')).toBe('Hello world');
    });

    it('should capitalize first letter', () => {
      expect(WhisperTextFormatter.format('hello world')).toBe('Hello world');
    });

    it('should capitalize first letter after sentence-ending punctuation', () => {
      expect(WhisperTextFormatter.format('hello. world. foo')).toBe(
        'Hello. World. Foo'
      );
    });

    it('should remove whisper artifacts', () => {
      expect(WhisperTextFormatter.format('[BLANK_AUDIO] hello')).toBe('Hello');
      expect(WhisperTextFormatter.format('(music) hello')).toBe('Hello');
      expect(WhisperTextFormatter.format('[something] hello')).toBe('Hello');
    });

    it('should collapse multiple spaces', () => {
      expect(WhisperTextFormatter.format('hello   world')).toBe('Hello world');
    });

    it('should handle empty string', () => {
      expect(WhisperTextFormatter.format('')).toBe('');
      expect(WhisperTextFormatter.format('  ')).toBe('');
    });

    it('should append trailing space when enabled', () => {
      const result = WhisperTextFormatter.format('hello', {
        appendTrailingSpace: true,
      });
      expect(result).toBe('Hello ');
    });

    it('should remove filler words when enabled', () => {
      const result = WhisperTextFormatter.format(
        'um I think, like, this is basically the idea',
        { removeFillerWords: true }
      );
      expect(result).not.toContain('um');
      expect(result).not.toContain('like');
      expect(result).not.toContain('basically');
      expect(result).toContain('idea');
    });
  });

  describe('removeFillerWords', () => {
    it('should remove common filler words', () => {
      expect(WhisperTextFormatter.removeFillerWords('um I think so')).toBe(
        'I think so'
      );
      expect(WhisperTextFormatter.removeFillerWords('uh the thing is')).toBe(
        'The thing is'
      );
    });

    it('should remove "you know"', () => {
      expect(
        WhisperTextFormatter.removeFillerWords('it was, you know, great')
      ).toBe('It was, great');
    });

    it('should remove "like" as filler but preserve in other contexts', () => {
      // "like" as filler word gets removed
      const result = WhisperTextFormatter.removeFillerWords(
        'I, like, went there'
      );
      expect(result).not.toMatch(/\blike\b/i);
    });

    it('should handle text with no filler words', () => {
      const text = 'This is a clean sentence.';
      expect(WhisperTextFormatter.removeFillerWords(text)).toBe(text);
    });

    it('should re-capitalize after removal', () => {
      const result = WhisperTextFormatter.removeFillerWords('um hello world');
      expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase());
    });
  });
});
