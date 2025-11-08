import React, { useState } from 'react';

export interface QuestionTemplate {
  id: string;
  text: string;
  category: string;
  type: 'text' | 'textarea' | 'scale';
  required: boolean;
}

const QUESTION_LIBRARY: QuestionTemplate[] = [
  // Work Performance
  { id: 'lib_wp_1', text: 'How would you describe the candidate\'s overall work performance?', category: 'Work Performance', type: 'textarea', required: true },
  { id: 'lib_wp_2', text: 'What were the candidate\'s key strengths in their role?', category: 'Work Performance', type: 'textarea', required: true },
  { id: 'lib_wp_3', text: 'What areas could the candidate improve upon?', category: 'Work Performance', type: 'textarea', required: true },
  { id: 'lib_wp_4', text: 'On a scale of 1-5, how would you rate their work quality?', category: 'Work Performance', type: 'scale', required: true },
  { id: 'lib_wp_5', text: 'Did the candidate consistently meet deadlines and deliverables?', category: 'Work Performance', type: 'textarea', required: true },
  
  // Communication & Teamwork
  { id: 'lib_ct_1', text: 'How effective was the candidate at communicating with team members?', category: 'Communication', type: 'textarea', required: true },
  { id: 'lib_ct_2', text: 'On a scale of 1-5, how would you rate their teamwork skills?', category: 'Communication', type: 'scale', required: true },
  { id: 'lib_ct_3', text: 'How did the candidate handle conflicts or disagreements?', category: 'Communication', type: 'textarea', required: false },
  { id: 'lib_ct_4', text: 'Was the candidate comfortable presenting ideas to stakeholders?', category: 'Communication', type: 'textarea', required: false },
  
  // Leadership & Initiative
  { id: 'lib_li_1', text: 'Did the candidate demonstrate leadership qualities?', category: 'Leadership', type: 'textarea', required: false },
  { id: 'lib_li_2', text: 'Can you provide an example of when they took initiative?', category: 'Leadership', type: 'textarea', required: false },
  { id: 'lib_li_3', text: 'How did they handle responsibility and accountability?', category: 'Leadership', type: 'textarea', required: true },
  { id: 'lib_li_4', text: 'On a scale of 1-5, how proactive were they?', category: 'Leadership', type: 'scale', required: false },
  
  // Reliability & Attendance
  { id: 'lib_ra_1', text: 'How would you rate the candidate\'s punctuality and attendance?', category: 'Reliability', type: 'textarea', required: true },
  { id: 'lib_ra_2', text: 'Could you rely on them to follow through on commitments?', category: 'Reliability', type: 'textarea', required: true },
  { id: 'lib_ra_3', text: 'On a scale of 1-5, how dependable were they?', category: 'Reliability', type: 'scale', required: true },
  
  // Professional Development
  { id: 'lib_pd_1', text: 'How receptive was the candidate to feedback and coaching?', category: 'Professional Development', type: 'textarea', required: true },
  { id: 'lib_pd_2', text: 'Did they show interest in learning and professional growth?', category: 'Professional Development', type: 'textarea', required: false },
  { id: 'lib_pd_3', text: 'What skills or capabilities did they develop during their time with you?', category: 'Professional Development', type: 'textarea', required: false },
  
  // Cultural Fit
  { id: 'lib_cf_1', text: 'How well did the candidate fit with your organization\'s culture?', category: 'Cultural Fit', type: 'textarea', required: true },
  { id: 'lib_cf_2', text: 'What type of work environment do they thrive in?', category: 'Cultural Fit', type: 'textarea', required: false },
  { id: 'lib_cf_3', text: 'On a scale of 1-5, how would you rate their cultural fit?', category: 'Cultural Fit', type: 'scale', required: false },
  
  // Recommendation
  { id: 'lib_rec_1', text: 'Would you rehire this candidate if given the opportunity?', category: 'Recommendation', type: 'textarea', required: true },
  { id: 'lib_rec_2', text: 'On a scale of 1-5, how strongly would you recommend this candidate?', category: 'Recommendation', type: 'scale', required: true },
  { id: 'lib_rec_3', text: 'Is there anything else you would like to add about this candidate?', category: 'Recommendation', type: 'textarea', required: false },
  
  // Reason for Leaving
  { id: 'lib_rfl_1', text: 'What was the reason for the candidate leaving your organization?', category: 'Employment History', type: 'textarea', required: true },
  { id: 'lib_rfl_2', text: 'Would you consider them eligible for rehire?', category: 'Employment History', type: 'textarea', required: true },
];

interface QuestionLibraryProps {
  onAddQuestion: (question: QuestionTemplate) => void;
  onClose: () => void;
}

export function QuestionLibrary({ onAddQuestion, onClose }: QuestionLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['all', ...Array.from(new Set(QUESTION_LIBRARY.map(q => q.category)))];

  const filteredQuestions = QUESTION_LIBRARY.filter(q => {
    const matchesCategory = selectedCategory === 'all' || q.category === selectedCategory;
    const matchesSearch = q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         q.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddQuestion = (question: QuestionTemplate) => {
    // Create a new question with a unique ID
    const newQuestion = {
      ...question,
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    onAddQuestion(newQuestion);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content question-library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📚 Question Library</h2>
          <button onClick={onClose} className="btn-close">×</button>
        </div>
        
        <div className="modal-body">
          <p className="library-intro">
            Choose from {QUESTION_LIBRARY.length} pre-built questions to add to your template
          </p>
          
          {/* Search & Filter */}
          <div className="library-filters">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Questions List */}
          <div className="library-questions">
            {filteredQuestions.length === 0 ? (
              <div className="no-results">
                <p>No questions found matching your criteria</p>
              </div>
            ) : (
              filteredQuestions.map((question, index) => (
                <div key={`${question.id}-${index}`} className="library-question-item">
                  <div className="question-details">
                    <span className="question-category">{question.category}</span>
                    <p className="question-text">{question.text}</p>
                    <div className="question-meta">
                      <span className="meta-badge">{question.type === 'textarea' ? 'Long Text' : question.type === 'scale' ? 'Rating (1-5)' : 'Short Text'}</span>
                      {question.required && <span className="meta-badge required">Required</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddQuestion(question)}
                    className="btn-add-from-library"
                    title="Add to template"
                  >
                    + Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

