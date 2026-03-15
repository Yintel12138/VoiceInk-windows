/**
 * DictionaryView - Custom vocabulary and word replacement management.
 * Mirrors VoiceInk/Views/Dictionary/ views.
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { VocabularyWord, WordReplacement } from '../../shared/models/dictionary';

export const DictionaryView: React.FC = () => {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [replacements, setReplacements] = useState<WordReplacement[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newOriginal, setNewOriginal] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [activeTab, setActiveTab] = useState<'words' | 'replacements'>('words');

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

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Dictionary</h1>
        <p className="view-subtitle">
          Custom vocabulary and automatic word replacements
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={`btn ${activeTab === 'words' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('words')}
        >
          Vocabulary Words
        </button>
        <button
          className={`btn ${activeTab === 'replacements' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('replacements')}
        >
          Word Replacements
        </button>
        <button className="btn btn-secondary" onClick={handleExport} style={{ marginLeft: 'auto' }}>
          📤 Export
        </button>
      </div>

      {activeTab === 'words' ? (
        <div className="card">
          <div className="card-title">
            Custom Vocabulary ({words.length} words)
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              className="input"
              placeholder="Add a custom word..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
            />
            <button className="btn btn-primary" onClick={handleAddWord}>
              Add
            </button>
          </div>

          {words.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">
                No custom words yet. Add words to improve transcription accuracy.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {words.map((w) => (
                <div
                  key={w.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: 'var(--bg-hover)',
                    borderRadius: 'var(--radius)',
                    fontSize: '14px',
                  }}
                >
                  <span>{w.word}</span>
                  <button
                    onClick={() => handleDeleteWord(w.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                    }}
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
            Word Replacements ({replacements.length} rules)
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              className="input"
              placeholder="Original word..."
              value={newOriginal}
              onChange={(e) => setNewOriginal(e.target.value)}
            />
            <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>→</span>
            <input
              className="input"
              placeholder="Replacement..."
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddReplacement()}
            />
            <button className="btn btn-primary" onClick={handleAddReplacement}>
              Add
            </button>
          </div>

          {replacements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">
                No replacement rules. Add rules to automatically replace words in
                transcriptions.
              </div>
            </div>
          ) : (
            <div>
              {replacements.map((r) => (
                <div
                  key={r.id}
                  className="setting-row"
                  style={{ padding: '8px 0' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 500 }}>{r.original}</span>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <span style={{ color: 'var(--accent)' }}>{r.replacement}</span>
                  </div>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => handleDeleteReplacement(r.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
