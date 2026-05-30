import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { IAssignment } from '../models/assignment';

export const generateAssignmentPDF = (assignment: IAssignment): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Define output directory and file path
      const pdfDir = path.join(__dirname, '..', '..', 'public', 'pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      const fileName = `assessment-${assignment._id}.pdf`;
      const filePath = path.join(pdfDir, fileName);

      // Create a PDF Document with margins and page buffering enabled
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true,
      });

      // Stream it to the file
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // --- Header Block ---
      doc.font('Helvetica-Bold').fontSize(18).text(assignment.title.toUpperCase(), { align: 'center' });
      doc.font('Helvetica').fontSize(10).fillColor('#666666').text('Powered by VedaAI Assessment Engine', { align: 'center' });
      doc.moveDown(0.5);

      // Divider Line
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      // --- Metadata Grid ---
      const yStart = doc.y;
      doc.fillColor('#1a202c');
      doc.font('Helvetica-Bold').fontSize(10).text('Subject/Topic:', 50, yStart);
      doc.font('Helvetica').text(assignment.topic, 130, yStart);

      doc.font('Helvetica-Bold').text('Due Date:', 350, yStart);
      doc.font('Helvetica').text(new Date(assignment.dueDate).toLocaleDateString(), 430, yStart);

      doc.moveDown(0.5);
      const yNext = doc.y;

      doc.font('Helvetica-Bold').text('Max Marks:', 50, yNext);
      doc.font('Helvetica').text(`${assignment.totalMarks} Marks`, 130, yNext);

      doc.font('Helvetica-Bold').text('Total Questions:', 350, yNext);
      doc.font('Helvetica').text(`${assignment.totalQuestions}`, 430, yNext);

      doc.moveDown(1);

      // Divider Line
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      // --- Student Info Block ---
      doc.fillColor('#1e293b');
      doc.font('Helvetica-Bold').fontSize(11).text('STUDENT INFORMATION SECTION', 50, doc.y);
      doc.moveDown(0.5);

      const yInfo = doc.y;
      doc.font('Helvetica').fontSize(9)
        .text('Name: _______________________________', 50, yInfo)
        .text('Roll No: __________________', 270, yInfo)
        .text('Section: ________', 440, yInfo);

      doc.moveDown(1.2);

      // Divider Line (Double line effect)
      doc.strokeColor('#94a3b8').lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1.5);

      // --- Additional Instructions if any ---
      if (assignment.additionalInstructions) {
        doc.font('Helvetica-Bold').fontSize(10).text('INSTRUCTIONS FOR CANDIDATES:');
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#475569')
          .text(assignment.additionalInstructions, { align: 'justify', width: 495 });
        doc.moveDown(1.5);
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1.5);
      }

      // --- Render Questions & Sections ---
      assignment.sections.forEach((section) => {
        // Check height for page break before section
        if (doc.y > 650) {
          doc.addPage();
        }

        // Section Title
        doc.fillColor('#0f172a');
        doc.font('Helvetica-Bold').fontSize(12).text(section.title.toUpperCase());
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#475569').text(section.instructions);
        doc.moveDown(0.8);

        // Section Questions
        section.questions.forEach((q, idx) => {
          // Estimate height of question + options to decide on page break
          let estimatedHeight = 35;
          if (q.options) {
            estimatedHeight += q.options.length * 15;
          }
          if (doc.y + estimatedHeight > 730) {
            doc.addPage();
          }

          const qY = doc.y;

          // Question Number and Text
          doc.fillColor('#0f172a');
          doc.font('Helvetica-Bold').fontSize(10).text(`Q${idx + 1}. `, 50, qY);
          
          doc.font('Helvetica').fontSize(10).text(q.questionText, 75, qY, {
            width: 380,
            align: 'justify',
          });

          // Marks and Difficulty Badge
          const marksText = `[${q.marks} M]`;
          const diffText = `(${q.difficulty.toUpperCase()})`;
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569').text(`${diffText}  ${marksText}`, 465, qY, {
            width: 80,
            align: 'right',
          });

          doc.moveDown(0.5);

          // Options for MCQs
          if (q.type === 'MCQ' && q.options) {
            const optY = doc.y;
            q.options.forEach((opt, optIdx) => {
              const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
              const col = optIdx % 2; // 2 column layout
              const row = Math.floor(optIdx / 2);
              
              const xPos = 85 + col * 200;
              const yPos = optY + row * 18;

              doc.font('Helvetica').fontSize(9.5).fillColor('#334155').text(`${letter}) ${opt}`, xPos, yPos, {
                width: 185,
                ellipsis: true
              });
            });
            doc.y = optY + Math.ceil(q.options.length / 2) * 18 + 5;
            doc.moveDown(0.5);
          } else if (q.type === 'TRUE_FALSE') {
            doc.font('Helvetica-Oblique').fontSize(9).fillColor('#64748b').text('Options: [ True ]   [ False ]', 85, doc.y);
            doc.moveDown(0.8);
          } else {
            doc.moveDown(0.8);
          }
        });

        doc.moveDown(1.5);
      });

      // --- Examiner Signature Block (on last page) ---
      doc.moveDown(2.5);
      if (doc.y > 680) {
        doc.addPage();
      }
      const sigY = doc.y;
      doc.strokeColor('#94a3b8').lineWidth(1).moveTo(375, sigY + 20).lineTo(545, sigY + 20).stroke();
      doc.fontSize(9).fillColor('#475569')
        .text('EXAMINER SIGNATURE', 375, sigY + 25, { width: 170, align: 'center' });

      // --- Global Page Numbering Footer ---
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#64748b');
        doc.text(`Page ${i + 1} of ${range.count}`, 50, 785, {
          align: 'center',
          width: 495,
        });
      }

      // End Document
      doc.end();

      writeStream.on('finish', () => {
        resolve(`/pdfs/${fileName}`);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};
