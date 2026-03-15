/**
 * OnboardingView - Multi-step onboarding wizard.
 * Mirrors VoiceInk/Views/Onboarding/OnboardingView.swift flow:
 *
 * Steps:
 * 1. Welcome - Animated welcome screen with typewriter effect
 * 2. Permissions - Microphone access and accessibility setup
 * 3. Model Download - Select and download a transcription model
 * 4. Tutorial - Quick guide on how to use hotkeys and recording
 * 5. Complete - All done, start using VoiceInk
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface OnboardingViewProps {
  onComplete: () => void;
}

type OnboardingStep = 'welcome' | 'permissions' | 'model' | 'tutorial' | 'complete';

const STEPS: OnboardingStep[] = ['welcome', 'permissions', 'model', 'tutorial', 'complete'];

// Typewriter roles matching Swift's TypewriterRoles view
const TYPEWRITER_ROLES = [
  'Writers ✍️',
  'Developers 💻',
  'Researchers 🔬',
  'Students 📚',
  'Professionals 💼',
  'Content Creators 🎨',
  'Everyone 🌍',
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation on mount
    const timer = setTimeout(() => setFadeIn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const goToStep = useCallback((step: OnboardingStep) => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentStep(step);
      setFadeIn(true);
    }, 300);
  }, []);

  const goNext = useCallback(() => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) {
      goToStep(STEPS[idx + 1]);
    }
  }, [currentStep, goToStep]);

  const handleComplete = useCallback(() => {
    setFadeIn(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-background">
        <div className="onboarding-particles" />
        <div className="onboarding-glow" />
      </div>

      <div className={`onboarding-container ${fadeIn ? 'fade-in' : 'fade-out'}`}>
        {/* Progress indicator */}
        <div className="onboarding-progress">
          {STEPS.map((step, idx) => (
            <div
              key={step}
              className={`onboarding-progress-dot ${
                STEPS.indexOf(currentStep) >= idx ? 'active' : ''
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        {currentStep === 'welcome' && (
          <WelcomeStep onNext={goNext} onSkip={handleSkip} />
        )}
        {currentStep === 'permissions' && (
          <PermissionsStep onNext={goNext} onSkip={handleSkip} />
        )}
        {currentStep === 'model' && (
          <ModelDownloadStep onNext={goNext} onSkip={handleSkip} />
        )}
        {currentStep === 'tutorial' && (
          <TutorialStep onNext={goNext} onSkip={handleSkip} />
        )}
        {currentStep === 'complete' && (
          <CompleteStep onFinish={handleComplete} />
        )}
      </div>
    </div>
  );
};

// --- Step Components ---

const WelcomeStep: React.FC<{ onNext: () => void; onSkip: () => void }> = ({
  onNext,
  onSkip,
}) => {
  const [typewriterText, setTypewriterText] = useState('');
  const [currentRoleIdx, setCurrentRoleIdx] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [showSecondary, setShowSecondary] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Typewriter effect matching Swift's TypewriterRoles
  useEffect(() => {
    const role = TYPEWRITER_ROLES[currentRoleIdx];
    let charIdx = 0;

    if (isTyping) {
      timerRef.current = setInterval(() => {
        charIdx++;
        setTypewriterText(role.slice(0, charIdx));
        if (charIdx >= role.length) {
          clearInterval(timerRef.current!);
          // Wait, then start erasing
          timerRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 1500);
        }
      }, 80);
    } else {
      // Erasing
      let eraseIdx = role.length;
      timerRef.current = setInterval(() => {
        eraseIdx--;
        setTypewriterText(role.slice(0, eraseIdx));
        if (eraseIdx <= 0) {
          clearInterval(timerRef.current!);
          setCurrentRoleIdx((prev) => (prev + 1) % TYPEWRITER_ROLES.length);
          setIsTyping(true);
        }
      }, 40);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        clearTimeout(timerRef.current);
      }
    };
  }, [currentRoleIdx, isTyping]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSecondary(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="onboarding-step welcome-step">
      <div className="onboarding-icon">🎙️</div>
      <h1 className="onboarding-title">Welcome to VoiceInk</h1>
      <p className="onboarding-subtitle">The Future of Typing</p>

      <div className="typewriter-container">
        <span className="typewriter-prefix">Built for </span>
        <span className="typewriter-text">{typewriterText}</span>
        <span className="typewriter-cursor">|</span>
      </div>

      {showSecondary && (
        <div className="welcome-features">
          <div className="welcome-feature">
            <span className="welcome-feature-icon">⚡</span>
            <span>Lightning-fast local transcription</span>
          </div>
          <div className="welcome-feature">
            <span className="welcome-feature-icon">🔒</span>
            <span>100% private - runs on your device</span>
          </div>
          <div className="welcome-feature">
            <span className="welcome-feature-icon">🤖</span>
            <span>AI-powered text enhancement</span>
          </div>
        </div>
      )}

      <div className="onboarding-actions">
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          Get Started
        </button>
        <button className="btn btn-ghost" onClick={onSkip}>
          Skip Setup
        </button>
      </div>
    </div>
  );
};

const PermissionsStep: React.FC<{ onNext: () => void; onSkip: () => void }> = ({
  onNext,
  onSkip,
}) => {
  const [micGranted, setMicGranted] = useState(false);
  const [checking, setChecking] = useState(false);

  const requestMicrophone = async () => {
    setChecking(true);
    try {
      // Request microphone permission via navigator.mediaDevices
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission granted - stop the stream
      stream.getTracks().forEach((track) => track.stop());
      setMicGranted(true);
    } catch {
      // Permission denied or error
      setMicGranted(false);
    }
    setChecking(false);
  };

  return (
    <div className="onboarding-step permissions-step">
      <div className="onboarding-icon">🔐</div>
      <h2 className="onboarding-title">Permissions</h2>
      <p className="onboarding-subtitle">
        VoiceInk needs access to your microphone to transcribe speech.
      </p>

      <div className="permission-cards">
        <div className={`permission-card ${micGranted ? 'granted' : ''}`}>
          <div className="permission-card-icon">🎤</div>
          <div className="permission-card-info">
            <div className="permission-card-title">Microphone Access</div>
            <div className="permission-card-desc">
              Required for recording audio for transcription.
            </div>
          </div>
          <div className="permission-card-action">
            {micGranted ? (
              <span className="permission-status granted">✓ Granted</span>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={requestMicrophone}
                disabled={checking}
              >
                {checking ? 'Checking...' : 'Grant Access'}
              </button>
            )}
          </div>
        </div>

        <div className="permission-card">
          <div className="permission-card-icon">⌨️</div>
          <div className="permission-card-info">
            <div className="permission-card-title">Keyboard Shortcuts</div>
            <div className="permission-card-desc">
              Configure global hotkeys to start/stop recording from any app.
            </div>
          </div>
          <div className="permission-card-action">
            <span className="permission-status info">Set up in Settings</span>
          </div>
        </div>

        <div className="permission-card">
          <div className="permission-card-icon">📋</div>
          <div className="permission-card-info">
            <div className="permission-card-title">Clipboard Access</div>
            <div className="permission-card-desc">
              Used to paste transcriptions at your cursor position.
            </div>
          </div>
          <div className="permission-card-action">
            <span className="permission-status granted">✓ Available</span>
          </div>
        </div>
      </div>

      <div className="onboarding-actions">
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          Continue
        </button>
        <button className="btn btn-ghost" onClick={onSkip}>
          Skip
        </button>
      </div>
    </div>
  );
};

interface ModelInfo {
  id: string;
  displayName: string;
  description: string;
  size: number;
  isDownloaded: boolean;
}

const ModelDownloadStep: React.FC<{ onNext: () => void; onSkip: () => void }> = ({
  onNext,
  onSkip,
}) => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    // Fetch available models from main process
    if (window.voiceink?.models?.list) {
      window.voiceink.models.list().then((result: ModelInfo[]) => {
        setModels(result || []);
        // Pre-select the first small model
        const defaultModel = result?.find((m: ModelInfo) => m.id === 'whisper-base') || result?.[0];
        if (defaultModel) {
          setSelectedModel(defaultModel.id);
          if (defaultModel.isDownloaded) {
            setDownloaded(true);
          }
        }
      }).catch(() => {
        // Use fallback models list for development
        setModels([
          { id: 'whisper-tiny', displayName: 'Whisper Tiny', description: 'Fastest, ~75MB', size: 75_000_000, isDownloaded: false },
          { id: 'whisper-base', displayName: 'Whisper Base', description: 'Balanced, ~142MB', size: 142_000_000, isDownloaded: false },
          { id: 'whisper-small', displayName: 'Whisper Small', description: 'Recommended, ~466MB', size: 466_000_000, isDownloaded: false },
        ]);
        setSelectedModel('whisper-base');
      });
    }

    // Listen for download progress
    if (window.voiceink?.models?.onDownloadProgress) {
      const unsubscribe = window.voiceink.models.onDownloadProgress((p: unknown) => {
        const progressData = p as { progress: number; modelId: string };
        setProgress(progressData.progress);
      });
      return unsubscribe;
    }
  }, []);

  const handleDownload = async () => {
    if (!selectedModel) return;
    setDownloading(true);
    setProgress(0);

    try {
      if (window.voiceink?.models?.download) {
        await window.voiceink.models.download(selectedModel);
      }
      setDownloaded(true);

      // Select the model
      if (window.voiceink?.models?.select) {
        await window.voiceink.models.select(selectedModel);
      }
    } catch {
      // Download failed
    }
    setDownloading(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} MB`;
    return `${(bytes / 1_000).toFixed(0)} KB`;
  };

  return (
    <div className="onboarding-step model-step">
      <div className="onboarding-icon">🤖</div>
      <h2 className="onboarding-title">Download a Model</h2>
      <p className="onboarding-subtitle">
        Choose a speech recognition model. Smaller models are faster, larger ones are more accurate.
      </p>

      <div className="model-selection">
        {models.slice(0, 5).map((model) => (
          <div
            key={model.id}
            className={`model-option ${selectedModel === model.id ? 'selected' : ''} ${
              model.isDownloaded ? 'downloaded' : ''
            }`}
            onClick={() => !downloading && setSelectedModel(model.id)}
          >
            <div className="model-option-radio">
              {selectedModel === model.id ? '◉' : '○'}
            </div>
            <div className="model-option-info">
              <div className="model-option-name">{model.displayName}</div>
              <div className="model-option-desc">{model.description}</div>
            </div>
            <div className="model-option-size">{formatSize(model.size)}</div>
            {model.isDownloaded && (
              <span className="model-option-badge">✓ Ready</span>
            )}
          </div>
        ))}
      </div>

      {downloading && (
        <div className="download-progress">
          <div className="download-progress-bar">
            <div
              className="download-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="download-progress-text">Downloading... {progress}%</div>
        </div>
      )}

      <div className="onboarding-actions">
        {downloaded ? (
          <button className="btn btn-primary btn-lg" onClick={onNext}>
            Continue
          </button>
        ) : (
          <button
            className="btn btn-primary btn-lg"
            onClick={handleDownload}
            disabled={downloading || !selectedModel}
          >
            {downloading ? 'Downloading...' : 'Download Model'}
          </button>
        )}
        <button className="btn btn-ghost" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
};

const TutorialStep: React.FC<{ onNext: () => void; onSkip: () => void }> = ({
  onNext,
  onSkip,
}) => {
  return (
    <div className="onboarding-step tutorial-step">
      <div className="onboarding-icon">📖</div>
      <h2 className="onboarding-title">How to Use VoiceInk</h2>
      <p className="onboarding-subtitle">
        A quick guide to get you started with voice-to-text transcription.
      </p>

      <div className="tutorial-cards">
        <div className="tutorial-card">
          <div className="tutorial-step-number">1</div>
          <div className="tutorial-card-content">
            <h3>Start Recording</h3>
            <p>
              Press your configured hotkey (default: <kbd>Alt+Shift+V</kbd>) or
              click the microphone button in the menu bar to start recording.
            </p>
          </div>
        </div>

        <div className="tutorial-card">
          <div className="tutorial-step-number">2</div>
          <div className="tutorial-card-content">
            <h3>Speak Naturally</h3>
            <p>
              Talk at a normal pace. VoiceInk works best with clear speech.
              Whisper supports 99+ languages.
            </p>
          </div>
        </div>

        <div className="tutorial-card">
          <div className="tutorial-step-number">3</div>
          <div className="tutorial-card-content">
            <h3>Stop & Paste</h3>
            <p>
              Press the hotkey again to stop. Your transcription is
              automatically copied to the clipboard and pasted at your cursor.
            </p>
          </div>
        </div>

        <div className="tutorial-card">
          <div className="tutorial-step-number">4</div>
          <div className="tutorial-card-content">
            <h3>AI Enhancement (Optional)</h3>
            <p>
              Enable AI enhancement to automatically fix grammar, adjust tone,
              or translate your transcriptions.
            </p>
          </div>
        </div>
      </div>

      <div className="onboarding-actions">
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          Almost Done!
        </button>
        <button className="btn btn-ghost" onClick={onSkip}>
          Skip
        </button>
      </div>
    </div>
  );
};

const CompleteStep: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="onboarding-step complete-step">
      {showConfetti && <div className="confetti-animation" />}
      <div className="onboarding-icon complete-icon">🎉</div>
      <h2 className="onboarding-title">You&apos;re All Set!</h2>
      <p className="onboarding-subtitle">
        VoiceInk is ready to use. Start recording with your hotkey or from the
        menu bar.
      </p>

      <div className="complete-tips">
        <div className="complete-tip">
          <span className="complete-tip-icon">💡</span>
          <span>
            Access settings anytime from the sidebar or system tray.
          </span>
        </div>
        <div className="complete-tip">
          <span className="complete-tip-icon">⚡</span>
          <span>
            Use Power Mode to set up app-specific configurations.
          </span>
        </div>
        <div className="complete-tip">
          <span className="complete-tip-icon">📝</span>
          <span>
            View your transcription history anytime in the History section.
          </span>
        </div>
      </div>

      <div className="onboarding-actions">
        <button className="btn btn-primary btn-lg" onClick={onFinish}>
          Start Using VoiceInk
        </button>
      </div>
    </div>
  );
};

export default OnboardingView;
