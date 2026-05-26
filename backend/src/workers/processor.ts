import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import Assignment from '../models/assignment';
import { generateQuestions } from '../services/ai';
import { generateAssignmentPDF } from '../services/pdf';
import { sendProgressUpdate } from '../services/websocket';

export const processAssignmentJob = async (assignmentId: string): Promise<void> => {
  console.log(`🔨 Processing assignment job for ID: ${assignmentId}`);
  
  try {
    // 1. Fetch assignment from DB
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      console.error(`❌ Assignment not found: ${assignmentId}`);
      return;
    }

    // 2. Update status: processing
    assignment.status = 'processing';
    assignment.progress = 10;
    assignment.statusMessage = 'Reading instructions and configuring parameters...';
    await assignment.save();
    sendProgressUpdate(assignmentId, 10, assignment.statusMessage, 'processing');

    // 3. Handle context text extraction if file uploaded
    let contextText = '';
    if (assignment.uploadedFileName) {
      assignment.progress = 25;
      assignment.statusMessage = `Parsing uploaded file: ${assignment.uploadedFileName}...`;
      await assignment.save();
      sendProgressUpdate(assignmentId, 25, assignment.statusMessage, 'processing');

      const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
      const filePath = path.join(uploadsDir, assignment.uploadedFileName);

      if (fs.existsSync(filePath)) {
        const fileExt = path.extname(assignment.uploadedFileName).toLowerCase();
        if (fileExt === '.pdf') {
          try {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            contextText = pdfData.text;
            console.log(`📄 PDF parsed successfully, characters: ${contextText.length}`);
          } catch (pdfErr: any) {
            console.error('❌ PDF parsing failed:', pdfErr);
            contextText = ''; // fallback to empty
          }
        } else {
          // Fallback to text file read
          contextText = fs.readFileSync(filePath, 'utf-8');
          console.log(`📄 Text file read successfully, characters: ${contextText.length}`);
        }
      } else {
        console.warn(`⚠️ Uploaded file not found at path: ${filePath}`);
      }
    }

    // Update assignment text context
    if (contextText) {
      assignment.uploadedFileText = contextText;
      await assignment.save();
    }

    // 4. Update status: Calling AI
    assignment.progress = 50;
    assignment.statusMessage = 'Submitting request to VedaAI Question Generator...';
    await assignment.save();
    sendProgressUpdate(assignmentId, 50, assignment.statusMessage, 'processing');

    // Call AI Generation
    const generatedSections = await generateQuestions({
      title: assignment.title,
      topic: assignment.topic,
      questionTypes: assignment.questionTypes,
      totalQuestions: assignment.totalQuestions,
      totalMarks: assignment.totalMarks,
      additionalInstructions: assignment.additionalInstructions,
      uploadedFileText: contextText
    });

    // 5. Update status: Saving & Rendering PDF
    assignment.progress = 85;
    assignment.statusMessage = 'Formatting questions and generating PDF document...';
    assignment.sections = generatedSections;
    await assignment.save();
    sendProgressUpdate(assignmentId, 85, assignment.statusMessage, 'processing');

    // Generate PDF
    const pdfUrl = await generateAssignmentPDF(assignment);
    
    // 6. Complete Job
    assignment.status = 'completed';
    assignment.progress = 100;
    assignment.statusMessage = 'Assignment assessment successfully generated!';
    assignment.pdfPath = pdfUrl;
    await assignment.save();

    sendProgressUpdate(assignmentId, 100, assignment.statusMessage, 'completed');
    console.log(`✅ Completed processing assignment ID: ${assignmentId}`);

  } catch (error: any) {
    console.error(`❌ Error processing assignment job ${assignmentId}:`, error);
    
    try {
      const assignment = await Assignment.findById(assignmentId);
      if (assignment) {
        assignment.status = 'failed';
        assignment.progress = 100;
        assignment.statusMessage = `Failed: ${error.message || 'Unknown generation error'}`;
        await assignment.save();
        sendProgressUpdate(assignmentId, 100, assignment.statusMessage, 'failed');
      }
    } catch (saveErr) {
      console.error('❌ Failed to update error state in MongoDB:', saveErr);
    }
  }
};
