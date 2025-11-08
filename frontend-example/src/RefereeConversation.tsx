import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  text: string;
  from: 'system' | 'user';
  timestamp?: string;
}

interface RefereeConversationProps {
  token: string;
  onBack: () => void;
}

const RefereeConversation: React.FC<RefereeConversationProps> = ({ token, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isPublicView, setIsPublicView] = useState(true); // Assume public referee view
  const hasInitialized = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NODE_ENV === 'production' ? 'https://referencecheck-backend-e485f62r5-brindle-c06e9d97.vercel.app/api' : 'http://localhost:5001/api';

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initializeConversation();
    }
  }, [token]);

  const initializeConversation = async (retryCount = 0) => {
    try {
      setIsLoading(true);
      
      // Longer timeout for first load (cold start can take 10+ seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${API_URL}/public/conversation/init?token=${token}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize conversation');
      }

      const data = await response.json();
      
      // Set candidate name from context
      if (data.context?.candidate_first_name && data.context?.candidate_last_name) {
        setCandidateName(`${data.context.candidate_first_name} ${data.context.candidate_last_name}`);
      }

      // Set progress
      if (data.progress) {
        setProgress({
          current: data.progress.answered || 0,
          total: data.progress.total || 0
        });
      }

      // Add welcome message
      const welcomeMessage: Message = {
        id: 'welcome',
        text: `Thank you for providing a reference${candidateName ? ` for ${candidateName}` : ''}. I'll ask you a few questions about your experience working together. Feel free to answer naturally - this is a conversation, not a form.`,
        from: 'system',
        timestamp: new Date().toISOString()
      };

      setMessages([welcomeMessage]);

      // Add first question
      if (data.message_queue && data.message_queue.length > 0) {
        const firstQuestion = data.message_queue[0];
        setCurrentQuestionId(firstQuestion.id);
        
        setTimeout(() => {
          const questionMessage: Message = {
            id: firstQuestion.id,
            text: firstQuestion.text,
            from: 'system',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, questionMessage]);
        }, 1000);
      }

      setIsLoading(false);
    } catch (err: any) {
      // Handle timeout or network errors with automatic retry
      if ((err.name === 'AbortError' || err.message.includes('fetch')) && retryCount < 2) {
        console.log(`Request timed out, retrying (attempt ${retryCount + 1}/2)...`);
        // Wait 2 seconds then retry (server should be warm now)
        setTimeout(() => {
          initializeConversation(retryCount + 1);
        }, 2000);
        return;
      }
      
      setError(err.message || 'Failed to load. Please refresh the page.');
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || !currentQuestionId || isSubmitting) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: currentInput,
      from: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsSubmitting(true);

    try {
      // Save draft
      const draftResponse = await fetch(`${API_URL}/public/conversation/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          turn: {
            question_id: currentQuestionId,
            answer: currentInput,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!draftResponse.ok) {
        throw new Error('Failed to save response');
      }

      const draftData = await draftResponse.json();

      // Update progress
      setProgress(prev => ({ ...prev, current: prev.current + 1 }));

      // Check if there are more questions
      if (draftData.next_question) {
        setTimeout(() => {
          const nextMessage: Message = {
            id: draftData.next_question.id,
            text: draftData.next_question.text,
            from: 'system',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, nextMessage]);
          setCurrentQuestionId(draftData.next_question.id);
          setIsSubmitting(false);
        }, 800);
      } else {
        // All questions answered, submit
        setTimeout(async () => {
          try {
            const submitResponse = await fetch(`${API_URL}/public/conversation/submit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token })
            });

            const submitData = await submitResponse.json();

            if (submitResponse.ok) {
              console.log('✅ Reference submitted successfully:', submitData);
              const thankYouMessage: Message = {
                id: 'complete',
                text: 'Thank you for completing this reference! Your responses have been submitted.',
                from: 'system',
                timestamp: new Date().toISOString()
              };
              setMessages(prev => [...prev, thankYouMessage]);
              setIsComplete(true);
            } else {
              console.error('❌ Submission failed:', submitData);
              const errorMessage: Message = {
                id: 'error',
                text: `Failed to submit: ${submitData.error || 'Unknown error'}. Please contact support with this error.`,
                from: 'system',
                timestamp: new Date().toISOString()
              };
              setMessages(prev => [...prev, errorMessage]);
              setError(submitData.error || 'Failed to submit reference');
            }
          } catch (submitError: any) {
            console.error('❌ Submission error:', submitError);
            const errorMessage: Message = {
              id: 'error',
              text: 'Network error during submission. Please check your connection and try refreshing the page.',
              from: 'system',
              timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
            setError(submitError.message);
          } finally {
            setIsSubmitting(false);
          }
        }, 800);
      }
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="referee-conversation">
        <div className="conversation-header">
          <h2>Reference Check</h2>
        </div>
        <div className="loading-state">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
            <p>Loading reference check...</p>
            <p style={{ fontSize: '14px', color: '#718096' }}>
              First load can take 10-15 seconds. Please wait, we'll retry automatically if needed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="referee-conversation">
        <div className="conversation-header">
          <h2>Reference Check</h2>
        </div>
        <div className="error-state">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', color: '#e53e3e' }}>❌</div>
            <p className="error-message" style={{ fontSize: '18px', marginBottom: '10px' }}>Error</p>
            <p style={{ color: '#718096' }}>{error}</p>
            <p style={{ fontSize: '14px', color: '#718096', marginTop: '20px' }}>
              If you received this link via email, please try clicking it again or contact the person who requested the reference.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="referee-conversation">
      <div className="conversation-header">
        <div style={{ textAlign: 'center' }}>
          <h2>Reference Check{candidateName ? ` - ${candidateName}` : ''}</h2>
          {progress.total > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '14px', color: '#718096', marginBottom: '5px' }}>
                Question {progress.current} of {progress.total}
              </div>
              <div style={{ 
                width: '100%', 
                height: '6px', 
                background: '#e2e8f0', 
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="conversation-messages" style={{ 
        maxHeight: 'calc(100vh - 300px)', 
        overflowY: 'auto',
        paddingBottom: '20px'
      }}>
        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`message ${message.from === 'user' ? 'message-user' : 'message-system'}`}
          >
            <div className="message-content">
              <p>{message.text}</p>
            </div>
            {message.timestamp && (
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        ))}
        {isSubmitting && (
          <div className="message message-system">
            <div className="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isComplete && (
        <div className="conversation-input">
          <textarea
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your answer here and press Enter or click Submit..."
            rows={3}
            disabled={isSubmitting}
            style={{ marginBottom: '10px' }}
          />
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleSendMessage}
              disabled={!currentInput.trim() || isSubmitting}
              className="button button-primary"
              style={{ 
                flex: 1,
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              {isSubmitting ? '⏳ Submitting...' : '📝 Submit Response'}
            </button>
            {currentInput.trim() && (
              <span style={{ fontSize: '12px', color: '#718096' }}>
                or press Enter
              </span>
            )}
          </div>
        </div>
      )}

      {isComplete && (
        <div className="conversation-complete" style={{
          textAlign: 'center',
          padding: '40px 20px',
          background: '#f0fdf4',
          borderRadius: '8px',
          border: '2px solid #86efac'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h3 style={{ color: '#166534', marginBottom: '10px' }}>
            Reference Completed!
          </h3>
          <p style={{ color: '#15803d', marginBottom: '20px' }}>
            Thank you for providing your reference for {candidateName}. 
            Your responses have been submitted successfully.
          </p>
          <p style={{ fontSize: '14px', color: '#16a34a' }}>
            You can now close this window.
          </p>
        </div>
      )}
    </div>
  );
};

export default RefereeConversation;

