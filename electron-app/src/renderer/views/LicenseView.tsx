/**
 * LicenseView - VoiceInk Pro license management.
 * Mirrors VoiceInk/Views/License/ views.
 *
 * Features:
 * - License key input and activation
 * - License status display
 * - Trial management
 * - Feature comparison (Free vs Pro)
 * - Subscription management
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

type LicenseStatus = 'trial' | 'active' | 'expired' | 'none';

interface LicenseInfo {
  status: LicenseStatus;
  key?: string;
  email?: string;
  expiresAt?: string;
  trialDaysRemaining?: number;
}

export const LicenseView: React.FC = () => {
  const { t } = useTranslation();

  const FEATURES_COMPARISON = [
    { key: 'localTranscription', free: true, pro: true },
    { key: 'customVocabulary', free: true, pro: true },
    { key: 'wordReplacements', free: true, pro: true },
    { key: 'cloudTranscription', free: false, pro: true },
    { key: 'aiEnhancement', free: false, pro: true },
    { key: 'powerModes', free: false, pro: true },
    { key: 'screenContext', free: false, pro: true },
    { key: 'customPrompts', free: false, pro: true },
    { key: 'prioritySupport', free: false, pro: true },
    { key: 'unlimitedHistory', free: false, pro: true },
  ];

  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>({
    status: 'trial',
    trialDaysRemaining: 7,
  });
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  const activateLicense = async () => {
    if (!licenseKey.trim()) {
      setActivationError('Please enter a license key');
      return;
    }
    setIsActivating(true);
    setActivationError(null);

    // Simulate activation (actual implementation requires Polar.sh integration)
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (licenseKey.startsWith('VK-')) {
      setLicenseInfo({
        status: 'active',
        key: licenseKey,
        email: 'user@example.com',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setActivationError(null);
    } else {
      setActivationError(t('license.activate.invalidKey'));
    }
    setIsActivating(false);
  };

  const deactivateLicense = () => {
    setLicenseInfo({ status: 'trial', trialDaysRemaining: 7 });
    setLicenseKey('');
  };

  const getStatusColor = () => {
    switch (licenseInfo.status) {
      case 'active': return 'var(--accent)';
      case 'trial': return '#f0ad4e';
      case 'expired': return 'var(--danger)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusText = () => {
    switch (licenseInfo.status) {
      case 'active': return t('license.status.active');
      case 'trial': return t('license.status.trial', { days: licenseInfo.trialDaysRemaining });
      case 'expired': return t('license.status.expired');
      default: return t('license.status.notActivated');
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">
          {t('license.title')} <span className="pro-badge">PRO</span>
        </h1>
        <p className="view-subtitle">
          {t('license.subtitle')}
        </p>
      </div>

      {/* License Status */}
      <div className="card">
        <div className="card-title">{t('license.status.title')}</div>
        <div className="license-status-row">
          <div className="license-status-indicator" style={{ backgroundColor: getStatusColor() }}>
            {licenseInfo.status === 'active' ? '✓' : licenseInfo.status === 'trial' ? '⏱' : '✕'}
          </div>
          <div className="license-status-info">
            <div className="license-status-text" style={{ color: getStatusColor() }}>
              {getStatusText()}
            </div>
            {licenseInfo.email && (
              <div className="license-status-email">{licenseInfo.email}</div>
            )}
            {licenseInfo.expiresAt && (
              <div className="license-status-expiry">
                {t('license.status.expires', { date: new Date(licenseInfo.expiresAt).toLocaleDateString() })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trial Warning */}
      {licenseInfo.status === 'trial' && licenseInfo.trialDaysRemaining !== undefined && (
        <div className={`trial-banner ${licenseInfo.trialDaysRemaining <= 3 ? 'warning' : 'info'}`}>
          <div className="trial-banner-icon">
            {licenseInfo.trialDaysRemaining <= 3 ? '⚠️' : 'ℹ️'}
          </div>
          <div className="trial-banner-text">
            {licenseInfo.trialDaysRemaining <= 3
              ? t('license.trial.expiringSoon', { days: licenseInfo.trialDaysRemaining })
              : t('license.trial.remaining', { days: licenseInfo.trialDaysRemaining })
            }
          </div>
        </div>
      )}

      {/* License Key Input */}
      {licenseInfo.status !== 'active' && (
        <div className="card">
          <div className="card-title">{t('license.activate.title')}</div>
          <div className="license-input-row">
            <input
              className="input"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value)}
              placeholder={t('license.activate.placeholder')}
              onKeyDown={e => e.key === 'Enter' && activateLicense()}
              disabled={isActivating}
            />
            <button
              className="btn btn-primary"
              onClick={activateLicense}
              disabled={isActivating || !licenseKey.trim()}
            >
              {isActivating ? t('license.activate.activating') : t('license.activate.activateBtn')}
            </button>
          </div>
          {activationError && (
            <div className="error-message" style={{ marginTop: '8px' }}>
              {activationError}
            </div>
          )}
          <p className="setting-description" style={{ marginTop: '12px' }}>
            <a href="#" onClick={() => window.voiceink?.app?.openExternal('https://voiceink.app/pricing')}>
              {t('license.activate.getLink')}
            </a>
          </p>
        </div>
      )}

      {/* Deactivate */}
      {licenseInfo.status === 'active' && (
        <div className="card">
          <div className="card-title">{t('license.management.title')}</div>
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">{t('license.management.key')}</span>
              <span className="setting-description">{licenseInfo.key}</span>
            </div>
            <button className="btn btn-secondary" onClick={deactivateLicense}>
              {t('license.management.deactivate')}
            </button>
          </div>
        </div>
      )}

      {/* Feature Comparison */}
      <div className="card">
        <div className="card-title">{t('license.comparison.title')}</div>
        <table className="feature-table">
          <thead>
            <tr>
              <th>{t('license.comparison.feature')}</th>
              <th className="feature-col-center">{t('license.comparison.free')}</th>
              <th className="feature-col-center">
                {t('license.comparison.pro')} <span className="pro-badge-small">PRO</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURES_COMPARISON.map(feature => (
              <tr key={feature.key}>
                <td>{t(`license.comparison.features.${feature.key}`)}</td>
                <td className="feature-col-center">
                  {feature.free ? '✅' : '—'}
                </td>
                <td className="feature-col-center">
                  {feature.pro ? '✅' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
