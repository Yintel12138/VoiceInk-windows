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
      setError(`Unsupported file format: .${ext}. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
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
    setProgressMessage('Preparing audio file...');

    // Simulate transcription process (actual implementation requires whisper.cpp backend)
    const steps = [
      { progress: 20, message: 'Loading audio file...' },
      { progress: 40, message: 'Extracting audio data...' },
      { progress: 60, message: 'Running transcription model...' },
      { progress: 80, message: enhanceEnabled ? 'Enhancing with AI...' : 'Finalizing...' },
      { progress: 100, message: 'Complete!' },
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
          <div className="drop-zone-title">Drop audio or video file here</div>
          <div className="drop-zone-subtitle">
            or click the button below to choose a file
          </div>
          <button className="btn btn-primary" onClick={handleFileSelect} style={{ marginTop: '16px' }}>
            Choose File
          </button>
          <div className="drop-zone-formats">
            Supported: {SUPPORTED_FORMATS.join(', ')}
          </div>
        </div>
      )}

      {state === 'fileSelected' && selectedFile && (
        <div className="card">
          <div className="card-title">Selected File</div>
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
              <span className="setting-name">AI Enhancement</span>
              <span className="setting-description">
                Enhance transcription with AI after processing
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
              ▶ Start Transcription
            </button>
            <button className="btn btn-secondary" onClick={handleFileSelect}>
              Choose Different File
            </button>
            <button className="btn btn-secondary" onClick={resetState}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {state === 'processing' && (
        <div className="card">
          <div className="card-title">Processing</div>
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
            <div className="card-title">Transcription Result</div>
            <div className="transcription-result">
              <div className="result-text">{result.text}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="btn btn-primary" onClick={() => copyResult(result.text)}>
                  📋 Copy
                </button>
              </div>
            </div>
          </div>

          {result.enhancedText && (
            <div className="card">
              <div className="card-title">Enhanced Result</div>
              <div className="transcription-result">
                <div className="result-text">{result.enhancedText}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button className="btn btn-primary" onClick={() => copyResult(result.enhancedText!)}>
                    📋 Copy Enhanced
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={handleFileSelect}>
              Transcribe Another File
            </button>
            <button className="btn btn-secondary" onClick={resetState}>
              Start Over
            </button>
          </div>
        </>
      )}

      {state === 'error' && error && (
        <div className="card" style={{ borderColor: 'var(--danger)' }}>
          <div className="card-title" style={{ color: 'var(--danger)' }}>Error</div>
          <div className="error-message">{error}</div>
          <button className="btn btn-secondary" onClick={resetState} style={{ marginTop: '12px' }}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
