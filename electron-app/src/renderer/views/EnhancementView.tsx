/**
 * EnhancementView - AI Enhancement settings.
 * Mirrors VoiceInk/Views/EnhancementSettingsView.swift.
 */
import React, { useState, useEffect } from 'react';

export const EnhancementView: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (window.voiceink?.settings?.get) {
        const enabled = await window.voiceink.settings.get('isEnhancementEnabled');
        setIsEnabled(enabled as boolean);
      }
    } catch (err) {
      console.error('Failed to load enhancement settings:', err);
    }
  };

  const toggleEnhancement = async () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    try {
      if (window.voiceink?.settings?.set) {
        await window.voiceink.settings.set('isEnhancementEnabled', newValue);
      }
    } catch (err) {
      console.error('Failed to toggle enhancement:', err);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">AI Enhancement</h1>
        <p className="view-subtitle">
          Configure AI-powered text enhancement after transcription
        </p>
      </div>

      <div className="card">
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Enable AI Enhancement</span>
            <span className="setting-description">
              Enhance transcribed text using AI before pasting
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={toggleEnhancement}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {isEnabled && (
        <>
          <div className="card">
            <div className="card-title">AI Provider</div>
            <div className="empty-state">
              <div className="empty-state-text">
                AI provider configuration will be available in a future update.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Enhancement Prompts</div>
            <div className="empty-state">
              <div className="empty-state-text">
                Custom prompt management will be available in a future update.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
