'use client';

import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import AssignmentForm from '../components/AssignmentForm';
import GenerationProgress from '../components/GenerationProgress';
import AssessmentPaper from '../components/AssessmentPaper';
import { useAssessmentStore } from '../store/useAssessmentStore';
import { io, Socket } from 'socket.io-client';
import { Sparkles, GraduationCap, FileText, Trash2, Plus, Calendar, Layers, Award, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Home() {
  const store = useAssessmentStore();
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);

  // Fetch saved assignments in library on initial mount
  useEffect(() => {
    store.fetchLibrary();
  }, []);

  // Setup WebSocket connection when a job is running
  useEffect(() => {
    let socket: Socket | null = null;

    if (store.status === 'pending' || store.status === 'processing') {
      const targetId = store.jobId || activeAssignmentId;
      if (targetId) {
        console.log(`🔌 Initializing Socket.io connection for assignment ${targetId}...`);
        
        // Connect to backend WebSocket server
        socket = io(API_URL, { transports: ['websocket'] });

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
                  
                  // Trigger Confetti Celebration!
                  confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 }
                  });

                  // Refresh library sidebar list
                  store.fetchLibrary();
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
    store.fetchLibrary(); // refresh sidebar list
  };

  const handleSelectPastAssignment = (assignment: any) => {
    store.setAssignment(assignment);
    store.setStatus('completed');
  };

  const handleDeleteLibraryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent select action trigger
    if (confirm('Are you sure you want to delete this assessment?')) {
      await store.deleteAssignment(id);
    }
  };

  return (
    <div style={styles.mainWrapper}>
      <Header />

      <div className="content-layout">
        {/* Sidebar: Library of Past Assessments (no-print) */}
        <aside className="sidebar-panel no-print glass-panel">
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>Assessment Library</h3>
            <button
              onClick={handleBackToCreator}
              style={styles.newBtn}
              title="Create New Assessment"
            >
              <Plus size={14} /> Create
            </button>
          </div>

          <div style={styles.sidebarDivider} />

          <div style={styles.libraryList}>
            {store.library.length === 0 ? (
              <div style={styles.emptyLibrary}>
                <FileText size={24} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
                No saved papers found. Create your first assessment!
              </div>
            ) : (
              store.library.map((item) => {
                const isActive = store.currentAssignment?._id === item._id;
                return (
                  <div
                    key={item._id}
                    onClick={() => handleSelectPastAssignment(item)}
                    style={{
                      ...styles.libraryCard,
                      border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                      background: isActive ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255,255,255,0.01)'
                    }}
                  >
                    <div style={styles.cardHeader}>
                      <span style={{
                        ...styles.cardTitle,
                        color: isActive ? 'var(--accent-primary)' : '#ffffff'
                      }}>{item.title}</span>
                      <button
                        onClick={(e) => handleDeleteLibraryItem(e, item._id)}
                        style={styles.deleteBtn}
                        title="Delete Assessment"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    
                    <p style={styles.cardTopic}>{item.topic}</p>
                    
                    <div style={styles.cardMeta}>
                      <span style={styles.metaText}>
                        <Calendar size={10} /> {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                      <span style={{
                        ...styles.statusTag,
                        color: item.status === 'completed' ? 'var(--accent-secondary)' : item.status === 'failed' ? 'var(--accent-hard)' : 'var(--accent-primary)',
                        background: item.status === 'completed' ? 'rgba(16, 185, 129, 0.08)' : item.status === 'failed' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(56, 189, 248, 0.08)'
                      }}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Workspace Pane */}
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
            <div className="dashboard-grid no-print" style={{ height: '100%' }}>
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
                          <Award size={18} color="var(--accent-secondary)" />
                        </div>
                        <div>
                          <h5 style={styles.featureName}>Cognitive Presets & Tone Styles</h5>
                          <p style={styles.featureDesc}>Apply Quick presets or sliders to customize questions (Formal Academic, Creative, or Scenario-based).</p>
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
                          <Plus size={18} color="var(--accent-secondary)" />
                        </div>
                        <div>
                          <h5 style={styles.featureName}>Interactive Inline Editor</h5>
                          <p style={styles.featureDesc}>Modify details, delete questions, or add custom ones right on the exam paper sheet. Saves directly to cloud.</p>
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
    </div>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const styles = {
  mainWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  contentLayout: {
    flexGrow: 1,
    display: 'flex',
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '30px 24px',
    gap: '30px',
  },
  sidebar: {
    width: '280px',
    flexShrink: 0,
    height: 'calc(100vh - 130px)',
    position: 'sticky' as const,
    top: '100px',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '20px',
    overflow: 'hidden',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#ffffff',
  },
  newBtn: {
    background: 'rgba(56, 189, 248, 0.1)',
    color: 'var(--accent-primary)',
    fontSize: '11px',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  sidebarDivider: {
    height: '1px',
    background: 'var(--border-glass)',
    margin: '14px 0',
  },
  libraryList: {
    flexGrow: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    paddingRight: '4px',
  },
  emptyLibrary: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center' as const,
    padding: '40px 10px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    lineHeight: 1.5,
  },
  libraryCard: {
    padding: '12px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  cardTitle: {
    fontSize: '13px',
    fontWeight: 700,
    lineHeight: 1.3,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '190px',
  },
  deleteBtn: {
    color: 'var(--text-muted)',
    transition: 'color var(--transition-fast)',
  },
  cardTopic: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  },
  metaText: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statusTag: {
    fontSize: '9px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    padding: '2px 6px',
    borderRadius: '4px',
  },
  main: {
    flexGrow: 1,
    minWidth: 0, // prevents flex item blowout
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
    fontSize: '24px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #ffffff, var(--text-secondary))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  welcomeSubtitle: {
    fontSize: '13px',
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
    fontSize: '13px',
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
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '2px',
    color: '#ffffff',
  },
  featureDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
  },
};
