/**
 * HistoryView - Displays transcription history.
 * Mirrors VoiceInk/Views/History/ views.
 */
import React, { useState, useEffect } from 'react';
import type { Transcription } from '../../shared/models/transcription';

export const HistoryView: React.FC = () => {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    try {
      if (window.voiceink?.transcriptions?.delete) {
        await window.voiceink.transcriptions.delete(id);
        setTranscriptions((prev) => prev.filter((t) => t.id !== id));
        if (selectedId === id) setSelectedId(null);
      }
    } catch (err) {
      console.error('Failed to delete transcription:', err);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const selected = transcriptions.find((t) => t.id === selectedId);

  if (isLoading) {
    return (
      <div className="view-container">
        <div className="empty-state">
          <div className="empty-state-text">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Transcription History</h1>
        <p className="view-subtitle">{transcriptions.length} transcriptions</p>
      </div>

      {transcriptions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">
            No transcriptions yet. Start recording to build your history.
          </div>
        </div>
      ) : (
        <div className="history-list">
          {transcriptions.map((t) => (
            <div
              key={t.id}
              className="history-item"
              onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
              style={
                t.id === selectedId
                  ? { borderColor: 'var(--accent)', backgroundColor: 'var(--bg-hover)' }
                  : undefined
              }
            >
              <div className="history-item-text">
                {t.enhancedText || t.text || 'Empty transcription'}
              </div>
              <div className="history-item-meta">
                <span>{formatDate(t.timestamp)}</span>
                {t.duration > 0 && <span>{formatDuration(t.duration)}</span>}
                {t.transcriptionModelName && <span>Model: {t.transcriptionModelName}</span>}
                {t.powerModeName && (
                  <span>
                    {t.powerModeEmoji} {t.powerModeName}
                  </span>
                )}
              </div>

              {t.id === selectedId && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(t.enhancedText || t.text);
                    }}
                  >
                    📋 Copy
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(t.id);
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
