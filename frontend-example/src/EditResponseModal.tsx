/**
 * EditResponseModal Component
 * Modal for editing reference responses with version control
 */

import React, { useState, useEffect } from 'react';

interface Question {
  id: string;
  text: string;
  required: boolean;
  type?: string;
}

interface Version {
  id: string;
  version: number;
  is_original: boolean;
  answers_json: Record<string, string>;
  edited_at: string | null;
  edited_by: string | null;
  edit_notes: string | null;
  submitted_at: string;
  users?: {
    full_name: string;
    email: string;
  };
}

interface EditResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  responseId: string;
  questions: Question[];
  currentAnswers: Record<string, string>;
  apiUrl: string;
  userId: string;
  onSaveSuccess: () => void;
}

export const EditResponseModal: React.FC<EditResponseModalProps> = ({
  isOpen,
  onClose,
  responseId,
  questions,
  currentAnswers,
  apiUrl,
  userId,
  onSaveSuccess,
}) => {
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>(currentAnswers);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [versions, setVersions] = useState<Version[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Fetch versions when modal opens
  useEffect(() => {
    if (isOpen && responseId) {
      fetchVersions();
    }
  }, [isOpen, responseId]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditedAnswers(currentAnswers);
      setEditNotes('');
      setError('');
      setShowVersionHistory(false);
      setSelectedVersion(null);
    }
  }, [isOpen, currentAnswers]);

  const fetchVersions = async () => {
    try {
      setLoadingVersions(true);
      const response = await fetch(`${apiUrl}/responses/${responseId}/versions`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to fetch versions - server response:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to fetch versions');
      }

      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err) {
      console.error('Error fetching versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setEditedAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // Validate that all required questions are answered
      const missingRequired = questions.filter(
        q => q.required && !editedAnswers[q.id]?.trim()
      );

      if (missingRequired.length > 0) {
        setError(`Please answer all required questions: ${missingRequired.map(q => q.text).join(', ')}`);
        return;
      }

      const response = await fetch(`${apiUrl}/responses/${responseId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          answers_json: editedAnswers,
          edit_notes: editNotes.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error details:', errorData);
        const errorMsg = errorData.message || errorData.error || 'Failed to save edited version';
        throw new Error(errorMsg);
      }

      const result = await response.json();
      
      alert(`✅ Version ${result.version.version} saved successfully!`);
      
      // Refresh versions list
      await fetchVersions();
      
      // Notify parent and close
      onSaveSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setError(errorMessage);
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleViewVersion = (version: Version) => {
    setSelectedVersion(version);
    setEditedAnswers(version.answers_json);
  };

  const handleResetToOriginal = () => {
    const original = versions.find(v => v.is_original);
    if (original) {
      setEditedAnswers(original.answers_json);
      setSelectedVersion(original);
    }
  };

  const handleResetToLatest = () => {
    setEditedAnswers(currentAnswers);
    setSelectedVersion(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content edit-response-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="modal-header">
          <h2>✏️ Edit Reference Response</h2>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>

        {error && (
          <div className="error-message" style={{ margin: '16px 0' }}>
            <p>❌ {error}</p>
          </div>
        )}

        {/* Version Info */}
        {selectedVersion && (
          <div className="version-info-banner" style={{ 
            background: selectedVersion.is_original ? '#fff3cd' : '#d1ecf1',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            border: `2px solid ${selectedVersion.is_original ? '#ffc107' : '#0dcaf0'}`
          }}>
            <strong>
              {selectedVersion.is_original ? '📜 Viewing Original Version' : `📝 Viewing Version ${selectedVersion.version}`}
            </strong>
            {!selectedVersion.is_original && (
              <div style={{ fontSize: '13px', marginTop: '4px', color: '#666' }}>
                Edited {new Date(selectedVersion.edited_at!).toLocaleString()}
                {selectedVersion.edit_notes && ` - ${selectedVersion.edit_notes}`}
              </div>
            )}
          </div>
        )}

        {/* Version History Toggle */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="btn btn-secondary"
            style={{ fontSize: '14px' }}
          >
            {showVersionHistory ? '📋 Hide' : '📋 Show'} Version History ({versions.length})
          </button>
          
          {versions.length > 1 && !selectedVersion && (
            <button
              onClick={handleResetToOriginal}
              className="btn btn-secondary"
              style={{ fontSize: '14px' }}
            >
              ↩️ Reset to Original
            </button>
          )}
          
          {selectedVersion && (
            <button
              onClick={handleResetToLatest}
              className="btn btn-secondary"
              style={{ fontSize: '14px' }}
            >
              ↪️ Reset to Latest
            </button>
          )}
        </div>

        {/* Version History */}
        {showVersionHistory && (
          <div className="version-history" style={{ 
            marginBottom: '24px',
            maxHeight: '200px',
            overflow: 'auto',
            border: '2px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px'
          }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>Version History</h3>
            {loadingVersions ? (
              <p>Loading versions...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {versions.map((version) => (
                  <div
                    key={version.id}
                    style={{
                      padding: '12px',
                      background: selectedVersion?.id === version.id ? '#f0f9ff' : 'white',
                      border: `2px solid ${selectedVersion?.id === version.id ? '#0ea5e9' : '#e2e8f0'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleViewVersion(version)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>
                          {version.is_original ? '📜 Original' : `📝 Version ${version.version}`}
                        </strong>
                        <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                          {version.is_original ? (
                            <>Submitted: {new Date(version.submitted_at).toLocaleString()}</>
                          ) : (
                            <>
                              Edited: {new Date(version.edited_at!).toLocaleString()}
                              {version.edit_notes && <><br/><em>{version.edit_notes}</em></>}
                            </>
                          )}
                        </div>
                      </div>
                      {selectedVersion?.id === version.id && (
                        <span style={{ color: '#0ea5e9', fontSize: '20px' }}>✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit Form */}
        <div className="edit-form">
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Edit Answers</h3>
          
          {questions.map((question) => (
            <div key={question.id} className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {question.text}
                {question.required && <span style={{ color: '#dc2626' }}> *</span>}
              </label>
              <textarea
                value={editedAnswers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                placeholder="Enter answer..."
              />
            </div>
          ))}

          {/* Edit Notes */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Edit Notes (optional)
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="e.g., Corrected typos, clarified answer to Q3"
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              These notes will be saved with this version for reference.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions" style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '2px solid #e2e8f0'
        }}>
          <button 
            onClick={onClose} 
            className="btn btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="btn btn-primary"
            disabled={saving}
            style={{ 
              background: '#10b981',
              minWidth: '120px'
            }}
          >
            {saving ? 'Saving...' : '💾 Save New Version'}
          </button>
        </div>
      </div>
    </div>
  );
};

