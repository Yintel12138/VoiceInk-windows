/**
 * DictionaryView - Custom vocabulary and word replacement management.
 * Mirrors VoiceInk/Views/Dictionary/ views.
 *
 * Features:
 * - Hero section with description
 * - Tab switcher (Vocabulary / Replacements)
 * - Add/delete/edit words and replacements
 * - Import from JSON file
 * - Export to JSON
 * - Search/filter
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { VocabularyWord, WordReplacement } from '../../shared/models/dictionary';

export const DictionaryView: React.FC = () => {
  const { t } = useTranslation();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [replacements, setReplacements] = useState<WordReplacement[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newOriginal, setNewOriginal] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [activeTab, setActiveTab] = useState<'words' | 'replacements'>('words');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingReplacementId, setEditingReplacementId] = useState<string | null>(null);
  const [editOriginal, setEditOriginal] = useState('');
  const [editReplacement, setEditReplacement] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (window.voiceink?.dictionary) {
        const [w, r] = await Promise.all([
          window.voiceink.dictionary.getWords(),
          window.voiceink.dictionary.getReplacements(),
        ]);
        setWords(w as VocabularyWord[]);
        setReplacements(r as WordReplacement[]);
      }
    } catch (err) {
      console.error('Failed to load dictionary:', err);
    }
  };

  const handleAddWord = useCallback(async () => {
    if (!newWord.trim()) return;
    try {
      if (window.voiceink?.dictionary?.addWord) {
        const word = await window.voiceink.dictionary.addWord(newWord.trim());
        setWords((prev) => [...prev, word as VocabularyWord]);
        setNewWord('');
      }
    } catch (err) {
      console.error('Failed to add word:', err);
    }
  }, [newWord]);

  const handleDeleteWord = useCallback(async (id: string) => {
    try {
      if (window.voiceink?.dictionary?.deleteWord) {
        await window.voiceink.dictionary.deleteWord(id);
        setWords((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete word:', err);
    }
  }, []);

  const handleAddReplacement = useCallback(async () => {
    if (!newOriginal.trim() || !newReplacement.trim()) return;
    try {
      if (window.voiceink?.dictionary?.addReplacement) {
        const rep = await window.voiceink.dictionary.addReplacement(
          newOriginal.trim(),
          newReplacement.trim()
        );
        setReplacements((prev) => [...prev, rep as WordReplacement]);
        setNewOriginal('');
        setNewReplacement('');
      }
    } catch (err) {
      console.error('Failed to add replacement:', err);
    }
  }, [newOriginal, newReplacement]);

  const handleDeleteReplacement = useCallback(async (id: string) => {
    try {
      if (window.voiceink?.dictionary?.deleteReplacement) {
        await window.voiceink.dictionary.deleteReplacement(id);
        setReplacements((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete replacement:', err);
    }
  }, []);

  const startEditReplacement = useCallback((r: WordReplacement) => {
    setEditingReplacementId(r.id);
    setEditOriginal(r.original);
    setEditReplacement(r.replacement);
  }, []);

  const saveEditReplacement = useCallback(async () => {
    if (!editingReplacementId || !editOriginal.trim() || !editReplacement.trim()) return;
    // Delete old and add new (since the API may not have an update endpoint)
    try {
      if (window.voiceink?.dictionary?.deleteReplacement) {
        await window.voiceink.dictionary.deleteReplacement(editingReplacementId);
      }
      if (window.voiceink?.dictionary?.addReplacement) {
        const rep = await window.voiceink.dictionary.addReplacement(editOriginal.trim(), editReplacement.trim());
        setReplacements(prev => prev.map(r =>
          r.id === editingReplacementId ? (rep as WordReplacement) : r
        ));
      }
    } catch (err) {
      console.error('Failed to edit replacement:', err);
    }
    setEditingReplacementId(null);
  }, [editingReplacementId, editOriginal, editReplacement]);

  const handleExport = useCallback(async () => {
    try {
      if (window.voiceink?.dictionary?.export) {
        const json = await window.voiceink.dictionary.export();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'voiceink-dictionary.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export dictionary:', err);
    }
  }, []);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (window.voiceink?.dictionary?.import) {
        await window.voiceink.dictionary.import(text);
        await loadData();
      }
    } catch (err) {
      console.error('Failed to import dictionary:', err);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const filteredWords = useMemo(() => {
    if (!searchQuery) return words;
    const q = searchQuery.toLowerCase();
    return words.filter(w => w.word.toLowerCase().includes(q));
  }, [words, searchQuery]);

  const filteredReplacements = useMemo(() => {
    if (!searchQuery) return replacements;
    const q = searchQuery.toLowerCase();
    return replacements.filter(r =>
      r.original.toLowerCase().includes(q) || r.replacement.toLowerCase().includes(q)
    );
  }, [replacements, searchQuery]);

  return (
    <div className="view-container">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      <div className="view-header">
        <h1 className="view-title">{t('dictionary.title')}</h1>
        <p className="view-subtitle">
          {t('dictionary.subtitle')}
        </p>
      </div>

      {/* Hero Section */}
      <div className="card hero-card">
        <div className="hero-content">
          <div className="hero-icon">📖</div>
          <div className="hero-text">
            <h3>{t('dictionary.heroTitle')}</h3>
            <p>{t('dictionary.heroDesc')}</p>
          </div>
        </div>
      </div>

      {/* Tab switcher & action buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'words' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('words')}
        >
          {t('dictionary.vocabulary', { count: words.length })}
        </button>
        <button
          className={`btn ${activeTab === 'replacements' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('replacements')}
        >
          {t('dictionary.replacements', { count: replacements.length })}
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={handleImport}>
          📥 {t('common.import')}
        </button>
        <button className="btn btn-secondary" onClick={handleExport}>
          📤 {t('common.export')}
        </button>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: '16px' }}>
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          placeholder={activeTab === 'words' ? t('dictionary.searchVocab') : t('dictionary.searchReplacements')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {activeTab === 'words' ? (
        <div className="card">
          <div className="card-title">
            {t('dictionary.customVocab', { count: filteredWords.length })}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              className="input"
              placeholder={t('dictionary.addWord')}
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
            />
            <button className="btn btn-primary" onClick={handleAddWord} disabled={!newWord.trim()}>
              {t('dictionary.addBtn')}
            </button>
          </div>

          {filteredWords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-text">
                {searchQuery ? t('dictionary.noMatchingWords') : t('dictionary.noWords')}
              </div>
            </div>
          ) : (
            <div className="word-chips">
              {filteredWords.map((w) => (
                <div key={w.id} className="word-chip">
                  <span className="word-chip-text">{w.word}</span>
                  <button
                    className="word-chip-delete"
                    onClick={() => handleDeleteWord(w.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="card-title">
            {t('dictionary.wordReplacements', { count: filteredReplacements.length })}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
            <input
              className="input"
              placeholder={t('dictionary.originalWord')}
              value={newOriginal}
              onChange={(e) => setNewOriginal(e.target.value)}
            />
            <span className="replacement-arrow">→</span>
            <input
              className="input"
              placeholder={t('dictionary.replacement')}
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddReplacement()}
            />
            <button
              className="btn btn-primary"
              onClick={handleAddReplacement}
              disabled={!newOriginal.trim() || !newReplacement.trim()}
            >
              {t('dictionary.addBtn')}
            </button>
          </div>

          {filteredReplacements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔄</div>
              <div className="empty-state-text">
                {searchQuery ? t('dictionary.noMatchingReplacements') : t('dictionary.noReplacements')}
              </div>
            </div>
          ) : (
            <div className="replacement-list">
              {filteredReplacements.map((r) => (
                <div key={r.id} className="replacement-item">
                  {editingReplacementId === r.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                      <input
                        className="input"
                        value={editOriginal}
                        onChange={e => setEditOriginal(e.target.value)}
                      />
                      <span className="replacement-arrow">→</span>
                      <input
                        className="input"
                        value={editReplacement}
                        onChange={e => setEditReplacement(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveEditReplacement()}
                      />
                      <button className="btn btn-primary btn-small" onClick={saveEditReplacement}>
                        {t('dictionary.saveBtn')}
                      </button>
                      <button className="btn btn-secondary btn-small" onClick={() => setEditingReplacementId(null)}>
                        {t('dictionary.cancelBtn')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="replacement-content">
                        <span className="replacement-original">{r.original}</span>
                        <span className="replacement-arrow">→</span>
                        <span className="replacement-target">{r.replacement}</span>
                      </div>
                      <div className="replacement-actions">
                        <button
                          className="btn-icon btn-icon-small"
                          onClick={() => startEditReplacement(r)}
                          title={t('dictionary.editTitle')}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon btn-icon-small"
                          onClick={() => handleDeleteReplacement(r.id)}
                          title={t('dictionary.deleteTitle')}
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
