/**
 * ReferenceReport Component
 * Clean, printable reference report for completed references
 */

import React, { useEffect, useState } from 'react';
import { EditResponseModal } from './EditResponseModal';

interface ReferenceData {
  candidate: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string | null;
    position_applied_for: string;
  };
  referee: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string | null;
    relationship: string;
    company: string | null;
  };
  submission: {
    id: string;
    submitted_at: string;
    answers: Record<string, any>;
    version?: number;
    is_original?: boolean;
    edited_at?: string | null;
    edited_by?: string | null;
    edit_notes?: string | null;
  };
  template: {
    name: string;
    questions: any[];
  };
}

interface ReferenceReportProps {
  requestId: string;
  refereeId: string;
  apiUrl?: string;
  userId?: string;
  onClose?: () => void;
}

export const ReferenceReport: React.FC<ReferenceReportProps> = ({
  requestId,
  refereeId,
  apiUrl = 'http://localhost:5001/api',
  userId = 'user-test-1',
  onClose,
}) => {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchReferenceData();
  }, [requestId, refereeId]);

  const fetchReferenceData = async () => {
    setLoading(true);
    setError('');

    try {
      // TODO: Create backend endpoint to fetch completed reference
      const response = await fetch(`${apiUrl}/requests/${requestId}/referees/${refereeId}/report`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch reference data');
      }

      setData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    // Import html2pdf dynamically
    import('html2pdf.js').then((html2pdf) => {
      const element = document.querySelector('.reference-report');
      const candidateName = data?.candidate ? 
        `${data.candidate.first_name}_${data.candidate.last_name}` : 'reference';
      const refereeName = data?.referee ?
        `${data.referee.first_name}_${data.referee.last_name}` : 'report';
      const filename = `${candidateName}_reference_${refereeName}.pdf`;
      
      const options = {
        margin: 0.5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      html2pdf.default().set(options).from(element).save();
    }).catch(() => {
      // Fallback to print if html2pdf not available
      alert('PDF generation library not loaded. Please use Print functionality.');
      window.print();
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="reference-report-modal">
        <div className="reference-report-container">
          <div className="loading">Loading reference...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reference-report-modal">
        <div className="reference-report-container">
          <div className="alert alert-error">{error}</div>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="reference-report-modal">
      <div className="reference-report-container">
        {/* Action Buttons (hidden when printing) */}
        <div className="report-actions no-print">
          <button onClick={() => setShowEditModal(true)} className="btn-primary" style={{ background: '#f59e0b' }}>
            ✏️ Edit Response
          </button>
          <button onClick={handleDownload} className="btn-primary">
            📥 Download PDF
          </button>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>

        {/* Printable Report */}
        <div className="reference-report">
          {/* Header with Logo */}
          <div className="report-header">
            <div className="logo-placeholder">
              {/* TODO: Replace with actual logo */}
              <div className="logo-box">COMPANY LOGO</div>
            </div>
            <h1>Reference Check Report</h1>
            <div className="report-date">
              Generated: {formatDate(new Date().toISOString())}
            </div>
            {data.submission.version && data.submission.version > 1 && (
              <div style={{ 
                marginTop: '12px', 
                padding: '8px 16px', 
                background: '#d1ecf1', 
                border: '2px solid #0dcaf0',
                borderRadius: '6px',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                📝 <strong>Version {data.submission.version}</strong>
                {data.submission.edited_at && (
                  <span> - Edited {formatDate(data.submission.edited_at)}</span>
                )}
                {data.submission.edit_notes && (
                  <div style={{ fontSize: '12px', marginTop: '4px', fontStyle: 'italic' }}>
                    {data.submission.edit_notes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Candidate Information */}
          <div className="report-section">
            <h2>Candidate Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">
                  {data.candidate.first_name} {data.candidate.last_name}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Position Applied For:</span>
                <span className="info-value">{data.candidate.position_applied_for}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{data.candidate.email}</span>
              </div>
              {data.candidate.phone_number && (
                <div className="info-item">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{data.candidate.phone_number}</span>
                </div>
              )}
            </div>
          </div>

          {/* Referee Information */}
          <div className="report-section">
            <h2>Referee Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">
                  {data.referee.first_name} {data.referee.last_name}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Relationship:</span>
                <span className="info-value">{data.referee.relationship}</span>
              </div>
              {data.referee.company && (
                <div className="info-item">
                  <span className="info-label">Company:</span>
                  <span className="info-value">{data.referee.company}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{data.referee.email}</span>
              </div>
              {data.referee.phone_number && (
                <div className="info-item">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{data.referee.phone_number}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Submitted:</span>
                <span className="info-value">{formatDate(data.submission.submitted_at)}</span>
              </div>
            </div>
          </div>

          {/* Reference Questions & Answers */}
          <div className="report-section">
            <h2>Reference Details</h2>
            <div className="questions-answers">
              {Object.entries(data.submission.answers).map(([questionKey, answer], index) => {
                // Find the question by ID (not key)
                const question = data.template.questions.find(q => q.id === questionKey);
                const questionText = question?.text || questionKey;

                // Check if answer has follow-up structure
                const hasFollowUp = typeof answer === 'object' && answer !== null &&
                                   'original_answer' in answer && 'follow_up_answer' in answer;

                return (
                  <div key={questionKey} className="qa-item">
                    <div className="question-label">
                      <strong>Q{index + 1}:</strong> {questionText}
                    </div>
                    {hasFollowUp ? (
                      <div>
                        <div className="answer-text">
                          {answer.original_answer}
                        </div>
                        <div className="follow-up-section" style={{ marginTop: '12px' }}>
                          <div className="follow-up-label" style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#667eea',
                            marginBottom: '8px'
                          }}>
                            Follow-up Response:
                          </div>
                          <div className="answer-text" style={{
                            background: '#f0f4ff',
                            borderLeft: '3px solid #667eea'
                          }}>
                            {answer.follow_up_answer}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="answer-text">
                        {typeof answer === 'object' ? JSON.stringify(answer, null, 2) : answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="report-footer">
            <p>
              This reference was provided voluntarily by the referee listed above.
              The information contained in this report is confidential and should be 
              treated accordingly.
            </p>
            <p className="report-id">
              Reference ID: {refereeId}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Response Modal */}
      {showEditModal && (
        <EditResponseModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          responseId={data.submission.id}
          questions={data.template.questions}
          currentAnswers={data.submission.answers}
          apiUrl={apiUrl}
          userId={userId}
          onSaveSuccess={() => {
            // Refresh the report to show the new version
            fetchReferenceData();
          }}
        />
      )}
    </div>
  );
};

export default ReferenceReport;

