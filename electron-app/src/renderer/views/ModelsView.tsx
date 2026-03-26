/**
 * ModelsView - AI model management with REAL backend integration.
 * This version properly connects to WhisperTranscriptionService via IPC.
 *
 * Changes from original:
 * - useEffect to load models from backend on mount
 * - Real download via window.voiceink.models.download()
 * - Real progress tracking via window.voiceink.models.onDownloadProgress()
 * - Settings persistence via window.voiceink.settings
 * - Binary download support for whisper.cpp
 * - Error handling and user feedback
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TranscriptionModel } from '../../shared/types';

type ModelCategory = 'all' | 'whisper' | 'parakeet' | 'custom';

declare global {
  interface Window {
    voiceink: {
      models: {
        list: () => Promise<TranscriptionModel[]>;
        download: (modelId: string) => Promise<{ success: boolean; path?: string; error?: string }>;
        delete: (modelId: string) => Promise<boolean>;
        select: (modelId: string) => Promise<boolean>;
        onDownloadProgress: (callback: (progress: { modelId: string; progress: number }) => void) => () => void;
      };
      settings: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown) => Promise<boolean>;
      };
      whisper: {
        getBinaryInfo: () => Promise<{ available: boolean; path: string | null }>;
        downloadBinary: () => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}

const PREDEFINED_MODEL_IDS = [
  'whisper-tiny', 'whisper-tiny-en', 'whisper-base', 'whisper-base-en',
  'whisper-small', 'whisper-small-en', 'whisper-medium',
  'whisper-large-v3', 'whisper-large-v3-turbo'
];

export const ModelsView: React.FC = () => {
  const { t } = useTranslation();
  const [models, setModels] = useState<TranscriptionModel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>('all');
  const [defaultModelId, setDefaultModelId] = useState<string>('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [prewarmEnabled, setPrewarmEnabled] = useState(true);
  const [binaryAvailable, setBinaryAvailable] = useState(false);
  const [downloadingBinary, setDownloadingBinary] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
    loadSettings();
    checkBinary();
  }, []);

  useEffect(() => {
    if (!window.voiceink?.models?.onDownloadProgress) return;
    const unsubscribe = window.voiceink.models.onDownloadProgress((progress) => {
      if (progress.modelId === downloadingId) {
        setDownloadProgress(progress.progress);
      }
    });
    return unsubscribe;
  }, [downloadingId]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const modelList = await window.voiceink.models.list();
      setModels(modelList);
      setErrorMessage(null);
    } catch (err) {
      console.error('Failed to load models:', err);
      setErrorMessage('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const savedModelId = await window.voiceink.settings.get('selectedTranscriptionModelId') as string;
      if (savedModelId) setDefaultModelId(savedModelId);
      const savedLanguage = await window.voiceink.settings.get('selectedLanguage') as string;
      if (savedLanguage) setSelectedLanguage(savedLanguage);
      const savedPrewarm = await window.voiceink.settings.get('prewarmModel') as boolean;
      if (savedPrewarm !== undefined) setPrewarmEnabled(savedPrewarm);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const checkBinary = async () => {
    try {
      const info = await window.voiceink.whisper.getBinaryInfo();
      setBinaryAvailable(info.available);
    } catch (err) {
      console.error('Failed to check binary:', err);
    }
  };

  const downloadBinary = async () => {
    setDownloadingBinary(true);
    setErrorMessage(null);
    try {
      const result = await window.voiceink.whisper.downloadBinary();
      if (result.success) {
        setBinaryAvailable(true);
      } else {
        setErrorMessage(`Failed to download whisper.cpp: ${result.error}`);
      }
    } catch (err) {
      setErrorMessage(`Error downloading whisper.cpp: ${err}`);
    } finally {
      setDownloadingBinary(false);
    }
  };

  const filteredModels = models.filter(m => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'custom') return !PREDEFINED_MODEL_IDS.includes(m.id);
    return m.type === selectedCategory;
  });

  const formatSize = (bytes: number): string => {
    if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    return `${(bytes / 1_000_000).toFixed(0)} MB`;
  };

  const downloadModel = useCallback(async (modelId: string) => {
    setDownloadingId(modelId);
    setDownloadProgress(0);
    setErrorMessage(null);
    try {
      const result = await window.voiceink.models.download(modelId);
      if (result.success) {
        await loadModels();
      } else {
        setErrorMessage(`Download failed: ${result.error}`);
      }
    } catch (err) {
      setErrorMessage(`Error: ${err}`);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const deleteModel = useCallback(async (modelId: string) => {
    try {
      const success = await window.voiceink.models.delete(modelId);
      if (success) {
        await loadModels();
        if (defaultModelId === modelId) {
          setDefaultModelId('');
          await window.voiceink.settings.set('selectedTranscriptionModelId', '');
        }
      }
    } catch (err) {
      setErrorMessage(`Error deleting: ${err}`);
    }
  }, [defaultModelId]);

  const setDefault = useCallback(async (modelId: string) => {
    try {
      await window.voiceink.models.select(modelId);
      await window.voiceink.settings.set('selectedTranscriptionModelId', modelId);
      setDefaultModelId(modelId);
    } catch (err) {
      setErrorMessage(`Error setting default: ${err}`);
    }
  }, []);

  const addCustomModel = useCallback(() => {
    if (!customName.trim() || !customPath.trim()) return;
    const newModel: TranscriptionModel = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      displayName: customName.trim(),
      description: 'Custom imported model',
      size: 0,
      downloadURL: '',
      type: 'whisper',
      isDownloaded: true,
      localPath: customPath.trim(),
    };
    setModels(prev => [...prev, newModel]);
    setCustomName('');
    setCustomPath('');
    setShowAddCustom(false);
  }, [customName, customPath]);

  const handleLanguageChange = async (language: string) => {
    setSelectedLanguage(language);
    await window.voiceink.settings.set('selectedLanguage', language);
  };

  const handlePrewarmToggle = async () => {
    const newValue = !prewarmEnabled;
    setPrewarmEnabled(newValue);
    await window.voiceink.settings.set('prewarmModel', newValue);
  };

  const categories: { key: ModelCategory; label: string; count: number }[] = [
    { key: 'all', label: 'All Models', count: models.length },
    { key: 'whisper', label: 'Whisper', count: models.filter(m => m.type === 'whisper').length },
    { key: 'parakeet', label: 'Parakeet', count: models.filter(m => m.type === 'parakeet').length },
    { key: 'custom', label: 'Custom', count: models.filter(m => !PREDEFINED_MODEL_IDS.includes(m.id)).length },
  ];

  if (loading) {
    return (
      <div className="view-container">
        <div className="view-header">
          <h1 className="view-title">{t('models.title')}</h1>
          <p className="view-subtitle">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="view-title">{t('models.title')}</h1>
            <p className="view-subtitle">{t('models.subtitle')}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => setShowAddCustom(!showAddCustom)}>
              📁 Import Local Model
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddCustom(!showAddCustom)}>
              + Add Custom Model
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="card" style={{ backgroundColor: '#fee', borderColor: '#fcc' }}>
          <div style={{ color: '#c00', fontWeight: 'bold' }}>⚠️ {errorMessage}</div>
        </div>
      )}

      {!binaryAvailable && (
        <div className="card" style={{ backgroundColor: '#fef9e7', borderColor: '#f9e79f' }}>
          <div className="card-title">⚠️ Whisper Engine Required</div>
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">whisper.cpp binary not found</span>
              <span className="setting-description">
                Download the transcription engine to use local models.
              </span>
            </div>
            <button className="btn btn-primary" onClick={downloadBinary} disabled={downloadingBinary}>
              {downloadingBinary ? '⏳ Downloading...' : '⬇️ Download Engine'}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Default Model</div>
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Active Transcription Model</span>
            <span className="setting-description">
              {defaultModelId
                ? models.find(m => m.id === defaultModelId)?.displayName || 'Unknown'
                : 'No model selected — download and select a model below'}
            </span>
          </div>
          {defaultModelId && <span className="badge badge-accent">Active</span>}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Model Settings</div>
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Language</span>
            <span className="setting-description">Primary language for transcription</span>
          </div>
          <select className="select" value={selectedLanguage} onChange={e => handleLanguageChange(e.target.value)}>
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
          </select>
        </div>
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Pre-warm Model on Startup</span>
            <span className="setting-description">Load model into memory for faster transcription</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={prewarmEnabled} onChange={handlePrewarmToggle} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {showAddCustom && (
        <div className="card">
          <div className="card-title">Add Custom Model</div>
          <div className="setting-row">
            <div className="setting-label"><span className="setting-name">Model Name</span></div>
            <input className="input" style={{ maxWidth: '300px' }} value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g., My Fine-tuned Whisper" />
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Model File Path</span>
              <span className="setting-description">Path to the GGML model file (.bin)</span>
            </div>
            <input className="input" style={{ maxWidth: '400px' }} value={customPath} onChange={e => setCustomPath(e.target.value)} placeholder="e.g., /path/to/model.bin" />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="btn btn-primary" onClick={addCustomModel}>Add Model</button>
            <button className="btn btn-secondary" onClick={() => setShowAddCustom(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="category-tabs">
        {categories.map(cat => (
          <button key={cat.key} className={`category-tab ${selectedCategory === cat.key ? 'active' : ''}`} onClick={() => setSelectedCategory(cat.key)}>
            {cat.label}<span className="category-count">{cat.count}</span>
          </button>
        ))}
      </div>

      <div className="model-grid">
        {filteredModels.map(model => (
          <div key={model.id} className={`model-card ${model.isDownloaded ? 'downloaded' : ''} ${defaultModelId === model.id ? 'default' : ''}`}>
            <div className="model-header">
              <div className="model-type-badge">{model.type === 'whisper' ? '🔊' : '🦜'} {model.type}</div>
              {defaultModelId === model.id && <span className="badge badge-accent">Default</span>}
              {model.isDownloaded && defaultModelId !== model.id && <span className="badge badge-outline">Downloaded</span>}
            </div>
            <div className="model-name">{model.displayName}</div>
            <div className="model-description">{model.description}</div>
            <div className="model-size">{model.size > 0 ? formatSize(model.size) : 'Local file'}</div>

            {downloadingId === model.id && (
              <div className="progress-container" style={{ marginTop: '8px' }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${downloadProgress}%` }} />
                </div>
                <div className="progress-text">Downloading... {downloadProgress}%</div>
              </div>
            )}

            <div className="model-actions">
              {!model.isDownloaded && downloadingId !== model.id && (
                <button className="btn btn-primary btn-small" onClick={() => downloadModel(model.id)}>⬇️ Download</button>
              )}
              {model.isDownloaded && defaultModelId !== model.id && (
                <button className="btn btn-primary btn-small" onClick={() => setDefault(model.id)}>⭐ Set Default</button>
              )}
              {model.isDownloaded && (
                <button className="btn btn-danger btn-small" onClick={() => deleteModel(model.id)}>🗑️ Delete</button>
              )}
            </div>
          </div>
        ))}

        {filteredModels.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">🤖</div>
            <div className="empty-state-text">No models in this category</div>
          </div>
        )}
      </div>
    </div>
  );
};
