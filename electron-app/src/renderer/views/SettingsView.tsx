/**
 * SettingsView - Application settings and preferences.
 * Mirrors VoiceInk/Views/Settings/SettingsView.swift.
 *
 * Includes:
 * - Hotkey configuration
 * - Sound feedback
 * - System audio mute
 * - Clipboard settings
 * - Auto-update
 * - Cleanup policies
 * - Recorder type selection
 */
import React, { useState, useEffect, useCallback } from 'react';

interface SettingsState {
  isSoundFeedbackEnabled: boolean;
  isSystemMuteEnabled: boolean;
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
}

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>({
    isSoundFeedbackEnabled: true,
    isSystemMuteEnabled: true,
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
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (window.voiceink?.settings?.getAll) {
        const all = (await window.voiceink.settings.getAll()) as SettingsState;
        setSettings((prev) => ({ ...prev, ...all }));
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

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Settings</h1>
        <p className="view-subtitle">Configure VoiceInk behavior and preferences</p>
      </div>

      {/* Recording Settings */}
      <div className="card">
        <div className="card-title">Recording</div>

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

        <ToggleSetting
          name="Voice Activity Detection"
          description="Automatically detect speech and silence"
          checked={settings.isVADEnabled}
          onChange={(v) => updateSetting('isVADEnabled', v)}
        />

        <ToggleSetting
          name="Remove Filler Words"
          description="Remove um, uh, etc. from transcription"
          checked={settings.removeFillerWords}
          onChange={(v) => updateSetting('removeFillerWords', v)}
        />

        <ToggleSetting
          name="Text Formatting"
          description="Auto-capitalize and add punctuation"
          checked={settings.isTextFormattingEnabled}
          onChange={(v) => updateSetting('isTextFormattingEnabled', v)}
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
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="it">Italian</option>
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
        <div className="card-title">Clipboard</div>

        <ToggleSetting
          name="Restore Clipboard After Paste"
          description="Restore original clipboard content after pasting transcription"
          checked={settings.restoreClipboardAfterPaste}
          onChange={(v) => updateSetting('restoreClipboardAfterPaste', v)}
        />

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
      </div>

      {/* Cleanup Settings */}
      <div className="card">
        <div className="card-title">Auto Cleanup</div>

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
            <input
              type="number"
              className="input"
              style={{ width: '100px' }}
              min={60}
              max={43200}
              value={settings.transcriptionRetentionMinutes}
              onChange={(e) =>
                updateSetting('transcriptionRetentionMinutes', parseInt(e.target.value))
              }
            />
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
            <input
              type="number"
              className="input"
              style={{ width: '80px' }}
              min={1}
              max={365}
              value={settings.audioRetentionPeriod}
              onChange={(e) =>
                updateSetting('audioRetentionPeriod', parseInt(e.target.value))
              }
            />
          </div>
        )}
      </div>

      {/* General */}
      <div className="card">
        <div className="card-title">General</div>

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
      </div>
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
