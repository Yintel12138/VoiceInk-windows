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

type LicenseStatus = 'trial' | 'active' | 'expired' | 'none';

interface LicenseInfo {
  status: LicenseStatus;
  key?: string;
  email?: string;
  expiresAt?: string;
  trialDaysRemaining?: number;
}

const FEATURES_COMPARISON = [
  { name: 'Local transcription', free: true, pro: true },
  { name: 'Custom vocabulary', free: true, pro: true },
  { name: 'Word replacements', free: true, pro: true },
  { name: 'Cloud transcription providers', free: false, pro: true },
  { name: 'AI text enhancement', free: false, pro: true },
  { name: 'Power Modes', free: false, pro: true },
  { name: 'Screen context awareness', free: false, pro: true },
  { name: 'Custom enhancement prompts', free: false, pro: true },
  { name: 'Priority support', free: false, pro: true },
  { name: 'Unlimited history', free: false, pro: true },
];

export const LicenseView: React.FC = () => {
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
      setActivationError('Invalid license key. Keys should start with "VK-".');
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
      case 'active': return 'Active';
      case 'trial': return `Trial (${licenseInfo.trialDaysRemaining} days remaining)`;
      case 'expired': return 'Expired';
      default: return 'Not Activated';
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">
          VoiceInk <span className="pro-badge">PRO</span>
        </h1>
        <p className="view-subtitle">
          Unlock the full power of VoiceInk with a Pro license
        </p>
      </div>

      {/* License Status */}
      <div className="card">
        <div className="card-title">License Status</div>
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
                Expires: {new Date(licenseInfo.expiresAt).toLocaleDateString()}
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
              ? `Your trial expires in ${licenseInfo.trialDaysRemaining} days. Activate a license to continue using Pro features.`
              : `You have ${licenseInfo.trialDaysRemaining} days remaining in your trial. Enjoy all Pro features!`
            }
          </div>
        </div>
      )}

      {/* License Key Input */}
      {licenseInfo.status !== 'active' && (
        <div className="card">
          <div className="card-title">Activate License</div>
          <div className="license-input-row">
            <input
              className="input"
              value={licenseKey}
              onChange={e => setLicenseKey(e.target.value)}
              placeholder="Enter your license key (e.g., VK-XXXX-XXXX-XXXX)"
              onKeyDown={e => e.key === 'Enter' && activateLicense()}
              disabled={isActivating}
            />
            <button
              className="btn btn-primary"
              onClick={activateLicense}
              disabled={isActivating || !licenseKey.trim()}
            >
              {isActivating ? '⏳ Activating...' : '🔑 Activate'}
            </button>
          </div>
          {activationError && (
            <div className="error-message" style={{ marginTop: '8px' }}>
              {activationError}
            </div>
          )}
          <p className="setting-description" style={{ marginTop: '12px' }}>
            Don&apos;t have a license? <a href="#" onClick={() => window.voiceink?.app?.openExternal('https://voiceink.app/pricing')}>
              Get VoiceInk Pro →
            </a>
          </p>
        </div>
      )}

      {/* Deactivate */}
      {licenseInfo.status === 'active' && (
        <div className="card">
          <div className="card-title">License Management</div>
          <div className="setting-row">
            <div className="setting-label">
              <span className="setting-name">License Key</span>
              <span className="setting-description">{licenseInfo.key}</span>
            </div>
            <button className="btn btn-secondary" onClick={deactivateLicense}>
              Deactivate
            </button>
          </div>
        </div>
      )}

      {/* Feature Comparison */}
      <div className="card">
        <div className="card-title">Feature Comparison</div>
        <table className="feature-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th className="feature-col-center">Free</th>
              <th className="feature-col-center">
                Pro <span className="pro-badge-small">PRO</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURES_COMPARISON.map(feature => (
              <tr key={feature.name}>
                <td>{feature.name}</td>
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
