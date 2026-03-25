/**
 * TranscribeAudioView - File-based audio/video transcription.
 * Mirrors VoiceInk/Views/TranscribeAudioView.swift.
 *
 * Features:
 * - Drag & drop audio/video files
 * - File picker
 * - Supported format display
 * - Processing progress
 * - Enhancement toggle
 * - Transcription result display
 */
import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type TranscribeState = 'idle' | 'fileSelected' | 'processing' | 'complete' | 'error';

interface TranscriptionResult {
  text: string;
  enhancedText?: string;
  duration: number;
  model: string;
}

const SUPPORTED_FORMATS = [
  'WAV', 'MP3', 'M4A', 'AIFF', 'FLAC', 'OGG',
  'MP4', 'MOV', 'AVI', 'MKV', 'WebM'
];

export const TranscribeAudioView: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<TranscribeState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [enhanceEnabled, setEnhanceEnabled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      selectFile(files[0]);
    }
  }, []);

  const selectFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toUpperCase() || '';
    if (!SUPPORTED_FORMATS.includes(ext)) {
      setError(t('transcribeAudio.unsupportedFormat', { ext, formats: SUPPORTED_FORMATS.join(', ') }));
      setState('error');
      return;
    }
    setSelectedFile(file);
    setState('fileSelected');
    setError(null);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      selectFile(files[0]);
    }
  };

  const startTranscription = async () => {
    if (!selectedFile) return;
    setState('processing');
    setProgress(0);
    setProgressMessage(t('transcribeAudio.processing.preparing'));

    // Simulate transcription process (actual implementation requires whisper.cpp backend)
    const steps = [
      { progress: 20, message: t('transcribeAudio.processing.loading') },
      { progress: 40, message: t('transcribeAudio.processing.extracting') },
      { progress: 60, message: t('transcribeAudio.processing.transcribing') },
      { progress: 80, message: enhanceEnabled ? t('transcribeAudio.processing.enhancing') : t('transcribeAudio.processing.finalizing') },
      { progress: 100, message: t('transcribeAudio.processing.complete') },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(step.progress);
      setProgressMessage(step.message);
    }

    setResult({
      text: `[Transcription of "${selectedFile.name}" will appear here once the transcription engine is configured]`,
      enhancedText: enhanceEnabled ? '[Enhanced version will appear here]' : undefined,
      duration: 0,
      model: 'Not configured',
    });
    setState('complete');
  };

  const resetState = () => {
    setState('idle');
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyResult = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">{t('transcribeAudio.title')}</h1>
        <p className="view-subtitle">
          {t('transcribeAudio.subtitle')}
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.m4a,.aiff,.flac,.ogg,.mp4,.mov,.avi,.mkv,.webm"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {state === 'idle' && (
        <div
          className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drop-zone-icon">🎵</div>
          <div className="drop-zone-title">{t('transcribeAudio.dropTitle')}</div>
          <div className="drop-zone-subtitle">
            {t('transcribeAudio.dropSubtitle')}
          </div>
          <button className="btn btn-primary" onClick={handleFileSelect} style={{ marginTop: '16px' }}>
            {t('transcribeAudio.chooseFile')}
          </button>
          <div className="drop-zone-formats">
            {t('transcribeAudio.supportedFormatsPrefix')} {SUPPORTED_FORMATS.join(', ')}
          </div>
        </div>
      )}

      {state === 'fileSelected' && selectedFile && (
        <div className="card">
          <div className="card-title">{t('transcribeAudio.selectedFile')}</div>
          <div className="file-info">
            <div className="file-info-icon">📄</div>
            <div className="file-info-details">
              <div className="file-info-name">{selectedFile.name}</div>
              <div className="file-info-size">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">{t('transcribeAudio.aiEnhancement')}</span>
              <span className="setting-description">
                {t('transcribeAudio.aiEnhancementDesc')}
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={enhanceEnabled}
                onChange={() => setEnhanceEnabled(!enhanceEnabled)}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={startTranscription}>
              {t('transcribeAudio.startTranscription')}
            </button>
            <button className="btn btn-secondary" onClick={handleFileSelect}>
              {t('transcribeAudio.chooseDifferentFile')}
            </button>
            <button className="btn btn-secondary" onClick={resetState}>
              {t('transcribeAudio.cancel')}
            </button>
          </div>
        </div>
      )}

      {state === 'processing' && (
        <div className="card">
          <div className="card-title">{t('transcribeAudio.processing')}</div>
          <div className="progress-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-text">{progressMessage}</div>
            <div className="progress-percentage">{progress}%</div>
          </div>
        </div>
      )}

      {state === 'complete' && result && (
        <>
          <div className="card">
            <div className="card-title">{t('transcribeAudio.transcriptionResult')}</div>
            <div className="transcription-result">
              <div className="result-text">{result.text}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="btn btn-primary" onClick={() => copyResult(result.text)}>
                  {t('transcribeAudio.copy')}
                </button>
              </div>
            </div>
          </div>

          {result.enhancedText && (
            <div className="card">
              <div className="card-title">{t('transcribeAudio.enhancedResult')}</div>
              <div className="transcription-result">
                <div className="result-text">{result.enhancedText}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button className="btn btn-primary" onClick={() => copyResult(result.enhancedText!)}>
                    {t('transcribeAudio.copyEnhanced')}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleFileSelect}>
              {t('transcribeAudio.transcribeAnother')}
            </button>
            <button className="btn btn-secondary" onClick={resetState}>
              {t('transcribeAudio.startOver')}
            </button>
          </div>
        </>
      )}

      {state === 'error' && error && (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <div className="card-title" style={{ color: 'var(--danger)' }}>{t('transcribeAudio.errorTitle')}</div>
          <div className="error-message">{error}</div>
          <button className="btn btn-secondary" onClick={resetState} style={{ marginTop: '12px' }}>
            {t('transcribeAudio.tryAgain')}
          </button>
        </div>
      )}
    </div>
  );
};
