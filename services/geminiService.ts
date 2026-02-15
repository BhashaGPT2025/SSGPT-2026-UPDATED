import { GoogleGenAI, Type, FunctionDeclaration, Modality, Chat, Part, GenerateContentResponse } from "@google/genai";
import { type FormData, type QuestionPaperData, QuestionType, Question, Difficulty, Taxonomy, AnalysisResult } from '../types';
import { generateHtmlFromPaperData } from "./htmlGenerator";
export { generateHtmlFromPaperData };

const handleApiError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    if (error?.message?.includes("Safety")) {
        throw new Error("The content was flagged by safety filters. Please adjust your topics to comply with academic standards.");
    }
    if (error?.message?.includes("429") || error?.message?.includes("Quota")) {
        throw new Error("API Quota exhausted. Please try again later.");
    }
    throw new Error(`AI Generation Failed (${context}). Please check your connection.`);
};

/**
 * Robustly cleans and parses JSON from AI responses, handling markdown artifacts.
 */
const parseAiJson = (text: string) => {
    try {
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error("JSON Parse Error. Raw text:", text);
        // Attempt to find JSON array or object if mixed with text
        const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e2) {
                throw new Error("The AI returned an invalid response format.");
            }
        }
        throw new Error("The AI returned an invalid response format.");
    }
};

// Helper to normalize vague AI outputs into strict QuestionType enums
const normalizeQuestionType = (typeStr: string): QuestionType => {
    if (!typeStr) return QuestionType.ShortAnswer;
    const lower = typeStr.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
    
    if (lower.includes('multiple') || lower.includes('choice') || lower.includes('mcq')) return QuestionType.MultipleChoice;
    if (lower.includes('fill') || lower.includes('blank')) return QuestionType.FillInTheBlanks;
    if (lower.includes('true') || lower.includes('false') || lower.includes('assertion')) return QuestionType.TrueFalse;
    if (lower.includes('match')) return QuestionType.MatchTheFollowing;
    if (lower.includes('short') || lower.includes('brief') || lower.includes('one word')) return QuestionType.ShortAnswer;
    if (lower.includes('long') || lower.includes('detailed') || lower.includes('essay') || lower.includes('descriptive')) return QuestionType.LongAnswer;
    
    return QuestionType.ShortAnswer; // Safe default
};

export const extractConfigFromTranscript = async (transcript: string): Promise<any> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred: API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Extract academic configuration from: "${transcript}". 
    Return JSON: {schoolName, className, subject, topics, difficulty, timeAllowed, questionDistribution: [{type, count, marks, taxonomy, difficulty}]}. 
    Math Requirement: Use LaTeX wrapped in $ signs (e.g., $\\frac{a}{b}$) with double backslashes.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return parseAiJson(response.text as string);
    } catch (error) {
        handleApiError(error, "extractConfigFromTranscript");
    }
};

export const generateQuestionPaper = async (formData: FormData): Promise<QuestionPaperData> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred: API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { schoolName, className, subject, topics, questionDistribution, totalMarks, language, timeAllowed, sourceMaterials, sourceFiles, modelQuality } = formData;
    
    // Switch to 'gemini-flash-latest' for stability and speed. 
    // Gemini 3 Preview models are causing the 404/Internal Errors.
    const modelToUse = 'gemini-flash-latest';

    const finalPrompt = `
You are a Senior Academic Examiner. Your task is to generate a high-quality, professional examination paper in JSON format.

**CORE LANGUAGE REQUIREMENT:**
- Generate the ENTIRE assessment (questions, options, matches, solutions) strictly in: **${language}**.
- Use formal academic tone and precise subject terminology appropriate for ${className}.

**MATHEMATICAL & SCIENTIFIC FORMATTING (CRITICAL):**
1. **DELIMITERS:** You **MUST** wrap ALL mathematical formulas, variables, and equations in single dollar signs ($). Example: "Calculate $x$ where $x = 5$".
2. **LATEX:** Use professional LaTeX for all math. 
3. **ESCAPING:** You **MUST** use DOUBLE BACKSLASHES (e.g., \\\\times, \\\\frac{a}{b}, \\\\pm) for all LaTeX commands within the JSON string.
4. **NO RAW LATEX:** Never output \frac{a}{b} without the surrounding $ signs.

**QUESTION STRUCTURE RULES:**
- **NO NUMBERING:** DO NOT include any numbering prefixes like "1.", "Q1", "a)", "(i)", "Column A:" inside the strings.
- **Multiple Choice:** Return exactly 4 options as a plain array of strings.
- **Match the Following:** Return an object for 'options': {"columnA": ["Item 1", "Item 2"...], "columnB": ["Match for 2", "Match for 1"...]}. Column B MUST be shuffled.
- **Answer Key:** The "answer" field must contain a detailed model solution or the correct choice.

**PAPER PARAMETERS:**
Subject: ${subject} | Grade: ${className} | Topics: ${topics} | Total Marks: ${totalMarks} | Time: ${timeAllowed}
Mix: ${JSON.stringify(questionDistribution)}
${sourceMaterials ? `Context: ${sourceMaterials}` : ''}

Return only a valid JSON array of question objects.
`;

    try {
        const parts: Part[] = [{ text: finalPrompt }];
        if (sourceFiles) {
            for (const file of sourceFiles) {
                parts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
            }
        }

        const response = await ai.models.generateContent({
            model: modelToUse,
            contents: { parts },
            config: { 
                responseMimeType: "application/json",
                // Removed strict schema to allow Flash model more flexibility in JSON structure (prevents 500 errors)
            }
        });

        const generatedQuestionsRaw = parseAiJson(response.text as string);
        
        if (!Array.isArray(generatedQuestionsRaw) || generatedQuestionsRaw.length === 0) {
            throw new Error("AI failed to produce content for the paper.");
        }

        const processedQuestions: Question[] = generatedQuestionsRaw.map((q, index) => ({
            ...q,
            type: normalizeQuestionType(q.type), // CRITICAL FIX: Ensure type matches internal enums
            options: q.options || null,
            answer: q.answer || '',
            questionNumber: index + 1
        }));

        const paperId = `paper-${Date.now()}`;
        const structuredPaperData: QuestionPaperData = {
            id: paperId, schoolName, className, subject, totalMarks: String(totalMarks),
            timeAllowed, questions: processedQuestions, htmlContent: '', createdAt: new Date().toISOString(),
        };
        
        structuredPaperData.htmlContent = generateHtmlFromPaperData(structuredPaperData);
        return structuredPaperData;
    } catch (error) {
        handleApiError(error, "generateQuestionPaper");
        throw error;
    }
};

export const generateImage = async (prompt: string, aspectRatio: string = '1:1'): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: prompt,
            config: { 
                imageConfig: { 
                    aspectRatio: aspectRatio as any, 
                } 
            }
        });
        for (const part of response.candidates![0].content.parts) {
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        throw new Error("Internal Error Occurred");
    } catch (error) {
        handleApiError(error, "generateImage");
        throw error;
    }
};

export const createEditingChat = (paperData: QuestionPaperData) => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.chats.create({
        model: "gemini-flash-latest",
        config: {
            systemInstruction: `You are an expert academic editor.
            STRICT MATH: Use professional LaTeX with double backslashes inside JSON. 
            WRAP MATH: Always wrap math in $ signs.
            NO REDUNDANT NUMBERING: The system handles all layout numbering. 
            Preserve the paper's original language strictly.`
        }
    });
};

export const getAiEditResponse = async (chat: Chat, instruction: string) => {
    const response = await chat.sendMessage({ message: instruction });
    return { functionCalls: response.functionCalls || null, text: response.text || null };
};

export const generateChatResponseStream = async (chat: Chat, messageParts: Part[], useSearch?: boolean, useThinking?: boolean): Promise<AsyncGenerator<GenerateContentResponse>> => {
    const config: any = {};
    if (useSearch) config.tools = [{ googleSearch: {} }];
    return chat.sendMessageStream({ message: messageParts, config });
};

export const generateTextToSpeech = async (text: string): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const analyzePastedText = async (text: string): Promise<AnalysisResult> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Analyze this content into JSON for a question paper. Math MUST be LaTeX with DOUBLE backslashes and wrapped in $ signs. Text: ${text}`,
        config: { responseMimeType: "application/json" }
    });
    return parseAiJson(response.text as string) as AnalysisResult;
};

export const analyzeHandwrittenImages = async (imageParts: Part[]): Promise<AnalysisResult> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: { parts: [...imageParts, { text: "Perform professional OCR and structure these questions into JSON. Use LaTeX with double backslashes and $ wrappers for all math." }] },
        config: { responseMimeType: "application/json" }
    });
    return parseAiJson(response.text as string) as AnalysisResult;
};