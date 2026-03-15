/**
 * PermissionsView - System permissions management.
 * Mirrors VoiceInk/Views/PermissionsView.swift.
 *
 * Features:
 * - Permission status cards (Microphone, Accessibility, Screen Recording)
 * - Status indicators (green checkmark / orange X)
 * - Request/settings buttons
 * - Refresh button with animation
 */
import React, { useState, useEffect, useCallback } from 'react';

interface PermissionStatus {
  id: string;
  name: string;
  description: string;
  icon: string;
  granted: boolean;
  loading: boolean;
}

export const PermissionsView: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionStatus[]>([
    {
      id: 'microphone',
      name: 'Microphone Access',
      description: 'Required for voice recording and speech-to-text transcription',
      icon: '🎤',
      granted: false,
      loading: true,
    },
    {
      id: 'accessibility',
      name: 'Accessibility Access',
      description: 'Required for pasting transcribed text into the active application',
      icon: '♿',
      granted: false,
      loading: true,
    },
    {
      id: 'screen-recording',
      name: 'Screen Recording',
      description: 'Optional — enables screen context awareness for AI enhancement',
      icon: '🖥️',
      granted: false,
      loading: true,
    },
    {
      id: 'keyboard-shortcut',
      name: 'Keyboard Shortcut',
      description: 'Configure global hotkeys to trigger recording from anywhere',
      icon: '⌨️',
      granted: false,
      loading: true,
    },
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    checkPermissions();
    loadPlatform();
  }, []);

  const loadPlatform = async () => {
    try {
      if (window.voiceink?.app?.getPlatform) {
        const p = await window.voiceink.app.getPlatform();
        setPlatform(p as string);
      }
    } catch { /* ignore */ }
  };

  const checkPermissions = useCallback(async () => {
    setIsRefreshing(true);

    // Check microphone permission using Web API
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissions(prev => prev.map(p =>
        p.id === 'microphone' ? { ...p, granted: result.state === 'granted', loading: false } : p
      ));
    } catch {
      // Fallback: try to enumerate devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMic = devices.some(d => d.kind === 'audioinput' && d.label !== '');
        setPermissions(prev => prev.map(p =>
          p.id === 'microphone' ? { ...p, granted: hasMic, loading: false } : p
        ));
      } catch {
        setPermissions(prev => prev.map(p =>
          p.id === 'microphone' ? { ...p, loading: false } : p
        ));
      }
    }

    // Other permissions are platform-specific, mark as unknown for now
    setPermissions(prev => prev.map(p =>
      p.id !== 'microphone' ? { ...p, loading: false } : p
    ));

    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  const requestPermission = async (id: string) => {
    if (id === 'microphone') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        setPermissions(prev => prev.map(p =>
          p.id === 'microphone' ? { ...p, granted: true } : p
        ));
      } catch {
        // Permission denied
      }
    } else if (id === 'keyboard-shortcut') {
      // Navigate to settings
      if (window.voiceink?.window?.navigate) {
        window.voiceink.window.navigate('settings');
      }
    } else {
      // For other permissions, open system settings
      if (window.voiceink?.app?.openExternal) {
        if (platform === 'darwin') {
          if (id === 'accessibility') {
            await window.voiceink.app.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
          } else if (id === 'screen-recording') {
            await window.voiceink.app.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
          }
        } else if (platform === 'win32') {
          // Windows: open privacy settings
          await window.voiceink.app.openExternal('ms-settings:privacy-microphone');
        }
      }
    }
  };

  const getStatusBadge = (permission: PermissionStatus) => {
    if (permission.loading) {
      return <span className="permission-status checking">⏳</span>;
    }
    if (permission.granted) {
      return <span className="permission-status granted">✅</span>;
    }
    return <span className="permission-status denied">⚠️</span>;
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="view-title">🛡️ Permissions</h1>
            <p className="view-subtitle">
              VoiceInk needs certain permissions to function properly.
              Grant the required permissions below.
            </p>
          </div>
          <button
            className={`btn btn-secondary ${isRefreshing ? 'refreshing' : ''}`}
            onClick={checkPermissions}
            disabled={isRefreshing}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {permissions.map(permission => (
        <div key={permission.id} className="permission-card card">
          <div className="permission-row">
            <div className="permission-icon-circle">
              <span className="permission-icon">{permission.icon}</span>
            </div>
            <div className="permission-info">
              <div className="permission-name">{permission.name}</div>
              <div className="permission-description">{permission.description}</div>
            </div>
            <div className="permission-actions">
              {getStatusBadge(permission)}
              {!permission.granted && !permission.loading && (
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => requestPermission(permission.id)}
                >
                  {permission.id === 'keyboard-shortcut' ? 'Configure →' : 'Grant Access →'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="card-title">ℹ️ About Permissions</div>
        <div className="setting-description" style={{ lineHeight: 1.6, fontSize: '13px' }}>
          <p><strong>Microphone:</strong> Essential for recording your voice for transcription.</p>
          <p><strong>Accessibility:</strong> Needed to paste transcribed text directly into apps. On macOS, enable in System Preferences → Privacy & Security → Accessibility.</p>
          <p><strong>Screen Recording:</strong> Optional — allows VoiceInk to capture screen context for smarter AI enhancements.</p>
          <p><strong>Keyboard Shortcut:</strong> Configure global hotkeys to start/stop recording from any application.</p>
        </div>
      </div>
    </div>
  );
};
