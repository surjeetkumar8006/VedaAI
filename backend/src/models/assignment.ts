import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  questionText: string;
  type: 'MCQ' | 'SHORT' | 'LONG' | 'TRUE_FALSE';
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  options?: string[]; // MCQs only
}

export interface ISection {
  sectionLetter: string;
  title: string;
  instructions: string;
  questions: IQuestion[];
}

export interface IAssignment extends Document {
  title: string;
  topic: string;
  dueDate: Date;
  questionTypes: string[];
  totalQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  uploadedFileName?: string;
  uploadedFileText?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0 to 100
  statusMessage: string;
  sections: ISection[];
  pdfPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  questionText: { type: String, required: true },
  type: { type: String, enum: ['MCQ', 'SHORT', 'LONG', 'TRUE_FALSE'], required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  marks: { type: Number, required: true },
  options: [{ type: String }]
});

const SectionSchema = new Schema<ISection>({
  sectionLetter: { type: String, required: true },
  title: { type: String, required: true },
  instructions: { type: String, required: true },
  questions: [QuestionSchema]
});

const AssignmentSchema = new Schema<IAssignment>({
  title: { type: String, required: true },
  topic: { type: String, required: true },
  dueDate: { type: Date, required: true },
  questionTypes: [{ type: String, required: true }],
  totalQuestions: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  additionalInstructions: { type: String },
  uploadedFileName: { type: String },
  uploadedFileText: { type: String },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  progress: { type: Number, default: 0 },
  statusMessage: { type: String, default: 'Assignment created' },
  sections: [SectionSchema],
  pdfPath: { type: String }
}, {
  timestamps: true
});

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
