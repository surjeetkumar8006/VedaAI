'use client';

import React, { useState, useEffect } from 'react';
import { Assignment, Section, Question } from '../store/useAssessmentStore';
import { Download, Printer, RotateCw, Save, Check, ArrowLeft, Trash2, Plus, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface AssessmentPaperProps {
  assignment: Assignment;
  onBack: () => void;
  onRegenerate: () => void;
}

export default function AssessmentPaper({ assignment, onBack, onRegenerate }: AssessmentPaperProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pdfPath, setPdfPath] = useState(assignment.pdfPath);

  // Examiner metadata
  const [examinerName, setExaminerName] = useState('Dr. Sharma');

  // Student details states (controlled inputs)
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentSec, setStudentSec] = useState('');

  // Sync sections from props
  useEffect(() => {
    if (assignment.sections) {
      setSections(JSON.parse(JSON.stringify(assignment.sections))); // Deep copy
    }
    setPdfPath(assignment.pdfPath);
  }, [assignment]);

  // Recalculate values dynamically from live editor state
  let currentTotalQuestions = 0;
  let currentTotalMarks = 0;
  sections.forEach((sec) => {
    if (sec.questions) {
      currentTotalQuestions += sec.questions.length;
      sec.questions.forEach((q) => {
        currentTotalMarks += Number(q.marks || 0);
      });
    }
  });

  // Handle text input edits for questions
  const handleQuestionTextChange = (secIdx: number, qIdx: number, newText: string) => {
    const updated = [...sections];
    updated[secIdx].questions[qIdx].questionText = newText;
    setSections(updated);
    setIsEditing(true);
  };

  // Handle marks change
  const handleQuestionMarksChange = (secIdx: number, qIdx: number, newMarks: number) => {
    const updated = [...sections];
    updated[secIdx].questions[qIdx].marks = newMarks;
    setSections(updated);
    setIsEditing(true);
  };

  // Handle difficulty change
  const handleQuestionDiffChange = (secIdx: number, qIdx: number, newDiff: 'easy' | 'medium' | 'hard') => {
    const updated = [...sections];
    updated[secIdx].questions[qIdx].difficulty = newDiff;
    setSections(updated);
    setIsEditing(true);
  };

  // Handle MCQ option change
  const handleOptionChange = (secIdx: number, qIdx: number, optIdx: number, newOpt: string) => {
    const updated = [...sections];
    const q = updated[secIdx].questions[qIdx];
    if (q.options) {
      q.options[optIdx] = newOpt;
      setSections(updated);
      setIsEditing(true);
    }
  };

  // Add Question inline
  const handleAddQuestion = (secIdx: number, type: 'MCQ' | 'SHORT' | 'LONG' | 'TRUE_FALSE') => {
    const updated = [...sections];
    const newQ: Question = {
      questionText: 'Enter your custom question here...',
      type,
      difficulty: 'medium',
      marks: type === 'MCQ' || type === 'TRUE_FALSE' ? 2 : type === 'SHORT' ? 5 : 10,
      options: type === 'MCQ' ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined
    };
    updated[secIdx].questions.push(newQ);
    setSections(updated);
    setIsEditing(true);
  };

  // Delete Question inline
  const handleDeleteQuestion = (secIdx: number, qIdx: number) => {
    const updated = [...sections];
    updated[secIdx].questions.splice(qIdx, 1);
    setSections(updated);
    setIsEditing(true);
  };

  // Save changes to backend
  const handleSaveEdits = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/assignments/${assignment._id}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPdfPath(data.assignment.pdfPath);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.message || 'Failed to save changes.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to server to save edits.');
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  const getDownloadUrl = () => {
    if (!pdfPath) return '#';
    if (pdfPath.startsWith('http')) return pdfPath;
    return `${API_URL}${pdfPath}`;
  };

  return (
    <div style={styles.container}>
      {/* Action Bar (no-print) */}
      <div style={styles.actionBar} className="no-print glass-panel">
        <button onClick={onBack} style={styles.backBtn}>
          <ArrowLeft size={16} />
          <span>Creator Portal</span>
        </button>

        <div style={styles.actionGroup}>
          {isEditing && (
            <button onClick={handleSaveEdits} style={styles.saveBtn} disabled={isSaving}>
              {isSaving ? (
                <RotateCw size={14} className="spin-animation" />
              ) : (
                <Save size={14} />
              )}
              <span>Save Edits</span>
            </button>
          )}

          {saveSuccess && (
            <div style={styles.successBadge}>
              <Check size={12} /> Saved PDF!
            </div>
          )}

          <button onClick={onRegenerate} style={styles.actionBtn}>
            <RotateCw size={14} />
            <span>Regenerate AI</span>
          </button>

          <button onClick={handlePrint} style={styles.actionBtn}>
            <Printer size={14} />
            <span>Print Paper</span>
          </button>

          <a href={getDownloadUrl()} download target="_blank" rel="noopener noreferrer" style={styles.downloadBtn}>
            <Download size={14} />
            <span>Download PDF</span>
          </a>
        </div>
      </div>

      {isEditing && (
        <div style={styles.alertBanner} className="no-print">
          <AlertCircle size={16} />
          <span>You have unsaved edits. Click "Save Edits" to sync changes and update the download PDF.</span>
        </div>
      )}

      {/* Exam Paper Sheet */}
      <div className="exam-container">
        {/* Header section */}
        <div className="exam-header">
          <h1>{assignment.title.toUpperCase()}</h1>
          <p style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '4px', color: '#64748b' }}>
            VedaAI Academic Assessment Engine
          </p>
        </div>

        {/* Paper details grid */}
        <div className="exam-meta-grid">
          <div>TOPIC/SUBJECT: <span style={{ fontWeight: 'normal' }}>{assignment.topic}</span></div>
          <div style={{ textAlign: 'right' }}>DATE: <span style={{ fontWeight: 'normal' }}>{new Date(assignment.dueDate).toLocaleDateString()}</span></div>
          <div>MAX MARKS: <span style={{ fontWeight: 'normal' }}>{currentTotalMarks} Marks</span></div>
          <div style={{ textAlign: 'right' }}>TOTAL QUESTIONS: <span style={{ fontWeight: 'normal' }}>{currentTotalQuestions}</span></div>
        </div>

        {/* Student identification table */}
        <div className="exam-student-box">
          <div className="student-grid">
            <div className="student-field">
              <label>STUDENT FULL NAME</label>
              <input
                type="text"
                placeholder="Enter Student Name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>
            <div className="student-field">
              <label>ROLL NUMBER</label>
              <input
                type="text"
                placeholder="Roll No"
                value={studentRoll}
                onChange={(e) => setStudentRoll(e.target.value)}
              />
            </div>
            <div className="student-field">
              <label>SECTION</label>
              <input
                type="text"
                placeholder="Sec"
                value={studentSec}
                onChange={(e) => setStudentSec(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Additional candidate instructions */}
        {assignment.additionalInstructions && (
          <div style={{ marginBottom: '24px', fontSize: '11px', borderBottom: '1px double #0f172a', paddingBottom: '10px' }}>
            <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>CANDIDATE INSTRUCTIONS:</span>
            <span style={{ fontStyle: 'italic', color: '#334155' }}>{assignment.additionalInstructions}</span>
          </div>
        )}

        {/* Render sections & questions */}
        {sections.map((sec, secIdx) => (
          <div key={sec._id || secIdx} className="exam-section">
            <div className="exam-section-title">
              {sec.title}
            </div>
            <div className="exam-section-instructions">
              {sec.instructions}
            </div>

            {/* List questions in section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {sec.questions.map((q, qIdx) => (
                <div key={q._id || qIdx} className="exam-question-item">
                  <div className="exam-question-header">
                    <span className="exam-question-num">Q{qIdx + 1}.</span>
                    <span className="exam-question-text">
                      <input
                        type="text"
                        className="exam-editable-input"
                        value={q.questionText}
                        onChange={(e) => handleQuestionTextChange(secIdx, qIdx, e.target.value)}
                      />
                    </span>
                    <span className="exam-question-meta">
                      {/* Difficulty Selection */}
                      <select
                        value={q.difficulty}
                        onChange={(e) => handleQuestionDiffChange(secIdx, qIdx, e.target.value as any)}
                        style={styles.diffSelect}
                        className="no-print"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      
                      <span className={`badge-diff ${q.difficulty} print-only`} style={{ display: 'none' }}>
                        {q.difficulty}
                      </span>

                      {/* Marks input */}
                      <span className="no-print" style={{ color: '#64748b', fontSize: '11px' }}>[</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={q.marks}
                        onChange={(e) => handleQuestionMarksChange(secIdx, qIdx, parseInt(e.target.value) || 1)}
                        style={styles.marksInput}
                      />
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Marks]</span>

                      {/* Delete button (no-print) */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(secIdx, qIdx)}
                        style={styles.deleteQBtn}
                        className="no-print"
                        title="Delete Question"
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </div>

                  {/* Render options for MCQs */}
                  {q.type === 'MCQ' && q.options && (
                    <div className="exam-options-grid">
                      {q.options.map((opt, optIdx) => {
                        const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
                        return (
                          <div key={optIdx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 'bold' }}>{letter})</span>
                            <input
                              type="text"
                              className="exam-editable-input"
                              value={opt}
                              onChange={(e) => handleOptionChange(secIdx, qIdx, optIdx, e.target.value)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Render True/False choice hint */}
                  {q.type === 'TRUE_FALSE' && (
                    <div style={{ paddingLeft: '25px', marginTop: '6px', fontSize: '11px', color: '#64748b' }}>
                      Options: [ True ]   [ False ]
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Question inline button bar (no-print) */}
            <div style={styles.addQuestionRow} className="no-print">
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Add custom question:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'MCQ', label: 'MCQ' },
                  { id: 'SHORT', label: 'Short' },
                  { id: 'LONG', label: 'Essay' },
                  { id: 'TRUE_FALSE', label: 'True/False' }
                ].map((typeOpt) => (
                  <button
                    key={typeOpt.id}
                    type="button"
                    onClick={() => handleAddQuestion(secIdx, typeOpt.id as any)}
                    style={styles.addQBtn}
                  >
                    <Plus size={10} />
                    {typeOpt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Examiner Signature & footer area */}
        <div style={styles.signatureBlock}>
          <div className="no-print" style={styles.examinerInputBlock}>
            <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>Examiner Name</label>
            <input
              type="text"
              value={examinerName}
              onChange={(e) => setExaminerName(e.target.value)}
              style={styles.examinerInput}
            />
          </div>
          <div style={styles.sigLineContainer}>
            <div style={styles.sigLine} />
            <div style={styles.sigText}>
              {examinerName.toUpperCase()}<br />EXAMINER SIGNATURE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    paddingBottom: '60px',
  },
  actionBar: {
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    transition: 'color var(--transition-fast)',
  },
  actionGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  actionBtn: {
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-glass)',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all var(--transition-fast)',
  },
  saveBtn: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--accent-secondary)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all var(--transition-fast)',
  },
  successBadge: {
    background: 'rgba(16, 185, 129, 0.1)',
    color: 'var(--accent-secondary)',
    fontSize: '12px',
    fontWeight: 600,
    padding: '6px 12px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  downloadBtn: {
    background: 'linear-gradient(135deg, var(--accent-primary), #0284c7)',
    color: '#ffffff',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 10px rgba(56, 189, 248, 0.2)',
    textDecoration: 'none',
  },
  alertBanner: {
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    color: 'var(--accent-medium)',
    fontSize: '13px',
    padding: '10px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontWeight: 500,
  },
  diffSelect: {
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    color: '#334155',
    fontSize: '10px',
    fontWeight: 'bold',
    borderRadius: '4px',
    padding: '2px 4px',
    outline: 'none',
    cursor: 'pointer',
  },
  marksInput: {
    width: '28px',
    border: 'none',
    borderBottom: '1px dotted #64748b',
    background: 'transparent',
    textAlign: 'center' as const,
    fontWeight: 'bold',
    fontSize: '11px',
    color: '#0f172a',
    padding: 0,
    margin: 0,
  },
  deleteQBtn: {
    color: '#ef4444',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addQuestionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '16px',
    paddingTop: '10px',
    borderTop: '1px dotted #e2e8f0',
  },
  addQBtn: {
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 600,
    color: '#475569',
    padding: '4px 10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s',
  },
  signatureBlock: {
    marginTop: '40px',
    paddingTop: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTop: '1px double #0f172a',
  },
  examinerInputBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  examinerInput: {
    border: 'none',
    borderBottom: '1px dotted #0f172a',
    background: 'transparent',
    padding: '2px 4px',
    fontFamily: 'Times New Roman',
    color: '#0f172a',
    fontSize: '13px',
  },
  sigLineContainer: {
    width: '200px',
    textAlign: 'center' as const,
  },
  sigLine: {
    borderBottom: '1px solid #475569',
    marginBottom: '6px',
  },
  sigText: {
    fontFamily: 'Times New Roman',
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#475569',
    lineHeight: 1.3,
  },
};
