/**
 * ConversationalReview Component
 * Review and edit interface for conversational reference check answers
 *
 * Features:
 * - Display all questions and answers
 * - Inline editing with auto-save
 * - Revision audit trail
 * - Final submission with tamper-proof hash
 * - Comparison of raw vs. polished answers
 */

import React, { useState, useEffect } from 'react';

interface ConversationTurn {
  type: string;
  content: string;
  created_at: string;
}

interface ReviewItem {
  answer_id: string;
  question_index: number;
  question_key: string;
  question_text: string;
  answer_type: string;
  raw_answer: string;
  polished_answer: string;
  word_count: number;
  answered_at: string;
  conversation_turns?: ConversationTurn[];
}

interface ConversationalReviewProps {
  sessionId: string;
  apiUrl?: string;
  onComplete?: () => void;
  onBack?: () => void;
}

export const ConversationalReview: React.FC<ConversationalReviewProps> = ({
  sessionId,
  apiUrl = 'http://localhost:5001/api',
  onComplete,
  onBack,
}) => {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [showComparison, setShowComparison] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string>('');
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    fetchReviewData();
  }, [sessionId]);

  const fetchReviewData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/conversation/review/${sessionId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch review data');
      }

      setReviewItems(data.review_items);
      setSessionStatus(data.status);
      setTotalQuestions(data.total_questions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (item: ReviewItem) => {
    setEditingId(item.answer_id);
    setEditValue(item.polished_answer);
    setEditReason('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
    setEditReason('');
  };

  const handleSaveEdit = async (answerId: string) => {
    if (!editValue.trim()) {
      alert('Answer cannot be empty');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/conversation/revise`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answer_id: answerId,
          new_answer: editValue.trim(),
          revision_reason: editReason || 'User revision during review',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save revision');
      }

      // Update local state
      setReviewItems((prev) =>
        prev.map((item) =>
          item.answer_id === answerId
            ? { ...item, polished_answer: editValue.trim() }
            : item
        )
      );

      setEditingId(null);
      setEditValue('');
      setEditReason('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      alert(`Error saving changes: ${errorMessage}`);
    }
  };

  const handleSubmit = async () => {
    if (
      !confirm(
        `Submit your reference check?\n\nThis will finalize your responses and they cannot be changed after submission.`
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/conversation/complete/${sessionId}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete session');
      }

      alert(
        `✅ Reference check submitted successfully!\n\nYour responses have been recorded and secured with a tamper-proof hash.\n\nThank you for your time!`
      );

      if (onComplete) {
        onComplete();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      alert(`Error submitting: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading review data...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            ← Back to Chat
          </button>
        )}

        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#111827' }}>
          Review Your Answers
        </h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
          Please review your {reviewItems.length} answers before submitting. You can edit any answer if
          needed.
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
          }}
        >
          {error}
        </div>
      )}

      {/* Review Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {reviewItems.map((item, index) => (
          <div
            key={item.answer_id}
            style={{
              padding: '20px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Question */}
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {index + 1}
                </span>
                <strong style={{ fontSize: '16px', color: '#111827' }}>
                  {item.question_text}
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '32px' }}>
                Answered {formatDate(item.answered_at)} • {item.word_count} words
              </div>
            </div>

            {/* Answer Display/Edit */}
            {editingId === item.answer_id ? (
              // Edit Mode
              <div style={{ marginTop: '16px' }}>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  spellCheck={item.answer_type !== 'number' && item.answer_type !== 'rating'}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #3b82f6',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
                <div style={{ marginTop: '12px' }}>
                  <input
                    type="text"
                    placeholder="Optional: Reason for change"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleSaveEdit(item.answer_id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Display Mode
              <div>
                {/* Always show conversation history in purple box for all responses */}
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: '#f0f4ff',
                    border: '1px solid #c7d2fe',
                    borderRadius: '6px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#4338ca',
                      marginBottom: '12px',
                    }}
                  >
                    Conversation History:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {item.conversation_turns && item.conversation_turns.length > 0 ? (
                      // Show all conversation turns
                      item.conversation_turns.map((turn, turnIndex) => {
                        // Skip the initial question and final acknowledgment
                        if (turn.type === 'question' && turnIndex === 0) return null;
                        if (turn.type === 'acknowledgment') return null;

                        const isUserAnswer = turn.type === 'user_answer';
                        const isClarification = turn.type === 'clarification';

                        return (
                          <div
                            key={turnIndex}
                            style={{
                              padding: '10px 12px',
                              backgroundColor: isUserAnswer ? '#ffffff' : '#e0e7ff',
                              border: `1px solid ${isUserAnswer ? '#d1d5db' : '#a5b4fc'}`,
                              borderRadius: '4px',
                              fontSize: '13px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: isUserAnswer ? '#6b7280' : '#4338ca',
                                marginBottom: '4px',
                                textTransform: 'uppercase',
                              }}
                            >
                              {isUserAnswer ? 'Your Response:' : isClarification ? 'Follow-up:' : 'System:'}
                            </div>
                            <div style={{ color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                              {turn.content}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // If no conversation turns available, show the polished answer
                      <div
                        style={{
                          padding: '10px 12px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '13px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#6b7280',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Your Response:
                        </div>
                        <div style={{ color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                          {item.polished_answer}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '12px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <button
                    onClick={() => handleStartEdit(item)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ffffff',
                      color: '#3b82f6',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    ✏️ Edit Answer
                  </button>

                  {item.raw_answer !== item.polished_answer && (
                    <button
                      onClick={() =>
                        setShowComparison(
                          showComparison === item.answer_id ? null : item.answer_id
                        )
                      }
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ffffff',
                        color: '#6b7280',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      {showComparison === item.answer_id ? 'Hide' : 'Show'} Original
                    </button>
                  )}
                </div>

                {/* Show comparison */}
                {showComparison === item.answer_id && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fcd34d',
                      borderRadius: '6px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#92400e',
                        marginBottom: '8px',
                      }}
                    >
                      Original Answer (before AI proofreading):
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#78350f',
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.5',
                      }}
                    >
                      {item.raw_answer}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Section */}
      <div
        style={{
          marginTop: '40px',
          padding: '24px',
          backgroundColor: '#f0fdf4',
          border: '2px solid #86efac',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', color: '#166534' }}>Ready to Submit?</h3>
        <p style={{ margin: '0 0 20px 0', color: '#15803d', fontSize: '14px' }}>
          Once submitted, your answers will be finalized and cannot be changed.
        </p>
        <button
          onClick={handleSubmit}
          disabled={submitting || editingId !== null}
          style={{
            padding: '14px 32px',
            backgroundColor:
              submitting || editingId !== null ? '#d1d5db' : '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: submitting || editingId !== null ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Submitting...' : '✓ Submit Reference Check'}
        </button>
        {editingId && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#dc2626' }}>
            Please save or cancel your current edit before submitting.
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationalReview;
