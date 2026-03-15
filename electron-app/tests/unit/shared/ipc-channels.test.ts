/**
 * Tests for IPC channel constants.
 * Ensures all channel names are unique and properly defined.
 */
import { IPC_CHANNELS } from '../../../src/shared/constants/ipc-channels';

describe('IPC_CHANNELS', () => {
  it('should have all required channel categories', () => {
    // Settings
    expect(IPC_CHANNELS.SETTINGS_GET).toBeDefined();
    expect(IPC_CHANNELS.SETTINGS_SET).toBeDefined();
    expect(IPC_CHANNELS.SETTINGS_GET_ALL).toBeDefined();
    expect(IPC_CHANNELS.SETTINGS_RESET).toBeDefined();
    expect(IPC_CHANNELS.SETTINGS_CHANGED).toBeDefined();

    // Recording
    expect(IPC_CHANNELS.RECORDER_START).toBeDefined();
    expect(IPC_CHANNELS.RECORDER_STOP).toBeDefined();
    expect(IPC_CHANNELS.RECORDER_TOGGLE).toBeDefined();
    expect(IPC_CHANNELS.RECORDER_STATE_CHANGED).toBeDefined();
    expect(IPC_CHANNELS.RECORDER_AUDIO_LEVEL).toBeDefined();

    // Transcription
    expect(IPC_CHANNELS.TRANSCRIPTION_START).toBeDefined();
    expect(IPC_CHANNELS.TRANSCRIPTION_COMPLETE).toBeDefined();
    expect(IPC_CHANNELS.TRANSCRIPTION_ERROR).toBeDefined();
    expect(IPC_CHANNELS.TRANSCRIPTION_LIST).toBeDefined();
    expect(IPC_CHANNELS.TRANSCRIPTION_DELETE).toBeDefined();

    // Window
    expect(IPC_CHANNELS.WINDOW_SHOW_MAIN).toBeDefined();
    expect(IPC_CHANNELS.WINDOW_HIDE_MAIN).toBeDefined();
    expect(IPC_CHANNELS.WINDOW_NAVIGATE).toBeDefined();
    expect(IPC_CHANNELS.WINDOW_OPEN_HISTORY).toBeDefined();

    // App
    expect(IPC_CHANNELS.APP_QUIT).toBeDefined();
    expect(IPC_CHANNELS.APP_VERSION).toBeDefined();
    expect(IPC_CHANNELS.APP_GET_PLATFORM).toBeDefined();
  });

  it('should have unique channel names', () => {
    const values = Object.values(IPC_CHANNELS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('should use consistent namespace format', () => {
    const values = Object.values(IPC_CHANNELS);
    for (const value of values) {
      expect(value).toMatch(/^[a-zA-Z]+:[a-zA-Z]+$/);
    }
  });
});
