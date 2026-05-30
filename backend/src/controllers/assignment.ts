import { Request, Response } from 'express';
import Assignment, { ISection } from '../models/assignment';
import { addGenerationJob } from '../queues/queueManager';
import { generateAssignmentPDF } from '../services/pdf';
import fs from 'fs';
import path from 'path';

/**
 * Create new assignment and enqueue generation job
 */
export const createAssignment = async (req: Request, res: Response) => {
  try {
    const {
      title,
      topic,
      dueDate,
      questionTypes,
      totalQuestions,
      totalMarks,
      additionalInstructions,
    } = req.body;

    // Validate inputs
    const errors: string[] = [];

    if (!title || typeof title !== 'string' || title.trim() === '') {
      errors.push('Title is required and must be a string.');
    }
    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      errors.push('Topic/Subject is required.');
    }
    if (!dueDate) {
      errors.push('Due date is required.');
    } else {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) {
        errors.push('Invalid due date format.');
      }
    }

    // Parse question types (could be sent as a JSON array string or regular array)
    let parsedQuestionTypes: string[] = [];
    if (typeof questionTypes === 'string') {
      try {
        parsedQuestionTypes = JSON.parse(questionTypes);
      } catch {
        parsedQuestionTypes = questionTypes.split(',').map((t: string) => t.trim());
      }
    } else if (Array.isArray(questionTypes)) {
      parsedQuestionTypes = questionTypes;
    }

    if (!parsedQuestionTypes || parsedQuestionTypes.length === 0) {
      errors.push('At least one question type must be specified.');
    }

    const numQuestions = Number(totalQuestions);
    const numMarks = Number(totalMarks);

    if (isNaN(numQuestions) || numQuestions <= 0) {
      errors.push('Total Questions must be a positive integer.');
    }
    if (isNaN(numMarks) || numMarks <= 0) {
      errors.push('Total Marks must be a positive integer.');
    }

    if (errors.length > 0) {
      // If a file was uploaded but validation failed, delete the file to save disk space
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, errors });
    }

    // Prepare uploaded file data
    let uploadedFileName: string | undefined = undefined;
    if (req.file) {
      uploadedFileName = req.file.filename;
    }

    // Create Assignment in database
    const assignment = new Assignment({
      title: title.trim(),
      topic: topic.trim(),
      dueDate: new Date(dueDate),
      questionTypes: parsedQuestionTypes,
      totalQuestions: numQuestions,
      totalMarks: numMarks,
      additionalInstructions: additionalInstructions || '',
      uploadedFileName,
      status: 'pending',
      progress: 0,
      statusMessage: 'Assessment queued for generation',
      sections: [],
    });

    await assignment.save();

    // Trigger queue job
    await addGenerationJob((assignment._id as any).toString());

    return res.status(201).json({
      success: true,
      message: 'Assessment creation started.',
      assignment,
    });
  } catch (error: any) {
    console.error('Error in createAssignment controller:', error);
    return res.status(500).json({
      success: false,
      errors: [error.message || 'Internal Server Error'],
    });
  }
};

/**
 * Get assignment by ID
 */
export const getAssignmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    return res.status(200).json({ success: true, assignment });
  } catch (error: any) {
    console.error('Error in getAssignmentById controller:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Trigger regeneration for an assignment
 */
export const regenerateAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    // Reset status and progress
    assignment.status = 'pending';
    assignment.progress = 0;
    assignment.statusMessage = 'Assessment enqueued for regeneration';
    assignment.sections = [];
    assignment.pdfPath = undefined;
    await assignment.save();

    // Enqueue job
    await addGenerationJob(id);

    return res.status(200).json({
      success: true,
      message: 'Regeneration job started.',
      assignment,
    });
  } catch (error: any) {
    console.error('Error in regenerateAssignment controller:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update assignment sections / questions (Inline Edit support)
 */
export const updateAssignmentQuestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sections } = req.body;

    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({ success: false, message: 'Sections array is required.' });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    // Update sections
    assignment.sections = sections as ISection[];
    
    // Dynamically calculate new totalQuestions and totalMarks from updated structure
    let totalQuestions = 0;
    let totalMarks = 0;
    sections.forEach((sec) => {
      if (sec.questions && Array.isArray(sec.questions)) {
        totalQuestions += sec.questions.length;
        sec.questions.forEach((q: any) => {
          totalMarks += Number(q.marks || 0);
        });
      }
    });

    assignment.totalQuestions = totalQuestions;
    assignment.totalMarks = totalMarks;

    // Regenerate PDF file asynchronously with new content
    const pdfUrl = await generateAssignmentPDF(assignment);
    assignment.pdfPath = pdfUrl;

    await assignment.save();

    return res.status(200).json({
      success: true,
      message: 'Assessment updated and PDF regenerated successfully.',
      assignment,
    });
  } catch (error: any) {
    console.error('Error in updateAssignmentQuestions controller:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all assessments
 */
export const getAssignments = async (req: Request, res: Response) => {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, assignments });
  } catch (error: any) {
    console.error('Error in getAssignments controller:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete assessment by ID and clean up files
 */
export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assessment not found.' });
    }

    // Delete associated PDF if it exists
    if (assignment.pdfPath) {
      // Remove leading slash if any
      const relativePath = assignment.pdfPath.startsWith('/') ? assignment.pdfPath.substring(1) : assignment.pdfPath;
      const pdfFilePath = path.join(__dirname, '..', '..', 'public', relativePath.replace('public/', ''));
      
      if (fs.existsSync(pdfFilePath)) {
        try {
          fs.unlinkSync(pdfFilePath);
        } catch (fileErr) {
          console.warn('⚠️ PDF file could not be deleted from disk:', fileErr);
        }
      }
    }

    // Delete associated upload if it exists
    if (assignment.uploadedFileName) {
      const uploadFilePath = path.join(__dirname, '..', '..', 'public', 'uploads', assignment.uploadedFileName);
      if (fs.existsSync(uploadFilePath)) {
        try {
          fs.unlinkSync(uploadFilePath);
        } catch (fileErr) {
          console.warn('⚠️ Uploaded file could not be deleted from disk:', fileErr);
        }
      }
    }

    await Assignment.findByIdAndDelete(id);

    return res.status(200).json({ success: true, message: 'Assessment deleted successfully.' });
  } catch (error: any) {
    console.error('Error in deleteAssignment controller:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
