import { create } from 'zustand';

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
}

interface AssessmentStore extends AssessmentFormState {
  // Generation state
  jobId: string | null;
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  statusMessage: string;
  logs: string[];
  currentAssignment: Assignment | null;

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
};

export const useAssessmentStore = create<AssessmentStore>((set) => ({
  ...initialFormState,
  jobId: null,
  status: 'idle',
  progress: 0,
  statusMessage: '',
  logs: [],
  currentAssignment: null,

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
}));
