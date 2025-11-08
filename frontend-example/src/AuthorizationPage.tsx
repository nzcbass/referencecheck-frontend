/**
 * Public Authorization Page
 * Allows candidates to review and sign authorization for reference checking
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://referencecheck-backend-e485f62r5-brindle-c06e9d97.vercel.app/api'
  : 'http://localhost:5001/api';

const AuthorizationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [position, setPosition] = useState('');
  const [signature, setSignature] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [refereesNotified, setRefereesNotified] = useState(0);

  useEffect(() => {
    if (!token) {
      setError('Invalid authorization link. Please check your email for the correct link.');
      setLoading(false);
      return;
    }

    // Fetch authorization details
    fetch(`${API_URL}/public/authorization?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setCandidateName(data.candidate_name);
          setPosition(data.position);
        } else {
          // Show error with hint if available
          let errorMsg = data.error || 'Invalid or expired authorization link';
          if (data.hint) {
            errorMsg += '\n\n' + data.hint;
          }
          setError(errorMsg);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Authorization fetch error:', err);
        setError('Failed to load authorization. Please try again or contact support.');
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signature.trim()) {
      alert('Please enter your full name as signature');
      return;
    }
    
    if (!agreed) {
      alert('You must agree to authorize reference checking to proceed');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/public/authorization/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signature: signature.trim(),
          agreed,
          user_agent: navigator.userAgent,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        alert(`Error: ${data.error || 'Failed to submit authorization'}`);
      }
    } catch (err) {
      alert('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
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
        <p>Please wait while we load your authorization form.</p>
      </div>
    );
  }

  if (error) {
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
        <p style={{ fontSize: '16px', lineHeight: '1.6' }}>{error}</p>
        <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          If you believe this is an error, please contact the hiring team for assistance.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ 
        maxWidth: '600px', 
        margin: '50px auto', 
        padding: '40px', 
        textAlign: 'center', 
        background: '#d1fae5', 
        border: '2px solid #10b981', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#059669', marginTop: 0 }}>✅ Authorization Complete</h2>
        <p style={{ fontSize: '18px', fontWeight: '500', marginBottom: '20px' }}>
          Thank you, {candidateName}!
        </p>
        <p style={{ fontSize: '16px', lineHeight: '1.6' }}>
          Your authorization has been successfully submitted. We will now proceed with contacting your referees for the <strong>{position}</strong> position.
        </p>
        <p style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
          We'll keep you updated on the progress of your reference checks.
        </p>
        <div style={{ 
          marginTop: '40px', 
          padding: '20px', 
          background: 'white', 
          borderRadius: '6px',
          fontSize: '14px',
          color: '#666'
        }}>
          <p style={{ margin: 0 }}>
            <strong>What happens next:</strong><br />
            1. Your referees will be contacted via email<br />
            2. They will complete a brief reference check<br />
            3. Results will be compiled into a report<br />
            4. The hiring team will review and contact you
          </p>
        </div>
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
        maxWidth: '700px', 
        margin: '0 auto', 
        padding: '40px', 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
      }}>
        <h1 style={{ marginTop: 0, marginBottom: '10px', color: '#1f2937' }}>
          Reference Check Authorization
        </h1>
        <div style={{ 
          padding: '15px', 
          background: '#f9fafb', 
          borderRadius: '6px', 
          marginBottom: '30px',
          borderLeft: '4px solid #2563eb'
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            <strong>Candidate:</strong> {candidateName}<br />
            <strong>Position:</strong> {position}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ 
            background: '#f9fafb', 
            padding: '25px', 
            borderRadius: '8px', 
            marginBottom: '30px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ marginTop: 0, color: '#1f2937' }}>Authorization Agreement</h3>
            <p style={{ lineHeight: '1.7' }}>
              By signing below, I authorize the collection of professional references as part of my application for the position of <strong>{position}</strong>.
            </p>
            
            <p style={{ marginTop: '20px', marginBottom: '10px', fontWeight: '600', color: '#1f2937' }}>
              I understand and authorize:
            </p>
            <ul style={{ textAlign: 'left', lineHeight: '1.8', paddingLeft: '20px' }}>
              <li>Permission to contact my professional referees</li>
              <li>Collection of feedback about my work history, performance, and professional conduct</li>
              <li>Use of this information in making hiring decisions</li>
              <li>Storage of this information for record-keeping purposes in accordance with privacy laws</li>
            </ul>

            <p style={{ marginTop: '20px', marginBottom: '10px', fontWeight: '600', color: '#1f2937' }}>
              I acknowledge:
            </p>
            <ul style={{ textAlign: 'left', lineHeight: '1.8', paddingLeft: '20px' }}>
              <li>This authorization is voluntary and I may withdraw consent at any time</li>
              <li>The information collected will be kept confidential</li>
              <li>I have the right to request a copy of any references collected</li>
              <li>This authorization will remain in effect for this hiring process</li>
            </ul>
          </div>

          <div style={{ marginBottom: '25px' }}>
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
              placeholder="John Smith"
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
                I have read and agree to the authorization terms above. I understand that this authorization will remain in effect for this hiring process. <span style={{ color: '#dc2626', fontWeight: '600' }}>*</span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || !signature.trim() || !agreed}
            style={{
              width: '100%',
              padding: '16px',
              background: submitting || !signature.trim() || !agreed ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: submitting || !signature.trim() || !agreed ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!submitting && signature.trim() && agreed) {
                e.currentTarget.style.background = '#1d4ed8';
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting && signature.trim() && agreed) {
                e.currentTarget.style.background = '#2563eb';
              }
            }}
          >
            {submitting ? '⏳ Submitting Authorization...' : '✅ Submit Authorization'}
          </button>
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
            <strong>Date:</strong> {new Date().toLocaleDateString('en-NZ', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          <p style={{ margin: 0 }}>
            Questions? Contact the hiring team for assistance.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthorizationPage;


