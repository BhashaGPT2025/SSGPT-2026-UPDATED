import { GoogleGenAI, Type, FunctionDeclaration, Modality, Chat, Part, GenerateContentResponse } from "@google/genai";
import { type FormData, type QuestionPaperData, QuestionType, Question, Difficulty, Taxonomy, AnalysisResult } from '../types';
import { generateHtmlFromPaperData } from "./htmlGenerator";
export { generateHtmlFromPaperData };

const handleApiError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    if (error?.message?.includes("Safety")) {
        throw new Error("The content was flagged by safety filters. Please adjust your topics to comply with academic standards.");
    }
    throw new Error(`AI Generation Failed (${context}). API Quota may be exhausted or service is unavailable.`);
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
        throw new Error("The AI returned an invalid response format.");
    }
};

export const extractConfigFromTranscript = async (transcript: string): Promise<any> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Extract academic configuration from: "${transcript}". 
    Return JSON: {schoolName, className, subject, topics, difficulty, timeAllowed, questionDistribution: [{type, count, marks, taxonomy, difficulty}]}. 
    Math Requirement: Use LaTeX wrapped in $ signs (e.g., $\\frac{a}{b}$) with double backslashes.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-latest",
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return parseAiJson(response.text as string);
    } catch (error) {
        handleApiError(error, "extractConfigFromTranscript");
    }
};

export const generateQuestionPaper = async (formData: FormData): Promise<QuestionPaperData> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { schoolName, className, subject, topics, questionDistribution, totalMarks, language, timeAllowed, sourceMaterials, sourceFiles, modelQuality } = formData;
    
    // Switch to Gemini 2.5 Flash for quota efficiency
    const modelToUse = 'gemini-2.5-flash-latest';

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
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING },
                            questionText: { type: Type.STRING },
                            options: { description: "Array of strings for MCQ, or {columnA:[], columnB:[]} for Matching." },
                            answer: { type: Type.STRING },
                            marks: { type: Type.NUMBER },
                            difficulty: { type: Type.STRING },
                            taxonomy: { type: Type.STRING }
                        },
                        required: ["type", "questionText", "marks", "answer"]
                    }
                }
            }
        });

        const generatedQuestionsRaw = parseAiJson(response.text as string);
        
        if (!Array.isArray(generatedQuestionsRaw) || generatedQuestionsRaw.length === 0) {
            throw new Error("AI failed to produce content for the paper.");
        }

        const processedQuestions: Question[] = generatedQuestionsRaw.map((q, index) => ({
            ...q,
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
                    // imageSize is not supported in 2.5-flash-image
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
        model: "gemini-2.5-flash-latest",
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
    // Thinking config is removed for 2.5 Flash to save quota
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
        model: "gemini-2.5-flash-latest",
        contents: `Analyze this content into JSON for a question paper. Math MUST be LaTeX with DOUBLE backslashes and wrapped in $ signs. Text: ${text}`,
        config: { responseMimeType: "application/json" }
    });
    return parseAiJson(response.text as string) as AnalysisResult;
};

export const analyzeHandwrittenImages = async (imageParts: Part[]): Promise<AnalysisResult> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-latest",
        contents: { parts: [...imageParts, { text: "Perform professional OCR and structure these questions into JSON. Use LaTeX with double backslashes and $ wrappers for all math." }] },
        config: { responseMimeType: "application/json" }
    });
    return parseAiJson(response.text as string) as AnalysisResult;
};