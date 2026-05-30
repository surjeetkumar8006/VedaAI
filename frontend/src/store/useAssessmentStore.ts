import { create } from 'zustand';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface Question {
  _id?: string;
  questionText: string;
  type: 'MCQ' | 'SHORT' | 'LONG' | 'TRUE_FALSE';
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  options?: string[];
}

export interface Section {
  _id?: string;
  sectionLetter: string;
  title: string;
  instructions: string;
  questions: Question[];
}

export interface Assignment {
  _id: string;
  title: string;
  topic: string;
  dueDate: string;
  questionTypes: string[];
  totalQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  uploadedFileName?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  statusMessage: string;
  sections: Section[];
  pdfPath?: string;
  createdAt: string;
}

interface AssessmentFormState {
  title: string;
  topic: string;
  dueDate: string;
  questionTypes: string[];
  totalQuestions: number;
  totalMarks: number;
  additionalInstructions: string;
  file: File | null;
  selectedSubject: string;
  assessmentTone: 'formal' | 'scenario' | 'creative';
}

interface AssessmentStore extends AssessmentFormState {
  // Generation state
  jobId: string | null;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  statusMessage: string;
  logs: string[];
  currentAssignment: Assignment | null;
  library: Assignment[];

  // Actions
  setField: <K extends keyof AssessmentFormState>(key: K, value: AssessmentFormState[K]) => void;
  setFile: (file: File | null) => void;
  resetForm: () => void;
  
  // Job Status actions
  startGeneration: (jobId: string) => void;
  updateProgress: (payload: { progress: number; statusMessage: string; status: any; assignment?: Assignment }) => void;
  addLog: (log: string) => void;
  clearLogs: () => void;
  setAssignment: (assignment: Assignment | null) => void;
  setStatus: (status: any) => void;

  // Library actions
  fetchLibrary: () => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
}

const initialFormState: AssessmentFormState = {
  title: '',
  topic: '',
  dueDate: '',
  questionTypes: ['MCQ'],
  totalQuestions: 5,
  totalMarks: 25,
  additionalInstructions: '',
  file: null,
  selectedSubject: '',
  assessmentTone: 'formal',
};

export const useAssessmentStore = create<AssessmentStore>((set, get) => ({
  ...initialFormState,
  jobId: null,
  status: 'idle',
  progress: 0,
  statusMessage: '',
  logs: [],
  currentAssignment: null,
  library: [],

  setField: (key, value) => set({ [key]: value }),
  setFile: (file) => set({ file }),
  resetForm: () => set({ ...initialFormState }),

  startGeneration: (jobId) => set({
    jobId,
    status: 'pending',
    progress: 0,
    statusMessage: 'Assessment queued for generation',
    logs: [`[${new Date().toLocaleTimeString()}] Queueing assessment generation...`],
    currentAssignment: null,
  }),

  updateProgress: ({ progress, statusMessage, status, assignment }) => set((state) => {
    const time = new Date().toLocaleTimeString();
    const newLog = `[${time}] ${statusMessage}`;
    const updatedLogs = [...state.logs];
    
    // Only add log if the message is unique or progress changes
    if (state.statusMessage !== statusMessage) {
      updatedLogs.push(newLog);
    }

    return {
      progress,
      statusMessage,
      status,
      logs: updatedLogs,
      currentAssignment: assignment !== undefined ? assignment : state.currentAssignment,
    };
  }),

  addLog: (log) => set((state) => ({
    logs: [...state.logs, `[${new Date().toLocaleTimeString()}] ${log}`]
  })),

  clearLogs: () => set({ logs: [] }),
  setAssignment: (assignment) => set({ currentAssignment: assignment }),
  setStatus: (status) => set({ status }),

  fetchLibrary: async () => {
    try {
      const response = await fetch(`${API_URL}/api/assignments`);
      const data = await response.json();
      if (response.ok && data.success) {
        set({ library: data.assignments });
      }
    } catch (error) {
      console.error('Failed to fetch library:', error);
    }
  },

  deleteAssignment: async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/assignments/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok && data.success) {
        set((state) => ({
          library: state.library.filter((item) => item._id !== id),
          currentAssignment: state.currentAssignment?._id === id ? null : state.currentAssignment,
          status: state.currentAssignment?._id === id ? 'idle' : state.status,
        }));
      }
    } catch (error) {
      console.error('Failed to delete assignment:', error);
    }
  },
}));
