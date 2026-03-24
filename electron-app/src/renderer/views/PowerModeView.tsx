/**
 * PowerModeView - Context-aware automation configurations.
 * Mirrors VoiceInk/Views/PowerMode/ views.
 *
 * Features:
 * - Power mode configuration list with backend persistence
 * - Add/edit/delete power modes
 * - Drag-to-reorder
 * - Emoji assignment
 * - App-specific modes
 * - Default/disabled badges
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { PowerModeConfig } from '../../shared/types';

declare global {
  interface Window {
    voiceink: {
      powerMode: {
        getConfigs: () => Promise<PowerModeConfig[]>;
        saveConfig: (config: PowerModeConfig) => Promise<PowerModeConfig>;
        deleteConfig: (id: string) => Promise<boolean>;
        toggleEnabled: (id: string) => Promise<boolean>;
        reorder: (orderedIds: string[]) => Promise<boolean>;
      };
    };
  }
}

const EMOJI_OPTIONS = ['⚡', '💼', '✍️', '💻', '📝', '🎯', '🔬', '📊', '🎨', '🎓', '💡', '🚀', '🤖', '📧', '🎵', '📱'];

export const PowerModeView: React.FC = () => {
  const { t } = useTranslation();
  const [configs, setConfigs] = useState<PowerModeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReordering, setIsReordering] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PowerModeConfig | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('⚡');
  const [newAppIdentifier, setNewAppIdentifier] = useState('');
  const [newUrlPattern, setNewUrlPattern] = useState('');
  const [newLanguage, setNewLanguage] = useState('en');

  // Load configs from backend on mount
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const loadedConfigs = await window.voiceink.powerMode.getConfigs();
      setConfigs(loadedConfigs);
    } catch (err) {
      console.error('Failed to load power mode configs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addConfig = useCallback(async () => {
    if (!newName.trim()) return;
    const config: PowerModeConfig = {
      id: Date.now().toString(),
      name: newName.trim(),
      emoji: newEmoji,
      appIdentifier: newAppIdentifier.trim() || undefined,
      urlPattern: newUrlPattern.trim() || undefined,
      languageCode: newLanguage,
      isEnabled: true,
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await window.voiceink.powerMode.saveConfig(config);
      setConfigs(prev => [...prev, saved]);
      resetForm();
    } catch (err) {
      console.error('Failed to save power mode config:', err);
    }
  }, [newName, newEmoji, newAppIdentifier, newUrlPattern, newLanguage]);

  const deleteConfig = useCallback(async (id: string) => {
    try {
      const success = await window.voiceink.powerMode.deleteConfig(id);
      if (success) {
        setConfigs(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete power mode config:', err);
    }
  }, []);

  const toggleConfig = useCallback(async (id: string) => {
    try {
      const newEnabled = await window.voiceink.powerMode.toggleEnabled(id);
      setConfigs(prev => prev.map(c =>
        c.id === id ? { ...c, isEnabled: newEnabled } : c
      ));
    } catch (err) {
      console.error('Failed to toggle power mode config:', err);
    }
  }, []);

  const moveConfig = useCallback((index: number, direction: 'up' | 'down') => {
    const newList = [...configs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;

    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    setConfigs(newList);

    // Save reorder to backend
    const orderedIds = newList.map(c => c.id);
    window.voiceink.powerMode.reorder(orderedIds).catch((err) => {
      console.error('Failed to reorder power mode configs:', err);
    });
  }, [configs]);

  const startEdit = (config: PowerModeConfig) => {
    setEditingConfig(config);
    setNewName(config.name);
    setNewEmoji(config.emoji);
    setNewAppIdentifier(config.appIdentifier || '');
    setNewUrlPattern(config.urlPattern || '');
    setNewLanguage(config.languageCode || 'en');
    setShowAddForm(true);
  };

  const saveEdit = async () => {
    if (!editingConfig || !newName.trim()) return;

    const updated: PowerModeConfig = {
      ...editingConfig,
      name: newName.trim(),
      emoji: newEmoji,
      appIdentifier: newAppIdentifier.trim() || undefined,
      urlPattern: newUrlPattern.trim() || undefined,
      languageCode: newLanguage,
    };

    try {
      const saved = await window.voiceink.powerMode.saveConfig(updated);
      setConfigs(prev => prev.map(c => c.id === saved.id ? saved : c));
      resetForm();
    } catch (err) {
      console.error('Failed to update power mode config:', err);
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingConfig(null);
    setNewName('');
    setNewEmoji('⚡');
    setNewAppIdentifier('');
    setNewUrlPattern('');
    setNewLanguage('en');
  };

  if (isLoading) {
    return (
      <div className="view-container">
        <div className="view-header">
          <h1 className="view-title">{t('powerMode.title')}</h1>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-text">Loading power modes...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="view-title">{t('powerMode.title')}</h1>
            <p className="view-subtitle">
              {t('powerMode.subtitle')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {configs.length > 1 && (
              <button
                className="btn btn-secondary"
                onClick={() => setIsReordering(!isReordering)}
              >
                {isReordering ? '✓ Done' : '↕ Reorder'}
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => { resetForm(); setShowAddForm(true); }}
            >
              + Add Power Mode
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="card">
          <div className="card-title">
            {editingConfig ? 'Edit Power Mode' : 'New Power Mode'}
          </div>

          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Name</span>
            </div>
            <input
              className="input"
              style={{ maxWidth: '300px' }}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g., Code Editor, Email, Chat"
            />
          </div>

          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Emoji</span>
            </div>
            <div className="emoji-picker">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  className={`emoji-option ${newEmoji === emoji ? 'selected' : ''}`}
                  onClick={() => setNewEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">App Identifier</span>
              <span className="setting-description">
                Application name or bundle ID to auto-activate this mode
              </span>
            </div>
            <input
              className="input"
              style={{ maxWidth: '300px' }}
              value={newAppIdentifier}
              onChange={e => setNewAppIdentifier(e.target.value)}
              placeholder="e.g., Visual Studio Code"
            />
          </div>

          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">URL Pattern</span>
              <span className="setting-description">
                Browser URL pattern to auto-activate this mode
              </span>
            </div>
            <input
              className="input"
              style={{ maxWidth: '300px' }}
              value={newUrlPattern}
              onChange={e => setNewUrlPattern(e.target.value)}
              placeholder="e.g., github.com, docs.google.com"
            />
          </div>

          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Language</span>
            </div>
            <select
              className="select"
              value={newLanguage}
              onChange={e => setNewLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="zh">Chinese</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={editingConfig ? saveEdit : addConfig}>
              {editingConfig ? 'Save Changes' : 'Add Power Mode'}
            </button>
            <button className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Configurations Grid/List */}
      {configs.length === 0 && !showAddForm ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <div className="empty-state-text">No Power Modes Yet</div>
            <p className="empty-state-description">
              Create power modes to automatically adjust transcription settings
              based on your active application or browser URL.
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => { resetForm(); setShowAddForm(true); }}
            >
              + Create Your First Power Mode
            </button>
          </div>
        </div>
      ) : (
        <div className="power-mode-grid">
          {configs.map((config, index) => (
            <div
              key={config.id}
              className={`power-mode-card ${!config.isEnabled ? 'disabled' : ''}`}
            >
              <div className="power-mode-header">
                <div className="power-mode-emoji">{config.emoji}</div>
                <div className="power-mode-info">
                  <div className="power-mode-name">{config.name}</div>
                  <div className="power-mode-badges">
                    {index === 0 && config.isEnabled && (
                      <span className="badge badge-accent">Default</span>
                    )}
                    {!config.isEnabled && (
                      <span className="badge badge-outline">Disabled</span>
                    )}
                  </div>
                </div>
                <div className="power-mode-actions">
                  {isReordering ? (
                    <>
                      <button
                        className="btn-icon"
                        onClick={() => moveConfig(index, 'up')}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => moveConfig(index, 'down')}
                        disabled={index === configs.length - 1}
                      >
                        ↓
                      </button>
                    </>
                  ) : (
                    <>
                      <label className="toggle-switch toggle-small">
                        <input
                          type="checkbox"
                          checked={config.isEnabled}
                          onChange={() => toggleConfig(config.id)}
                        />
                        <span className="toggle-slider" />
                      </label>
                      <button className="btn-icon" onClick={() => startEdit(config)}>
                        ✏️
                      </button>
                      <button className="btn-icon" onClick={() => deleteConfig(config.id)}>
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
              {config.appIdentifier && (
                <div className="power-mode-detail">
                  <span className="detail-label">App:</span> {config.appIdentifier}
                </div>
              )}
              {config.urlPattern && (
                <div className="power-mode-detail">
                  <span className="detail-label">URL:</span> {config.urlPattern}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
