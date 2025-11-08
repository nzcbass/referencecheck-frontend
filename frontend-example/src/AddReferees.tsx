/**
 * AddReferees Component
 * Form to add multiple referees to a reference request
 */

import React, { useState } from 'react';

interface Referee {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  relationship: string;
}

interface AddRefereesProps {
  requestId: string;
  onSuccess?: (contacts: any[]) => void;
  onError?: (error: string) => void;
  apiUrl?: string;
}

export const AddReferees: React.FC<AddRefereesProps> = ({
  requestId,
  onSuccess,
  onError,
  apiUrl = 'http://localhost:5001/api',
}) => {
  const [referees, setReferees] = useState<Referee[]>([
    {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      relationship: '',
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addRefereeField = () => {
    setReferees([
      ...referees,
      {
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        relationship: '',
      },
    ]);
  };

  const removeReferee = (index: number) => {
    if (referees.length > 1) {
      setReferees(referees.filter((_, i) => i !== index));
    }
  };

  const handleRefereeChange = (index: number, field: keyof Referee, value: string) => {
    const updatedReferees = [...referees];
    updatedReferees[index][field] = value;
    setReferees(updatedReferees);
    
    // Clear error for this field
    const errorKey = `${index}_${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    referees.forEach((referee, index) => {
      if (!referee.first_name.trim()) {
        newErrors[`${index}_first_name`] = 'First name is required';
      }
      if (!referee.last_name.trim()) {
        newErrors[`${index}_last_name`] = 'Last name is required';
      }
      if (!referee.email.trim()) {
        newErrors[`${index}_email`] = 'Email is required';
      } else if (!referee.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        newErrors[`${index}_email`] = 'Invalid email format';
      }
      if (!referee.relationship.trim()) {
        newErrors[`${index}_relationship`] = 'Relationship is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${apiUrl}/requests/${requestId}/referees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referees }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add referees');
      }

      if (onSuccess && data.contacts) {
        onSuccess(data.contacts);
      }

      // Reset form
      setReferees([
        {
          first_name: '',
          last_name: '',
          email: '',
          phone_number: '',
          relationship: '',
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setErrors({ submit: errorMessage });
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-referees">
      <h2>Add Referees</h2>
      <p className="help-text">Add one or more people to provide references</p>

      <form onSubmit={handleSubmit}>
        {referees.map((referee, index) => (
          <div key={index} className="referee-card">
            <div className="referee-header">
              <h3>Referee {index + 1}</h3>
              {referees.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeReferee(index)}
                  className="btn-remove"
                  aria-label="Remove referee"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="form-row">
              {/* First Name */}
              <div className="form-group">
                <label htmlFor={`first_name_${index}`}>
                  First Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id={`first_name_${index}`}
                  value={referee.first_name}
                  onChange={(e) => handleRefereeChange(index, 'first_name', e.target.value)}
                  placeholder="Jane"
                  className={errors[`${index}_first_name`] ? 'error' : ''}
                />
                {errors[`${index}_first_name`] && (
                  <span className="error-message">{errors[`${index}_first_name`]}</span>
                )}
              </div>

              {/* Last Name */}
              <div className="form-group">
                <label htmlFor={`last_name_${index}`}>
                  Last Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id={`last_name_${index}`}
                  value={referee.last_name}
                  onChange={(e) => handleRefereeChange(index, 'last_name', e.target.value)}
                  placeholder="Smith"
                  className={errors[`${index}_last_name`] ? 'error' : ''}
                />
                {errors[`${index}_last_name`] && (
                  <span className="error-message">{errors[`${index}_last_name`]}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              {/* Email */}
              <div className="form-group">
                <label htmlFor={`email_${index}`}>
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id={`email_${index}`}
                  value={referee.email}
                  onChange={(e) => handleRefereeChange(index, 'email', e.target.value)}
                  placeholder="jane.smith@company.com"
                  className={errors[`${index}_email`] ? 'error' : ''}
                />
                {errors[`${index}_email`] && (
                  <span className="error-message">{errors[`${index}_email`]}</span>
                )}
              </div>

              {/* Phone Number */}
              <div className="form-group">
                <label htmlFor={`phone_number_${index}`}>Phone Number</label>
                <input
                  type="tel"
                  id={`phone_number_${index}`}
                  value={referee.phone_number}
                  onChange={(e) => handleRefereeChange(index, 'phone_number', e.target.value)}
                  placeholder="+1-555-0100"
                />
              </div>
            </div>

            {/* Relationship */}
            <div className="form-group">
              <label htmlFor={`relationship_${index}`}>
                Relationship <span className="required">*</span>
              </label>
              <input
                type="text"
                id={`relationship_${index}`}
                value={referee.relationship}
                onChange={(e) => handleRefereeChange(index, 'relationship', e.target.value)}
                placeholder="Direct Manager, Colleague, Team Lead..."
                className={errors[`${index}_relationship`] ? 'error' : ''}
              />
              {errors[`${index}_relationship`] && (
                <span className="error-message">{errors[`${index}_relationship`]}</span>
              )}
            </div>
          </div>
        ))}

        {/* Add Another Referee Button */}
        <button
          type="button"
          onClick={addRefereeField}
          className="btn-secondary"
        >
          + Add Another Referee
        </button>

        {/* Submit Error */}
        {errors.submit && (
          <div className="alert alert-error">
            {errors.submit}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Adding Referees...' : `Add ${referees.length} Referee${referees.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddReferees;

