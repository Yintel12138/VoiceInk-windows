/**
 * EnhancementView - AI Enhancement settings.
 * Mirrors VoiceInk/Views/EnhancementSettingsView.swift.
 *
 * Features:
 * - Toggle enhancement
 * - API key management
 * - AI Provider selection (OpenAI, Groq, Anthropic, etc.)
 * - Enhancement prompts grid with drag-reorder
 * - Prompt editor panel (add/edit/delete)
 * - Shortcuts section
 * - Context toggles (Clipboard, Screen)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { CustomPrompt, AIProvider } from '../../shared/types';

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'openai',
    displayName: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    requiresAPIKey: true,
    models: [
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini', displayName: 'GPT-4o Mini', providerId: 'openai' },
      { id: 'gpt-4o', name: 'gpt-4o', displayName: 'GPT-4o', providerId: 'openai' },
      { id: 'gpt-4-turbo', name: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', providerId: 'openai' },
    ],
  },
  {
    id: 'groq',
    name: 'groq',
    displayName: 'Groq',
    baseURL: 'https://api.groq.com/openai/v1',
    requiresAPIKey: true,
    models: [
      { id: 'llama-3.1-8b-instant', name: 'llama-3.1-8b-instant', displayName: 'Llama 3.1 8B', providerId: 'groq' },
      { id: 'llama-3.1-70b-versatile', name: 'llama-3.1-70b-versatile', displayName: 'Llama 3.1 70B', providerId: 'groq' },
    ],
  },
  {
    id: 'anthropic',
    name: 'anthropic',
    displayName: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    requiresAPIKey: true,
    models: [
      { id: 'claude-3-5-sonnet-latest', name: 'claude-3-5-sonnet-latest', displayName: 'Claude 3.5 Sonnet', providerId: 'anthropic' },
      { id: 'claude-3-5-haiku-latest', name: 'claude-3-5-haiku-latest', displayName: 'Claude 3.5 Haiku', providerId: 'anthropic' },
    ],
  },
  {
    id: 'ollama',
    name: 'ollama',
    displayName: 'Ollama (Local)',
    baseURL: 'http://localhost:11434/v1',
    requiresAPIKey: false,
    models: [
      { id: 'llama3', name: 'llama3', displayName: 'Llama 3', providerId: 'ollama' },
    ],
  },
];

const BUILT_IN_PROMPTS: CustomPrompt[] = [
  {
    id: 'fix-grammar',
    name: 'Fix Grammar',
    systemPrompt: 'You are a text editor. Fix grammar and punctuation errors in the text.',
    userPromptTemplate: 'Fix the grammar in: {{text}}',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'professional',
    name: 'Professional Tone',
    systemPrompt: 'You are a professional writing assistant. Make the text sound more professional and polished.',
    userPromptTemplate: 'Make this professional: {{text}}',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'casual',
    name: 'Casual Tone',
    systemPrompt: 'You are a writing assistant. Make the text sound more casual and conversational.',
    userPromptTemplate: 'Make this casual: {{text}}',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'summarize',
    name: 'Summarize',
    systemPrompt: 'You are a summarization assistant. Provide a concise summary.',
    userPromptTemplate: 'Summarize: {{text}}',
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
  },
];

export const EnhancementView: React.FC = () => {
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState('openai');
  const [selectedModelId, setSelectedModelId] = useState('gpt-4o-mini');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [prompts, setPrompts] = useState<CustomPrompt[]>(BUILT_IN_PROMPTS);
  const [selectedPromptId, setSelectedPromptId] = useState('fix-grammar');
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [clipboardContextEnabled, setClipboardContextEnabled] = useState(false);
  const [screenContextEnabled, setScreenContextEnabled] = useState(false);
  const [toggleShortcutEnabled, setToggleShortcutEnabled] = useState(true);

  // New prompt form
  const [promptName, setPromptName] = useState('');
  const [promptSystem, setPromptSystem] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (window.voiceink?.settings?.get) {
        const enabled = await window.voiceink.settings.get('isEnhancementEnabled');
        setIsEnabled(enabled as boolean);
        const provider = await window.voiceink.settings.get('selectedAIProvider');
        if (provider) setSelectedProviderId(provider as string);
        const model = await window.voiceink.settings.get('selectedAIModel');
        if (model) setSelectedModelId(model as string);
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

  const selectedProvider = AI_PROVIDERS.find(p => p.id === selectedProviderId);

  const selectProvider = async (providerId: string) => {
    setSelectedProviderId(providerId);
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    if (provider && provider.models.length > 0) {
      setSelectedModelId(provider.models[0].id);
    }
    try {
      if (window.voiceink?.settings?.set) {
        await window.voiceink.settings.set('selectedAIProvider', providerId);
      }
    } catch { /* ignore */ }
  };

  const selectModel = async (modelId: string) => {
    setSelectedModelId(modelId);
    try {
      if (window.voiceink?.settings?.set) {
        await window.voiceink.settings.set('selectedAIModel', modelId);
      }
    } catch { /* ignore */ }
  };

  const openPromptEditor = (prompt?: CustomPrompt) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setPromptName(prompt.name);
      setPromptSystem(prompt.systemPrompt);
      setPromptTemplate(prompt.userPromptTemplate);
    } else {
      setEditingPrompt(null);
      setPromptName('');
      setPromptSystem('');
      setPromptTemplate('{{text}}');
    }
    setShowPromptEditor(true);
  };

  const savePrompt = useCallback(() => {
    if (!promptName.trim()) return;
    if (editingPrompt) {
      setPrompts(prev => prev.map(p =>
        p.id === editingPrompt.id
          ? { ...p, name: promptName, systemPrompt: promptSystem, userPromptTemplate: promptTemplate }
          : p
      ));
    } else {
      const newPrompt: CustomPrompt = {
        id: `custom-${Date.now()}`,
        name: promptName,
        systemPrompt: promptSystem,
        userPromptTemplate: promptTemplate,
        isBuiltIn: false,
        createdAt: new Date().toISOString(),
      };
      setPrompts(prev => [...prev, newPrompt]);
    }
    setShowPromptEditor(false);
    setEditingPrompt(null);
  }, [editingPrompt, promptName, promptSystem, promptTemplate]);

  const deletePrompt = useCallback((id: string) => {
    setPrompts(prev => prev.filter(p => p.id !== id));
    if (selectedPromptId === id) {
      setSelectedPromptId(prompts[0]?.id || '');
    }
  }, [selectedPromptId, prompts]);

  const movePrompt = useCallback((index: number, direction: 'up' | 'down') => {
    setPrompts(prev => {
      const newList = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newList.length) return prev;
      [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
      return newList;
    });
  }, []);

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">AI Enhancement</h1>
        <p className="view-subtitle">
          Configure AI-powered text enhancement after transcription
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="card">
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Enable AI Enhancement</span>
            <span className="setting-description">
              Enhance transcribed text using AI before pasting
            </span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={isEnabled} onChange={toggleEnhancement} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {isEnabled && (
        <>
          {/* AI Provider Selection */}
          <div className="card">
            <div className="card-title">AI Provider</div>
            <div className="provider-grid">
              {AI_PROVIDERS.map(provider => (
                <div
                  key={provider.id}
                  className={`provider-card ${selectedProviderId === provider.id ? 'selected' : ''}`}
                  onClick={() => selectProvider(provider.id)}
                >
                  <div className="provider-name">{provider.displayName}</div>
                  <div className="provider-models">{provider.models.length} models</div>
                  {!provider.requiresAPIKey && (
                    <span className="badge badge-outline" style={{ marginTop: '4px' }}>Free / Local</span>
                  )}
                </div>
              ))}
            </div>

            {/* API Key Input */}
            {selectedProvider?.requiresAPIKey && (
              <div className="setting-row" style={{ marginTop: '16px' }}>
                <div className="setting-label">
                  <span className="setting-name">API Key for {selectedProvider.displayName}</span>
                  <span className="setting-description">
                    Required to use {selectedProvider.displayName} models
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    className="input"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeys[selectedProviderId] || ''}
                    onChange={e => setApiKeys(prev => ({ ...prev, [selectedProviderId]: e.target.value }))}
                    placeholder={`Enter ${selectedProvider.displayName} API key`}
                    style={{ minWidth: '300px' }}
                  />
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            {/* Model Selection */}
            <div className="setting-row" style={{ marginTop: '12px' }}>
              <div className="setting-label">
                <span className="setting-name">AI Model</span>
              </div>
              <select className="select" value={selectedModelId} onChange={e => selectModel(e.target.value)}>
                {selectedProvider?.models.map(m => (
                  <option key={m.id} value={m.id}>{m.displayName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Enhancement Prompts */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="card-title" style={{ margin: 0 }}>Enhancement Prompts</div>
              <button className="btn btn-primary btn-small" onClick={() => openPromptEditor()}>
                + Add Prompt
              </button>
            </div>

            <div className="prompt-grid">
              {prompts.map((prompt, index) => (
                <div
                  key={prompt.id}
                  className={`prompt-card ${selectedPromptId === prompt.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPromptId(prompt.id)}
                  onDoubleClick={() => !prompt.isBuiltIn && openPromptEditor(prompt)}
                >
                  <div className="prompt-card-header">
                    <div className="prompt-icon">
                      {prompt.isBuiltIn ? '📝' : '✏️'}
                    </div>
                    <div className="prompt-card-actions">
                      <button
                        className="btn-icon btn-icon-small"
                        onClick={e => { e.stopPropagation(); movePrompt(index, 'up'); }}
                        disabled={index === 0}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        className="btn-icon btn-icon-small"
                        onClick={e => { e.stopPropagation(); movePrompt(index, 'down'); }}
                        disabled={index === prompts.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                      {!prompt.isBuiltIn && (
                        <>
                          <button
                            className="btn-icon btn-icon-small"
                            onClick={e => { e.stopPropagation(); openPromptEditor(prompt); }}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-icon btn-icon-small"
                            onClick={e => { e.stopPropagation(); deletePrompt(prompt.id); }}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="prompt-name">{prompt.name}</div>
                  <div className="prompt-preview">
                    {prompt.systemPrompt.substring(0, 60)}...
                  </div>
                  {selectedPromptId === prompt.id && (
                    <div className="prompt-selected-indicator">●</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Editor Panel */}
          {showPromptEditor && (
            <div className="card prompt-editor-panel">
              <div className="card-title">
                {editingPrompt ? 'Edit Prompt' : 'New Prompt'}
              </div>
              <div className="setting-row">
                <div className="setting-label">
                  <span className="setting-name">Name</span>
                </div>
                <input
                  className="input"
                  value={promptName}
                  onChange={e => setPromptName(e.target.value)}
                  placeholder="Prompt name"
                />
              </div>
              <div className="prompt-editor-field">
                <label className="setting-name">System Prompt</label>
                <textarea
                  className="textarea"
                  rows={4}
                  value={promptSystem}
                  onChange={e => setPromptSystem(e.target.value)}
                  placeholder="You are a helpful assistant that..."
                />
              </div>
              <div className="prompt-editor-field">
                <label className="setting-name">User Prompt Template</label>
                <textarea
                  className="textarea"
                  rows={3}
                  value={promptTemplate}
                  onChange={e => setPromptTemplate(e.target.value)}
                  placeholder="Use {{text}} as placeholder for the transcription"
                />
                <span className="setting-description">Use {'{{text}}'} for the transcribed text</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="btn btn-primary" onClick={savePrompt}>
                  {editingPrompt ? 'Save Changes' : 'Create Prompt'}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowPromptEditor(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Context Settings */}
          <div className="card">
            <div className="card-title">Context Awareness</div>
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-name">Clipboard Context</span>
                <span className="setting-description">
                  Include clipboard contents as context for AI enhancement
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={clipboardContextEnabled}
                  onChange={() => setClipboardContextEnabled(!clipboardContextEnabled)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-name">Screen Context</span>
                <span className="setting-description">
                  Capture screen content as context for smarter enhancements
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={screenContextEnabled}
                  onChange={() => setScreenContextEnabled(!screenContextEnabled)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="card">
            <div className="card-title">Shortcuts</div>
            <div className="setting-row">
              <div className="setting-label">
                <span className="setting-name">Toggle Enhancement Shortcut</span>
                <span className="setting-description">
                  Quick toggle AI enhancement with keyboard shortcut
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={toggleShortcutEnabled}
                  onChange={() => setToggleShortcutEnabled(!toggleShortcutEnabled)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
