/**
 * ReferenceRequestApp Component
 * Complete workflow: Create request → Add referees → Send invitations
 */

import React, { useState } from 'react';
import { CreateReferenceRequest } from './CreateReferenceRequest';
import { AddReferees } from './AddReferees';
import { RequestList } from './RequestList';
import { SendInvitations } from './SendInvitations';
import { TemplateLibrary } from './TemplateLibrary';
import { TemplateBuilder } from './TemplateBuilder';
import { Settings } from './Settings';

interface ReferenceRequestAppProps {
  userId: string;
  templateId: string;
  apiUrl?: string;
}

type Step = 'list' | 'select-template' | 'build-template' | 'create' | 'add-referees' | 'send-invitations' | 'settings';

export const ReferenceRequestApp: React.FC<ReferenceRequestAppProps> = ({
  userId,
  templateId,
  apiUrl = 'http://localhost:5001/api',
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('list');
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [candidateName, setCandidateName] = useState<string>('');
  const [positionAppliedFor, setPositionAppliedFor] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');

  const handleTemplateSelected = (templateId: string, templateName: string) => {
    setSelectedTemplateId(templateId);
    setSelectedTemplateName(templateName);
    setCurrentStep('create');
  };

  const handleCreateNewTemplate = () => {
    setCurrentStep('build-template');
  };

  const handleTemplateSaved = (templateId: string) => {
    setSuccessMessage('Template created successfully! You can now use it to create reference requests.');
    // Redirect back to template selection
    setTimeout(() => {
      setSuccessMessage('');
      setCurrentStep('select-template');
    }, 2000);
  };

  const handleRequestCreated = (requestId: string) => {
    setCurrentRequestId(requestId);
    setSuccessMessage('Reference request created successfully!');
    setCurrentStep('add-referees');
  };

  const handleRefereesAdded = () => {
    setSuccessMessage('Referees added successfully!');
    // Navigate to send invitations and load candidate data
    setTimeout(() => {
      setSuccessMessage('');
      if (currentRequestId) {
        goToSendInvitations(currentRequestId);
      }
    }, 1000);
  };

  const handleInvitationsSent = () => {
    setSuccessMessage('Reference check invitations sent successfully!');
    setTimeout(() => {
      setCurrentStep('list');
      setCurrentRequestId(null);
      setCandidateName('');
      setPositionAppliedFor('');
      setSuccessMessage('');
    }, 2000);
  };

  const handleError = (error: string) => {
    console.error('Error:', error);
  };

  const startNewRequest = () => {
    setCurrentRequestId(null);
    setCandidateName('');
    setPositionAppliedFor('');
    setSuccessMessage('');
    setSelectedTemplateId(null);
    setSelectedTemplateName('');
    setCurrentStep('select-template');
  };

  const cancelAndGoBack = () => {
    setCurrentStep('list');
    setCurrentRequestId(null);
    setCandidateName('');
    setPositionAppliedFor('');
    setSuccessMessage('');
  };

  const goToSendInvitations = async (requestId: string) => {
    // Fetch request details to get candidate name and position
    try {
      const response = await fetch(`${apiUrl}/requests/${requestId}`);
      const data = await response.json();
      if (data.request) {
        const fullName = `${data.request.candidate_first_name} ${data.request.candidate_last_name}`;
        setCandidateName(fullName);
        setPositionAppliedFor(data.request.position_applied_for);
        setCurrentRequestId(requestId);
        setCurrentStep('send-invitations');
      }
    } catch (error) {
      console.error('Failed to fetch request details:', error);
    }
  };

  return (
    <div className="reference-request-app">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Reference Check Management</h1>
          <button
            onClick={() => setCurrentStep('settings')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ⚙️ Settings
          </button>
        </div>
        <nav className="breadcrumb">
          <button onClick={() => setCurrentStep('list')} className="breadcrumb-link">
            All Requests
          </button>
          {currentStep === 'select-template' && <span> / Select Template</span>}
          {currentStep === 'build-template' && <span> / Build Template</span>}
          {currentStep === 'create' && <span> / Create Request</span>}
          {currentStep === 'add-referees' && <span> / Add Referees</span>}
          {currentStep === 'send-invitations' && <span> / Send Invitations</span>}
          {currentStep === 'settings' && <span> / Settings</span>}
        </nav>
      </header>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      <main className="app-content">
        {/* List View */}
        {currentStep === 'list' && (
          <>
            <div className="page-header">
              <button onClick={startNewRequest} className="btn-primary">
                + New Reference Request
              </button>
            </div>
            <RequestList
              userId={userId}
              apiUrl={apiUrl}
              onSelectRequest={(requestId) => {
                setCurrentRequestId(requestId);
                setCurrentStep('add-referees');
              }}
            />
          </>
        )}

        {/* Select Template */}
        {currentStep === 'select-template' && (
          <>
            <button onClick={cancelAndGoBack} className="btn-back">
              ← Back to List
            </button>
            <TemplateLibrary
              apiUrl={apiUrl}
              userId={userId}
              onSelectTemplate={handleTemplateSelected}
              onCreateNew={handleCreateNewTemplate}
            />
          </>
        )}

        {/* Build Template */}
        {currentStep === 'build-template' && (
          <>
            <button onClick={() => setCurrentStep('select-template')} className="btn-back">
              ← Back to Templates
            </button>
            <TemplateBuilder
              apiUrl={apiUrl}
              userId={userId}
              onSave={handleTemplateSaved}
              onCancel={() => setCurrentStep('select-template')}
            />
          </>
        )}

        {/* Create Request Form */}
        {currentStep === 'create' && selectedTemplateId && (
          <>
            <div className="selected-template-banner">
              <span>Using template: <strong>{selectedTemplateName}</strong></span>
              <button onClick={() => setCurrentStep('select-template')} className="btn-link">
                Change Template
              </button>
            </div>
            <CreateReferenceRequest
              userId={userId}
              templateId={selectedTemplateId}
              onSuccess={handleRequestCreated}
              onError={handleError}
              apiUrl={apiUrl}
            />
          </>
        )}

        {/* Add Referees Form */}
        {currentStep === 'add-referees' && currentRequestId && (
          <>
            <button onClick={cancelAndGoBack} className="btn-back">
              ← Back to List
            </button>
            <AddReferees
              requestId={currentRequestId}
              onSuccess={handleRefereesAdded}
              onError={handleError}
              apiUrl={apiUrl}
            />
          </>
        )}

        {/* Send Invitations */}
        {currentStep === 'send-invitations' && currentRequestId && (
          <SendInvitations
            requestId={currentRequestId}
            candidateName={candidateName}
            positionAppliedFor={positionAppliedFor}
            apiUrl={apiUrl}
            onBack={() => setCurrentStep('list')}
            onSuccess={handleInvitationsSent}
          />
        )}

        {/* Settings */}
        {currentStep === 'settings' && (
          <Settings
            userId={userId}
            apiUrl={apiUrl}
            onBack={() => setCurrentStep('list')}
          />
        )}
      </main>
    </div>
  );
};

export default ReferenceRequestApp;

