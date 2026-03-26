/**
 * MiniRecorderView - Compact floating recorder overlay.
 * Mirrors VoiceInk/Views/Recorder/MiniRecorderView.swift.
 *
 * Displayed in a frameless, always-on-top window.
 * Shows record button, audio level visualization, prompt selector,
 * power mode indicator, enhancement toggle, and real-time streaming
 * partial transcription text when WebSocket streaming is enabled.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { RecordingState, AudioLevel } from '../../shared/types';

export const MiniRecorderView: React.FC = () => {
  const { t } = useTranslation();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [audioLevel, setAudioLevel] = useState<AudioLevel>({
    averagePower: 0,
    peakPower: 0,
  });
  const [isEnhancementEnabled, setIsEnhancementEnabled] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('Fix Grammar');
  const [currentPowerMode, setCurrentPowerMode] = useState<string | null>(null);
  const [showPromptMenu, setShowPromptMenu] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [streamingText, setStreamingText] = useState('');
  const [streamingStatus, setStreamingStatus] = useState<'idle' | 'connected' | 'disconnected' | 'error'>('idle');
  const streamingTextRef = useRef('');

  useEffect(() => {
    // Listen for recording state changes
    if (window.voiceink?.recorder?.onStateChanged) {
      const unsubState = window.voiceink.recorder.onStateChanged((state: string) => {
        setRecordingState(state as RecordingState);
        if (state === 'idle') {
          setElapsedSeconds(0);
          // Clear streaming text a moment after recording ends
          setTimeout(() => {
            setStreamingText('');
            streamingTextRef.current = '';
            setStreamingStatus('idle');
          }, 1500);
        }
      });

      const unsubLevel = window.voiceink.recorder.onAudioLevel((level: unknown) => {
        setAudioLevel(level as AudioLevel);
      });

      return () => {
        unsubState();
        unsubLevel();
      };
    }
  }, []);

  // Subscribe to streaming partial results
  useEffect(() => {
    const unsubPartial = window.voiceink?.transcriptions?.onStreamingPartialResult?.((text: string) => {
      streamingTextRef.current = text;
      setStreamingText(text);
    });

    const unsubStatus = window.voiceink?.transcriptions?.onStreamingStatus?.((status) => {
      setStreamingStatus(status === 'connected' ? 'connected' :
        status === 'error' ? 'error' : 'disconnected');
    });

    return () => {
      unsubPartial?.();
      unsubStatus?.();
    };
  }, []);

  // Timer for recording duration
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (recordingState === 'recording') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [recordingState]);

  // Load enhancement state
  useEffect(() => {
    const loadEnhancement = async () => {
      try {
        if (window.voiceink?.settings?.get) {
          const enabled = await window.voiceink.settings.get('isEnhancementEnabled');
          setIsEnhancementEnabled(enabled as boolean);
        }
      } catch { /* ignore */ }
    };
    loadEnhancement();
  }, []);

  const handleToggle = async () => {
    try {
      if (window.voiceink?.recorder?.toggle) {
        await window.voiceink.recorder.toggle();
      }
    } catch (err) {
      console.error('Failed to toggle recording:', err);
    }
  };

  const toggleEnhancement = async () => {
    const newValue = !isEnhancementEnabled;
    setIsEnhancementEnabled(newValue);
    try {
      if (window.voiceink?.settings?.set) {
        await window.voiceink.settings.set('isEnhancementEnabled', newValue);
      }
    } catch { /* ignore */ }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusText = (): string => {
    switch (recordingState) {
      case 'recording':
        return formatTime(elapsedSeconds);
      case 'transcribing':
        return t('miniRecorder.transcribing');
      case 'enhancing':
        return t('miniRecorder.enhancing');
      default:
        return t('miniRecorder.ready');
    }
  };

  const getButtonIcon = (): string => {
    switch (recordingState) {
      case 'recording':
        return '⏹';
      case 'transcribing':
      case 'enhancing':
        return '⏳';
      default:
        return '🎤';
    }
  };

  // Generate audio visualizer bars
  const barCount = 5;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const variance = (i - Math.floor(barCount / 2)) / barCount;
    const height = Math.max(
      4,
      audioLevel.averagePower * 24 * (1 - Math.abs(variance) * 0.5)
    );
    return height;
  });

  const PROMPTS = [
    t('miniRecorder.prompts.fixGrammar'),
    t('miniRecorder.prompts.professional'),
    t('miniRecorder.prompts.casual'),
    t('miniRecorder.prompts.summarize'),
  ];

  // Determine if we should show the streaming text panel
  const showStreamingPanel = recordingState === 'recording' && streamingText.trim().length > 0;

  return (
    <div className="mini-recorder">
      <div className="mini-recorder-pill">
        {/* Record Button */}
        <button
          className={`mini-recorder-btn ${recordingState}`}
          onClick={handleToggle}
          disabled={recordingState === 'transcribing' || recordingState === 'enhancing'}
        >
          {getButtonIcon()}
        </button>

        {/* Audio Visualizer */}
        {recordingState === 'recording' && (
          <div className="audio-visualizer">
            {bars.map((height, i) => (
              <div
                key={i}
                className="audio-bar"
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        )}

        {/* Status Text */}
        <span className="mini-recorder-status">
          {getStatusText()}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Power Mode Indicator */}
        {currentPowerMode && (
          <span className="mini-recorder-power-mode" title={`Power Mode: ${currentPowerMode}`}>
            ⚡
          </span>
        )}

        {/* Enhancement Toggle */}
        <button
          className={`mini-recorder-enhancement ${isEnhancementEnabled ? 'active' : ''}`}
          onClick={toggleEnhancement}
          title={isEnhancementEnabled ? t('miniRecorder.enhancementOn') : t('miniRecorder.enhancementOff')}
        >
          ✨
        </button>

        {/* Prompt Selector */}
        <div className="mini-recorder-prompt-container">
          <button
            className="mini-recorder-prompt-btn"
            onClick={() => setShowPromptMenu(!showPromptMenu)}
            title={`Prompt: ${currentPrompt}`}
          >
            📝
          </button>
          {showPromptMenu && (
            <div className="mini-recorder-prompt-menu">
              {PROMPTS.map(p => (
                <div
                  key={p}
                  className={`mini-recorder-prompt-option ${currentPrompt === p ? 'active' : ''}`}
                  onClick={() => { setCurrentPrompt(p); setShowPromptMenu(false); }}
                >
                  {currentPrompt === p ? '● ' : ''}{p}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Streaming Transcription Panel */}
      {showStreamingPanel && (
        <div className="mini-recorder-streaming-panel">
          <div className="mini-recorder-streaming-indicator">
            <span
              className={`streaming-dot ${streamingStatus === 'error' ? 'error' : 'active'}`}
            />
            <span className="streaming-label">
              {streamingStatus === 'error' ? t('miniRecorder.streamingError') : t('miniRecorder.streaming')}
            </span>
          </div>
          <p className="mini-recorder-streaming-text">{streamingText}</p>
        </div>
      )}
    </div>
  );
};
