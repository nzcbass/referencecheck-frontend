/**
 * Settings Component
 * Central hub for managing messaging templates and contact information
 */

import React, { useState, useEffect } from 'react';

interface UserSettings {
  contact_name: string;
  contact_mobile: string;
  contact_email: string;
  company_name: string;
  link_expiry_days: number;
  email_template?: string;
  sms_template?: string;
}

interface SettingsProps {
  userId: string;
  apiUrl?: string;
  onBack?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  userId,
  apiUrl = 'http://localhost:5001/api',
  onBack,
}) => {
  const [settings, setSettings] = useState<UserSettings>({
    contact_name: '',
    contact_mobile: '',
    contact_email: '',
    company_name: '',
    link_expiry_days: 5,
    email_template: '',
    sms_template: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [userId]);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/users/${userId}/settings`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch settings');
      }

      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${apiUrl}/users/${userId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccessMessage('✅ Settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '20px',
            }}
          >
            ← Back
          </button>
        )}
        <h1 style={{ margin: '0 0 10px 0', color: '#1f2937', fontSize: '32px' }}>
          ⚙️ Settings
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '16px' }}>
          Manage your contact information and messaging preferences
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#991b1b',
          marginBottom: '20px',
        }}>
          ❌ {error}
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '6px',
          color: '#15803d',
          marginBottom: '20px',
        }}>
          {successMessage}
        </div>
      )}

      {/* Contact Information Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '20px',
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '20px' }}>
          📧 Contact Information
        </h2>
        <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
          This information will be displayed in emails sent to referees when they have questions.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            Your Name *
          </label>
          <input
            type="text"
            value={settings.contact_name}
            onChange={(e) => setSettings({ ...settings, contact_name: e.target.value })}
            placeholder="e.g., John Smith"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            Mobile Number *
          </label>
          <input
            type="tel"
            value={settings.contact_mobile}
            onChange={(e) => setSettings({ ...settings, contact_mobile: e.target.value })}
            placeholder="e.g., +64 21 123 4567"
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            Email Address *
          </label>
          <input
            type="email"
            value={settings.contact_email}
            onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
            placeholder="e.g., john@company.com"
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            Company Name *
          </label>
          <input
            type="text"
            value={settings.company_name}
            onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
            placeholder="e.g., Acme Corporation"
            required
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>
      </div>

      {/* Email Template Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '20px',
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '20px' }}>
          📧 Email Message Template
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            Email Message
          </label>
          <textarea
            value={`Hi {referee_first_name},

You've been asked to provide a reference for {candidate_first_name} {candidate_last_name}, who is applying for the position of {position} through {company_name}.

Please click the link below to complete the reference check. This should take approximately 10-15 minutes.

{reference_link}

This link will expire in {expires_in_days} days.

If you have any questions, please don't hesitate to reach out to:
{contact_name}
{contact_mobile}
{contact_email}
{company_name}

Thank you for your time!

Best regards`}
            readOnly
            rows={18}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
            }}
          />
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
            Not configurable at this stage
          </p>
        </div>
      </div>

      {/* SMS Template Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '20px',
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '20px' }}>
          💬 SMS Message Template
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
            SMS Message
          </label>
          <textarea
            value={`Hi {referee_first_name}, {candidate_first_name} has provided your details to be a referee for them. Please click the link to complete the reference {reference_link}, it will take 10 - 15 minutes. Thanks, {contact_name}, {company_name}`}
            readOnly
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              backgroundColor: '#f9fafb',
              color: '#6b7280',
            }}
          />
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
            Not configurable at this stage
          </p>
        </div>
      </div>

      {/* Reminders Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '20px',
      }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: '20px' }}>
          🔔 Reminders
        </h2>
        <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
          Following the first email, the referee will then receive a follow up email the next morning, then the text message reminders on the following 2 days before their link expires.
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving || !settings.contact_name || !settings.contact_mobile || !settings.contact_email || !settings.company_name}
          style={{
            padding: '12px 24px',
            backgroundColor: (settings.contact_name && settings.contact_mobile && settings.contact_email && settings.company_name && !saving) ? '#2563eb' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (settings.contact_name && settings.contact_mobile && settings.contact_email && settings.company_name && !saving) ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: '600',
            width: '100%',
          }}
        >
          {saving ? 'Saving...' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
