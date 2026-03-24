/**
 * Sidebar component.
 * Mirrors VoiceInk/Views/ContentView.swift sidebar navigation.
 *
 * Displays app header with navigation items grouped by category.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ViewType } from '../../../shared/types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

interface NavItem {
  type: ViewType;
  icon: string;
  labelKey: string;
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: 'sidebar.sections.overview',
    items: [
      { type: 'metrics', icon: '📊', labelKey: 'sidebar.items.dashboard' },
      { type: 'transcribeAudio', icon: '🎤', labelKey: 'sidebar.items.transcribeAudio' },
    ],
  },
  {
    titleKey: 'sidebar.sections.aiModels',
    items: [
      { type: 'models', icon: '🤖', labelKey: 'sidebar.items.aiModels' },
      { type: 'enhancement', icon: '✨', labelKey: 'sidebar.items.aiEnhancement' },
      { type: 'powerMode', icon: '⚡', labelKey: 'sidebar.items.powerMode' },
    ],
  },
  {
    titleKey: 'sidebar.sections.customization',
    items: [
      { type: 'dictionary', icon: '📖', labelKey: 'sidebar.items.dictionary' },
      { type: 'audioInput', icon: '🎧', labelKey: 'sidebar.items.audioInput' },
    ],
  },
  {
    titleKey: 'sidebar.sections.system',
    items: [
      { type: 'settings', icon: '⚙️', labelKey: 'sidebar.items.settings' },
      { type: 'permissions', icon: '🔒', labelKey: 'sidebar.items.permissions' },
      { type: 'license', icon: '🏷️', labelKey: 'sidebar.items.license' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { t } = useTranslation();

  const handleHistoryClick = () => {
    if (window.voiceink?.window?.openHistory) {
      window.voiceink.window.openHistory();
    } else {
      onNavigate('history');
    }
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <span>🎙️</span>
          <span>{t('app.name')}</span>
        </div>
      </div>

      {NAV_SECTIONS.map((section) => (
        <div key={section.titleKey} className="sidebar-section">
          <div className="sidebar-section-title">{t(section.titleKey)}</div>
          {section.items.map((item) => (
            <button
              key={item.type}
              className={`sidebar-item ${currentView === item.type ? 'active' : ''}`}
              onClick={() => onNavigate(item.type)}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </button>
          ))}
        </div>
      ))}

      {/* History button opens a separate window */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">{t('sidebar.sections.data')}</div>
        <button
          className={`sidebar-item ${currentView === 'history' ? 'active' : ''}`}
          onClick={handleHistoryClick}
        >
          <span className="sidebar-item-icon">📋</span>
          <span>{t('sidebar.items.history')}</span>
        </button>
      </div>
    </nav>
  );
};
