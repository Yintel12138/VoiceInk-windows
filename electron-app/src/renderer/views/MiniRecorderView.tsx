/**
 * MiniRecorderView - Compact floating recorder overlay.
 * Mirrors VoiceInk/Views/Recorder/MiniRecorderView.swift.
 *
 * Displayed in a frameless, always-on-top window.
 * Shows record button and audio level visualization.
 */
import React, { useState, useEffect } from 'react';
import type { RecordingState, AudioLevel } from '../../shared/types';

export const MiniRecorderView: React.FC = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [audioLevel, setAudioLevel] = useState<AudioLevel>({
    averagePower: 0,
    peakPower: 0,
  });

  useEffect(() => {
    // Listen for recording state changes
    if (window.voiceink?.recorder?.onStateChanged) {
      const unsubState = window.voiceink.recorder.onStateChanged((state: string) => {
        setRecordingState(state as RecordingState);
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

  const handleToggle = async () => {
    try {
      if (window.voiceink?.recorder?.toggle) {
        await window.voiceink.recorder.toggle();
      }
    } catch (err) {
      console.error('Failed to toggle recording:', err);
    }
  };

  const getStatusText = (): string => {
    switch (recordingState) {
      case 'recording':
        return 'Recording...';
      case 'transcribing':
        return 'Transcribing...';
      case 'enhancing':
        return 'Enhancing...';
      default:
        return 'Ready';
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

  return (
    <div className="mini-recorder">
      <div className="mini-recorder-pill">
        <button
          className={`mini-recorder-btn ${recordingState}`}
          onClick={handleToggle}
          disabled={recordingState === 'transcribing' || recordingState === 'enhancing'}
        >
          {getButtonIcon()}
        </button>

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

        <span
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};
