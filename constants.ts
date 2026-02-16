// Fix: Import `FunctionDeclaration` and `Type` to support the moved `generatePaperFunctionDeclaration` constant.
import { QuestionType, Difficulty, Taxonomy } from './types';
import { FunctionDeclaration, Type } from '@google/genai';

export const SSGPT_LOGO_URL = "https://res.cloudinary.com/dqxzwguc7/image/upload/v1762417424/image_ozpkui-removebg-preview_tejudh.png";

export const QUESTION_TYPES = [
  { value: QuestionType.MultipleChoice, label: 'Multiple Choice' },
  { value: QuestionType.FillInTheBlanks, label: 'Fill in the Blanks' },
  { value: QuestionType.TrueFalse, label: 'True / False' },
  { value: QuestionType.ShortAnswer, label: 'Short Answer' },
  { value: QuestionType.LongAnswer, label: 'Long Answer' },
  { value: QuestionType.MatchTheFollowing, label: 'Match the Following' },
];

export const DIFFICULTY_LEVELS = [
    { value: Difficulty.Easy, label: 'Easy' },
    { value: Difficulty.Medium, label: 'Medium' },
    { value: Difficulty.Hard, label: 'Hard' },
];

export const BLOOM_TAXONOMY_LEVELS = [
    { value: Taxonomy.Remembering, label: 'Remembering' },
    { value: Taxonomy.Understanding, label: 'Understanding' },
    { value: Taxonomy.Applying, label: 'Applying' },
    { value: Taxonomy.Analyzing, label: 'Analyzing' },
    { value: Taxonomy.Evaluating, label: 'Evaluating' },
    { value: Taxonomy.Creating, label: 'Creating' },
];

export const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Mandarin Chinese', 'Hindi',
  'Arabic', 'Bengali', 'Russian', 'Portuguese', 'Urdu', 'Indonesian',
  'Japanese', 'Punjabi', 'Javanese', 'Telugu', 'Korean', 'Tamil',
  'Marathi', 'Turkish', 'Vietnamese', 'Italian', 'Thai', 'Gujarati',
  'Persian', 'Polish', 'Kannada', 'Odia', 'Malayalam', 'Ukrainian',
  'Burmese', 'Dutch', 'Romanian', 'Pashto', 'Greek', 'Hungarian',
  'Swedish', 'Czech', 'Zulu', 'Finnish', 'Danish', 'Norwegian', 'Hebrew',
  'Filipino', 'Swahili', 'Afrikaans', 'Albanian', 'Amharic', 'Armenian',
  'Assamese', 'Azerbaijani', 'Basque', 'Belarusian', 'Bosnian', 'Bulgarian',
  'Catalan', 'Croatian', 'Estonian', 'Galician', 'Georgian', 'Haitian Creole',
  'Hausa', 'Icelandic', 'Igbo', 'Irish', 'Kazakh', 'Khmer', 'Kurdish',
  'Kyrgyz', 'Lao', 'Latin', 'Latvian', 'Lithuanian', 'Luxembourgish',
  'Macedonian', 'Malagasy', 'Maltese', 'Maori', 'Mongolian', 'Nepali',
  'Samoan', 'Scots Gaelic', 'Serbian', 'Sesotho', 'Shona', 'Sindhi',
  'Sinhala', 'Slovak', 'Slovenian', 'Somali', 'Sundanese', 'Tajik',
  'Tongan', 'Turkmen', 'Uzbek', 'Welsh', 'Xhosa', 'Yiddish', 'Yoruba'
];

// Fix: Moved `generatePaperFunctionDeclaration` here from `ChatbotInterface.tsx` to be shared across the application.
export const generatePaperFunctionDeclaration: FunctionDeclaration = { name: 'generatePaper', description: 'Call this function ONLY when all necessary details for creating a question paper have been collected. This is a specialized tool and should not be used for general queries.', parameters: { type: Type.OBJECT, properties: { schoolName: { type: Type.STRING, description: "The name of the school or institution." }, className: { type: Type.STRING, description: "The grade or class level (e.g., '10th Grade')." }, subject: { type: Type.STRING, description: "The subject of the exam (e.g., 'Physics')." }, topics: { type: Type.STRING, description: "A comma-separated list of topics to be covered." }, timeAllowed: { type: Type.STRING, description: "The total time allowed for the exam, e.g., '2 hours 30 minutes'." }, sourceMaterials: { type: Type.STRING, description: "Optional text, URLs, or references provided by the user that should be used as a primary source for generating questions." }, sourceMode: { type: Type.STRING, enum: ['strict', 'reference'], description: "Determines how the source materials are used. 'strict' means only use the provided materials. 'reference' means use them as a primary guide but allow other relevant questions. Default to 'reference' if unsure." }, questionDistribution: { type: Type.ARRAY, description: "The breakdown of questions by type, count, marks, difficulty, and taxonomy.", items: { type: Type.OBJECT, properties: { type: { type: Type.STRING, enum: Object.values(QuestionType) }, count: { type: Type.INTEGER }, marks: { type: Type.INTEGER }, difficulty: { type: Type.STRING, enum: Object.values(Difficulty) }, taxonomy: { type: Type.STRING, enum: Object.values(Taxonomy) }, }, required: ['type', 'count', 'marks', 'difficulty', 'taxonomy'] } }, language: { type: Type.STRING, description: "The language the paper should be written in (e.g., 'English')." }, }, required: ['schoolName', 'className', 'subject', 'topics', 'questionDistribution', 'language', 'timeAllowed'] } };

// Fix: Moved `systemInstruction` here from `ChatbotInterface.tsx` to be shared across the application.
export const systemInstruction = `You are SSGPT, a state-of-the-art, multi-purpose AI assistant integrated into an application for educators. You are a versatile and powerful AI, like Gemini, capable of handling a wide array of tasks.

**Your Core Capabilities:**
1.  **General Assistant:** You can answer questions, write code, brainstorm ideas, summarize text, translate languages, and perform any other general AI task a user might ask for. Be helpful, creative, and knowledgeable.
2.  **Expert Exam Creator:** You have a special tool, \`generatePaper\`, which is your primary function within this specific application. You must guide educators through the process of creating a question paper. If the user uploads images of handwritten questions, analyze them using OCR and start the conversation to build a question paper from them.

**Interaction Guidelines:**
- **Persona:** Be friendly, professional, and proactive. Start with a warm welcome and make it clear you can help with anything, not just making papers.
- **Primary Goal:** Your main objective is to assist the user. If they want to generate a paper, you MUST collaboratively gather all the required details: School Name, Class, Subject, Topics, Time Allowed, a complete Question Distribution, and Language. Also, ask if they have any source materials to provide. If they provide source materials, you should also ask them if the questions should be **strictly** from the materials or if the materials should be used as a **reference**.
- **Tool Usage:**
  - Use the \`generatePaper\` function ONLY when you have gathered all the necessary information.
  - If the user provides text or attaches a file (including images), treat it as potential source material and include it in the 'sourceMaterials' argument when calling the 'generatePaper' tool. Set 'sourceMode' to 'strict' or 'reference' based on their preference. Default to 'reference' if they don't specify.
  - For any other request (e.g., "What is photosynthesis?", "Write a python script", "Give me ideas for a class project"), provide a direct text-based answer. Do NOT use the \`generatePaper\` tool for these.
- **Initiating Conversation:** Start by introducing yourself and highlighting your dual capabilities. For example: "Hello! I'm SSGPT, your AI assistant. I can help you with a variety of tasks, or we can jump right into creating the perfect question paper. What's on your mind today?"`;
