'use client';

import React, { useState } from 'react';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { FileUp, Sparkles, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface FormErrors {
  title?: string;
  topic?: string;
  dueDate?: string;
  questionTypes?: string;
  totalQuestions?: string;
  totalMarks?: string;
  file?: string;
}

export default function AssignmentForm({ onSubmitSuccess }: { onSubmitSuccess: (id: string) => void }) {
  const store = useAssessmentStore();
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle question type selection
  const handleTypeChange = (type: string) => {
    const current = [...store.questionTypes];
    if (current.includes(type)) {
      // Keep at least one type checked
      if (current.length > 1) {
        store.setField('questionTypes', current.filter((t) => t !== type));
      }
    } else {
      store.setField('questionTypes', [...current, type]);
    }
  };

  // Validate the form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!store.title.trim()) {
      newErrors.title = 'Assessment title is required';
    }
    if (!store.topic.trim()) {
      newErrors.topic = 'Subject topic or syllabus is required';
    }
    
    if (!store.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const today = new Date();
      today.setHours(0,0,0,0);
      const selected = new Date(store.dueDate);
      if (selected < today) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }

    if (store.questionTypes.length === 0) {
      newErrors.questionTypes = 'Select at least one question type';
    }

    if (!store.totalQuestions || store.totalQuestions <= 0) {
      newErrors.totalQuestions = 'Must be greater than 0';
    } else if (store.totalQuestions > 50) {
      newErrors.totalQuestions = 'Maximum limit is 50 questions';
    }

    if (!store.totalMarks || store.totalMarks <= 0) {
      newErrors.totalMarks = 'Must be greater than 0';
    } else if (store.totalMarks > 500) {
      newErrors.totalMarks = 'Maximum limit is 500 marks';
    }

    if (store.file) {
      const sizeLimit = 5 * 1024 * 1024; // 5MB
      const fileExt = store.file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'txt'].includes(fileExt || '')) {
        newErrors.file = 'Only PDF and TXT files are supported';
      } else if (store.file.size > sizeLimit) {
        newErrors.file = 'File size must be under 5MB';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      store.setFile(files[0]);
    } else {
      store.setFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    store.clearLogs();
    
    try {
      // Build FormData payload
      const formData = new FormData();
      formData.append('title', store.title);
      formData.append('topic', store.topic);
      formData.append('dueDate', store.dueDate);
      formData.append('questionTypes', JSON.stringify(store.questionTypes));
      formData.append('totalQuestions', store.totalQuestions.toString());
      formData.append('totalMarks', store.totalMarks.toString());
      formData.append('additionalInstructions', store.additionalInstructions);
      if (store.file) {
        formData.append('file', store.file);
      }

      const response = await fetch(`${API_URL}/api/assignments`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const assignmentId = result.assignment._id;
        store.startGeneration(assignmentId);
        onSubmitSuccess(assignmentId);
      } else {
        const backendErrors = result.errors || ['Server generation rejected. Check details.'];
        setErrors({ title: backendErrors.join('. ') });
      }
    } catch (err: any) {
      console.error(err);
      setErrors({ title: 'Network connection to backend failed. Is server running on port 5000?' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={styles.formContainer}>
      <div style={styles.formHeader}>
        <h2 style={styles.title}>Assessment Planner</h2>
        <p style={styles.subtitle}>Configure details to generate a structured AI question paper</p>
      </div>

      {/* Title */}
      <div className="form-group">
        <label className="form-label">Assessment Title</label>
        <input
          type="text"
          placeholder="e.g., Biology Mid-Term Exam"
          className="form-input"
          value={store.title}
          onChange={(e) => store.setField('title', e.target.value)}
        />
        {errors.title && <span style={styles.errorText}><AlertCircle size={12} /> {errors.title}</span>}
      </div>

      {/* Topic */}
      <div className="form-group">
        <label className="form-label">Syllabus / Subject Topic</label>
        <input
          type="text"
          placeholder="e.g., Plant Photosynthesis and Cell Respiration"
          className="form-input"
          value={store.topic}
          onChange={(e) => store.setField('topic', e.target.value)}
        />
        {errors.topic && <span style={styles.errorText}><AlertCircle size={12} /> {errors.topic}</span>}
      </div>

      <div style={styles.grid2}>
        {/* Due Date */}
        <div className="form-group">
          <label className="form-label">Due Date</label>
          <input
            type="date"
            className="form-input"
            value={store.dueDate}
            onChange={(e) => store.setField('dueDate', e.target.value)}
          />
          {errors.dueDate && <span style={styles.errorText}><AlertCircle size={12} /> {errors.dueDate}</span>}
        </div>

        {/* File Upload */}
        <div className="form-group">
          <label className="form-label">Reference Material (PDF/TXT)</label>
          <label style={styles.fileUploadBtn} className={store.file ? 'file-active' : ''}>
            <FileUp size={16} />
            <span style={styles.fileLabelText}>
              {store.file ? store.file.name.substring(0, 15) + '...' : 'Upload Context File'}
            </span>
            <input type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleFileChange} />
          </label>
          {errors.file && <span style={styles.errorText}><AlertCircle size={12} /> {errors.file}</span>}
        </div>
      </div>

      {/* Question Types */}
      <div className="form-group">
        <label className="form-label">Question Types Allowed</label>
        <div className="checkbox-grid">
          {[
            { id: 'MCQ', label: 'Multiple Choice' },
            { id: 'TRUE_FALSE', label: 'True / False' },
            { id: 'SHORT', label: 'Short Answer' },
            { id: 'LONG', label: 'Long / Essay' },
          ].map((type) => (
            <label
              key={type.id}
              className={`checkbox-tile ${store.questionTypes.includes(type.id) ? 'checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={store.questionTypes.includes(type.id)}
                onChange={() => handleTypeChange(type.id)}
              />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>{type.label}</span>
            </label>
          ))}
        </div>
        {errors.questionTypes && <span style={styles.errorText}><AlertCircle size={12} /> {errors.questionTypes}</span>}
      </div>

      <div style={styles.grid2}>
        {/* Total Questions */}
        <div className="form-group">
          <label className="form-label">Total Questions</label>
          <input
            type="number"
            min="1"
            max="50"
            className="form-input"
            value={store.totalQuestions || ''}
            onChange={(e) => store.setField('totalQuestions', parseInt(e.target.value) || 0)}
          />
          {errors.totalQuestions && <span style={styles.errorText}><AlertCircle size={12} /> {errors.totalQuestions}</span>}
        </div>

        {/* Total Marks */}
        <div className="form-group">
          <label className="form-label">Total Marks</label>
          <input
            type="number"
            min="1"
            max="500"
            className="form-input"
            value={store.totalMarks || ''}
            onChange={(e) => store.setField('totalMarks', parseInt(e.target.value) || 0)}
          />
          {errors.totalMarks && <span style={styles.errorText}><AlertCircle size={12} /> {errors.totalMarks}</span>}
        </div>
      </div>

      {/* Additional Instructions */}
      <div className="form-group">
        <label className="form-label">Additional Instructions (Optional)</label>
        <textarea
          placeholder="e.g., Focus heavily on light reactions. Keep vocabulary suitable for Grade 10."
          className="form-textarea"
          value={store.additionalInstructions}
          onChange={(e) => store.setField('additionalInstructions', e.target.value)}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="btn-primary"
        disabled={isSubmitting || store.status === 'processing'}
        style={styles.submitBtn}
      >
        <Sparkles size={16} />
        {isSubmitting || store.status === 'processing' ? 'Generating with AI...' : 'Create Assessment'}
      </button>
    </form>
  );
}

const styles = {
  formContainer: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  formHeader: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    marginBottom: '6px',
    background: 'linear-gradient(135deg, #ffffff, #94a3b8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  fileUploadBtn: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1.5px dashed var(--border-glass)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    padding: '11px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  fileLabelText: {
    fontSize: '13px',
    fontWeight: 500,
  },
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    marginTop: '10px',
  },
  errorText: {
    fontSize: '12px',
    color: 'var(--accent-hard)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '2px',
    fontWeight: 500,
  },
};
