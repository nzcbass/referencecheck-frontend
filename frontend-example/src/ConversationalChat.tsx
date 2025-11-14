/**
 * ConversationalChat Component
 * Claude-powered conversational interface for reference checking
 *
 * Features:
 * - Chat-like interface with AI asking questions
 * - Real-time answer submission
 * - Progress tracking
 * - Browser spell-check enabled
 * - Smooth scrolling and animations
 */

import React, { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface Question {
  index: number;
  key: string;
  text: string;
  type: string;
  required: boolean;
}

interface ConversationalChatProps {
  token: string;
  apiUrl?: string;
  onComplete?: () => void;
  onSessionIdChange?: (sessionId: string) => void;
}

export const ConversationalChat: React.FC<ConversationalChatProps> = ({
  token,
  apiUrl = 'http://localhost:5001/api',
  onComplete,
  onSessionIdChange,
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState({ answered: 0, total: 0, percent: 0 });
  const [status, setStatus] = useState<'in_progress' | 'ready_for_review' | 'completed'>('in_progress');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    console.log('ConversationalChat: messages changed, count:', messages.length);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session on mount
  useEffect(() => {
    if (token) {
      console.log('ConversationalChat: Initializing session with token:', token);
      initializeSession();
    }
  }, [token]);

  // Auto-focus textarea when question changes
  useEffect(() => {
    if (currentQuestion && !submitting) {
      textareaRef.current?.focus();
    }
  }, [currentQuestion, submitting]);

  const initializeSession = async () => {
    console.log('ConversationalChat: initializeSession called');
    console.log('ConversationalChat: apiUrl =', apiUrl);
    console.log('ConversationalChat: token =', token);

    setLoading(true);
    setError('');

    try {
      const url = `${apiUrl}/conversation/init?token=${token}`;
      console.log('ConversationalChat: Fetching:', url);

      const response = await fetch(url);
      console.log('ConversationalChat: Response received:', response.status, response.statusText);

      const data = await response.json();
      console.log('ConversationalChat: Data received:', data);

      if (!response.ok) {
        console.log('ConversationalChat: Response not OK, throwing error');
        throw new Error(data.error || 'Failed to initialize session');
      }

      console.log('ConversationalChat: Setting session state...');
      setSessionId(data.session_id);
      setStatus(data.status);
      setProgress(data.progress);

      // Notify parent component of sessionId
      if (onSessionIdChange && data.session_id) {
        console.log('ConversationalChat: Notifying parent of sessionId:', data.session_id);
        onSessionIdChange(data.session_id);
      }

      if (data.status === 'completed') {
        console.log('ConversationalChat: Session already completed');
        // Session already completed
        addMessage('assistant', 'Thank you! Your reference check has already been completed.');
        setStatus('completed');
      } else if (data.status === 'in_review' || data.status === 'ready_for_review') {
        console.log('ConversationalChat: All questions answered, ready for review');
        // All questions answered, move to review
        addMessage('assistant', '✅ Great! You\'ve answered all the questions. Please review your answers before submitting.');
        setStatus('ready_for_review');
        if (onComplete) {
          setTimeout(() => onComplete(), 1000);
        }
      } else if (data.question) {
        console.log('ConversationalChat: Adding question to chat:', data.question);

        // Add welcome message first
        const candidateName = data.context?.candidate_name || '';
        const position = data.context?.position || '';
        let welcomeMessage = `Thank you for providing a reference${candidateName ? ` for ${candidateName}` : ''}.`;
        if (position) {
          welcomeMessage += ` They have applied for the position of ${position}.`;
        }
        welcomeMessage += ` I'll ask you a series of questions about your experience working together. Please answer naturally and honestly.`;

        addMessage('assistant', welcomeMessage);

        // Then add first question
        setTimeout(() => {
          setCurrentQuestion(data.question);
          addMessage('assistant', data.question.text);
        }, 300);  // Reduced from 500ms to 300ms
      } else {
        console.log('ConversationalChat: No question in response!');
      }
    } catch (err) {
      console.error('ConversationalChat: Error in initializeSession:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      addMessage('assistant', `Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const addMessage = (role: 'assistant' | 'user', content: string) => {
    console.log('ConversationalChat: addMessage called', { role, content, contentLength: content?.length });
    setMessages((prev) => {
      const newMessages = [
        ...prev,
        {
          role,
          content,
          timestamp: new Date(),
        },
      ];
      console.log('ConversationalChat: New messages array:', newMessages);
      return newMessages;
    });
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!answer.trim() || !sessionId || !currentQuestion) {
      return;
    }

    setSubmitting(true);
    setError('');

    // Add user's answer to chat immediately
    addMessage('user', answer.trim());
    const userAnswer = answer.trim();
    setAnswer('');

    try {
      const response = await fetch(`${apiUrl}/conversation/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          question_index: currentQuestion.index,
          answer: userAnswer,
          skip_proofreading: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save answer');
      }

      setProgress(data.progress);
      setStatus(data.status);

      if (data.status === 'needs_clarification') {
        // Answer needs follow-up or was invalid
        if (data.message) {
          addMessage('assistant', data.message);
        }
        // Keep same question
        if (data.same_question) {
          setCurrentQuestion(data.same_question);
        }
        // Never restore answer - user must retype
      } else if (data.status === 'ready_for_review') {
        // All questions answered
        addMessage(
          'assistant',
          '✅ Great! You\'ve answered all the questions. Please review your answers before submitting.'
        );
        setCurrentQuestion(null);
        setStatus('ready_for_review');
      } else if (data.next_question) {
        // Answer was accepted - immediately show the next question to keep things snappy
        setCurrentQuestion(data.next_question);
        addMessage('assistant', data.next_question.text);
      }

      setSubmitting(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      addMessage('assistant', `Error: ${errorMessage}. Please try again.`);
      // Don't restore answer - let user retype if needed
      setSubmitting(false);
    }
  };

  const handleGoToReview = () => {
    if (onComplete) {
      onComplete();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>
          Loading conversation...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxHeight: '800px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>
          Reference Check
        </h2>
        <div
          style={{
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            color: '#6b7280',
          }}
        >
          <span>
            Progress: {progress.answered} / {progress.total} questions
          </span>
          <div
            style={{
              flex: 1,
              height: '6px',
              backgroundColor: '#e5e7eb',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress.percent}%`,
                backgroundColor: '#3b82f6',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span>{progress.percent}%</span>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: message.role === 'user' ? '#3b82f6' : '#ffffff',
                color: message.role === 'user' ? '#ffffff' : '#111827',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                border: message.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {message.content}
              </div>
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '11px',
                  opacity: 0.7,
                }}
              >
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator when submitting */}
        {submitting && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                color: '#6b7280',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span style={{ fontSize: '14px' }}>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {(status === 'in_progress' || status === 'needs_clarification') && currentQuestion && (
        <form
          onSubmit={handleSubmitAnswer}
          style={{
            padding: '20px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: '12px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              disabled={submitting}
              spellCheck={true}
              rows={3}
              style={{
                flex: 1,
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
              onKeyDown={(e) => {
                // Submit on Ctrl/Cmd + Enter
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmitAnswer(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!answer.trim() || submitting}
              style={{
                padding: '12px 24px',
                backgroundColor: !answer.trim() || submitting ? '#d1d5db' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: !answer.trim() || submitting ? 'not-allowed' : 'pointer',
                minWidth: '100px',
              }}
            >
              {submitting ? 'Sending...' : 'Send'}
            </button>
          </div>
          <div
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            Press Ctrl+Enter to send • Browser spell-check enabled
          </div>
        </form>
      )}

      {/* Review Button */}
      {status === 'ready_for_review' && (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#ffffff',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center',
          }}
        >
          <button
            onClick={handleGoToReview}
            style={{
              padding: '12px 32px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Review and Edit Your Answers
          </button>
        </div>
      )}

      {/* Completed State */}
      {status === 'completed' && (
        <div
          style={{
            padding: '20px',
            backgroundColor: '#ecfdf5',
            borderTop: '1px solid #a7f3d0',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', color: '#059669', fontWeight: '500' }}>
            ✅ Reference check completed
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .typing-indicator {
            display: flex;
            gap: 4px;
            align-items: center;
          }

          .typing-indicator span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #9ca3af;
            animation: typing 1.4s infinite;
          }

          .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
          }

          .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
          }

          @keyframes typing {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.7;
            }
            30% {
              transform: translateY(-10px);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ConversationalChat;
