/**
 * Unit tests for HotkeyService.
 * Tests hotkey registration, mode handling, and configuration.
 *
 * Note: Since globalShortcut is an Electron API that requires a running
 * Electron app, we mock it for unit testing.
 */

// Mock Electron's globalShortcut - use inline functions that jest.mock can hoist
const mockRegister = jest.fn().mockReturnValue(true);
const mockUnregister = jest.fn();
const mockIsRegistered = jest.fn().mockReturnValue(false);

jest.mock('electron', () => ({
  globalShortcut: {
    register: (...args: unknown[]) => mockRegister(...args),
    unregister: (...args: unknown[]) => mockUnregister(...args),
    isRegistered: (...args: unknown[]) => mockIsRegistered(...args),
  },
  BrowserWindow: {
    getAllWindows: jest.fn().mockReturnValue([]),
  },
}));

import { HotkeyService } from '../../../../src/main/services/hotkey-service';

describe('HotkeyService', () => {
  let service: HotkeyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HotkeyService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = service.getConfig();
      expect(config.selectedHotkey1).toBe('none');
      expect(config.selectedHotkey2).toBe('none');
      expect(config.hotkeyMode1).toBe('toggle');
      expect(config.hotkeyMode2).toBe('toggle');
      expect(config.isMiddleClickToggleEnabled).toBe(false);
      expect(config.middleClickActivationDelay).toBe(200);
    });

    it('should accept custom config', () => {
      const customService = new HotkeyService({
        selectedHotkey1: 'custom',
        hotkeyMode1: 'pushToTalk',
        customAccelerator1: 'CommandOrControl+Shift+R',
      });

      const config = customService.getConfig();
      expect(config.selectedHotkey1).toBe('custom');
      expect(config.hotkeyMode1).toBe('pushToTalk');
      expect(config.customAccelerator1).toBe('CommandOrControl+Shift+R');

      customService.destroy();
    });
  });

  describe('registerAll', () => {
    it('should not register any hotkeys when both slots are none', () => {
      service.registerAll();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should register slot 1 hotkey', () => {
      service.updateConfig({
        selectedHotkey1: 'custom',
        customAccelerator1: 'F9',
      });

      // registerAll is called by updateConfig
      expect(mockRegister).toHaveBeenCalledWith('F9', expect.any(Function));
    });

    it('should register slot 2 hotkey', () => {
      service.updateConfig({
        selectedHotkey2: 'custom',
        customAccelerator2: 'F10',
      });

      expect(mockRegister).toHaveBeenCalledWith('F10', expect.any(Function));
    });

    it('should register both hotkeys simultaneously', () => {
      service.updateConfig({
        selectedHotkey1: 'custom',
        customAccelerator1: 'F9',
        selectedHotkey2: 'custom',
        customAccelerator2: 'F10',
      });

      expect(mockRegister).toHaveBeenCalledTimes(2);
    });

    it('should unregister existing hotkeys before registering new ones', () => {
      service.updateConfig({
        selectedHotkey1: 'custom',
        customAccelerator1: 'F9',
      });

      // Register again - should unregister first
      service.updateConfig({
        selectedHotkey1: 'custom',
        customAccelerator1: 'F10',
      });

      expect(mockUnregister).toHaveBeenCalled();
    });
  });

  describe('unregisterAll', () => {
    it('should unregister all registered hotkeys', () => {
      service.updateConfig({
        selectedHotkey1: 'custom',
        customAccelerator1: 'F9',
      });

      service.unregisterAll();
      expect(mockUnregister).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration and re-register', () => {
      service.updateConfig({
        selectedHotkey1: 'capsLock',
        hotkeyMode1: 'toggle',
      });

      const config = service.getConfig();
      expect(config.selectedHotkey1).toBe('capsLock');
      expect(config.hotkeyMode1).toBe('toggle');
    });
  });

  describe('callbacks', () => {
    it('should call toggle callback in toggle mode', () => {
      const toggleFn = jest.fn();
      service.onToggleRecording(toggleFn);

      service.updateConfig({
        selectedHotkey1: 'custom',
        customAccelerator1: 'F9',
        hotkeyMode1: 'toggle',
      });

      // Simulate hotkey press by calling the registered callback
      const registeredCallback = mockRegister.mock.calls.find(
        (call: unknown[]) => call[0] === 'F9'
      )?.[1] as (() => void) | undefined;
      expect(registeredCallback).toBeDefined();
      registeredCallback!();

      expect(toggleFn).toHaveBeenCalled();
    });

    it('should call start callback in push-to-talk mode (first press)', () => {
      const startFn = jest.fn();
      const stopFn = jest.fn();
      service.onStartRecording(startFn);
      service.onStopRecording(stopFn);

      service.updateConfig({
        selectedHotkey1: 'custom',
        customAccelerator1: 'F9',
        hotkeyMode1: 'pushToTalk',
      });

      const registeredCallback = mockRegister.mock.calls.find(
        (call: unknown[]) => call[0] === 'F9'
      )?.[1] as (() => void) | undefined;
      registeredCallback!();

      expect(startFn).toHaveBeenCalled();
      expect(stopFn).not.toHaveBeenCalled();
    });

    it('should call stop callback in push-to-talk mode (second press)', () => {
      const startFn = jest.fn();
      const stopFn = jest.fn();
      service.onStartRecording(startFn);
      service.onStopRecording(stopFn);

      service.setRecordingState(false);

      service.updateConfig({
        selectedHotkey1: 'custom',
        customAccelerator1: 'F9',
        hotkeyMode1: 'pushToTalk',
      });

      const registeredCallback = mockRegister.mock.calls.find(
        (call: unknown[]) => call[0] === 'F9'
      )?.[1] as (() => void) | undefined;

      // First press → start
      registeredCallback!();
      expect(startFn).toHaveBeenCalledTimes(1);

      // Simulate recording started
      service.setRecordingState(true);

      // Second press → stop
      registeredCallback!();
      expect(stopFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleMiddleClick', () => {
    it('should not toggle when disabled', () => {
      const toggleFn = jest.fn();
      service.onToggleRecording(toggleFn);

      service.handleMiddleClick();
      // Even after waiting, nothing should happen
      expect(toggleFn).not.toHaveBeenCalled();
    });

    it('should toggle after delay when enabled', (done) => {
      const toggleFn = jest.fn();
      service.onToggleRecording(toggleFn);

      service.updateConfig({
        isMiddleClickToggleEnabled: true,
        middleClickActivationDelay: 50, // Short delay for testing
      });

      service.handleMiddleClick();

      setTimeout(() => {
        expect(toggleFn).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('isRegistered', () => {
    it('should delegate to Electron globalShortcut.isRegistered', () => {
      service.isRegistered('F9');
      expect(mockIsRegistered).toHaveBeenCalledWith('F9');
    });
  });

  describe('setRecordingState', () => {
    it('should update recording state', () => {
      service.setRecordingState(true);
      // No direct getter - this affects push-to-talk behavior
      // tested through callback tests
    });
  });

  describe('destroy', () => {
    it('should unregister all hotkeys', () => {
      service.updateConfig({
        selectedHotkey1: 'custom',
        customAccelerator1: 'F9',
      });

      service.destroy();
      expect(mockUnregister).toHaveBeenCalled();
    });
  });

  describe('hotkey option mapping', () => {
    it('should map capsLock to Alt+CapsLock', () => {
      service.updateConfig({
        selectedHotkey1: 'capsLock',
        hotkeyMode1: 'toggle',
      });

      expect(mockRegister).toHaveBeenCalledWith(
        'Alt+CapsLock',
        expect.any(Function)
      );
    });

    it('should map rightOption to Alt+Shift+V', () => {
      service.updateConfig({
        selectedHotkey1: 'rightOption',
        hotkeyMode1: 'toggle',
      });

      expect(mockRegister).toHaveBeenCalledWith(
        'Alt+Shift+V',
        expect.any(Function)
      );
    });

    it('should map fn to F13', () => {
      service.updateConfig({
        selectedHotkey1: 'fn',
        hotkeyMode1: 'toggle',
      });

      expect(mockRegister).toHaveBeenCalledWith(
        'F13',
        expect.any(Function)
      );
    });

    it('should use custom accelerator for custom option', () => {
      service.updateConfig({
        selectedHotkey1: 'custom',
        customAccelerator1: 'CommandOrControl+Shift+R',
        hotkeyMode1: 'toggle',
      });

      expect(mockRegister).toHaveBeenCalledWith(
        'CommandOrControl+Shift+R',
        expect.any(Function)
      );
    });

    it('should not register for none option', () => {
      service.updateConfig({
        selectedHotkey1: 'none',
      });

      // Find calls that aren't from the beforeEach
      expect(
        mockRegister.mock.calls.filter(
          (call: unknown[]) => call[0] !== 'none'
        ).length
      ).toBe(0);
    });
  });
});
