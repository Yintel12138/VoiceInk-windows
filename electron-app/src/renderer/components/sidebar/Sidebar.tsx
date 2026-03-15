/**
 * Sidebar component.
 * Mirrors VoiceInk/Views/ContentView.swift sidebar navigation.
 *
 * Displays app header with navigation items grouped by category.
 */
import React from 'react';
import type { ViewType } from '../../../shared/types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

interface NavItem {
  type: ViewType;
  icon: string;
  label: string;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { type: 'metrics', icon: '📊', label: 'Dashboard' },
      { type: 'transcribeAudio', icon: '🎤', label: 'Transcribe Audio' },
    ],
  },
  {
    title: 'AI & Models',
    items: [
      { type: 'models', icon: '🤖', label: 'AI Models' },
      { type: 'enhancement', icon: '✨', label: 'AI Enhancement' },
      { type: 'powerMode', icon: '⚡', label: 'Power Mode' },
    ],
  },
  {
    title: 'Customization',
    items: [
      { type: 'dictionary', icon: '📖', label: 'Dictionary' },
      { type: 'audioInput', icon: '🎧', label: 'Audio Input' },
    ],
  },
  {
    title: 'System',
    items: [
      { type: 'settings', icon: '⚙️', label: 'Settings' },
      { type: 'permissions', icon: '🔒', label: 'Permissions' },
      { type: 'license', icon: '🏷️', label: 'License' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
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
          <span>VoiceInk</span>
        </div>
      </div>

      {navSections.map((section) => (
        <div key={section.title} className="sidebar-section">
          <div className="sidebar-section-title">{section.title}</div>
          {section.items.map((item) => (
            <button
              key={item.type}
              className={`sidebar-item ${currentView === item.type ? 'active' : ''}`}
              onClick={() => onNavigate(item.type)}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ))}

      {/* History button opens a separate window */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Data</div>
        <button
          className={`sidebar-item ${currentView === 'history' ? 'active' : ''}`}
          onClick={handleHistoryClick}
        >
          <span className="sidebar-item-icon">📋</span>
          <span>History</span>
        </button>
      </div>
    </nav>
  );
};
