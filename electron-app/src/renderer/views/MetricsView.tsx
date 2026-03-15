/**
 * MetricsView - Dashboard showing transcription statistics.
 * Mirrors VoiceInk/Views/MetricsView.swift.
 */
import React, { useState, useEffect } from 'react';
import type { Transcription } from '../../shared/models/transcription';

export const MetricsView: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTranscriptions();
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

  const totalTranscriptions = transcriptions.length;
  const totalDuration = transcriptions.reduce((sum, t) => sum + (t.duration || 0), 0);
  const totalWords = transcriptions.reduce(
    (sum, t) => sum + (t.text?.split(/\s+/).filter(Boolean).length || 0),
    0
  );
  const enhancedCount = transcriptions.filter((t) => t.enhancedText).length;

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{totalTranscriptions}</div>
          <div className="metric-label">Total Transcriptions</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{totalWords.toLocaleString()}</div>
          <div className="metric-label">Words Transcribed</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{formatDuration(totalDuration)}</div>
          <div className="metric-label">Total Recording Time</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{enhancedCount}</div>
          <div className="metric-label">AI Enhanced</div>
        </div>
      </div>

      {totalTranscriptions === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🎙️</div>
          <div className="empty-state-text">
            No transcriptions yet. Start recording to see your stats here.
          </div>
        </div>
      )}
    </div>
  );
};
