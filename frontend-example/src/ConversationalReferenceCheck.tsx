/**
 * ConversationalReferenceCheck Component
 * Parent component that orchestrates the conversational reference check flow
 *
 * Flow:
 * 1. RefereeAuthorization - Consent form (new step)
 * 2. ConversationalChat - Answer questions one by one
 * 3. ConversationalReview - Review and edit all answers
 * 4. Completion - Thank you message
 */

import React, { useState } from 'react';
import { RefereeAuthorization } from './RefereeAuthorization';
import { ConversationalChat } from './ConversationalChat';
import { ConversationalReview } from './ConversationalReview';

interface ConversationalReferenceCheckProps {
  token: string;
  apiUrl?: string;
  onComplete?: () => void;
}

type Step = 'authorization' | 'chat' | 'review' | 'complete';

export const ConversationalReferenceCheck: React.FC<
  ConversationalReferenceCheckProps
> = ({ token, apiUrl = 'http://localhost:5001/api', onComplete }) => {
  const [currentStep, setCurrentStep] = useState<Step>('authorization');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleAuthorizationComplete = () => {
    // After authorization, move to chat
    setCurrentStep('chat');
  };

  const handleSessionIdChange = (newSessionId: string) => {
    setSessionId(newSessionId);
  };

  const handleChatComplete = () => {
    // When all questions are answered, move to review
    setCurrentStep('review');
  };

  const handleReviewComplete = () => {
    // When review is submitted, show completion
    setCurrentStep('complete');
  };

  const handleBackToChat = () => {
    setCurrentStep('chat');
  };

  if (currentStep === 'authorization') {
    return (
      <RefereeAuthorization
        token={token}
        apiUrl={apiUrl}
        onAuthorizationComplete={handleAuthorizationComplete}
      />
    );
  }

  if (currentStep === 'complete') {
    return (
      <div
        style={{
          maxWidth: '600px',
          margin: '60px auto',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#d1fae5',
            borderRadius: '50%',
            fontSize: '40px',
          }}
        >
          ✓
        </div>

        <h1
          style={{
            margin: '0 0 16px 0',
            fontSize: '28px',
            color: '#111827',
            fontWeight: '600',
          }}
        >
          Thank You!
        </h1>

        <p
          style={{
            margin: '0 0 24px 0',
            fontSize: '16px',
            color: '#6b7280',
            lineHeight: '1.6',
          }}
        >
          Your reference check has been completed successfully. Your responses have been
          securely recorded and will be reviewed by the hiring team.
        </p>

        <div
          style={{
            padding: '16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: '#166534',
            }}
          >
            Your responses have been secured with a tamper-proof hash to ensure integrity.
          </p>
        </div>

        {onComplete ? (
          <button
            onClick={onComplete}
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            ← Back to All Requests
          </button>
        ) : (
          <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
            You can now close this window.
          </p>
        )}
      </div>
    );
  }

  if (currentStep === 'review') {
    if (!sessionId) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Error: No session found. Please start over.</p>
          <button onClick={handleBackToChat}>Back to Chat</button>
        </div>
      );
    }

    return (
      <ConversationalReview
        sessionId={sessionId}
        apiUrl={apiUrl}
        onComplete={handleReviewComplete}
        onBack={handleBackToChat}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#f7fafc',
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <ConversationalChat
          token={token}
          apiUrl={apiUrl}
          onComplete={handleChatComplete}
          onSessionIdChange={handleSessionIdChange}
        />
      </div>
    </div>
  );
};

export default ConversationalReferenceCheck;
