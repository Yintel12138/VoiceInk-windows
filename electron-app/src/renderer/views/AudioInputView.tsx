/**
 * AudioInputView - Audio device selection and configuration.
 * Mirrors VoiceInk/Views/AudioInputSettingsView.swift.
 *
 * Features:
 * - Audio device listing with backend integration
 * - Device selection with persistence
 * - Audio level meter (real-time)
 * - Device configuration
 */
import React, { useState, useEffect, useCallback } from 'react';
import type { AudioDevice } from '../../shared/types';

declare global {
  interface Window {
    voiceink: {
      audio: {
        listDevices: () => Promise<AudioDevice[]>;
        selectDevice: (deviceId: string) => Promise<boolean>;
        getSelectedDevice: () => Promise<string>;
      };
    };
  }
}

export const AudioInputView: React.FC = () => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testStream, setTestStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    loadDevicesAndSelection();
    return () => {
      // Cleanup test stream on unmount
      if (testStream) {
        testStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const loadDevicesAndSelection = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load saved device selection from backend
      const savedDeviceId = await window.voiceink.audio.getSelectedDevice();

      // Request permission first to get labeled devices
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
      } catch { /* may already have permission */ }

      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = mediaDevices
        .filter(d => d.kind === 'audioinput')
        .map((d, i) => ({
          id: d.deviceId,
          name: d.label || `Microphone ${i + 1}`,
          isDefault: d.deviceId === 'default' || i === 0,
          isInput: true,
        }));

      setDevices(audioInputs);

      // Set selected device to saved value or first device
      if (savedDeviceId && audioInputs.some(d => d.id === savedDeviceId)) {
        setSelectedDeviceId(savedDeviceId);
      } else if (audioInputs.length > 0) {
        const defaultDevice = audioInputs[0];
        setSelectedDeviceId(defaultDevice.id);
        // Save the default selection to backend
        await window.voiceink.audio.selectDevice(defaultDevice.id);
      }
    } catch (err) {
      console.error('Failed to load audio devices:', err);
    }
    setIsLoading(false);
  }, []);

  const selectDevice = useCallback(async (deviceId: string) => {
    try {
      // Save selection to backend
      await window.voiceink.audio.selectDevice(deviceId);
      setSelectedDeviceId(deviceId);

      // Stop existing mic test if running
      if (testStream) {
        testStream.getTracks().forEach(t => t.stop());
        setTestStream(null);
        setIsTestingMic(false);
        setAudioLevel(0);
      }
    } catch (err) {
      console.error('Failed to select audio device:', err);
    }
  }, [testStream]);

  const toggleMicTest = useCallback(async () => {
    if (isTestingMic && testStream) {
      testStream.getTracks().forEach(t => t.stop());
      setTestStream(null);
      setIsTestingMic(false);
      setAudioLevel(0);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setTestStream(stream);
      setIsTestingMic(true);

      // Create audio context for level metering
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!stream.active) {
          audioContext.close();
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(avg / 255);
        requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.error('Failed to start mic test:', err);
    }
  }, [isTestingMic, testStream, selectedDeviceId]);

  return (
    <div className="view-container">
      <div className="view-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="view-title">Audio Input</h1>
            <p className="view-subtitle">
              Select and configure your microphone for voice recording
            </p>
          </div>
          <button className="btn btn-secondary" onClick={loadDevicesAndSelection} disabled={isLoading}>
            🔄 Refresh Devices
          </button>
        </div>
      </div>

      {/* Device List */}
      <div className="card">
        <div className="card-title">Input Devices</div>
        {isLoading ? (
          <div className="empty-state">
            <div className="empty-state-text">Loading audio devices...</div>
          </div>
        ) : devices.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎤</div>
            <div className="empty-state-text">
              No audio input devices found. Please connect a microphone and click Refresh.
            </div>
          </div>
        ) : (
          <div className="device-list">
            {devices.map(device => (
              <div
                key={device.id}
                className={`device-item ${selectedDeviceId === device.id ? 'selected' : ''}`}
                onClick={() => selectDevice(device.id)}
              >
                <div className="device-icon">
                  {selectedDeviceId === device.id ? '✅' : '🎤'}
                </div>
                <div className="device-info">
                  <div className="device-name">{device.name}</div>
                  {device.isDefault && (
                    <span className="badge badge-accent">Default</span>
                  )}
                </div>
                {selectedDeviceId === device.id && (
                  <span className="device-selected-indicator">●</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audio Level Meter */}
      <div className="card">
        <div className="card-title">Microphone Test</div>
        <p className="setting-description" style={{ marginBottom: '16px' }}>
          Test your microphone to verify it&apos;s working properly. Speak into your mic to see the audio level.
        </p>
        <div className="audio-level-container">
          <div className="audio-level-meter">
            <div
              className="audio-level-fill"
              style={{
                width: `${Math.min(audioLevel * 100, 100)}%`,
                backgroundColor: audioLevel > 0.8 ? 'var(--danger)' : audioLevel > 0.5 ? '#f0ad4e' : 'var(--accent)',
              }}
            />
          </div>
          <span className="audio-level-value">
            {isTestingMic ? `${Math.round(audioLevel * 100)}%` : '—'}
          </span>
        </div>
        <button
          className={`btn ${isTestingMic ? 'btn-danger' : 'btn-primary'}`}
          onClick={toggleMicTest}
          style={{ marginTop: '12px' }}
        >
          {isTestingMic ? '⏹ Stop Test' : '▶ Start Mic Test'}
        </button>
      </div>

      {/* Device Settings */}
      <div className="card">
        <div className="card-title">Device Settings</div>
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Sample Rate</span>
            <span className="setting-description">Audio sample rate for recording (Hz)</span>
          </div>
          <select className="select" defaultValue="16000">
            <option value="16000">16,000 Hz (Recommended)</option>
            <option value="44100">44,100 Hz</option>
            <option value="48000">48,000 Hz</option>
          </select>
        </div>
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">Channels</span>
            <span className="setting-description">Number of audio channels</span>
          </div>
          <select className="select" defaultValue="1">
            <option value="1">Mono (Recommended)</option>
            <option value="2">Stereo</option>
          </select>
        </div>
      </div>
    </div>
  );
};
