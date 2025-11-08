import React, { useState, useEffect } from 'react';
import { QuestionLibrary, QuestionTemplate } from './QuestionLibrary';

interface Question {
  id: string;
  text: string;
  required: boolean;
  type: 'text' | 'textarea' | 'scale';
  category?: string; // Track the category/source of the question
}

interface TemplateBuilderProps {
  apiUrl: string;
  userId: string;
  templateId?: string; // For editing existing templates
  onSave: (templateId: string) => void;
  onCancel: () => void;
}

export function TemplateBuilder({ apiUrl, userId, templateId, onSave, onCancel }: TemplateBuilderProps) {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showQuestionLibrary, setShowQuestionLibrary] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
    } else {
      // Add initial blank question for new templates
      addQuestion();
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    if (!templateId) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/templates/${templateId}?user_id=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }

      const data = await response.json();
      const template = data.template;

      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      setQuestions(template.schema_json.fields.map((f: any) => ({
        id: f.id,
        text: f.text,
        required: f.required,
        type: f.type || 'text',
        category: f.category || 'Custom'
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const generateQuestionId = () => {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addQuestion = (atIndex?: number) => {
    const newQuestion: Question = {
      id: generateQuestionId(),
      text: '',
      required: false,
      type: 'text',
      category: 'Custom'
    };
    
    if (atIndex !== undefined) {
      const updated = [...questions];
      updated.splice(atIndex, 0, newQuestion);
      setQuestions(updated);
    } else {
      setQuestions([...questions, newQuestion]);
    }
  };

  const addQuestionFromLibrary = (questionTemplate: QuestionTemplate) => {
    const newQuestion: Question = {
      id: generateQuestionId(), // Generate new ID
      text: questionTemplate.text,
      required: questionTemplate.required,
      type: questionTemplate.type,
      category: questionTemplate.category // Preserve the category from library
    };
    
    if (insertAtIndex !== null) {
      const updated = [...questions];
      
      // If the previous question (at insertAtIndex - 1) is blank, replace it instead of inserting
      const prevIndex = insertAtIndex - 1;
      if (prevIndex >= 0 && !updated[prevIndex].text.trim()) {
        updated[prevIndex] = newQuestion;
      } else {
        // Otherwise insert at the specified index
        updated.splice(insertAtIndex, 0, newQuestion);
      }
      
      setQuestions(updated);
    } else {
      setQuestions([...questions, newQuestion]);
    }
    
    setShowQuestionLibrary(false);
    setInsertAtIndex(null);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    if (questions.length === 1) {
      setError('Template must have at least one question');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    const updated = [...questions];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setQuestions(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    moveQuestion(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const validateTemplate = (): boolean => {
    if (!templateName.trim()) {
      setError('Template name is required');
      return false;
    }

    if (questions.length === 0) {
      setError('Template must have at least one question');
      return false;
    }

    if (questions.length > 20) {
      setError('Template cannot have more than 20 questions');
      return false;
    }

    // Filter out empty questions (don't validate, just remove them)
    const nonEmptyQuestions = questions.filter(q => q.text.trim());
    
    if (nonEmptyQuestions.length === 0) {
      setError('Template must have at least one question with text');
      return false;
    }

    const requiredCount = questions.filter(q => q.required).length;
    if (requiredCount === 0) {
      setError('Template must have at least one required question');
      return false;
    }

    // Check for duplicate question IDs
    const ids = questions.map(q => q.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      setError('Duplicate question IDs detected. Please try again.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    setError('');
    
    if (!validateTemplate()) {
      return;
    }

    try {
      setSaving(true);

      // Only save non-empty questions
      const nonEmptyQuestions = questions.filter(q => q.text.trim());

      const schema_json = {
        title: templateName,
        description: templateDescription,
        type: 'chat',
        fields: nonEmptyQuestions.map(q => ({
          id: q.id,
          text: q.text,
          required: q.required,
          type: q.type,
          category: q.category || 'Custom'
        }))
      };

      const payload = {
        user_id: userId,
        name: templateName,
        description: templateDescription,
        type: 'chat',
        category: 'custom',
        schema_json
      };

      let response;
      if (templateId) {
        // Update existing template
        response = await fetch(`${apiUrl}/templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create new template
        response = await fetch(`${apiUrl}/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      const data = await response.json();
      onSave(data.template.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="template-builder loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-builder">
      <div className="builder-header">
        <h2>{templateId ? 'Edit Template' : 'Create Custom Template'}</h2>
        <p>Build your own custom reference check template with the questions you need</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>❌ {error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="builder-content">
        {/* Template Info Section */}
        <section className="builder-section">
          <h3>Template Information</h3>
          
          <div className="form-group">
            <label>
              Template Name <span className="required">*</span>
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Custom Sales Reference"
              maxLength={100}
            />
            <span className="help-text">{templateName.length}/100 characters</span>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Describe what this template is for..."
              rows={3}
              maxLength={300}
            />
            <span className="help-text">{templateDescription.length}/300 characters</span>
          </div>
        </section>

        {/* Questions Section */}
        <section className="builder-section">
          <h3>Questions ({questions.length}/20)</h3>

          <div className="questions-list">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className={`question-editor ${draggedIndex === index ? 'dragging' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="question-header">
                  <div className="drag-handle" title="Drag to reorder">
                    ⋮⋮
                  </div>
                  <span className="question-number">Question {index + 1}</span>
                  <span className={`question-category-badge ${question.category === 'Custom' ? 'custom' : 'library'}`}>
                    {question.category || 'Custom'}
                  </span>
                  <div className="question-actions">
                    <button
                      onClick={() => {
                        setInsertAtIndex(index + 1);
                        setShowQuestionLibrary(true);
                      }}
                      className="btn-library-small"
                      title="Add question from library"
                      disabled={questions.length >= 20}
                    >
                      📚
                    </button>
                    <button
                      onClick={() => addQuestion(index + 1)}
                      className="btn-add-custom-small"
                      title="Add custom question"
                      disabled={questions.length >= 20}
                    >
                      +
                    </button>
                    <button
                      onClick={() => deleteQuestion(index)}
                      className="btn-delete-question"
                      title="Delete question"
                      disabled={questions.length === 1}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="question-body">
                  <div className="form-group">
                    <label>Question Text <span className="required">*</span></label>
                    <textarea
                      value={question.text}
                      onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                      placeholder="Enter your question here..."
                      rows={2}
                      maxLength={500}
                    />
                    <span className="help-text">{question.text.length}/500 characters</span>
                  </div>

                  <div className="question-options">
                    <label className="inline-label">Answer Type</label>
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                      className="type-select"
                    >
                      <option value="text">Short Text</option>
                      <option value="textarea">Long Text (Paragraph)</option>
                      <option value="scale">Rating Scale (1-5)</option>
                    </select>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                      />
                      <span>Required Question</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Question Buttons at Bottom */}
          {questions.length < 20 && (
            <div className="add-question-buttons">
              <button
                onClick={() => {
                  setInsertAtIndex(questions.length);
                  setShowQuestionLibrary(true);
                }}
                className="btn-library"
              >
                + Add Template Question
              </button>
              <button 
                onClick={() => addQuestion()} 
                className="btn-add-question"
              >
                + Add Custom Question
              </button>
            </div>
          )}
        </section>

        {/* Validation Summary */}
        <section className="builder-section validation-summary">
          <h4>Template Summary</h4>
          <ul>
            <li className={templateName.trim() ? 'valid' : 'invalid'}>
              {templateName.trim() ? '✓' : '○'} Template name
            </li>
            <li className={questions.length > 0 ? 'valid' : 'invalid'}>
              {questions.length > 0 ? '✓' : '○'} At least 1 question ({questions.length} added)
            </li>
            <li className={questions.filter(q => q.required).length > 0 ? 'valid' : 'invalid'}>
              {questions.filter(q => q.required).length > 0 ? '✓' : '○'} At least 1 required question
            </li>
            <li className={questions.every(q => q.text.trim()) ? 'valid' : 'invalid'}>
              {questions.every(q => q.text.trim()) ? '✓' : '○'} All questions have text
            </li>
          </ul>
        </section>
      </div>

      {/* Footer Actions */}
      <div className="builder-footer">
        <button onClick={onCancel} className="btn-secondary" disabled={saving}>
          Cancel
        </button>
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : templateId ? 'Update Template' : 'Create Template'}
        </button>
      </div>

      {/* Question Library Modal */}
      {showQuestionLibrary && (
        <QuestionLibrary
          onAddQuestion={addQuestionFromLibrary}
          onClose={() => setShowQuestionLibrary(false)}
        />
      )}
    </div>
  );
}

