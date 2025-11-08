/**
 * CreateReferenceRequest Component
 * Form to create a new reference check request
 */

import React, { useState } from 'react';

interface FormData {
  user_id: string;
  template_id: string;
  candidate_first_name: string;
  candidate_last_name: string;
  candidate_email: string;
  candidate_phone_number: string;
  position_applied_for: string;
  notes: string;
}

interface CreateReferenceRequestProps {
  userId: string;
  templateId: string;
  onSuccess?: (requestId: string) => void;
  onError?: (error: string) => void;
  apiUrl?: string;
}

export const CreateReferenceRequest: React.FC<CreateReferenceRequestProps> = ({
  userId,
  templateId,
  onSuccess,
  onError,
  apiUrl = 'http://localhost:5001/api',
}) => {
  const [formData, setFormData] = useState<FormData>({
    user_id: userId,
    template_id: templateId,
    candidate_first_name: '',
    candidate_last_name: '',
    candidate_email: '',
    candidate_phone_number: '',
    position_applied_for: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.candidate_first_name.trim()) {
      newErrors.candidate_first_name = 'First name is required';
    }

    if (!formData.candidate_last_name.trim()) {
      newErrors.candidate_last_name = 'Last name is required';
    }

    if (!formData.position_applied_for.trim()) {
      newErrors.position_applied_for = 'Position is required';
    }

    if (formData.candidate_email && !formData.candidate_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.candidate_email = 'Invalid email format';
    }

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
      const response = await fetch(`${apiUrl}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create request');
      }

      if (onSuccess && data.request) {
        onSuccess(data.request.id);
      }

      // Reset form
      setFormData({
        ...formData,
        candidate_first_name: '',
        candidate_last_name: '',
        candidate_email: '',
        candidate_phone_number: '',
        position_applied_for: '',
        notes: '',
      });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="create-reference-request">
      <h2>Create Reference Check Request</h2>

      <form onSubmit={handleSubmit}>
        {/* Candidate First Name */}
        <div className="form-group">
          <label htmlFor="candidate_first_name">
            Candidate First Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="candidate_first_name"
            name="candidate_first_name"
            value={formData.candidate_first_name}
            onChange={handleChange}
            placeholder="John"
            required
            className={errors.candidate_first_name ? 'error' : ''}
          />
          {errors.candidate_first_name && (
            <span className="error-message">{errors.candidate_first_name}</span>
          )}
        </div>

        {/* Candidate Last Name */}
        <div className="form-group">
          <label htmlFor="candidate_last_name">
            Candidate Last Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="candidate_last_name"
            name="candidate_last_name"
            value={formData.candidate_last_name}
            onChange={handleChange}
            placeholder="Doe"
            required
            className={errors.candidate_last_name ? 'error' : ''}
          />
          {errors.candidate_last_name && (
            <span className="error-message">{errors.candidate_last_name}</span>
          )}
        </div>

        {/* Position Applied For */}
        <div className="form-group">
          <label htmlFor="position_applied_for">
            Position Applied For <span className="required">*</span>
          </label>
          <input
            type="text"
            id="position_applied_for"
            name="position_applied_for"
            value={formData.position_applied_for}
            onChange={handleChange}
            placeholder="Senior Product Manager"
            required
            className={errors.position_applied_for ? 'error' : ''}
          />
          {errors.position_applied_for && (
            <span className="error-message">{errors.position_applied_for}</span>
          )}
        </div>

        {/* Candidate Email */}
        <div className="form-group">
          <label htmlFor="candidate_email">Candidate Email</label>
          <input
            type="email"
            id="candidate_email"
            name="candidate_email"
            value={formData.candidate_email}
            onChange={handleChange}
            placeholder="john.doe@email.com"
            className={errors.candidate_email ? 'error' : ''}
          />
          {errors.candidate_email && (
            <span className="error-message">{errors.candidate_email}</span>
          )}
        </div>

        {/* Candidate Phone */}
        <div className="form-group">
          <label htmlFor="candidate_phone_number">Candidate Phone Number</label>
          <input
            type="tel"
            id="candidate_phone_number"
            name="candidate_phone_number"
            value={formData.candidate_phone_number}
            onChange={handleChange}
            placeholder="+1-555-1234"
          />
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional information about the candidate..."
            rows={4}
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="alert alert-error">
            {errors.submit}
          </div>
        )}

        {/* Submit Button */}
        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateReferenceRequest;

