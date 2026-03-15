/**
 * ModelsView - AI model management.
 * Mirrors VoiceInk/Views/AI Models/ views.
 */
import React from 'react';

export const ModelsView: React.FC = () => {
  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">AI Models</h1>
        <p className="view-subtitle">
          Manage transcription models for local speech-to-text
        </p>
      </div>

      <div className="card">
        <div className="card-title">Available Models</div>
        <div className="empty-state">
          <div className="empty-state-icon">🤖</div>
          <div className="empty-state-text">
            Model management will be available once the transcription engine is configured.
          </div>
        </div>
      </div>
    </div>
  );
};
