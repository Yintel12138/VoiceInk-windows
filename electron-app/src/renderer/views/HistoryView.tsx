/**
 * HistoryView - Displays transcription history.
 * Mirrors VoiceInk/Views/History/ views.
 *
 * Features:
 * - Search/filter
 * - Pagination (Load More)
 * - Multi-select with checkboxes
 * - Selection toolbar (Select All / Deselect All)
 * - Bulk delete
 * - Export to CSV
 * - 3-column layout with detail panel
 * - Column toggles (date, duration, model, power mode)
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Transcription } from '../../shared/models/transcription';

const PAGE_SIZE = 20;

export const HistoryView: React.FC = () => {
  const { t } = useTranslation();
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showDate, setShowDate] = useState(true);
  const [showDuration, setShowDuration] = useState(true);
  const [showModel, setShowModel] = useState(true);
  const [showPowerMode, setShowPowerMode] = useState(true);

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
        setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      }
    } catch (err) {
      console.error('Failed to delete transcription:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = selectedIds.size > 5
      ? window.confirm(`Delete ${selectedIds.size} transcriptions?`)
      : true;
    if (!confirmed) return;
    for (const id of selectedIds) {
      try {
        if (window.voiceink?.transcriptions?.delete) {
          await window.voiceink.transcriptions.delete(id);
        }
      } catch { /* continue */ }
    }
    setTranscriptions(prev => prev.filter(t => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
    setSelectedId(null);
  };

  const filteredTranscriptions = useMemo(() => {
    if (!searchQuery.trim()) return transcriptions;
    const q = searchQuery.toLowerCase();
    return transcriptions.filter(t =>
      (t.text?.toLowerCase().includes(q)) ||
      (t.enhancedText?.toLowerCase().includes(q)) ||
      (t.transcriptionModelName?.toLowerCase().includes(q)) ||
      (t.powerModeName?.toLowerCase().includes(q))
    );
  }, [transcriptions, searchQuery]);

  const displayedTranscriptions = useMemo(() =>
    filteredTranscriptions.slice(0, displayCount),
    [filteredTranscriptions, displayCount]
  );

  const hasMore = displayCount < filteredTranscriptions.length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }, []);

  const selectAll = () => {
    setSelectedIds(new Set(displayedTranscriptions.map(t => t.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const exportCSV = () => {
    const headers = ['Date', 'Text', 'Enhanced Text', 'Duration (s)', 'Model', 'Power Mode'];
    const rows = filteredTranscriptions.map(t => [
      t.timestamp,
      `"${(t.text || '').replace(/"/g, '""')}"`,
      `"${(t.enhancedText || '').replace(/"/g, '""')}"`,
      String(t.duration || 0),
      t.transcriptionModelName || '',
      t.powerModeName || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceink-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <div className="empty-state-text">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="view-title">{t('history.title')}</h1>
            <p className="view-subtitle">
              {searchQuery
                ? t('history.subtitleSearch', { query: searchQuery })
                : t('history.subtitle_other', { count: filteredTranscriptions.length })
              }
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={exportCSV} disabled={transcriptions.length === 0}>
              {t('history.exportCSV')}
            </button>
            <button
              className={`btn ${isMultiSelectMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setIsMultiSelectMode(!isMultiSelectMode); setSelectedIds(new Set()); }}
            >
              {isMultiSelectMode ? t('history.done') : t('history.select')}
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          placeholder={t('history.searchPlaceholder')}
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setDisplayCount(PAGE_SIZE); }}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {/* Column Toggles */}
      <div className="column-toggles">
        <label className="column-toggle">
          <input type="checkbox" checked={showDate} onChange={() => setShowDate(!showDate)} /> {t('history.columns.date')}
        </label>
        <label className="column-toggle">
          <input type="checkbox" checked={showDuration} onChange={() => setShowDuration(!showDuration)} /> {t('history.columns.duration')}
        </label>
        <label className="column-toggle">
          <input type="checkbox" checked={showModel} onChange={() => setShowModel(!showModel)} /> {t('history.columns.model')}
        </label>
        <label className="column-toggle">
          <input type="checkbox" checked={showPowerMode} onChange={() => setShowPowerMode(!showPowerMode)} /> {t('history.columns.powerMode')}
        </label>
      </div>

      {/* Selection Toolbar */}
      {isMultiSelectMode && (
        <div className="selection-toolbar">
          <div className="selection-count">{t('history.selected', { count: selectedIds.size })}</div>
          <button className="btn btn-secondary btn-small" onClick={selectAll}>{t('history.selectAll')}</button>
          <button className="btn btn-secondary btn-small" onClick={deselectAll}>{t('history.deselectAll')}</button>
          {selectedIds.size > 0 && (
            <button className="btn btn-danger btn-small" onClick={handleBulkDelete}>
              {t('history.deleteSelected')}
            </button>
          )}
        </div>
      )}

      {filteredTranscriptions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">
            {searchQuery ? t('history.emptySearch', { query: searchQuery }) : t('history.empty')}
          </div>
        </div>
      ) : (
        <div className="history-layout">
          <div className="history-list">
            {displayedTranscriptions.map((t) => (
              <div
                key={t.id}
                className={`history-item ${t.id === selectedId ? 'active' : ''}`}
                onClick={() => {
                  if (isMultiSelectMode) {
                    toggleSelect(t.id);
                  } else {
                    setSelectedId(t.id === selectedId ? null : t.id);
                  }
                }}
              >
                {isMultiSelectMode && (
                  <input
                    type="checkbox"
                    className="history-checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    onClick={e => e.stopPropagation()}
                  />
                )}
                <div className="history-item-content">
                  <div className="history-item-text">
                    {t.enhancedText || t.text || 'Empty transcription'}
                  </div>
                  <div className="history-item-meta">
                    {showDate && <span>{formatDate(t.timestamp)}</span>}
                    {showDuration && t.duration > 0 && <span>{formatDuration(t.duration)}</span>}
                    {showModel && t.transcriptionModelName && <span>🤖 {t.transcriptionModelName}</span>}
                    {showPowerMode && t.powerModeName && (
                      <span>{t.powerModeEmoji} {t.powerModeName}</span>
                    )}
                    {t.enhancedText && <span className="badge badge-accent">✨ Enhanced</span>}
                  </div>
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <button
                className="btn btn-secondary load-more-btn"
                onClick={() => setDisplayCount(prev => prev + PAGE_SIZE)}
              >
                Load More ({filteredTranscriptions.length - displayCount} remaining)
              </button>
            )}
          </div>

          {/* Detail Panel */}
          {selected && !isMultiSelectMode && (
            <div className="history-detail">
              <div className="card">
                <div className="card-title">{t('history.details.title')}</div>
                <div className="detail-section">
                  <div className="detail-label">{t('history.details.originalText')}</div>
                  <div className="detail-text">{selected.text || '—'}</div>
                </div>
                {selected.enhancedText && (
                  <div className="detail-section">
                    <div className="detail-label">{t('history.details.enhancedText')}</div>
                    <div className="detail-text">{selected.enhancedText}</div>
                  </div>
                )}
                <div className="detail-meta">
                  <div><strong>{t('history.details.date')}</strong> {formatDate(selected.timestamp)}</div>
                  {selected.duration > 0 && <div><strong>{t('history.details.duration')}</strong> {formatDuration(selected.duration)}</div>}
                  {selected.transcriptionModelName && <div><strong>{t('history.details.model')}</strong> {selected.transcriptionModelName}</div>}
                  {selected.powerModeName && <div><strong>{t('history.details.powerMode')}</strong> {selected.powerModeEmoji} {selected.powerModeName}</div>}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => navigator.clipboard.writeText(selected.enhancedText || selected.text)}
                  >
                    {t('history.details.copy')}
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>
                    {t('history.details.delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
