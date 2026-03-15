/**
 * Root App component.
 * Mirrors VoiceInk/Views/ContentView.swift - the main tabbed navigation hub.
 *
 * Uses HashRouter for Electron file:// protocol compatibility.
 * Shows the onboarding wizard on first launch (mirrors OnboardingView.swift).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/sidebar/Sidebar';
import { MetricsView } from './views/MetricsView';
import { SettingsView } from './views/SettingsView';
import { HistoryView } from './views/HistoryView';
import { DictionaryView } from './views/DictionaryView';
import { ModelsView } from './views/ModelsView';
import { EnhancementView } from './views/EnhancementView';
import { MiniRecorderView } from './views/MiniRecorderView';
import { TranscribeAudioView } from './views/TranscribeAudioView';
import { PowerModeView } from './views/PowerModeView';
import { PermissionsView } from './views/PermissionsView';
import { AudioInputView } from './views/AudioInputView';
import { LicenseView } from './views/LicenseView';
import { OnboardingView } from './views/OnboardingView';
import type { ViewType } from '../shared/types';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('metrics');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Check if onboarding has been completed
  useEffect(() => {
    if (window.voiceink?.settings?.get) {
      window.voiceink.settings
        .get('hasCompletedOnboarding')
        .then((value: unknown) => {
          setShowOnboarding(!value);
          setOnboardingChecked(true);
        })
        .catch(() => {
          setOnboardingChecked(true);
        });
    } else {
      setOnboardingChecked(true);
    }
  }, []);

  // Listen for navigation commands from main process
  useEffect(() => {
    if (window.voiceink?.window?.onNavigate) {
      const unsubscribe = window.voiceink.window.onNavigate((viewType: string) => {
        setCurrentView(viewType as ViewType);
      });
      return unsubscribe;
    }
  }, []);

  const handleNavigation = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    // Mark onboarding as completed
    if (window.voiceink?.settings?.set) {
      window.voiceink.settings.set('hasCompletedOnboarding', true);
    }
    setShowOnboarding(false);
  }, []);

  // Wait until we've checked onboarding status
  if (!onboardingChecked) {
    return null;
  }

  return (
    <HashRouter>
      {showOnboarding && (
        <OnboardingView onComplete={handleOnboardingComplete} />
      )}
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout currentView={currentView} onNavigate={handleNavigation} />
          }
        />
        <Route path="/mini-recorder" element={<MiniRecorderView />} />
        <Route path="/history" element={<HistoryView />} />
      </Routes>
    </HashRouter>
  );
};

interface MainLayoutProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ currentView, onNavigate }) => {
  return (
    <div className="app-layout">
      <Sidebar currentView={currentView} onNavigate={onNavigate} />
      <main className="main-content">
        <ContentArea currentView={currentView} />
      </main>
    </div>
  );
};

interface ContentAreaProps {
  currentView: ViewType;
}

const ContentArea: React.FC<ContentAreaProps> = ({ currentView }) => {
  switch (currentView) {
    case 'metrics':
      return <MetricsView />;
    case 'settings':
      return <SettingsView />;
    case 'history':
      return <HistoryView />;
    case 'dictionary':
      return <DictionaryView />;
    case 'models':
      return <ModelsView />;
    case 'enhancement':
      return <EnhancementView />;
    case 'transcribeAudio':
      return <TranscribeAudioView />;
    case 'powerMode':
      return <PowerModeView />;
    case 'permissions':
      return <PermissionsView />;
    case 'audioInput':
      return <AudioInputView />;
    case 'license':
      return <LicenseView />;
    default:
      return <MetricsView />;
  }
};
