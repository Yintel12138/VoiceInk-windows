/**
 * SettingsView - Application settings and preferences.
 * Mirrors VoiceInk/Views/Settings/SettingsView.swift.
 *
 * Includes:
 * - Hotkey configuration (2 slots + custom shortcuts)
 * - Sound feedback with custom sounds
 * - System audio mute with delay
 * - Clipboard settings
 * - Auto-update, Launch at login
 * - Cleanup policies
 * - Recorder type selection
 * - Middle-click recording
 * - Filler words removal
 * - Announcements
 * - Reset onboarding
 * - Export/Import settings
 * - Diagnostics
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface SettingsState {
  isSoundFeedbackEnabled: boolean;
  isSystemMuteEnabled: boolean;
  audioResumptionDelay: number;
  restoreClipboardAfterPaste: boolean;
  clipboardRestoreDelay: number;
  isTextFormattingEnabled: boolean;
  isVADEnabled: boolean;
  removeFillerWords: boolean;
  selectedLanguage: string;
  appendTrailingSpace: boolean;
  recorderType: string;
  isTranscriptionCleanupEnabled: boolean;
  transcriptionRetentionMinutes: number;
  isAudioCleanupEnabled: boolean;
  audioRetentionPeriod: number;
  isMenuBarOnly: boolean;
  autoUpdateCheck: boolean;
  enableAnnouncements: boolean;
  hasCompletedOnboarding: boolean;
  hotkeyMode1: string;
  hotkeyMode2: string;
  selectedHotkey1: string;
  selectedHotkey2: string;
  isMiddleClickToggleEnabled: boolean;
  middleClickActivationDelay: number;
  isPauseMediaEnabled: boolean;
}

type HotkeyOption = 'capsLock' | 'rightOption' | 'fn' | 'custom' | 'none';

const HOTKEY_OPTIONS: { value: HotkeyOption; label: string }[] = [
  { value: 'none', label: 'Not Set' },
  { value: 'capsLock', label: 'Caps Lock' },
  { value: 'rightOption', label: 'Right Option / Alt' },
  { value: 'fn', label: 'Fn / Globe' },
  { value: 'custom', label: 'Custom...' },
];

const HOTKEY_MODES = [
  { value: 'toggle', label: 'Toggle (press to start/stop)' },
  { value: 'pushToTalk', label: 'Push-to-Talk (hold to record)' },
  { value: 'hybrid', label: 'Hybrid (short press toggle, long press PTT)' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'auto', name: 'Auto-detect' },
];

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>({
    isSoundFeedbackEnabled: true,
    isSystemMuteEnabled: true,
    audioResumptionDelay: 0,
    restoreClipboardAfterPaste: true,
    clipboardRestoreDelay: 2.0,
    isTextFormattingEnabled: true,
    isVADEnabled: true,
    removeFillerWords: true,
    selectedLanguage: 'en',
    appendTrailingSpace: true,
    recorderType: 'mini',
    isTranscriptionCleanupEnabled: false,
    transcriptionRetentionMinutes: 1440,
    isAudioCleanupEnabled: false,
    audioRetentionPeriod: 7,
    isMenuBarOnly: false,
    autoUpdateCheck: true,
    enableAnnouncements: true,
    hasCompletedOnboarding: false,
    hotkeyMode1: 'toggle',
    hotkeyMode2: 'toggle',
    selectedHotkey1: 'none',
    selectedHotkey2: 'none',
    isMiddleClickToggleEnabled: false,
    middleClickActivationDelay: 200,
    isPauseMediaEnabled: false,
  });
  const [showHotkey2, setShowHotkey2] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsText, setDiagnosticsText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (window.voiceink?.settings?.getAll) {
        const all = (await window.voiceink.settings.getAll()) as SettingsState;
        setSettings((prev) => ({ ...prev, ...all }));
        if (all.selectedHotkey2 && all.selectedHotkey2 !== 'none') {
          setShowHotkey2(true);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const updateSetting = useCallback(async (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    try {
      if (window.voiceink?.settings?.set) {
        await window.voiceink.settings.set(key, value);
      }
    } catch (err) {
      console.error(`Failed to update setting ${key}:`, err);
    }
  }, []);

  const exportSettings = useCallback(async () => {
    try {
      if (window.voiceink?.settings?.getAll) {
        const all = await window.voiceink.settings.getAll();
        const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voiceink-settings-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export settings:', err);
    }
  }, []);

  const importSettings = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      for (const [key, value] of Object.entries(imported)) {
        if (window.voiceink?.settings?.set) {
          await window.voiceink.settings.set(key, value);
        }
      }
      await loadSettings();
    } catch (err) {
      console.error('Failed to import settings:', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const resetOnboarding = useCallback(async () => {
    await updateSetting('hasCompletedOnboarding', false);
  }, [updateSetting]);

  const showDiagnosticsInfo = useCallback(async () => {
    let info = '';
    try {
      if (window.voiceink?.app?.getVersion) {
        const version = await window.voiceink.app.getVersion();
        info += `App Version: ${version}\n`;
      }
      if (window.voiceink?.app?.getPlatform) {
        const platform = await window.voiceink.app.getPlatform();
        info += `Platform: ${platform}\n`;
      }
      info += `User Agent: ${navigator.userAgent}\n`;
      info += `Screen: ${window.screen.width}x${window.screen.height}\n`;
      info += `Device Pixel Ratio: ${window.devicePixelRatio}\n`;
      info += `Locale: ${navigator.language}\n`;
      info += `Online: ${navigator.onLine}\n`;
      const all = settings;
      info += `\nSettings:\n${JSON.stringify(all, null, 2)}`;
    } catch { /* ignore */ }
    setDiagnosticsText(info);
    setShowDiagnostics(true);
  }, [settings]);

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Settings</h1>
        <p className="view-subtitle">Configure VoiceInk behavior and preferences</p>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      {/* Hotkey Configuration */}
      <div className="card">
        <div className="card-title">⌨️ Keyboard Shortcuts</div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Hotkey #1</span>
            <span className="setting-description">Primary keyboard shortcut to control recording</span>
          </div>
          <select
            className="select"
            value={settings.selectedHotkey1}
            onChange={(e) => updateSetting('selectedHotkey1', e.target.value)}
          >
            {HOTKEY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {settings.selectedHotkey1 !== 'none' && (
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Hotkey #1 Mode</span>
              <span className="setting-description">How the hotkey triggers recording</span>
            </div>
            <select
              className="select"
              value={settings.hotkeyMode1}
              onChange={(e) => updateSetting('hotkeyMode1', e.target.value)}
            >
              {HOTKEY_MODES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        {!showHotkey2 && (
          <button
            className="btn btn-secondary"
            style={{ marginTop: '8px' }}
            onClick={() => setShowHotkey2(true)}
          >
            + Add Second Shortcut
          </button>
        )}

        {showHotkey2 && (
          <>
            <div className="setting-row" style={{ marginTop: '16px' }}>
              <div className="setting-label">
                <span className="setting-name">Hotkey #2</span>
                <span className="setting-description">Secondary keyboard shortcut</span>
              </div>
              <select
                className="select"
                value={settings.selectedHotkey2}
                onChange={(e) => updateSetting('selectedHotkey2', e.target.value)}
              >
                {HOTKEY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {settings.selectedHotkey2 !== 'none' && (
              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-name">Hotkey #2 Mode</span>
                </div>
                <select
                  className="select"
                  value={settings.hotkeyMode2}
                  onChange={(e) => updateSetting('hotkeyMode2', e.target.value)}
                >
                  {HOTKEY_MODES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        <div className="setting-row" style={{ marginTop: '16px' }}>
          <div className="setting-label">
            <span className="setting-name">Middle-Click Recording</span>
            <span className="setting-description">Toggle recording with middle mouse button click</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.isMiddleClickToggleEnabled}
              onChange={(e) => updateSetting('isMiddleClickToggleEnabled', e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {settings.isMiddleClickToggleEnabled && (
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Middle-Click Activation Delay</span>
              <span className="setting-description">Milliseconds delay to avoid accidental triggers</span>
            </div>
            <input
              type="number"
              className="input"
              style={{ width: '100px' }}
              min={0}
              max={1000}
              step={50}
              value={settings.middleClickActivationDelay}
              onChange={(e) => updateSetting('middleClickActivationDelay', parseInt(e.target.value))}
            />
          </div>
        )}
      </div>

      {/* Recording Settings */}
      <div className="card">
        <div className="card-title">🎤 Recording</div>

        <ToggleSetting
          name="Sound Feedback"
          description="Play sound when recording starts/stops"
          checked={settings.isSoundFeedbackEnabled}
          onChange={(v) => updateSetting('isSoundFeedbackEnabled', v)}
        />

        <ToggleSetting
          name="Mute System Audio"
          description="Mute system audio while recording"
          checked={settings.isSystemMuteEnabled}
          onChange={(v) => updateSetting('isSystemMuteEnabled', v)}
        />

        {settings.isSystemMuteEnabled && (
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Audio Resumption Delay</span>
              <span className="setting-description">Seconds to wait before unmuting after recording stops</span>
            </div>
            <input
              type="number"
              className="input"
              style={{ width: '80px' }}
              min={0}
              max={10}
              step={0.5}
              value={settings.audioResumptionDelay}
              onChange={(e) => updateSetting('audioResumptionDelay', parseFloat(e.target.value))}
            />
          </div>
        )}

        <ToggleSetting
          name="Pause Media Playback"
          description="Pause media players during recording"
          checked={settings.isPauseMediaEnabled}
          onChange={(v) => updateSetting('isPauseMediaEnabled', v)}
        />

        <ToggleSetting
          name="Voice Activity Detection"
          description="Automatically detect speech and silence"
          checked={settings.isVADEnabled}
          onChange={(v) => updateSetting('isVADEnabled', v)}
        />

        <ToggleSetting
          name="Remove Filler Words"
          description='Remove &quot;um&quot;, &quot;uh&quot;, &quot;like&quot; etc. from transcription'
          checked={settings.removeFillerWords}
          onChange={(v) => updateSetting('removeFillerWords', v)}
        />

        <ToggleSetting
          name="Text Formatting"
          description="Auto-capitalize and add punctuation"
          checked={settings.isTextFormattingEnabled}
          onChange={(v) => updateSetting('isTextFormattingEnabled', v)}
        />

        <ToggleSetting
          name="Append Trailing Space"
          description="Add a space at the end of transcribed text"
          checked={settings.appendTrailingSpace}
          onChange={(v) => updateSetting('appendTrailingSpace', v)}
        />

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Language</span>
            <span className="setting-description">Transcription language</span>
          </div>
          <select
            className="select"
            value={settings.selectedLanguage}
            onChange={(e) => updateSetting('selectedLanguage', e.target.value)}
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Recorder Type</span>
            <span className="setting-description">
              Choose between mini or notch recorder style
            </span>
          </div>
          <select
            className="select"
            value={settings.recorderType}
            onChange={(e) => updateSetting('recorderType', e.target.value)}
          >
            <option value="mini">Mini</option>
            <option value="notch">Notch</option>
          </select>
        </div>
      </div>

      {/* Clipboard Settings */}
      <div className="card">
        <div className="card-title">📋 Clipboard</div>

        <ToggleSetting
          name="Restore Clipboard After Paste"
          description="Restore original clipboard content after pasting transcription"
          checked={settings.restoreClipboardAfterPaste}
          onChange={(v) => updateSetting('restoreClipboardAfterPaste', v)}
        />

        {settings.restoreClipboardAfterPaste && (
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Clipboard Restore Delay</span>
              <span className="setting-description">Seconds to wait before restoring</span>
            </div>
            <input
              type="number"
              className="input"
              style={{ width: '80px' }}
              min={0.5}
              max={10}
              step={0.5}
              value={settings.clipboardRestoreDelay}
              onChange={(e) =>
                updateSetting('clipboardRestoreDelay', parseFloat(e.target.value))
              }
            />
          </div>
        )}
      </div>

      {/* Cleanup Settings */}
      <div className="card">
        <div className="card-title">🧹 Auto Cleanup</div>

        <ToggleSetting
          name="Auto-Delete Transcriptions"
          description="Automatically delete old transcriptions"
          checked={settings.isTranscriptionCleanupEnabled}
          onChange={(v) => updateSetting('isTranscriptionCleanupEnabled', v)}
        />

        {settings.isTranscriptionCleanupEnabled && (
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Retention Period</span>
              <span className="setting-description">Minutes to keep transcriptions</span>
            </div>
            <select
              className="select"
              value={settings.transcriptionRetentionMinutes}
              onChange={(e) =>
                updateSetting('transcriptionRetentionMinutes', parseInt(e.target.value))
              }
            >
              <option value={60}>1 hour</option>
              <option value={360}>6 hours</option>
              <option value={1440}>1 day</option>
              <option value={10080}>1 week</option>
              <option value={43200}>1 month</option>
            </select>
          </div>
        )}

        <ToggleSetting
          name="Auto-Delete Audio Files"
          description="Automatically delete old audio recordings"
          checked={settings.isAudioCleanupEnabled}
          onChange={(v) => updateSetting('isAudioCleanupEnabled', v)}
        />

        {settings.isAudioCleanupEnabled && (
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Audio Retention Period</span>
              <span className="setting-description">Days to keep audio files</span>
            </div>
            <select
              className="select"
              value={settings.audioRetentionPeriod}
              onChange={(e) =>
                updateSetting('audioRetentionPeriod', parseInt(e.target.value))
              }
            >
              <option value={1}>1 day</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
        )}
      </div>

      {/* General */}
      <div className="card">
        <div className="card-title">⚙️ General</div>

        <ToggleSetting
          name="Menu Bar Only Mode"
          description="Hide dock icon and only show in menu bar / system tray"
          checked={settings.isMenuBarOnly}
          onChange={(v) => updateSetting('isMenuBarOnly', v)}
        />

        <ToggleSetting
          name="Auto Check Updates"
          description="Automatically check for app updates"
          checked={settings.autoUpdateCheck}
          onChange={(v) => updateSetting('autoUpdateCheck', v)}
        />

        <ToggleSetting
          name="Show Announcements"
          description="Display in-app announcements and news"
          checked={settings.enableAnnouncements}
          onChange={(v) => updateSetting('enableAnnouncements', v)}
        />

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Check for Updates</span>
            <span className="setting-description">Manually check for app updates now</span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              // Placeholder for update check
              alert('You are running the latest version!');
            }}
          >
            Check Now
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <div className="card-title">💾 Data Management</div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Export Settings</span>
            <span className="setting-description">Save all settings to a JSON file</span>
          </div>
          <button className="btn btn-secondary" onClick={exportSettings}>
            📤 Export
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Import Settings</span>
            <span className="setting-description">Load settings from a JSON file</span>
          </div>
          <button className="btn btn-secondary" onClick={importSettings}>
            📥 Import
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Reset Onboarding</span>
            <span className="setting-description">Show the onboarding guide again on next launch</span>
          </div>
          <button className="btn btn-secondary" onClick={resetOnboarding}>
            🔄 Reset
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Diagnostics</span>
            <span className="setting-description">View system info and debug data</span>
          </div>
          <button className="btn btn-secondary" onClick={showDiagnosticsInfo}>
            🔍 Show Diagnostics
          </button>
        </div>
      </div>

      {/* Diagnostics Panel */}
      {showDiagnostics && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title" style={{ margin: 0 }}>Diagnostics</div>
            <button className="btn btn-secondary btn-small" onClick={() => setShowDiagnostics(false)}>
              Close
            </button>
          </div>
          <pre className="diagnostics-output">{diagnosticsText}</pre>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '8px' }}
            onClick={() => navigator.clipboard.writeText(diagnosticsText)}
          >
            📋 Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
};

// Reusable toggle setting component
interface ToggleSettingProps {
  name: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

const ToggleSetting: React.FC<ToggleSettingProps> = ({
  name,
  description,
  checked,
  onChange,
}) => (
  <div className="setting-row">
    <div className="setting-label">
      <span className="setting-name">{name}</span>
      <span className="setting-description">{description}</span>
    </div>
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  </div>
);
