/**
 * Referee Page - Public page for referees to complete references
 * Now using Claude AI conversational interface
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ConversationalReferenceCheck } from './ConversationalReferenceCheck';

interface RefereePageProps {
  apiUrl?: string;
}

const RefereePage: React.FC<RefereePageProps> = ({ apiUrl }) => {
  const { token } = useParams<{ token: string }>();
  const [error, setError] = useState<string>('');
  
  const API_URL = apiUrl || (process.env.NODE_ENV === 'production'
    ? 'https://referencecheck-backend-e485f62r5-brindle-c06e9d97.vercel.app/api'
    : 'http://localhost:5001/api');

  useEffect(() => {
    if (!token) {
      setError('No token provided. Please use the link from your email.');
    }

    // Hide any platform UI elements and ensure full isolation
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    return () => {
      document.body.style.overflow = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
    };
  }, [token]);

  if (error) {
    return (
      <div style={{ 
        maxWidth: '600px', 
        margin: '50px auto', 
        padding: '30px',
        textAlign: 'center',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#e53e3e' }}>❌ Error</h2>
        <p>{error}</p>
        <p style={{ fontSize: '14px', color: '#718096', marginTop: '20px' }}>
          If you received this link via email, please try clicking the link again or contact the person who requested the reference.
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{ 
        maxWidth: '600px', 
        margin: '50px auto', 
        padding: '30px',
        textAlign: 'center' 
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#f7fafc',
      padding: '20px',
      position: 'fixed',
      top: 0,
      left: 0,
      overflow: 'auto',
      zIndex: 9999
    }}>
      <ConversationalReferenceCheck
        token={token}
        apiUrl={API_URL}
      />
    </div>
  );
};

export default RefereePage;

