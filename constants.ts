import { QuestionType, Difficulty, Taxonomy } from './types';

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