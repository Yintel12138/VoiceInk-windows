/**
 * MetricsView - Dashboard showing transcription statistics.
 * Mirrors VoiceInk/Views/MetricsView.swift with MetricsContent,
 * DashboardPromotionsSection, and HelpAndResourcesSection.
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { Transcription } from '../../shared/models/transcription';

export const MetricsView: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appVersion, setAppVersion] = useState('');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
  const [isLicenseActive] = useState(false);
  const [trialDaysRemaining] = useState(7);

  useEffect(() => {
    loadTranscriptions();
    loadAppInfo();
  }, []);

  const loadTranscriptions = async () => {
    try {
      if (window.voiceink?.transcriptions?.list) {
        const data = await window.voiceink.transcriptions.list();
        setTranscriptions(data as Transcription[]);
      }
    } catch (err) {
      console.error('Failed to load transcriptions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAppInfo = async () => {
    try {
      if (window.voiceink?.app?.getVersion) {
        const v = await window.voiceink.app.getVersion();
        setAppVersion(v as string);
      }
      if (window.voiceink?.settings?.get) {
        const onboarded = await window.voiceink.settings.get('hasCompletedOnboarding');
        setHasCompletedOnboarding(onboarded as boolean);
      }
    } catch { /* ignore */ }
  };

  const navigateTo = useCallback((view: string) => {
    if (window.voiceink?.window?.navigate) {
      window.voiceink.window.navigate(view);
    }
  }, []);

  const totalTranscriptions = transcriptions.length;
  const totalDuration = transcriptions.reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalWords = transcriptions.reduce(
    (sum, t) => sum + (t.text?.split(/\s+/).filter(Boolean).length || 0),
    0
  );
  const enhancedCount = transcriptions.filter((t) => t.enhancedText).length;

  const avgWordsPerTranscription = totalTranscriptions > 0
    ? Math.round(totalWords / totalTranscriptions) : 0;
  const avgDurationPerTranscription = totalTranscriptions > 0
    ? totalDuration / totalTranscriptions : 0;

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${Math.round(seconds)}s`;
  };

  if (isLoading) {
    return (
      <div className="view-container">
        <div className="view-header">
          <h1 className="view-title">Dashboard</h1>
        </div>
        <div className="empty-state">
          <div className="empty-state-text">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Dashboard</h1>
        <p className="view-subtitle">Your transcription activity at a glance</p>
      </div>

      {/* Trial message banner */}
      {!isLicenseActive && (
        <div className={`trial-banner ${trialDaysRemaining <= 3 ? 'warning' : 'info'}`}>
          <div className="trial-banner-icon">
            {trialDaysRemaining <= 3 ? '⚠️' : 'ℹ️'}
          </div>
          <div className="trial-banner-text">
            {trialDaysRemaining <= 3
              ? `Trial expires in ${trialDaysRemaining} days — activate a license to keep Pro features.`
              : `${trialDaysRemaining} days remaining in your trial. Enjoy all Pro features!`
            }
          </div>
          <button className="btn btn-primary btn-small" onClick={() => navigateTo('license')}>
            Add License Key
          </button>
        </div>
      )}

      {/* Setup prompt for first-time users */}
      {!hasCompletedOnboarding && totalTranscriptions === 0 && (
        <div className="card setup-card">
          <div className="card-title">🚀 Get Started with VoiceInk</div>
          <div className="setup-steps">
            <div className="setup-step" onClick={() => navigateTo('permissions')}>
              <div className="setup-step-icon">🔒</div>
              <div className="setup-step-info">
                <div className="setup-step-title">1. Grant Permissions</div>
                <div className="setup-step-description">Allow microphone access and set up keyboard shortcuts</div>
              </div>
              <span className="setup-step-arrow">→</span>
            </div>
            <div className="setup-step" onClick={() => navigateTo('models')}>
              <div className="setup-step-icon">🤖</div>
              <div className="setup-step-info">
                <div className="setup-step-title">2. Download a Model</div>
                <div className="setup-step-description">Choose and download a transcription model</div>
              </div>
              <span className="setup-step-arrow">→</span>
            </div>
            <div className="setup-step" onClick={() => navigateTo('settings')}>
              <div className="setup-step-icon">⚙️</div>
              <div className="setup-step-info">
                <div className="setup-step-title">3. Configure Settings</div>
                <div className="setup-step-description">Set up hotkeys, language, and recording preferences</div>
              </div>
              <span className="setup-step-arrow">→</span>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📝</div>
          <div className="metric-value">{totalTranscriptions}</div>
          <div className="metric-label">Total Transcriptions</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-value">{totalWords.toLocaleString()}</div>
          <div className="metric-label">Words Transcribed</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-value">{formatDuration(totalDuration)}</div>
          <div className="metric-label">Total Recording Time</div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">✨</div>
          <div className="metric-value">{enhancedCount}</div>
          <div className="metric-label">AI Enhanced</div>
        </div>
      </div>

      {/* Performance Analysis */}
      {totalTranscriptions > 0 && (
        <div className="card">
          <div className="card-title">📈 Performance Analysis</div>
          <div className="analysis-grid">
            <div className="analysis-item">
              <div className="analysis-label">Avg. Words per Transcription</div>
              <div className="analysis-value">{avgWordsPerTranscription}</div>
            </div>
            <div className="analysis-item">
              <div className="analysis-label">Avg. Duration</div>
              <div className="analysis-value">{formatDuration(avgDurationPerTranscription)}</div>
            </div>
            <div className="analysis-item">
              <div className="analysis-label">Enhancement Rate</div>
              <div className="analysis-value">
                {totalTranscriptions > 0 ? Math.round((enhancedCount / totalTranscriptions) * 100) : 0}%
              </div>
            </div>
            <div className="analysis-item">
              <div className="analysis-label">Words per Minute</div>
              <div className="analysis-value">
                {totalDuration > 0 ? Math.round(totalWords / (totalDuration / 60)) : 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalTranscriptions === 0 && hasCompletedOnboarding && (
        <div className="empty-state">
          <div className="empty-state-icon">🎙️</div>
          <div className="empty-state-text">
            No transcriptions yet. Start recording to see your stats here.
          </div>
        </div>
      )}

      {/* Help & Resources */}
      <div className="card">
        <div className="card-title">💡 Help & Resources</div>
        <div className="help-links">
          <a
            className="help-link"
            href="#"
            onClick={() => window.voiceink?.app?.openExternal('https://voiceink.app/docs')}
          >
            <span className="help-link-icon">📖</span>
            <span className="help-link-text">Documentation</span>
            <span className="help-link-arrow">→</span>
          </a>
          <a
            className="help-link"
            href="#"
            onClick={() => window.voiceink?.app?.openExternal('https://voiceink.app/support')}
          >
            <span className="help-link-icon">💬</span>
            <span className="help-link-text">Support</span>
            <span className="help-link-arrow">→</span>
          </a>
          <a
            className="help-link"
            href="#"
            onClick={() => window.voiceink?.app?.openExternal('https://voiceink.app/changelog')}
          >
            <span className="help-link-icon">📋</span>
            <span className="help-link-text">What&apos;s New</span>
            <span className="help-link-arrow">→</span>
          </a>
          <a
            className="help-link"
            href="#"
            onClick={() => window.voiceink?.app?.openExternal('mailto:support@voiceink.app')}
          >
            <span className="help-link-icon">✉️</span>
            <span className="help-link-text">Email Support</span>
            <span className="help-link-arrow">→</span>
          </a>
        </div>
      </div>

      {appVersion && (
        <div className="app-version-footer">
          VoiceInk v{appVersion}
        </div>
      )}
    </div>
  );
};
