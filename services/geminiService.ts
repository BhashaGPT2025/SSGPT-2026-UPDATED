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
 * Ensures any LaTeX patterns like \frac, \sqrt, \times that are not wrapped in $ are fixed.
 * This is the most efficient way to handle "missing formatting" from AI.
 */
const ensureMathWrapped = (text: string): string => {
    if (!text) return '';
    // Pattern to catch common LaTeX commands not preceded by $ and wrap them
    // Captures \frac, \sqrt, \times, \div, \sum, \alpha, \beta, \theta, etc.
    const latexPattern = /(?<!\$)\\((?:frac|sqrt|times|div|sum|alpha|beta|gamma|delta|theta|pi|phi|rho|sigma|tau|omega|le|ge|neq|approx|pm|mp|cdot|nabla|partial)[^ $\t\r\n]*)(?!\$)/g;
    
    // Also catch fractions like {1}/{2} or simple digit/digit patterns that AI uses in text
    return text.replace(latexPattern, (match) => {
        // Simple heuristic: if it contains a LaTeX control word but no $ wrapper
        return `$${match}$`;
    });
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

const normalizeQuestionType = (typeStr: string): QuestionType => {
    if (!typeStr) return QuestionType.ShortAnswer;
    const lower = typeStr.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
    if (lower.includes('multiple') || lower.includes('choice') || lower.includes('mcq')) return QuestionType.MultipleChoice;
    if (lower.includes('fill') || lower.includes('blank')) return QuestionType.FillInTheBlanks;
    if (lower.includes('true') || lower.includes('false') || lower.includes('assertion')) return QuestionType.TrueFalse;
    if (lower.includes('match')) return QuestionType.MatchTheFollowing;
    if (lower.includes('short') || lower.includes('brief') || lower.includes('one word')) return QuestionType.ShortAnswer;
    if (lower.includes('long') || lower.includes('detailed') || lower.includes('essay') || lower.includes('descriptive')) return QuestionType.LongAnswer;
    return QuestionType.ShortAnswer;
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
    const { schoolName, className, subject, topics, questionDistribution, totalMarks, language, timeAllowed, sourceMaterials, sourceFiles } = formData;
    const modelToUse = 'gemini-flash-latest';

    const finalPrompt = `
You are a Senior Academic Examiner. Generate a high-quality, professional examination paper in JSON format.

**CORE LANGUAGE REQUIREMENT:** Strictly use: **${language}**.
**MATHEMATICAL FORMATTING (CRITICAL):**
1. Wrap ALL formulas/symbols/roots/fractions in single dollar signs ($). Example: "Calculate $x \\times y$".
2. **ESCAPING:** Use DOUBLE BACKSLASHES (e.g., \\\\times, \\\\frac{a}{b}, \\\\pm) for all LaTeX commands inside JSON.
3. No raw LaTeX like \frac{a}{b} without $ markers.

**PAPER PARAMETERS:**
Subject: ${subject} | Grade: ${className} | Topics: ${topics} | Total Marks: ${totalMarks} | Time: ${timeAllowed}
Mix: ${JSON.stringify(questionDistribution)}
${sourceMaterials ? `Context: ${sourceMaterials}` : ''}

Return only a valid JSON array of question objects.`;

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
            config: { responseMimeType: "application/json" }
        });

        const generatedQuestionsRaw = parseAiJson(response.text as string);
        if (!Array.isArray(generatedQuestionsRaw) || generatedQuestionsRaw.length === 0) {
            throw new Error("AI failed to produce content for the paper.");
        }

        const processedQuestions: Question[] = generatedQuestionsRaw.map((q, index) => {
            const questionText = ensureMathWrapped(q.questionText || '');
            const answer = typeof q.answer === 'string' ? ensureMathWrapped(q.answer) : q.answer;
            let options = q.options;
            
            if (Array.isArray(options)) {
                options = options.map(opt => ensureMathWrapped(opt));
            } else if (options && typeof options === 'object') {
                if (options.columnA) options.columnA = options.columnA.map((i: string) => ensureMathWrapped(i));
                if (options.columnB) options.columnB = options.columnB.map((i: string) => ensureMathWrapped(i));
            }

            return {
                ...q,
                questionText,
                options,
                answer,
                type: normalizeQuestionType(q.type),
                questionNumber: index + 1
            };
        });

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
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
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
            STRICT MATH: Use LaTeX with double backslashes inside JSON. 
            WRAP MATH: Always wrap math in $ signs.
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