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
import { useTranslation } from 'react-i18next';

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

export const SettingsView: React.FC = () => {
  const { t } = useTranslation();

  const HOTKEY_OPTIONS: { value: HotkeyOption; label: string }[] = [
    { value: 'none', label: t('settings.hotkeys.options.notSet') },
    { value: 'capsLock', label: t('settings.hotkeys.options.capsLock') },
    { value: 'rightOption', label: t('settings.hotkeys.options.rightOption') },
    { value: 'fn', label: t('settings.hotkeys.options.fn') },
    { value: 'custom', label: t('settings.hotkeys.options.custom') },
  ];

  const HOTKEY_MODES = [
    { value: 'toggle', label: t('settings.hotkeys.modes.toggle') },
    { value: 'pushToTalk', label: t('settings.hotkeys.modes.pushToTalk') },
    { value: 'hybrid', label: t('settings.hotkeys.modes.hybrid') },
  ];

  const LANGUAGES = [
    { code: 'en', name: t('settings.languages.en') },
    { code: 'zh', name: t('settings.languages.zh') },
    { code: 'es', name: t('settings.languages.es') },
    { code: 'fr', name: t('settings.languages.fr') },
    { code: 'de', name: t('settings.languages.de') },
    { code: 'ja', name: t('settings.languages.ja') },
    { code: 'ko', name: t('settings.languages.ko') },
    { code: 'pt', name: t('settings.languages.pt') },
    { code: 'ru', name: t('settings.languages.ru') },
    { code: 'it', name: t('settings.languages.it') },
    { code: 'ar', name: t('settings.languages.ar') },
    { code: 'hi', name: t('settings.languages.hi') },
    { code: 'auto', name: t('settings.languages.auto') },
  ];
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
  const [customSpeechApiEnabled, setCustomSpeechApiEnabled] = useState(false);
  const [customSpeechApiType, setCustomSpeechApiType] = useState<'http' | 'websocket'>('http');
  const [customSpeechApiUrl, setCustomSpeechApiUrl] = useState('');
  const [customSpeechApiKey, setCustomSpeechApiKey] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'failed'>('idle');
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
        // Load custom speech API settings
        const apiEnabled = await window.voiceink.settings.get('customSpeechApiEnabled');
        if (apiEnabled !== undefined) setCustomSpeechApiEnabled(apiEnabled as boolean);
        const apiType = await window.voiceink.settings.get('customSpeechApiType');
        if (apiType) setCustomSpeechApiType(apiType as 'http' | 'websocket');
        const apiUrl = await window.voiceink.settings.get('customSpeechApiUrl');
        if (apiUrl) setCustomSpeechApiUrl(apiUrl as string);
        const apiKey = await window.voiceink.settings.get('customSpeechApiKey');
        if (apiKey) setCustomSpeechApiKey(apiKey as string);
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

  // Alias for updating settings by key (used for custom speech API settings)
  const saveSetting = useCallback(async (key: string, value: unknown) => {
    try {
      if (window.voiceink?.settings?.set) {
        await window.voiceink.settings.set(key, value);
      }
    } catch (err) {
      console.error(`Failed to save setting ${key}:`, err);
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
        <h1 className="view-title">{t('settings.title')}</h1>
        <p className="view-subtitle">{t('settings.subtitle')}</p>
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
        <div className="card-title">{t('settings.hotkeys.title')}</div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settings.hotkeys.hotkey1')}</span>
            <span className="setting-description">{t('settings.hotkeys.hotkey1Desc')}</span>
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
              <span className="setting-name">{t('settings.hotkeys.hotkey1Mode')}</span>
              <span className="setting-description">{t('settings.hotkeys.hotkey1ModeDesc')}</span>
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
            {t('settings.hotkeys.addSecond')}
          </button>
        )}

        {showHotkey2 && (
          <>
            <div className="setting-row" style={{ marginTop: '16px' }}>
              <div className="setting-label">
                <span className="setting-name">{t('settings.hotkeys.hotkey2')}</span>
                <span className="setting-description">{t('settings.hotkeys.hotkey2Desc')}</span>
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
                  <span className="setting-name">{t('settings.hotkeys.hotkey2Mode')}</span>
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
            <span className="setting-name">{t('settings.hotkeys.middleClick')}</span>
            <span className="setting-description">{t('settings.hotkeys.middleClickDesc')}</span>
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
              <span className="setting-name">{t('settings.hotkeys.middleClickDelay')}</span>
              <span className="setting-description">{t('settings.hotkeys.middleClickDelayDesc')}</span>
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
        <div className="card-title">{t('settings.recording.title')}</div>

        <ToggleSetting
          name={t('settings.recording.soundFeedback')}
          description={t('settings.recording.soundFeedbackDesc')}
          checked={settings.isSoundFeedbackEnabled}
          onChange={(v) => updateSetting('isSoundFeedbackEnabled', v)}
        />

        <ToggleSetting
          name={t('settings.recording.muteAudio')}
          description={t('settings.recording.muteAudioDesc')}
          checked={settings.isSystemMuteEnabled}
          onChange={(v) => updateSetting('isSystemMuteEnabled', v)}
        />

        {settings.isSystemMuteEnabled && (
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">{t('settings.recording.audioDelay')}</span>
              <span className="setting-description">{t('settings.recording.audioDelayDesc')}</span>
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
          name={t('settings.recording.pauseMedia')}
          description={t('settings.recording.pauseMediaDesc')}
          checked={settings.isPauseMediaEnabled}
          onChange={(v) => updateSetting('isPauseMediaEnabled', v)}
        />

        <ToggleSetting
          name={t('settings.recording.vad')}
          description={t('settings.recording.vadDesc')}
          checked={settings.isVADEnabled}
          onChange={(v) => updateSetting('isVADEnabled', v)}
        />

        <ToggleSetting
          name={t('settings.recording.fillerWords')}
          description={t('settings.recording.fillerWordsDesc')}
          checked={settings.removeFillerWords}
          onChange={(v) => updateSetting('removeFillerWords', v)}
        />

        <ToggleSetting
          name={t('settings.recording.formatting')}
          description={t('settings.recording.formattingDesc')}
          checked={settings.isTextFormattingEnabled}
          onChange={(v) => updateSetting('isTextFormattingEnabled', v)}
        />

        <ToggleSetting
          name={t('settings.recording.trailingSpace')}
          description={t('settings.recording.trailingSpaceDesc')}
          checked={settings.appendTrailingSpace}
          onChange={(v) => updateSetting('appendTrailingSpace', v)}
        />

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settings.recording.language')}</span>
            <span className="setting-description">{t('settings.recording.languageDesc')}</span>
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
            <span className="setting-name">{t('settings.recording.recorderType')}</span>
            <span className="setting-description">
              {t('settings.recording.recorderTypeDesc')}
            </span>
          </div>
          <select
            className="select"
            value={settings.recorderType}
            onChange={(e) => updateSetting('recorderType', e.target.value)}
          >
            <option value="mini">{t('settings.recording.recorderMini')}</option>
            <option value="notch">{t('settings.recording.recorderNotch')}</option>
          </select>
        </div>
      </div>

      {/* Clipboard Settings */}
      <div className="card">
        <div className="card-title">{t('settings.clipboard.title')}</div>

        <ToggleSetting
          name={t('settings.clipboard.restore')}
          description={t('settings.clipboard.restoreDesc')}
          checked={settings.restoreClipboardAfterPaste}
          onChange={(v) => updateSetting('restoreClipboardAfterPaste', v)}
        />

        {settings.restoreClipboardAfterPaste && (
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">{t('settings.clipboard.restoreDelay')}</span>
              <span className="setting-description">{t('settings.clipboard.restoreDelayDesc')}</span>
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
        <div className="card-title">{t('settings.cleanup.title')}</div>

        <ToggleSetting
          name={t('settings.cleanup.autoDelete')}
          description={t('settings.cleanup.autoDeleteDesc')}
          checked={settings.isTranscriptionCleanupEnabled}
          onChange={(v) => updateSetting('isTranscriptionCleanupEnabled', v)}
        />

        {settings.isTranscriptionCleanupEnabled && (
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">{t('settings.cleanup.retention')}</span>
              <span className="setting-description">{t('settings.cleanup.retentionDesc')}</span>
            </div>
            <select
              className="select"
              value={settings.transcriptionRetentionMinutes}
              onChange={(e) =>
                updateSetting('transcriptionRetentionMinutes', parseInt(e.target.value))
              }
            >
              <option value={60}>{t('settings.cleanup.retentionOptions.1hour')}</option>
              <option value={360}>{t('settings.cleanup.retentionOptions.6hours')}</option>
              <option value={1440}>{t('settings.cleanup.retentionOptions.1day')}</option>
              <option value={10080}>{t('settings.cleanup.retentionOptions.1week')}</option>
              <option value={43200}>{t('settings.cleanup.retentionOptions.1month')}</option>
            </select>
          </div>
        )}

        <ToggleSetting
          name={t('settings.cleanup.autoDeleteAudio')}
          description={t('settings.cleanup.autoDeleteAudioDesc')}
          checked={settings.isAudioCleanupEnabled}
          onChange={(v) => updateSetting('isAudioCleanupEnabled', v)}
        />

        {settings.isAudioCleanupEnabled && (
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">{t('settings.cleanup.audioRetention')}</span>
              <span className="setting-description">{t('settings.cleanup.audioRetentionDesc')}</span>
            </div>
            <select
              className="select"
              value={settings.audioRetentionPeriod}
              onChange={(e) =>
                updateSetting('audioRetentionPeriod', parseInt(e.target.value))
              }
            >
              <option value={1}>{t('settings.cleanup.audioRetentionOptions.1day')}</option>
              <option value={7}>{t('settings.cleanup.audioRetentionOptions.7days')}</option>
              <option value={30}>{t('settings.cleanup.audioRetentionOptions.30days')}</option>
              <option value={90}>{t('settings.cleanup.audioRetentionOptions.90days')}</option>
              <option value={365}>{t('settings.cleanup.audioRetentionOptions.1year')}</option>
            </select>
          </div>
        )}
      </div>

      {/* General */}
      <div className="card">
        <div className="card-title">{t('settings.general.title')}</div>

        <ToggleSetting
          name={t('settings.general.menuBarOnly')}
          description={t('settings.general.menuBarOnlyDesc')}
          checked={settings.isMenuBarOnly}
          onChange={(v) => updateSetting('isMenuBarOnly', v)}
        />

        <ToggleSetting
          name={t('settings.general.autoUpdate')}
          description={t('settings.general.autoUpdateDesc')}
          checked={settings.autoUpdateCheck}
          onChange={(v) => updateSetting('autoUpdateCheck', v)}
        />

        <ToggleSetting
          name={t('settings.general.announcements')}
          description={t('settings.general.announcementsDesc')}
          checked={settings.enableAnnouncements}
          onChange={(v) => updateSetting('enableAnnouncements', v)}
        />

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settings.general.checkUpdates')}</span>
            <span className="setting-description">{t('settings.general.checkUpdatesDesc')}</span>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              alert(t('settings.general.latestVersion'));
            }}
          >
            {t('settings.general.checkNow')}
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="card">
        <div className="card-title">{t('settings.data.title')}</div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settings.data.exportSettings')}</span>
            <span className="setting-description">{t('settings.data.exportSettingsDesc')}</span>
          </div>
          <button className="btn btn-secondary" onClick={exportSettings}>
            {t('settings.data.exportBtn')}
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settings.data.importSettings')}</span>
            <span className="setting-description">{t('settings.data.importSettingsDesc')}</span>
          </div>
          <button className="btn btn-secondary" onClick={importSettings}>
            {t('settings.data.importBtn')}
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settings.data.resetOnboarding')}</span>
            <span className="setting-description">{t('settings.data.resetOnboardingDesc')}</span>
          </div>
          <button className="btn btn-secondary" onClick={resetOnboarding}>
            {t('settings.data.resetBtn')}
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settings.data.diagnostics')}</span>
            <span className="setting-description">{t('settings.data.diagnosticsDesc')}</span>
          </div>
          <button className="btn btn-secondary" onClick={showDiagnosticsInfo}>
            {t('settings.data.showDiagnostics')}
          </button>
        </div>
      </div>

      {/* Diagnostics Panel */}
      {showDiagnostics && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title" style={{ margin: 0 }}>{t('settings.data.diagnosticsTitle')}</div>
            <button className="btn btn-secondary btn-small" onClick={() => setShowDiagnostics(false)}>
              {t('common.close')}
            </button>
          </div>
          <pre className="diagnostics-output">{diagnosticsText}</pre>
          <button
            className="btn btn-secondary"
            style={{ marginTop: '8px' }}
            onClick={() => navigator.clipboard.writeText(diagnosticsText)}
          >
            {t('settings.data.copyClipboard')}
          </button>
        </div>
      )}

      {/* Custom Speech API */}
      <div className="card">
        <div className="card-title">{t('settings.customSpeechApi.title')}</div>
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settings.customSpeechApi.enabled')}</span>
            <span className="setting-description">{t('settings.customSpeechApi.enabledDesc')}</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={customSpeechApiEnabled} onChange={e => { setCustomSpeechApiEnabled(e.target.checked); saveSetting('customSpeechApiEnabled', e.target.checked); }} />
            <span className="toggle-slider" />
          </label>
        </div>
        {customSpeechApiEnabled && (
          <>
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-name">{t('settings.customSpeechApi.type')}</span>
                <span className="setting-description">{t('settings.customSpeechApi.typeDesc')}</span>
              </div>
              <select className="select" value={customSpeechApiType} onChange={e => { setCustomSpeechApiType(e.target.value as 'http' | 'websocket'); saveSetting('customSpeechApiType', e.target.value); }}>
                <option value="http">{t('settings.customSpeechApi.typeHttp')}</option>
                <option value="websocket">{t('settings.customSpeechApi.typeWebSocket')}</option>
              </select>
            </div>
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-name">{t('settings.customSpeechApi.url')}</span>
                <span className="setting-description">{t('settings.customSpeechApi.urlDesc')}</span>
              </div>
              <input
                type="text"
                className="input"
                value={customSpeechApiUrl}
                placeholder={t('settings.customSpeechApi.urlPlaceholder')}
                onChange={e => setCustomSpeechApiUrl(e.target.value)}
                onBlur={e => saveSetting('customSpeechApiUrl', e.target.value)}
              />
            </div>
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-name">{t('settings.customSpeechApi.apiKey')}</span>
                <span className="setting-description">{t('settings.customSpeechApi.apiKeyDesc')}</span>
              </div>
              <input
                type="password"
                className="input"
                value={customSpeechApiKey}
                placeholder={t('settings.customSpeechApi.apiKeyPlaceholder')}
                onChange={e => setCustomSpeechApiKey(e.target.value)}
                onBlur={e => saveSetting('customSpeechApiKey', e.target.value)}
              />
            </div>
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-name">{t('settings.customSpeechApi.testConnection')}</span>
                {connectionStatus === 'connected' && <span className="badge badge-success">{t('settings.customSpeechApi.connected')}</span>}
                {connectionStatus === 'failed' && <span className="badge badge-danger">{t('settings.customSpeechApi.connectionFailed')}</span>}
              </div>
              <button
                className="btn btn-secondary"
                disabled={isTestingConnection || !customSpeechApiUrl}
                onClick={async () => {
                  setIsTestingConnection(true);
                  setConnectionStatus('idle');
                  try {
                    const result = await window.voiceink?.customSpeechApi?.testConnection?.({
                      url: customSpeechApiUrl,
                      apiKey: customSpeechApiKey,
                      type: customSpeechApiType,
                    });
                    setConnectionStatus(result ? 'connected' : 'failed');
                  } catch {
                    setConnectionStatus('failed');
                  }
                  setIsTestingConnection(false);
                }}
              >
                {isTestingConnection ? t('settings.customSpeechApi.testing') : t('settings.customSpeechApi.testConnection')}
              </button>
            </div>
          </>
        )}
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
