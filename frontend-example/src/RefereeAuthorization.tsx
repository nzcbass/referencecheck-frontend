/**
 * RefereeAuthorization Component
 * Consent form for referees before providing reference information
 *
 * Similar to candidate authorization but tailored for referees
 * Includes consent for data collection, use, and disclosure
 */

import React, { useState, useEffect } from 'react';

interface RefereeAuthorizationProps {
  token: string;
  apiUrl?: string;
  onAuthorizationComplete?: () => void;
}

interface AuthorizationData {
  referee_name: string;
  candidate_name: string;
  position: string;
  recruiting_company: string;
  contact_email: string;
}

export const RefereeAuthorization: React.FC<RefereeAuthorizationProps> = ({
  token,
  apiUrl = 'http://localhost:5001/api',
  onAuthorizationComplete,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AuthorizationData | null>(null);
  const [signature, setSignature] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid authorization link');
      setLoading(false);
      return;
    }

    // Fetch referee and request details
    fetch(`${apiUrl}/public/referee-authorization?token=${token}`)
      .then(res => res.json())
      .then(responseData => {
        if (responseData.ok) {
          setData(responseData.data);
        } else {
          setError(responseData.error || 'Failed to load authorization form');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Authorization fetch error:', err);
        setError('Failed to load authorization. Please try again.');
        setLoading(false);
      });
  }, [token, apiUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signature.trim()) {
      alert('Please enter your full name as signature');
      return;
    }

    if (!agreed) {
      alert('You must agree to the consent terms to proceed');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/public/referee-authorization/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signature: signature.trim(),
          agreed,
          user_agent: navigator.userAgent,
          signed_at: new Date().toISOString(),
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        // Authorization complete, proceed to reference questions
        if (onAuthorizationComplete) {
          onAuthorizationComplete();
        }
      } else {
        alert(`Error: ${responseData.error || 'Failed to submit authorization'}`);
      }
    } catch (err) {
      alert('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Are you sure you do not wish to provide a reference? The hiring company will be notified.')) {
      return;
    }

    setDeclining(true);
    try {
      const response = await fetch(`${apiUrl}/public/referee-authorization/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          user_agent: navigator.userAgent,
          declined_at: new Date().toISOString(),
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setDeclined(true);
      } else {
        alert(`Error: ${responseData.error || 'Failed to record decline'}`);
      }
    } catch (err) {
      alert('Network error. Please check your connection and try again.');
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '50px auto',
        padding: '30px',
        textAlign: 'center',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>Loading...</h2>
        <p>Please wait while we load your consent form.</p>
      </div>
    );
  }

  if (declined) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '50px auto',
        padding: '40px',
        textAlign: 'center',
        background: '#f0f9ff',
        border: '2px solid #3b82f6',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#1e40af', marginTop: 0 }}>Thank You for Your Time</h2>
        <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '20px' }}>
          We've notified {data?.recruiting_company || 'the hiring company'} that you do not wish to be a reference.
        </p>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          You may now close this window.
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '50px auto',
        padding: '30px',
        textAlign: 'center',
        background: '#fee2e2',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#dc2626', marginTop: 0 }}>⚠️ Authorization Error</h2>
        <p style={{ fontSize: '16px', lineHeight: '1.6' }}>{error || 'Failed to load authorization data'}</p>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          If you believe this is an error, please contact the hiring team for assistance.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ marginTop: 0, marginBottom: '10px', color: '#1f2937', fontSize: '28px' }}>
          Referee Authorisation and Consent Form
        </h1>

        <p style={{ color: '#666', fontSize: '15px', lineHeight: '1.6', marginBottom: '30px' }}>
          This form confirms that you, as a referee, understand the purpose of the reference process and consent to providing information about the named candidate.
          It also outlines how your information and the information you provide will be collected, used, and stored in compliance with privacy laws.
        </p>

        <div style={{
          padding: '15px',
          background: '#f9fafb',
          borderRadius: '6px',
          marginBottom: '30px',
          borderLeft: '4px solid #2563eb'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            <strong>Referee:</strong> {data.referee_name}<br />
            <strong>Candidate:</strong> {data.candidate_name}<br />
            <strong>Position:</strong> {data.position}<br />
            <strong>Company:</strong> {data.recruiting_company}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{
            background: '#f9fafb',
            padding: '25px',
            borderRadius: '8px',
            marginBottom: '25px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ marginTop: 0, color: '#1f2937', fontSize: '18px' }}>
              1. Consent to Provide Information
            </h3>
            <p style={{ lineHeight: '1.7', marginBottom: '20px' }}>
              I understand that I am being asked to provide information about <strong>{data.candidate_name}</strong> for the purpose of assessing their suitability for employment or engagement with <strong>{data.recruiting_company}</strong>. I confirm that all information I provide will be true and accurate to the best of my knowledge.
            </p>

            <h3 style={{ marginTop: '20px', color: '#1f2937', fontSize: '18px' }}>
              2. Consent to Collection and Use of Information
            </h3>
            <p style={{ lineHeight: '1.7', marginBottom: '10px' }}>
              I understand that my responses, including opinions and factual information about the candidate, will be collected and stored by <strong>{data.recruiting_company}</strong> for the purpose of completing a reference check.
            </p>
            <p style={{ lineHeight: '1.7', marginBottom: '10px', fontWeight: '600' }}>
              This information may be shared with:
            </p>
            <ul style={{ textAlign: 'left', lineHeight: '1.8', paddingLeft: '20px', marginBottom: '20px' }}>
              <li>The hiring organisation or client for whom the reference is being conducted</li>
              <li>The candidate</li>
              <li>Regulatory or compliance bodies where required by law</li>
            </ul>

            <h3 style={{ marginTop: '20px', color: '#1f2937', fontSize: '18px' }}>
              3. Consent to Disclose Information
            </h3>
            <p style={{ lineHeight: '1.7', marginBottom: '20px' }}>
              I consent to <strong>{data.recruiting_company}</strong> disclosing my reference responses to the hiring organisation, the candidate (where required), and any third-party service providers engaged to perform the reference process on their behalf.
            </p>

            <h3 style={{ marginTop: '20px', color: '#1f2937', fontSize: '18px' }}>
              4. Data Storage & Retention
            </h3>
            <p style={{ lineHeight: '1.7', marginBottom: '20px' }}>
              I understand that my reference responses and contact information will be securely stored in accordance with <strong>{data.recruiting_company}</strong> privacy policy and may be retained for audit, compliance, or quality assurance purposes.
            </p>

            <h3 style={{ marginTop: '20px', color: '#1f2937', fontSize: '18px' }}>
              5. Right to Withdraw Consent
            </h3>
            <p style={{ lineHeight: '1.7', marginBottom: '20px' }}>
              I acknowledge that I may withdraw my consent to the collection and use of my information at any time by contacting <strong>{data.contact_email}</strong>, though this may affect the ability to complete the reference process.
            </p>

            <h3 style={{ marginTop: '20px', color: '#1f2937', fontSize: '18px' }}>
              6. Acknowledgment
            </h3>
            <p style={{ lineHeight: '1.7', marginBottom: '0' }}>
              I have read and understood the information above and consent to participate as a referee. I understand that my participation is voluntary.
            </p>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ marginTop: 0, color: '#1f2937', fontSize: '18px' }}>
              7. Signature Section
            </h3>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Electronic Signature (type your full name) <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Jane Smith"
              disabled={submitting}
              required
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#2563eb'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
            <small style={{ color: '#666', display: 'block', marginTop: '8px', fontSize: '13px' }}>
              By typing your name above, you are providing a legally binding electronic signature
            </small>
          </div>

          <div style={{
            marginBottom: '30px',
            padding: '15px',
            background: '#fef3c7',
            borderRadius: '6px',
            border: '1px solid #fbbf24'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={submitting}
                required
                style={{
                  marginRight: '12px',
                  marginTop: '4px',
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '14px', lineHeight: '1.6' }}>
                I have read and understood the information above and consent to participate as a referee. I understand that my participation is voluntary and that all information I provide will be true and accurate to the best of my knowledge. <span style={{ color: '#dc2626', fontWeight: '600' }}>*</span>
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              type="submit"
              disabled={submitting || declining || !signature.trim() || !agreed}
              style={{
                width: '100%',
                padding: '16px',
                background: submitting || declining || !signature.trim() || !agreed ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: submitting || declining || !signature.trim() || !agreed ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!submitting && !declining && signature.trim() && agreed) {
                  e.currentTarget.style.background = '#1d4ed8';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting && !declining && signature.trim() && agreed) {
                  e.currentTarget.style.background = '#2563eb';
                }
              }}
            >
              {submitting ? '⏳ Submitting...' : '✅ I Consent - Proceed to Reference Questions'}
            </button>

            <button
              type="button"
              onClick={handleDecline}
              disabled={submitting || declining}
              style={{
                width: '100%',
                padding: '14px',
                background: submitting || declining ? '#d1d5db' : '#ffffff',
                color: '#dc2626',
                border: '2px solid #dc2626',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: submitting || declining ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!submitting && !declining) {
                  e.currentTarget.style.background = '#fee2e2';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting && !declining) {
                  e.currentTarget.style.background = '#ffffff';
                }
              }}
            >
              {declining ? '⏳ Processing...' : '❌ I Don\'t Consent'}
            </button>
          </div>
        </form>

        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: '#f9fafb',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#666',
          textAlign: 'center',
          borderTop: '2px solid #e5e7eb'
        }}>
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>Date:</strong> {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          <p style={{ margin: 0 }}>
            Questions? Contact <strong>{data.contact_email}</strong> for assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RefereeAuthorization;
