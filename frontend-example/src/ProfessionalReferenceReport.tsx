/**
 * Professional Reference Report Component
 * Generates a comprehensive, visually-rich reference report
 * Inspired by professional reference checking platforms
 */

import React from 'react';

interface ReferenceData {
  // Candidate info
  candidate: {
    name: string;
    organization?: string;
    role?: string;
    email: string;
    phone?: string;
    employmentStart: string;
    employmentEnd: string;
  };

  // Referee info
  referee: {
    name: string;
    organization?: string;
    role?: string;
    email: string;
    phone?: string;
    submissionDate: string;
    relationship: string;
  };

  // Responses
  responses: Array<{
    question: string;
    answer: string;
    rating?: number; // 1-7 scale
    wordCount?: number;
  }>;

  // Metadata
  metadata?: {
    turnaroundTimeHours?: number;
    totalWordCount?: number;
    sentimentScore?: number; // 0-100
  };
}

interface CompetencyScore {
  name: string;
  score: number;
  maxScore: number;
  average: number;
}

export const ProfessionalReferenceReport: React.FC<{ data: ReferenceData }> = ({ data }) => {

  // Calculate employment duration
  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                   (endDate.getMonth() - startDate.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return years > 0 ? `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}` : `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  };

  // Calculate average rating from responses
  const calculateAverageRating = () => {
    const ratingsOnly = data.responses.filter(r => r.rating !== undefined);
    if (ratingsOnly.length === 0) return 0;
    const sum = ratingsOnly.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / ratingsOnly.length).toFixed(1);
  };

  // Extract competency scores from responses (this would be based on your question structure)
  const competencyScores: CompetencyScore[] = [
    { name: 'Overall Performance', score: 7, maxScore: 7, average: 6.2 },
    { name: 'Communication', score: 6, maxScore: 7, average: 6.2 },
    { name: 'Teamwork', score: 7, maxScore: 7, average: 6.3 },
    { name: 'Reliability', score: 6, maxScore: 7, average: 6.3 },
  ];

  // Calculate sentiment breakdown (example - would be from AI analysis)
  const sentimentPositive = data.metadata?.sentimentScore || 76;
  const sentimentNeutral = 100 - sentimentPositive;

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#fff'
    }}>

      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        color: '#1e3a8a',
        padding: '30px',
        borderRadius: '24px',
        marginBottom: '30px',
        border: '2px solid #1e3a8a'
      }}>
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '400', opacity: 0.7 }}>Reference Report</h1>
        <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '600' }}>
          {data.candidate.name} / {data.candidate.role || 'Position'}
        </p>
      </div>

      {/* Referee Details */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#1a1a1a' }}>
          Referee Details
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '30px',
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Referee name</div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a' }}>{data.referee.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Submission date</div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a' }}>
              {new Date(data.referee.submissionDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Relationship</div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a' }}>{data.referee.relationship}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Organization</div>
            <div style={{ fontSize: '15px', fontWeight: '500', color: '#1a1a1a' }}>{data.referee.organization || 'N/A'}</div>
          </div>
        </div>
      </section>

      {/* Referee Feedback Responses */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#1a1a1a' }}>
          Referee Feedback
        </h2>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
          The referee's responses to the reference survey.
        </p>

        {data.responses.map((response, idx) => (
          <div key={idx} style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            borderLeft: '4px solid #1e3a8a'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                flexShrink: 0
              }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                  {response.question}
                </div>
                <div style={{ fontSize: '15px', color: '#1a1a1a', lineHeight: '1.6' }}>
                  {response.answer}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Footer/Disclaimer */}
      <section style={{
        marginTop: '60px',
        padding: '24px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#666',
        lineHeight: '1.6'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1a1a1a' }}>
          Disclaimer
        </h3>
        <p style={{ margin: 0 }}>
          This reference report has been generated from feedback provided by the referee listed above.
          The candidate has consented to the collection and use of this data. While we strive for accuracy,
          this information is provided to assist in your assessment and should be considered alongside other
          evaluation methods. The information is confidential and should not be shared without proper authorization.
        </p>
      </section>
    </div>
  );
};

export default ProfessionalReferenceReport;
