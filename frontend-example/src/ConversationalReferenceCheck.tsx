/**
 * ConversationalReferenceCheck Component
 * Parent component that orchestrates the conversational reference check flow
 *
 * Flow:
 * 1. ConversationalChat - Answer questions one by one
 * 2. ConversationalReview - Review and edit all answers
 * 3. Completion - Thank you message
 */

import React, { useState } from 'react';
import { ConversationalChat } from './ConversationalChat';
import { ConversationalReview } from './ConversationalReview';

interface ConversationalReferenceCheckProps {
  token: string;
  apiUrl?: string;
}

type Step = 'chat' | 'review' | 'complete';

export const ConversationalReferenceCheck: React.FC<
  ConversationalReferenceCheckProps
> = ({ token, apiUrl = 'http://localhost:5001/api' }) => {
  const [currentStep, setCurrentStep] = useState<Step>('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);

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

        <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
          You can now close this window.
        </p>
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
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px' }}>
      <ConversationalChat
        token={token}
        apiUrl={apiUrl}
        onComplete={handleChatComplete}
        onSessionIdChange={handleSessionIdChange}
      />
    </div>
  );
};

export default ConversationalReferenceCheck;
