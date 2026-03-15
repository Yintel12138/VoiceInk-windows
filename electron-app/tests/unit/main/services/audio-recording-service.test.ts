/**
 * Unit tests for AudioRecordingService.
 * Tests recording lifecycle, WAV file generation, state management, and device handling.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AudioRecordingService } from '../../../../src/main/services/audio-recording-service';

// Mock Electron's BrowserWindow
jest.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: jest.fn().mockReturnValue([]),
  },
  ipcMain: { handle: jest.fn(), on: jest.fn() },
}));

describe('AudioRecordingService', () => {
  let service: AudioRecordingService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voiceink-audio-test-'));
    service = new AudioRecordingService(tempDir);
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create output directory if it does not exist', () => {
      const newDir = path.join(tempDir, 'nested', 'recordings');
      new AudioRecordingService(newDir);
      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('should initialize with idle state', () => {
      expect(service.getState()).toBe('idle');
    });
  });

  describe('startRecording', () => {
    it('should start recording and change state', async () => {
      const result = await service.startRecording();
      expect(service.getState()).toBe('recording');
      expect(result.outputPath).toContain('recording-');
      expect(result.outputPath).toContain('.wav');
    });

    it('should throw error if already recording', async () => {
      await service.startRecording();
      await expect(service.startRecording()).rejects.toThrow('Already recording');
    });

    it('should accept custom device ID', async () => {
      await service.startRecording('my-microphone');
      expect(service.getCurrentDeviceId()).toBe('my-microphone');
    });
  });

  describe('stopRecording', () => {
    it('should stop recording and create WAV file', async () => {
      await service.startRecording();

      // Simulate receiving audio data
      service.receiveAudioChunk(Buffer.alloc(1600)); // 100ms of 16kHz mono 16-bit

      const result = await service.stopRecording();
      expect(result).not.toBeNull();
      expect(result!.filePath).toContain('.wav');
      expect(result!.duration).toBeGreaterThanOrEqual(0);
      expect(fs.existsSync(result!.filePath)).toBe(true);

      // Verify WAV header
      const wavData = fs.readFileSync(result!.filePath);
      expect(wavData.toString('ascii', 0, 4)).toBe('RIFF');
      expect(wavData.toString('ascii', 8, 12)).toBe('WAVE');
    });

    it('should return null if not recording', async () => {
      const result = await service.stopRecording();
      expect(result).toBeNull();
    });

    it('should create empty WAV file when no audio data received', async () => {
      await service.startRecording();
      const result = await service.stopRecording();
      expect(result).not.toBeNull();
      expect(fs.existsSync(result!.filePath)).toBe(true);
    });

    it('should set state to idle after stopping', async () => {
      await service.startRecording();
      await service.stopRecording();
      expect(service.getState()).toBe('idle');
    });
  });

  describe('toggleRecording', () => {
    it('should start recording when idle', async () => {
      const result = await service.toggleRecording();
      expect(result).toBeNull(); // Start returns null
      expect(service.getState()).toBe('recording');
    });

    it('should stop and return result when recording', async () => {
      await service.startRecording();
      const result = await service.toggleRecording();
      expect(result).not.toBeNull();
      expect(service.getState()).toBe('idle');
    });
  });

  describe('cancelRecording', () => {
    it('should cancel recording without saving', async () => {
      await service.startRecording();
      service.cancelRecording();
      expect(service.getState()).toBe('idle');
    });
  });

  describe('receiveAudioChunk', () => {
    it('should ignore chunks when not recording', () => {
      service.receiveAudioChunk(Buffer.alloc(100));
      // Should not throw
    });

    it('should accumulate chunks during recording', async () => {
      await service.startRecording();
      service.receiveAudioChunk(Buffer.alloc(100));
      service.receiveAudioChunk(Buffer.alloc(200));
      const result = await service.stopRecording();
      expect(result).not.toBeNull();
      // WAV file should be 44 header + 300 data = 344 bytes
      const stat = fs.statSync(result!.filePath);
      expect(stat.size).toBe(344);
    });
  });

  describe('state listeners', () => {
    it('should notify state change listeners', async () => {
      const states: string[] = [];
      service.onStateChanged((state) => states.push(state));

      await service.startRecording();
      await service.stopRecording();

      expect(states).toEqual(['recording', 'idle']);
    });

    it('should support unsubscribing', async () => {
      const states: string[] = [];
      const unsubscribe = service.onStateChanged((state) => states.push(state));

      await service.startRecording();
      unsubscribe();
      await service.stopRecording();

      expect(states).toEqual(['recording']); // Only 'recording', not 'idle'
    });
  });

  describe('complete listeners', () => {
    it('should notify complete listeners with file path and duration', async () => {
      let completePath = '';
      let completeDuration = 0;

      service.onComplete((filePath, duration) => {
        completePath = filePath;
        completeDuration = duration;
      });

      await service.startRecording();
      await service.stopRecording();

      expect(completePath).toContain('.wav');
      expect(completeDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('audio level listeners', () => {
    it('should support audio level listeners', () => {
      const levels: Array<{ averagePower: number; peakPower: number }> = [];
      service.onAudioLevel((level) => levels.push(level));

      // Manually trigger audio level update
      service.updateAudioLevel({ averagePower: 0.5, peakPower: 0.8 });

      expect(levels).toHaveLength(1);
      expect(levels[0].averagePower).toBe(0.5);
      expect(levels[0].peakPower).toBe(0.8);
    });
  });

  describe('selectDevice', () => {
    it('should update current device ID', () => {
      service.selectDevice('test-device');
      expect(service.getCurrentDeviceId()).toBe('test-device');
    });

    it('should default to "default"', () => {
      expect(service.getCurrentDeviceId()).toBe('default');
    });
  });

  describe('listDevices', () => {
    it('should return default devices when no windows are available', async () => {
      const devices = await service.listDevices();
      expect(devices).toHaveLength(1);
      expect(devices[0].id).toBe('default');
      expect(devices[0].name).toBe('Default Microphone');
      expect(devices[0].isDefault).toBe(true);
    });
  });

  describe('cleanupOldRecordings', () => {
    it('should delete old WAV files', async () => {
      // Create a test WAV file
      const testFile = path.join(tempDir, 'old-recording.wav');
      fs.writeFileSync(testFile, 'test');

      // Set its mtime to 30 days ago
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      fs.utimesSync(testFile, new Date(thirtyDaysAgo), new Date(thirtyDaysAgo));

      const deleted = service.cleanupOldRecordings(7);
      expect(deleted).toBe(1);
      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should keep recent files', async () => {
      const testFile = path.join(tempDir, 'new-recording.wav');
      fs.writeFileSync(testFile, 'test');

      const deleted = service.cleanupOldRecordings(7);
      expect(deleted).toBe(0);
      expect(fs.existsSync(testFile)).toBe(true);
    });

    it('should only delete WAV files', () => {
      const txtFile = path.join(tempDir, 'notes.txt');
      fs.writeFileSync(txtFile, 'test');

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      fs.utimesSync(txtFile, new Date(thirtyDaysAgo), new Date(thirtyDaysAgo));

      const deleted = service.cleanupOldRecordings(7);
      expect(deleted).toBe(0);
    });
  });

  describe('getOutputDir', () => {
    it('should return the output directory', () => {
      expect(service.getOutputDir()).toBe(tempDir);
    });
  });
});
