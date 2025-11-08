/**
 * SendInvitations Component
 * Review and customize email/SMS messages before sending to referees
 */

import React, { useState, useEffect } from 'react';

interface Referee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
}

interface SendInvitationsProps {
  requestId: string;
  candidateName: string;
  positionAppliedFor: string;
  apiUrl?: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

export const SendInvitations: React.FC<SendInvitationsProps> = ({
  requestId,
  candidateName,
  positionAppliedFor,
  apiUrl = 'http://localhost:5001/api',
  onBack,
  onSuccess,
}) => {
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingAuth, setSendingAuth] = useState(false);
  const [error, setError] = useState<string>('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [authorizationStatus, setAuthorizationStatus] = useState('');

  // Authorization email template
  const [authEmailSubject, setAuthEmailSubject] = useState(`Authorization Required: Reference Check for ${positionAppliedFor}`);
  const [authEmailMessage, setAuthEmailMessage] = useState('');

  // Referee email template
  const [emailSubject, setEmailSubject] = useState(`Reference Request for ${candidateName}`);
  const [emailMessage, setEmailMessage] = useState('');

  // SMS template
  const [smsMessage, setSmsMessage] = useState('');

  useEffect(() => {
    fetchReferees();
    initializeDefaultMessages();
  }, [requestId]);

  const initializeDefaultMessages = () => {
    const candName = candidateName || '{candidate_first_name} {candidate_last_name}';
    const position = positionAppliedFor || '{position}';
    
    // Default authorization email message
    setAuthEmailMessage(
`Dear ${candName},

We would like to conduct reference checks as part of your application for the position of ${position}.

To proceed, we need your authorization to contact your professional referees. This is a standard part of our hiring process.

What you're authorizing:
• Permission to contact your professional referees
• Collection of feedback about your work history and performance  
• Use of this information in our hiring decision

Please click the link below to review and authorize:

{authorization_link}

This link is unique to you and will expire once used.

If you have any questions, please contact us.

Best regards,
The Hiring Team`
    );
    
    // Default referee email message
    setEmailMessage(
`Hi {referee_first_name},

You've been asked to provide a reference for ${candName}, who is applying for the position of ${position}.

Please click the link below to complete the reference check. This should take approximately 10-15 minutes:

{reference_link}

This link will expire in 30 days.

If you have any questions, please don't hesitate to reach out.

Thank you for your time!

Best regards`
    );

    // Default SMS message
    setSmsMessage(
`Hi {referee_first_name}, you've been asked to provide a reference for ${candName} (${position}). Complete here: {reference_link} - Expires in 30 days.`
    );
  };

  const fetchReferees = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/requests/${requestId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch referees');
      }

      setReferees(data.referees || []);
      setCandidateEmail(data.request?.candidate_email || '');
      setAuthorizationStatus(data.request?.authorization_status || 'pending');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAuthorization = async () => {
    if (!confirm(`Send authorization request to ${candidateName}?\n\nThey will receive an email at: ${candidateEmail}\n\n⚠️ Note: Only the most recent email link will work. Previous links will be invalidated.`)) {
      return;
    }

    setSendingAuth(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/requests/${requestId}/send-authorization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send authorization');
      }

      alert(`✅ Authorization request sent to ${candidateName}!\n\nThey will receive an email shortly. Only this latest link will work - any previous authorization links are now invalid.`);

      // Return to home page after success
      if (onSuccess) {
        onSuccess();
      } else if (onBack) {
        onBack();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(`Authorization Error: ${errorMessage}`);
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setSendingAuth(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setError('');

    try {
      // First check if user has completed settings
      const userId = '10242198-4ee0-4540-8cfd-25343df1f41d'; // TODO: Get from auth context
      const settingsResponse = await fetch(`${apiUrl}/users/${userId}/settings`);
      const settingsData = await settingsResponse.json();

      if (settingsResponse.ok && settingsData.settings) {
        const { contact_name, contact_mobile, contact_email, company_name } = settingsData.settings;

        if (!contact_name || !contact_mobile || !contact_email || !company_name) {
          alert('❌ Settings Incomplete\n\nYou must complete all contact information in Settings before sending referee invitations.\n\nRequired fields:\n• Your Name\n• Mobile Number\n• Email Address\n• Company Name\n\nPlease go to Settings and fill in all fields.');
          setSending(false);
          return;
        }
      }

      // Now, mark request as sent
      const response = await fetch(`${apiUrl}/requests/${requestId}/send`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitations');
      }

      // Show actual sending results
      const summary = data.summary || {};
      const sent = summary.sent || 0;
      const failed = summary.failed || 0;
      const total = summary.total || referees.length;
      
      let message = `✅ Invitations Sent!\n\n`;
      message += `📧 ${sent} email(s) sent successfully\n`;
      if (failed > 0) {
        message += `⚠️ ${failed} email(s) failed\n`;
      }
      message += `\nReferees should receive their invitation emails within 30 seconds.`;
      message += `\n\nCheck your inbox (and spam folder) if you added yourself as a test.`;
      
      alert(message);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading referees...</div>;
  }

  return (
    <div className="send-invitations">
      {/* Header */}
      <button onClick={onBack} className="btn-back">
        ← Back to Referees
      </button>

      <h2>Send Reference Check Invitations</h2>
      <p className="help-text">
        {authorizationStatus === 'authorized' || authorizationStatus === 'verbal' ? (
          <span style={{ color: '#059669', fontWeight: '500' }}>
            ✅ Candidate has authorized! Referee invitations were automatically sent to {referees.length} referee(s).
          </span>
        ) : (
          `Review the messages that will be automatically sent to ${referees.length} referee(s) after authorization`
        )}
      </p>

      {/* Candidate Info */}
      <div style={{ 
        background: '#f7fafc', 
        padding: '15px', 
        borderRadius: '6px', 
        marginBottom: '30px',
        border: '1px solid #e2e8f0'
      }}>
        <strong>Candidate:</strong> {candidateName || 'Loading...'}<br />
        <strong>Position:</strong> {positionAppliedFor || 'Loading...'}<br />
        <strong>Email:</strong> {candidateEmail || 'Loading...'}<br />
        <strong>Authorization Status:</strong> {
          authorizationStatus === 'authorized' ? '✅ Authorized' :
          authorizationStatus === 'verbal' ? '✅ Authorized (Verbal)' :
          '⏳ Pending'
        }<br />
        <strong>Referees:</strong> {referees.length}
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Candidate Authorization Status */}
      {authorizationStatus !== 'authorized' && authorizationStatus !== 'verbal' && (
        <div style={{
          marginBottom: '30px',
          padding: '15px',
          borderLeft: '4px solid #f59e0b',
          background: '#fefce8',
          borderRadius: '6px'
        }}>
          <p style={{ margin: 0, color: '#d97706', fontWeight: '500' }}>
            ⚠️ Authorization Required
          </p>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#92400e' }}>
            The candidate will be sent an email to authorise the reference checks before the referees are contacted.
          </p>
        </div>
      )}

      {/* Referee List */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Referee/s:</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {referees.map((referee) => (
            <li
              key={referee.id}
              style={{
                padding: '10px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                marginBottom: '8px'
              }}
            >
              <strong>{referee.first_name} {referee.last_name}</strong>
              <br />
              📧 {referee.email}
              {referee.phone_number && (
                <>
                  <br />
                  📱 {referee.phone_number}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>


      {/* Action Buttons */}
      <div className="form-actions" style={{ marginTop: '40px', textAlign: 'center' }}>
        {authorizationStatus === 'authorized' || authorizationStatus === 'verbal' ? (
          <div style={{ 
            background: '#d1fae5', 
            padding: '20px', 
            borderRadius: '8px',
            border: '2px solid #10b981',
            marginBottom: '20px'
          }}>
            <p style={{ margin: 0, color: '#059669', fontWeight: '500', fontSize: '16px' }}>
              ✅ Referee invitations were automatically sent when the candidate authorized!
            </p>
            <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#047857' }}>
              Check your dashboard to see referee responses as they come in.
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={handleSendAuthorization}
              disabled={sendingAuth}
              className="btn-primary"
              style={{ 
                fontSize: '18px',
                padding: '15px 40px',
                marginBottom: '20px'
              }}
            >
              {sendingAuth ? 'Sending...' : '🚀 Begin Reference Checking'}
            </button>
            <div>
              <button 
                onClick={onBack} 
                className="btn-secondary"
              >
                ← Back to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SendInvitations;

