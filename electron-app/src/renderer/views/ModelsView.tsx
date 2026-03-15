/**
 * ModelsView - AI model management.
 * Mirrors VoiceInk/Views/AI Models/ views.
 *
 * Features:
 * - Model listing with 4 categories (All, Whisper, Parakeet, Custom)
 * - Download/delete/set-default actions
 * - Import local model
 * - Add custom model
 * - Model settings (language, warming)
 * - Download progress
 * - Filter animation
 */
import React, { useState, useCallback } from 'react';
import type { TranscriptionModel } from '../../shared/types';

type ModelCategory = 'all' | 'whisper' | 'parakeet' | 'custom';

const PREDEFINED_MODELS: TranscriptionModel[] = [
  {
    id: 'whisper-tiny',
    name: 'tiny',
    displayName: 'Whisper Tiny',
    description: 'Fastest model, lowest accuracy. Good for quick notes.',
    size: 75_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    type: 'whisper',
    isDownloaded: false,
  },
  {
    id: 'whisper-base',
    name: 'base',
    displayName: 'Whisper Base',
    description: 'Good balance of speed and accuracy for everyday use.',
    size: 142_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    type: 'whisper',
    isDownloaded: false,
  },
  {
    id: 'whisper-small',
    name: 'small',
    displayName: 'Whisper Small',
    description: 'Higher accuracy, moderate speed. Recommended for most users.',
    size: 466_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    type: 'whisper',
    isDownloaded: false,
  },
  {
    id: 'whisper-medium',
    name: 'medium',
    displayName: 'Whisper Medium',
    description: 'High accuracy for professional transcription needs.',
    size: 1_500_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    type: 'whisper',
    isDownloaded: false,
  },
  {
    id: 'whisper-large-v3',
    name: 'large-v3',
    displayName: 'Whisper Large v3',
    description: 'Best accuracy. Requires significant RAM and CPU/GPU resources.',
    size: 3_000_000_000,
    downloadURL: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin',
    type: 'whisper',
    isDownloaded: false,
  },
  {
    id: 'parakeet-tdt-0.6b',
    name: 'parakeet-tdt-0.6b',
    displayName: 'Parakeet TDT 0.6B',
    description: 'NVIDIA Parakeet model. Fast and accurate for English.',
    size: 600_000_000,
    downloadURL: '',
    type: 'parakeet',
    language: 'en',
    isDownloaded: false,
  },
];

export const ModelsView: React.FC = () => {
  const [models, setModels] = useState<TranscriptionModel[]>(PREDEFINED_MODELS);
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>('all');
  const [defaultModelId, setDefaultModelId] = useState<string>('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [prewarmEnabled, setPrewarmEnabled] = useState(true);

  const filteredModels = models.filter(m => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'custom') return !PREDEFINED_MODELS.some(p => p.id === m.id);
    return m.type === selectedCategory;
  });

  const formatSize = (bytes: number): string => {
    if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    return `${(bytes / 1_000_000).toFixed(0)} MB`;
  };

  const downloadModel = useCallback(async (modelId: string) => {
    setDownloadingId(modelId);
    setDownloadProgress(0);
    // Simulate download progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setDownloadProgress(i);
    }
    setModels(prev => prev.map(m =>
      m.id === modelId ? { ...m, isDownloaded: true, localPath: `/models/${m.name}.bin` } : m
    ));
    setDownloadingId(null);
  }, []);

  const deleteModel = useCallback((modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;
    if (PREDEFINED_MODELS.some(p => p.id === modelId)) {
      // Predefined model: mark as not downloaded
      setModels(prev => prev.map(m =>
        m.id === modelId ? { ...m, isDownloaded: false, localPath: undefined } : m
      ));
    } else {
      // Custom model: remove entirely
      setModels(prev => prev.filter(m => m.id !== modelId));
    }
    if (defaultModelId === modelId) setDefaultModelId('');
  }, [models, defaultModelId]);

  const setDefault = useCallback((modelId: string) => {
    setDefaultModelId(modelId);
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

  const categories: { key: ModelCategory; label: string; count: number }[] = [
    { key: 'all', label: 'All Models', count: models.length },
    { key: 'whisper', label: 'Whisper', count: models.filter(m => m.type === 'whisper').length },
    { key: 'parakeet', label: 'Parakeet', count: models.filter(m => m.type === 'parakeet').length },
    { key: 'custom', label: 'Custom', count: models.filter(m => !PREDEFINED_MODELS.some(p => p.id === m.id)).length },
  ];

  return (
    <div className="view-container">
      <div className="view-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="view-title">AI Models</h1>
            <p className="view-subtitle">
              Manage transcription models for local speech-to-text
            </p>
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

      {/* Default Model Section */}
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
          {defaultModelId && (
            <span className="badge badge-accent">Active</span>
          )}
        </div>
      </div>

      {/* Model Settings */}
      <div className="card">
        <div className="card-title">Model Settings</div>
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Language</span>
            <span className="setting-description">Primary language for transcription</span>
          </div>
          <select
            className="select"
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="auto">Auto-detect</option>
          </select>
        </div>
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Pre-warm Model on Startup</span>
            <span className="setting-description">
              Load the model into memory on app launch for faster first transcription
            </span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={prewarmEnabled}
              onChange={() => setPrewarmEnabled(!prewarmEnabled)}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {/* Add Custom Model Form */}
      {showAddCustom && (
        <div className="card">
          <div className="card-title">Add Custom Model</div>
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Model Name</span>
            </div>
            <input
              className="input"
              style={{ maxWidth: '300px' }}
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="e.g., My Fine-tuned Whisper"
            />
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">Model File Path</span>
              <span className="setting-description">Path to the GGML model file (.bin)</span>
            </div>
            <input
              className="input"
              style={{ maxWidth: '400px' }}
              value={customPath}
              onChange={e => setCustomPath(e.target.value)}
              placeholder="e.g., /path/to/model.bin"
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="btn btn-primary" onClick={addCustomModel}>
              Add Model
            </button>
            <button className="btn btn-secondary" onClick={() => setShowAddCustom(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="category-tabs">
        {categories.map(cat => (
          <button
            key={cat.key}
            className={`category-tab ${selectedCategory === cat.key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.key)}
          >
            {cat.label}
            <span className="category-count">{cat.count}</span>
          </button>
        ))}
      </div>

      {/* Model List */}
      <div className="model-grid">
        {filteredModels.map(model => (
          <div key={model.id} className={`model-card ${model.isDownloaded ? 'downloaded' : ''} ${defaultModelId === model.id ? 'default' : ''}`}>
            <div className="model-header">
              <div className="model-type-badge">
                {model.type === 'whisper' ? '🔊' : '🦜'} {model.type}
              </div>
              {defaultModelId === model.id && (
                <span className="badge badge-accent">Default</span>
              )}
              {model.isDownloaded && defaultModelId !== model.id && (
                <span className="badge badge-outline">Downloaded</span>
              )}
            </div>
            <div className="model-name">{model.displayName}</div>
            <div className="model-description">{model.description}</div>
            <div className="model-size">{model.size > 0 ? formatSize(model.size) : 'Local file'}</div>

            {/* Download Progress */}
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
                <button className="btn btn-primary btn-small" onClick={() => downloadModel(model.id)}>
                  ⬇️ Download
                </button>
              )}
              {model.isDownloaded && defaultModelId !== model.id && (
                <button className="btn btn-primary btn-small" onClick={() => setDefault(model.id)}>
                  ⭐ Set Default
                </button>
              )}
              {model.isDownloaded && (
                <button className="btn btn-danger btn-small" onClick={() => deleteModel(model.id)}>
                  🗑️ Delete
                </button>
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
