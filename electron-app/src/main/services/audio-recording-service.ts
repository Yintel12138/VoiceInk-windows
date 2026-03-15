/**
 * AudioRecordingService - Manages audio capture from input devices.
 * Mirrors VoiceInk/CoreAudioRecorder.swift + Recorder.swift.
 *
 * Uses Electron's desktopCapturer for device enumeration and
 * spawns a renderer-side MediaRecorder via a hidden utility window,
 * or uses node-record-lpcm16 / mic for direct PCM capture.
 *
 * For cross-platform compatibility, we use the Web Audio API approach:
 * The renderer process captures audio via navigator.mediaDevices.getUserMedia(),
 * and sends PCM chunks to the main process via IPC for Whisper processing.
 *
 * Main process responsibilities:
 * - Device enumeration (forwarded from renderer)
 * - Recording state management
 * - Audio file management (WAV output)
 * - Audio level broadcasting
 */
import { BrowserWindow, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { RecordingState, AudioDevice, AudioLevel } from '../../shared/types';

export class AudioRecordingService {
  private state: RecordingState = 'idle';
  private audioChunks: Buffer[] = [];
  private recordingStartTime: number = 0;
  private outputDir: string;
  private currentDeviceId: string = 'default';
  private audioLevelInterval: ReturnType<typeof setInterval> | null = null;
  private stateListeners: Array<(state: RecordingState) => void> = [];
  private audioLevelListeners: Array<(level: AudioLevel) => void> = [];
  private completeListeners: Array<(filePath: string, duration: number) => void> = [];

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Get current recording state.
   */
  getState(): RecordingState {
    return this.state;
  }

  /**
   * Set recording state and notify listeners.
   */
  setState(state: RecordingState): void {
    this.state = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  /**
   * Start recording audio.
   * In the Electron architecture, actual audio capture happens in the renderer
   * process using the Web Audio API. The main process manages state and file I/O.
   *
   * The renderer sends audio data chunks via IPC which we accumulate here.
   */
  async startRecording(deviceId?: string): Promise<{ outputPath: string }> {
    if (this.state === 'recording') {
      throw new Error('Already recording');
    }

    if (deviceId) {
      this.currentDeviceId = deviceId;
    }

    this.audioChunks = [];
    this.recordingStartTime = Date.now();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(this.outputDir, `recording-${timestamp}.wav`);

    this.setState('recording');
    this.startAudioLevelSimulation();

    return { outputPath };
  }

  /**
   * Receive audio data chunk from renderer process.
   * Called via IPC when the renderer captures audio data.
   */
  receiveAudioChunk(chunk: Buffer): void {
    if (this.state !== 'recording') return;
    this.audioChunks.push(chunk);
  }

  /**
   * Stop recording and save audio file.
   * Returns the path to the saved WAV file and the recording duration.
   */
  async stopRecording(): Promise<{ filePath: string; duration: number } | null> {
    if (this.state !== 'recording') {
      return null;
    }

    this.stopAudioLevelSimulation();

    const duration = (Date.now() - this.recordingStartTime) / 1000;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(this.outputDir, `recording-${timestamp}.wav`);

    // Combine all audio chunks into a single WAV file
    if (this.audioChunks.length > 0) {
      const audioData = Buffer.concat(this.audioChunks);
      const wavBuffer = this.createWavBuffer(audioData, 16000, 1, 16);
      fs.writeFileSync(filePath, wavBuffer);
    } else {
      // Create an empty WAV file placeholder
      const emptyWav = this.createWavBuffer(Buffer.alloc(0), 16000, 1, 16);
      fs.writeFileSync(filePath, emptyWav);
    }

    this.setState('idle');

    // Notify completion listeners
    for (const listener of this.completeListeners) {
      listener(filePath, duration);
    }

    return { filePath, duration };
  }

  /**
   * Toggle recording state (start if idle, stop if recording).
   */
  async toggleRecording(): Promise<{ filePath: string; duration: number } | null> {
    if (this.state === 'recording') {
      return this.stopRecording();
    } else if (this.state === 'idle') {
      await this.startRecording();
      return null;
    }
    return null;
  }

  /**
   * Cancel recording without saving.
   */
  cancelRecording(): void {
    this.stopAudioLevelSimulation();
    this.audioChunks = [];
    this.setState('idle');
  }

  /**
   * List available audio input devices.
   * Uses Electron's built-in media device enumeration via a renderer window.
   */
  async listDevices(): Promise<AudioDevice[]> {
    // Get devices from any existing BrowserWindow
    const windows = BrowserWindow.getAllWindows();
    if (windows.length === 0) {
      return this.getDefaultDevices();
    }

    try {
      const devices = await windows[0].webContents.executeJavaScript(`
        navigator.mediaDevices.enumerateDevices()
          .then(devices => devices
            .filter(d => d.kind === 'audioinput')
            .map(d => ({
              id: d.deviceId,
              name: d.label || 'Microphone ' + d.deviceId.slice(0, 8),
              isDefault: d.deviceId === 'default',
              isInput: true
            }))
          )
      `);
      return devices;
    } catch {
      return this.getDefaultDevices();
    }
  }

  /**
   * Select audio input device.
   */
  selectDevice(deviceId: string): void {
    this.currentDeviceId = deviceId;
  }

  /**
   * Get current device ID.
   */
  getCurrentDeviceId(): string {
    return this.currentDeviceId;
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
   * Register audio level listener.
   */
  onAudioLevel(listener: (level: AudioLevel) => void): () => void {
    this.audioLevelListeners.push(listener);
    return () => {
      const idx = this.audioLevelListeners.indexOf(listener);
      if (idx >= 0) this.audioLevelListeners.splice(idx, 1);
    };
  }

  /**
   * Register recording completion listener.
   */
  onComplete(listener: (filePath: string, duration: number) => void): () => void {
    this.completeListeners.push(listener);
    return () => {
      const idx = this.completeListeners.indexOf(listener);
      if (idx >= 0) this.completeListeners.splice(idx, 1);
    };
  }

  /**
   * Get recording output directory.
   */
  getOutputDir(): string {
    return this.outputDir;
  }

  /**
   * Clean up old recordings.
   */
  cleanupOldRecordings(maxAgeDays: number): number {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let deleted = 0;

    try {
      const files = fs.readdirSync(this.outputDir);
      for (const file of files) {
        if (!file.endsWith('.wav')) continue;
        const filePath = path.join(this.outputDir, file);
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      }
    } catch {
      // Ignore cleanup errors
    }

    return deleted;
  }

  // --- Private helpers ---

  private getDefaultDevices(): AudioDevice[] {
    return [
      {
        id: 'default',
        name: 'Default Microphone',
        isDefault: true,
        isInput: true,
      },
    ];
  }

  /**
   * Create a WAV file buffer from raw PCM data.
   * Follows the RIFF/WAVE specification for 16-bit mono PCM.
   */
  private createWavBuffer(
    pcmData: Buffer,
    sampleRate: number,
    channels: number,
    bitsPerSample: number
  ): Buffer {
    const byteRate = (sampleRate * channels * bitsPerSample) / 8;
    const blockAlign = (channels * bitsPerSample) / 8;
    const dataSize = pcmData.length;
    const headerSize = 44;
    const buffer = Buffer.alloc(headerSize + dataSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Sub-chunk size
    buffer.writeUInt16LE(1, 20); // Audio format (PCM)
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    pcmData.copy(buffer, 44);

    return buffer;
  }

  /**
   * Simulate audio level updates during recording.
   * In production, real levels come from the renderer's AnalyserNode via IPC.
   */
  private startAudioLevelSimulation(): void {
    this.audioLevelInterval = setInterval(() => {
      if (this.state !== 'recording') return;

      // Generate simulated audio levels (will be replaced by real data from renderer)
      const level: AudioLevel = {
        averagePower: 0.1 + Math.random() * 0.3,
        peakPower: 0.2 + Math.random() * 0.4,
      };

      for (const listener of this.audioLevelListeners) {
        listener(level);
      }
    }, 50); // ~20fps update rate
  }

  /**
   * Update audio levels from real data received from renderer.
   */
  updateAudioLevel(level: AudioLevel): void {
    for (const listener of this.audioLevelListeners) {
      listener(level);
    }
  }

  private stopAudioLevelSimulation(): void {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
  }
}
