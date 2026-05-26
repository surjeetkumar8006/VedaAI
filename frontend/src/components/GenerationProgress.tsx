'use client';

import React, { useEffect, useRef } from 'react';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { CheckCircle2, Circle, Loader2, XCircle, Terminal } from 'lucide-react';

export default function GenerationProgress() {
  const { progress, statusMessage, logs, status } = useAssessmentStore();
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the terminal logs box
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Map progress to steps
  const steps = [
    { label: 'Reading parameters & uploaded materials', minProgress: 10, doneProgress: 25 },
    { label: 'Formulating structured educational prompt', minProgress: 25, doneProgress: 50 },
    { label: 'Generating question items via VedaAI LLM', minProgress: 50, doneProgress: 85 },
    { label: 'Creating printable exam sheet PDF', minProgress: 85, doneProgress: 100 },
  ];

  return (
    <div className="glass-panel" style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>AI Generation Status</h3>
        {status === 'processing' || status === 'pending' ? (
          <div style={styles.statusBadgeActive}>
            <Loader2 size={12} className="spin-animation" style={styles.spin} />
            Processing
          </div>
        ) : status === 'completed' ? (
          <div style={styles.statusBadgeCompleted}>Success</div>
        ) : status === 'failed' ? (
          <div style={styles.statusBadgeFailed}>Failed</div>
        ) : (
          <div style={styles.statusBadgeIdle}>Idle</div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={styles.progressBarBg}>
        <div style={{ ...styles.progressBarFill, width: `${progress}%` }} />
      </div>
      <div style={styles.progressPercent}>{progress}% Completed</div>

      {/* Stepper Timeline */}
      <div style={styles.stepperContainer}>
        {steps.map((step, idx) => {
          let stepStatus: 'pending' | 'active' | 'completed' | 'failed' = 'pending';
          
          if (status === 'failed' && progress >= step.minProgress && progress < step.doneProgress) {
            stepStatus = 'failed';
          } else if (progress >= step.doneProgress) {
            stepStatus = 'completed';
          } else if (progress >= step.minProgress) {
            stepStatus = 'active';
          }

          return (
            <div key={idx} style={styles.stepRow}>
              <div style={styles.iconContainer}>
                {stepStatus === 'completed' && <CheckCircle2 size={18} color="var(--accent-secondary)" />}
                {stepStatus === 'active' && <Loader2 size={18} color="var(--accent-primary)" className="spin-animation" style={styles.spin} />}
                {stepStatus === 'pending' && <Circle size={18} color="var(--text-muted)" />}
                {stepStatus === 'failed' && <XCircle size={18} color="var(--accent-hard)" />}
              </div>
              <div style={{
                ...styles.stepLabel,
                color: stepStatus === 'active' ? 'var(--text-primary)' : stepStatus === 'completed' ? 'var(--text-secondary)' : 'var(--text-muted)',
                fontWeight: stepStatus === 'active' ? 600 : 400
              }}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Logs Terminal */}
      <div style={styles.terminalHeader}>
        <Terminal size={14} color="var(--accent-primary)" />
        <span style={styles.terminalTitle}>Generation Logs</span>
      </div>
      <div className="terminal-card">
        {logs.length === 0 ? (
          <div className="terminal-line">System ready. Awaiting submission...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="terminal-line">
              {log}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    padding: '30px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
  },
  statusBadgeActive: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--accent-primary)',
    background: 'rgba(56, 189, 248, 0.1)',
    padding: '4px 10px',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusBadgeCompleted: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--accent-secondary)',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '4px 10px',
    borderRadius: '999px',
  },
  statusBadgeFailed: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--accent-hard)',
    background: 'rgba(239, 68, 68, 0.1)',
    padding: '4px 10px',
    borderRadius: '999px',
  },
  statusBadgeIdle: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    background: 'var(--bg-tertiary)',
    padding: '4px 10px',
    borderRadius: '999px',
  },
  progressBarBg: {
    height: '6px',
    background: 'var(--bg-tertiary)',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
    borderRadius: '999px',
    transition: 'width 0.4s ease',
  },
  progressPercent: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textAlign: 'right' as const,
    marginTop: '-12px',
  },
  stepperContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '8px 0',
  },
  stepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
  },
  stepLabel: {
    fontSize: '13px',
    transition: 'color var(--transition-normal)',
  },
  terminalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginTop: '10px',
  },
  terminalTitle: {
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  spin: {
    flexShrink: 0,
  },
};
