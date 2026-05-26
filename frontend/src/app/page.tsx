'use client';

import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import AssignmentForm from '../components/AssignmentForm';
import GenerationProgress from '../components/GenerationProgress';
import AssessmentPaper from '../components/AssessmentPaper';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { io, Socket } from 'socket.io-client';
import { Sparkles, GraduationCap, FileText, CheckSquare, Layers } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Home() {
  const store = useAssessmentStore();
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);

  // Setup WebSocket connection when a job is running
  useEffect(() => {
    let socket: Socket | null = null;

    if (store.status === 'pending' || store.status === 'processing') {
      const targetId = store.jobId || activeAssignmentId;
      if (targetId) {
        console.log(`🔌 Initializing Socket.io connection for assignment ${targetId}...`);
        
        // Connect to backend WebSocket server
        socket = io(API_URL);

        socket.on('connect', () => {
          console.log('🔌 Connected to websocket stream server.');
          socket?.emit('join_assignment', targetId);
          store.addLog('Successfully established real-time websocket link.');
        });

        socket.on('progress_update', (data: {
          assignmentId: string;
          progress: number;
          statusMessage: string;
          status: 'pending' | 'processing' | 'completed' | 'failed';
        }) => {
          console.log('📣 WebSocket Progress Event:', data);
          
          if (data.status === 'completed') {
            // Fetch final assessment document
            fetch(`${API_URL}/api/assignments/${data.assignmentId}`)
              .then((res: Response) => res.json())
              .then((result: { success: boolean; assignment: any }) => {
                if (result.success) {
                  store.updateProgress({
                    progress: 100,
                    statusMessage: 'Assessment loaded successfully!',
                    status: 'completed',
                    assignment: result.assignment,
                  });
                }
              })
              .catch((err: any) => {
                console.error('Failed to fetch complete assignment:', err);
                store.setStatus('failed');
              });
          } else {
            store.updateProgress({
              progress: data.progress,
              statusMessage: data.statusMessage,
              status: data.status,
            });
          }
        });

        socket.on('connect_error', () => {
          store.addLog('Websocket connection failed. Attempting reconnect...');
        });

        socket.on('disconnect', () => {
          console.log('🔌 Websocket disconnected.');
        });
      }
    }

    return () => {
      if (socket) {
        console.log('🔌 Cleaning up Socket.io connection...');
        socket.disconnect();
      }
    };
  }, [store.status, store.jobId, activeAssignmentId]);

  const handleFormSubmitted = (id: string) => {
    setActiveAssignmentId(id);
  };

  const handleRegenerate = async () => {
    const id = store.currentAssignment?._id || activeAssignmentId;
    if (!id) return;

    store.startGeneration(id);
    
    try {
      const response = await fetch(`${API_URL}/api/assignments/${id}/regenerate`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        store.updateProgress({
          progress: 100,
          statusMessage: 'Regeneration request rejected by server',
          status: 'failed',
        });
      }
    } catch (err) {
      console.error(err);
      store.updateProgress({
        progress: 100,
        statusMessage: 'Failed to dispatch regeneration request to server',
        status: 'failed',
      });
    }
  };

  const handleBackToCreator = () => {
    store.setStatus('idle');
    setActiveAssignmentId(null);
    store.resetForm();
  };

  return (
    <div style={styles.mainWrapper}>
      <Header />

      <main style={styles.main}>
        {store.status === 'completed' && store.currentAssignment ? (
          // Full-screen printable Assessment Preview Page
          <AssessmentPaper
            assignment={store.currentAssignment}
            onBack={handleBackToCreator}
            onRegenerate={handleRegenerate}
          />
        ) : (
          // Split-screen Creator Dashboard
          <div className="dashboard-grid no-print">
            {/* Left Side Planner Form */}
            <div style={styles.leftColumn}>
              <AssignmentForm onSubmitSuccess={handleFormSubmitted} />
            </div>

            {/* Right Side Status Panel / Welcomer */}
            <div style={styles.rightColumn}>
              {store.status === 'idle' ? (
                <div className="glass-panel" style={styles.welcomeCard}>
                  <div style={styles.welcomeHeader}>
                    <GraduationCap size={44} color="var(--accent-primary)" />
                    <h2 style={styles.welcomeTitle}>VedaAI Assessment Creator</h2>
                    <p style={styles.welcomeSubtitle}>
                      Streamline your classroom workflows by generating curriculum-aligned exam papers using advanced educational models.
                    </p>
                  </div>

                  <div style={styles.divider} />

                  <h4 style={styles.featureTitle}>Key Capabilities</h4>
                  <div style={styles.featureGrid}>
                    <div style={styles.featureItem}>
                      <div style={styles.featureIcon}>
                        <Layers size={18} color="var(--accent-primary)" />
                      </div>
                      <div>
                        <h5 style={styles.featureName}>Automatic Section Grouping</h5>
                        <p style={styles.featureDesc}>Questions are automatically sorted into structured Section groups (A, B, C) with instructions.</p>
                      </div>
                    </div>

                    <div style={styles.featureItem}>
                      <div style={styles.featureIcon}>
                        <Sparkles size={18} color="var(--accent-secondary)" />
                      </div>
                      <div>
                        <h5 style={styles.featureName}>Custom Cognitive Weights</h5>
                        <p style={styles.featureDesc}>Generates questions with accurate marks values matching difficulty tags (Easy, Medium, Hard).</p>
                      </div>
                    </div>

                    <div style={styles.featureItem}>
                      <div style={styles.featureIcon}>
                        <FileText size={18} color="var(--accent-primary)" />
                      </div>
                      <div>
                        <h5 style={styles.featureName}>Reference-Guided Generation</h5>
                        <p style={styles.featureDesc}>Upload textbooks, PDFs, or lecture notes to target the generated questions onto exact materials.</p>
                      </div>
                    </div>

                    <div style={styles.featureItem}>
                      <div style={styles.featureIcon}>
                        <CheckSquare size={18} color="var(--accent-secondary)" />
                      </div>
                      <div>
                        <h5 style={styles.featureName}>Interactive Editing</h5>
                        <p style={styles.featureDesc}>Modify, append, or delete questions inline before outputting. Changes sync directly to the database.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Live Stepper and Logs Logger
                <GenerationProgress />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  mainWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  main: {
    flexGrow: 1,
    padding: '30px 24px',
    maxWidth: '1280px',
    margin: '0 auto',
    width: '100%',
  },
  dashboardLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '30px',
    alignItems: 'start',
    // Responsive grid handled in layout or fallback media queries
  },
  leftColumn: {
    width: '100%',
  },
  rightColumn: {
    width: '100%',
  },
  welcomeCard: {
    padding: '40px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    minHeight: '520px',
    justifyContent: 'center',
  },
  welcomeHeader: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  welcomeTitle: {
    fontSize: '26px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #ffffff, var(--text-secondary))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  welcomeSubtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    maxWidth: '480px',
    lineHeight: 1.6,
  },
  divider: {
    height: '1px',
    background: 'var(--border-glass)',
    margin: '10px 0',
  },
  featureTitle: {
    fontSize: '14px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'var(--accent-primary)',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px',
  },
  featureItem: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-glass)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureName: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '2px',
    color: '#ffffff',
  },
  featureDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
};
