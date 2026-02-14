// Fix: Defined and exported all necessary types to resolve import errors across the application.
export enum QuestionType {
  MultipleChoice = 'Multiple Choice',
  FillInTheBlanks = 'Fill in the Blanks',
  TrueFalse = 'True / False',
  ShortAnswer = 'Short Answer',
  LongAnswer = 'Long Answer',
  MatchTheFollowing = 'Match the Following',
}

export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export enum Taxonomy {
  Remembering = 'Remembering',
  Understanding = 'Understanding',
  Applying = 'Applying',
  Analyzing = 'Analyzing',
  Evaluating = 'Evaluating',
  Creating = 'Creating',
}

export interface QuestionDistributionItem {
  id: string;
  type: QuestionType;
  count: number;
  marks: number;
  difficulty: Difficulty;
  taxonomy: Taxonomy;
}

export interface FormData {
  schoolName: string;
  className: string;
  subject: string;
  topics: string;
  language: string;
  timeAllowed: string;
  sourceMaterials: string;
  sourceFiles?: {
    name: string;
    data: string; // base64 encoded string
    mimeType: string;
  }[];
  sourceMode: 'strict' | 'reference';
  questionDistribution: QuestionDistributionItem[];
  totalMarks: number;
  modelQuality?: 'flash' | 'pro';
}

export interface AnalysisResult {
  extractedData: {
    schoolName: string | null;
    className: string | null;
    subject: string | null;
    timeAllowed: string | null;
    totalMarks: number | null;
  };
  missingFields: (keyof AnalysisResult['extractedData'])[];
  extractedQuestions: Omit<Question, 'questionNumber' | 'styles'>[];
}

export interface Question {
  questionNumber: number;
  type: QuestionType;
  questionText: string;
  options: string[] | { columnA: string[]; columnB: string[] } | null;
  answer: string | { [key: string]: string };
  marks: number;
  difficulty: Difficulty;
  taxonomy: Taxonomy;
  styles?: {
      color?: string;
  };
}

export interface BankQuestion extends Omit<Question, 'questionNumber'> {
    id: string;
    createdAt: string;
    subject: string;
    className: string;
}

export interface QuestionPaperData {
  id: string;
  schoolName: string;
  className: string;
  subject: string;
  totalMarks: string;
  timeAllowed: string;
  questions: Question[];
  htmlContent: string;
  createdAt: string;
  schoolLogo?: string;
}

export interface User {
    uid: string;
    email: string;
    profilePicture: string;
    role?: 'teacher' | 'student';
    defaultSchoolName?: string;
    schoolLogo?: string;
}

export interface PaperStyles {
    fontFamily: string;
    headingColor: string;
    borderColor: string;
    borderWidth: number;
    borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
}

export interface WatermarkState {
    type: 'none' | 'text' | 'image';
    text?: string;
    src?: string;
    color: string;
    fontSize: number;
    opacity: number;
    rotation: number;
}

export interface LogoState {
    src?: string;
    position: 'header-left' | 'header-center' | 'header-right' | 'background' | 'none';
    size: number;
    opacity: number;
}

export interface ImageState {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  rotation: number;
}

export interface TextBoxState {
  id: string;
  htmlContent: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
  rotation: number;
}

export type Page = 
  | 'creationHub' 
  | 'generate' 
  | 'chat' 
  | 'edit' 
  | 'myPapers' 
  | 'analyze' 
  | 'settings'
  | 'teacherDashboard'
  | 'studentDashboard'
  | 'questionBank'
  | 'practice'
  | 'assignedPapers'
  | 'attendedPapers'
  | 'gallery'
  | 'imageEditor';
  
export type Theme = 'light' | 'dark';

// Fix: Added VoiceOption interface to be used in voice-related components.
export interface VoiceOption {
    id: string;
    name: string;
}

// --- Image Gallery & Editor Types ---

export interface GalleryFolder {
    id: string;
    name: string;
    parentId: string | null;
}

export interface UploadedImage {
    id: string;
    name: string;
    url: string; // Base64 or Blob URL
    thumbnailUrl: string;
    size: number; // in bytes
    type: string; // MIME type
    width: number;
    height: number;
    folderId: string | null;
    createdAt: number;
    updatedAt: number;
    tags: string[];
}

export interface EditorLayer {
    id: string;
    type: 'image' | 'text';
    name: string;
    visible: boolean;
    locked: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    
    // Image specific
    src?: string;
    filter?: string; // CSS filter string
    
    // Text specific
    text?: string;
    fontSize?: number;
    color?: string;
    fontFamily?: string;
}

export interface EditorState {
    canvasWidth: number;
    canvasHeight: number;
    layers: EditorLayer[];
    selectedLayerId: string | null;
    history: EditorLayer[][]; // Simple history stack
    historyIndex: number;
    zoom: number;
}