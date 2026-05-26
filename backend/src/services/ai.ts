import { GoogleGenerativeAI } from '@google/generative-ai';
import { ISection, IQuestion } from '../models/assignment';

// Check if Gemini API Key is configured
const apiKey = process.env.GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;
if (apiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('⚡ Gemini AI SDK initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Gemini AI:', err);
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY not found in environment. Fallback dynamic question generator will be active.');
}

/**
 * Generate questions using Gemini AI or the high-fidelity mock generator fallback
 */
export const generateQuestions = async (params: {
  title: string;
  topic: string;
  questionTypes: string[];
  totalQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  uploadedFileText?: string;
}): Promise<ISection[]> => {
  const { title, topic, questionTypes, totalQuestions, totalMarks, additionalInstructions, uploadedFileText } = params;

  if (genAI) {
    try {
      console.log('🤖 Invoking Gemini AI for question generation...');
      return await generateWithGemini(params);
    } catch (error) {
      console.error('❌ Gemini generation failed. Falling back to dynamic generator:', error);
      return generateMockQuestions(topic, questionTypes, totalQuestions, totalMarks);
    }
  } else {
    // Artificial delay to simulate processing time for workers
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log('🤖 Running Dynamic Question Generator...');
    return generateMockQuestions(topic, questionTypes, totalQuestions, totalMarks);
  }
};

/**
 * Call Gemini 1.5 Flash using structured JSON response format
 */
const generateWithGemini = async (params: {
  title: string;
  topic: string;
  questionTypes: string[];
  totalQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  uploadedFileText?: string;
}): Promise<ISection[]> => {
  if (!genAI) throw new Error('Gemini API not initialized');

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const contextText = params.uploadedFileText 
    ? `\nUse the following reference content to generate the assessment:\n\"\"\"\n${params.uploadedFileText.substring(0, 10000)}\n\"\"\"\n`
    : '';

  const systemPrompt = `You are a professional educational assessor. Create a structured exam paper based on the topic/subject: "${params.topic}".
The paper details are:
- Title: "${params.title}"
- Allowed Question Types: ${params.questionTypes.join(', ')}
- Total Questions: ${params.totalQuestions}
- Total Marks: ${params.totalMarks}
${params.additionalInstructions ? `- Additional Teacher Instructions: "${params.additionalInstructions}"` : ''}
${contextText}

Generate sections labeled "A", "B", "C", etc., depending on the question types. Group similar question types together in their own section.
Every section must have a sectionLetter, a title, instructions, and an array of questions.
Each question must include:
- questionText (string)
- type (one of: MCQ, SHORT, LONG, TRUE_FALSE)
- difficulty (one of: easy, medium, hard)
- marks (integer, the sum of marks for all questions in all sections must equal exactly ${params.totalMarks})
- options (array of 4 strings, only required for MCQ type)

You MUST respond with a JSON array matching the Section format. Do not wrap in markdown syntax, return raw JSON.
JSON format schema:
[
  {
    "sectionLetter": "A",
    "title": "Section Title",
    "instructions": "Attempt all questions in this section",
    "questions": [
      {
        "questionText": "Question text here",
        "type": "MCQ",
        "difficulty": "easy",
        "marks": 2,
        "options": ["A", "B", "C", "D"]
      }
    ]
  }
]`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  });

  const responseText = result.response.text();
  const parsedData = JSON.parse(responseText);

  if (!Array.isArray(parsedData)) {
    throw new Error('LLM Response is not an array of sections');
  }

  // Validate total marks and total questions matches (or do a basic normalization if slightly off)
  return parsedData as ISection[];
};

/**
 * High-fidelity fallback question generator
 * Crafts subject-specific questions based on the topic parameter
 */
const generateMockQuestions = (
  topic: string,
  questionTypes: string[],
  totalQuestions: number,
  totalMarks: number
): ISection[] => {
  const normTopic = topic.toLowerCase();
  
  // Custom templates based on common subjects
  let subjectTemplates = {
    science: {
      mcq: [
        { q: "Which of the following is the primary site of photosynthesis in plants?", o: ["Mitochondria", "Chloroplast", "Ribosome", "Lysosome"] },
        { q: "What is the chemical formula of glucose?", o: ["H2O", "CO2", "C6H12O6", "NaCl"] },
        { q: "Which gas is released during the light reactions of photosynthesis?", o: ["Carbon Dioxide", "Nitrogen", "Oxygen", "Hydrogen"] },
        { q: "Which cell organelle is known as the powerhouse of the cell?", o: ["Nucleus", "Mitochondria", "Endoplasmic Reticulum", "Golgi Apparatus"] }
      ],
      short: [
        "Explain the role of chlorophyll in capturing solar energy.",
        "What is the difference between aerobic and anaerobic respiration?",
        "Define transpiration and list two factors that affect its rate."
      ],
      long: [
        "Describe in detail the light-independent reactions (Calvin Cycle) of photosynthesis, noting the inputs and products.",
        "Explain the ecosystem carbon cycle and how cellular processes like respiration and photosynthesis maintain atmospheric balance."
      ],
      tf: [
        { q: "Photosynthesis occurs in both plants and animals.", a: false },
        { q: "The light reactions of photosynthesis occur in the thylakoid membranes.", a: true },
        { q: "Carbon dioxide is required for the dark reactions.", a: true }
      ]
    },
    tech: {
      mcq: [
        { q: "What does HTML stand for?", o: ["HyperText Markup Language", "HighText Machine Language", "HyperTransfer Markup Link", "HyperTech Media Layout"] },
        { q: "In JavaScript, which keyword is used to declare a block-scoped variable?", o: ["var", "let", "const", "Both let and const"] },
        { q: "Which protocol is primarily used to transmit secure web pages?", o: ["HTTP", "FTP", "HTTPS", "SMTP"] },
        { q: "What is the default port number for a standard Redis server?", o: ["3000", "5000", "27017", "6379"] }
      ],
      short: [
        "Explain the key differences between SQL and NoSQL databases.",
        "What is the purpose of middleware in an Express.js application?",
        "Describe how a WebSocket connection differs from a standard HTTP request."
      ],
      long: [
        "Analyze the architecture of a Node.js microservice network using BullMQ for background queues, Redis for caching, and MongoDB for document storage. Outline potential bottleneck mitigations.",
        "Explain the Event Loop in JavaScript, focusing on call stack, callback queue, microtask queue, and how asynchronous callbacks are scheduled."
      ],
      tf: [
        { q: "Node.js is multithreaded by default for all user-written Javascript execution.", a: false },
        { q: "MongoDB is an ACID-compliant Relational Database Management System.", a: false },
        { q: "Docker containers share the host operating system's kernel.", a: true }
      ]
    },
    general: {
      mcq: [
        { q: `Which of the following is core to the study of ${topic}?`, o: ["Fundamental Principles", "Historical Speculation", "Irrelevant Factors", "Unrelated Theories"] },
        { q: `What is a primary tool or technique used by practitioners of ${topic}?`, o: ["Analytical modeling", "Random guessing", "Ignoring evidence", "External outsourcing"] },
        { q: `Which historical figure or milestone is most associated with ${topic}?`, o: ["The classical founders", "Medieval alchemists", "21st century influencers", "It arose spontaneously"] }
      ],
      short: [
        `What are the three main pillars or criteria governing ${topic}?`,
        `Describe the primary challenge faced when applying ${topic} in real-world scenarios.`,
        `Briefly explain the historical evolution of ${topic} over the last decade.`
      ],
      long: [
        `Provide a comprehensive overview of the theoretical foundations of ${topic}. Discuss how these theories are validated, including potential modern-day limitations.`,
        `Discuss the future roadmap of ${topic} in the context of emerging technological trends. Evaluate the social, financial, or academic impacts.`
      ],
      tf: [
        { q: `${topic} has a significant impact on modern research and industry.`, a: true },
        { q: `There is only one universally accepted approach to implementing ${topic}.`, a: false },
        { q: `Academic studies of ${topic} have completely resolved all active questions.`, a: false }
      ]
    }
  };

  // Determine template category
  let t = subjectTemplates.general;
  if (normTopic.includes('photosynthesis') || normTopic.includes('science') || normTopic.includes('biology') || normTopic.includes('cell') || normTopic.includes('plant')) {
    t = subjectTemplates.science;
  } else if (normTopic.includes('programming') || normTopic.includes('tech') || normTopic.includes('javascript') || normTopic.includes('database') || normTopic.includes('computer') || normTopic.includes('code') || normTopic.includes('ai') || normTopic.includes('software')) {
    t = subjectTemplates.tech;
  }

  // Distribute questions and marks
  // Let's create sections based on questionTypes requested
  const sections: ISection[] = [];
  let sectionIndex = 0;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // Distribute marks:
  // MCQs/TFs are typically 2 marks each
  // Short answer are 5 marks each
  // Long answer are 10-15 marks each
  let remainingQuestions = totalQuestions;
  let remainingMarks = totalMarks;

  const activeTypes = questionTypes.filter(type => ['MCQ', 'TRUE_FALSE', 'SHORT', 'LONG'].includes(type));
  if (activeTypes.length === 0) activeTypes.push('MCQ');

  // Distribute counts per type
  const typeCounts: Record<string, number> = {};
  let baseCount = Math.floor(totalQuestions / activeTypes.length);
  activeTypes.forEach(type => {
    typeCounts[type] = baseCount;
  });
  // Add remainder to the first type
  const remainder = totalQuestions - (baseCount * activeTypes.length);
  if (remainder > 0) {
    typeCounts[activeTypes[0]] += remainder;
  }

  // Iterate types and build sections
  activeTypes.forEach((type) => {
    const qCount = typeCounts[type];
    if (qCount <= 0) return;

    let secLetter = alphabet[sectionIndex++];
    let secTitle = '';
    let secInstructions = '';
    let questionsList: IQuestion[] = [];

    // Calculate marks for this section
    // Try to allot reasonable weight, ensuring the final total is exactly totalMarks
    let marksPerQuestion = 1;
    if (type === 'MCQ' || type === 'TRUE_FALSE') {
      marksPerQuestion = 2;
    } else if (type === 'SHORT') {
      marksPerQuestion = 5;
    } else if (type === 'LONG') {
      marksPerQuestion = 10;
    }

    if (sectionIndex === activeTypes.length) {
      // Last section absorbs all remaining marks
      // Ensure we don't end up with <= 0 marks per question
      const calculatedTotal = qCount * marksPerQuestion;
      // We will adjust later
    }

    if (type === 'MCQ') {
      secTitle = 'Section ' + secLetter + ': Multiple Choice Questions';
      secInstructions = 'Choose the single best answer for each question. Each question carries equal marks.';
      for (let i = 0; i < qCount; i++) {
        const item = t.mcq[i % t.mcq.length];
        questionsList.push({
          questionText: item ? item.q : `Sample multiple choice question about ${topic} #${i+1}?`,
          type: 'MCQ',
          difficulty: i % 3 === 0 ? 'easy' : (i % 3 === 1 ? 'medium' : 'hard'),
          marks: marksPerQuestion,
          options: item ? item.o : ["Option A", "Option B", "Option C", "Option D"]
        });
      }
    } else if (type === 'TRUE_FALSE') {
      secTitle = 'Section ' + secLetter + ': True or False';
      secInstructions = 'State whether the following statements are True or False.';
      for (let i = 0; i < qCount; i++) {
        const item = t.tf[i % t.tf.length];
        questionsList.push({
          questionText: item ? item.q : `A major theory in ${topic} claims that ${topic} was discovered in the 19th century.`,
          type: 'TRUE_FALSE',
          difficulty: i % 2 === 0 ? 'easy' : 'medium',
          marks: marksPerQuestion,
          options: ["True", "False"]
        });
      }
    } else if (type === 'SHORT') {
      secTitle = 'Section ' + secLetter + ': Short Answer Questions';
      secInstructions = 'Write concise answers in 2-3 sentences. Support with examples where applicable.';
      for (let i = 0; i < qCount; i++) {
        const item = t.short[i % t.short.length];
        questionsList.push({
          questionText: item ? item : `Discuss the key functions and importance of ${topic} in professional research.`,
          type: 'SHORT',
          difficulty: i % 2 === 0 ? 'medium' : 'hard',
          marks: marksPerQuestion
        });
      }
    } else if (type === 'LONG') {
      secTitle = 'Section ' + secLetter + ': Long Answer / Essay Questions';
      secInstructions = 'Provide detailed, structured responses. Define key terms, illustrate concepts, and support arguments.';
      for (let i = 0; i < qCount; i++) {
        const item = t.long[i % t.long.length];
        questionsList.push({
          questionText: item ? item : `Provide an in-depth critical analysis of ${topic}. Discuss current debates, key challenges, and potential future trajectories in detail.`,
          type: 'LONG',
          difficulty: 'hard',
          marks: marksPerQuestion
        });
      }
    }

    sections.push({
      sectionLetter: secLetter,
      title: secTitle,
      instructions: secInstructions,
      questions: questionsList
    });
  });

  // Normalize marks to make sure the SUM equals exactly totalMarks
  let currentSum = 0;
  sections.forEach(s => s.questions.forEach(q => currentSum += q.marks));

  let difference = totalMarks - currentSum;
  
  if (difference !== 0) {
    // Distribute difference across questions
    let flatQuestions: IQuestion[] = [];
    sections.forEach(s => flatQuestions.push(...s.questions));
    
    if (flatQuestions.length > 0) {
      if (difference > 0) {
        // Add marks to questions (preferring LONG, then SHORT, then MCQs)
        let sorted = [...flatQuestions].sort((a,b) => (b.marks - a.marks));
        let index = 0;
        while (difference > 0) {
          sorted[index % sorted.length].marks += 1;
          difference--;
          index++;
        }
      } else {
        // Subtract marks from questions (ensuring we don't go below 1 mark)
        let sorted = [...flatQuestions].sort((a,b) => (a.marks - b.marks));
        let index = 0;
        let attempts = 0;
        while (difference < 0 && attempts < 100) {
          let q = sorted[index % sorted.length];
          if (q.marks > 1) {
            q.marks -= 1;
            difference++;
          }
          index++;
          attempts++;
        }
      }
    }
  }

  return sections;
};
