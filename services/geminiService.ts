import { GoogleGenAI, Type, FunctionDeclaration, Modality, Chat, Part, GenerateContentResponse, GenerateContentConfig } from "@google/genai";
import { type FormData, type QuestionPaperData, QuestionType, Question, Difficulty, Taxonomy, AnalysisResult } from '../types';
import { generateHtmlFromPaperData } from "./htmlGenerator";
export { generateHtmlFromPaperData };

const handleApiError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    const errorMessage = error?.message?.toLowerCase() || '';

    if (errorMessage.includes("safety")) {
        throw new Error("The content was flagged by safety filters. Please adjust your topics to comply with academic standards.");
    }
    
    // Check for quota-related errors
    if (errorMessage.includes("quota") || errorMessage.includes("resource has been exhausted")) {
        throw new Error(
            "API Quota Exceeded.\n\n" +
            "You've reached the request limit for your current API key plan. Here's what you can do:\n\n" +
            "1. Try again in a few minutes.\n" +
            "2. Use the 'Fast (Flash)' model setting for lower usage.\n" +
            "3. Upgrade your project to a paid plan for higher limits. Visit:\n" +
            "ai.google.dev/gemini-api/docs/billing"
        );
    }
    
    throw new Error(`AI Generation Failed (${context}). Please check your connection or try again. If the issue persists, your API key might be invalid.`);
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
        throw new Error("The AI returned an invalid response format. Using Gemini 3 might require a slightly different prompt structure if errors persist.");
    }
};

export const extractConfigFromTranscript = async (transcript: string): Promise<any> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Extract academic configuration from: "${transcript}". 
    Return JSON: {schoolName, className, subject, topics, difficulty, timeAllowed, questionDistribution: [{type, count, marks, taxonomy, difficulty}]}. 
    Use LaTeX with double backslashes for any math.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
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
    
    const modelToUse = modelQuality === 'pro' ? 'gemini-3-flash-preview' : 'gemini-flash-latest';

    const finalPrompt = `
You are a Senior Academic Examiner. Your task is to generate a high-quality, professional examination paper in JSON format.

**CORE LANGUAGE REQUIREMENT:**
- Generate the ENTIRE assessment (questions, options, matches, solutions) strictly in: **${language}**.
- Use formal academic tone and precise subject terminology appropriate for ${className}.

**MATHEMATICAL & SCIENTIFIC FORMATTING (CRITICAL):**
1. **LATEX FOR ALL MATH:** Use professional LaTeX for ALL formulas, equations, variables ($x$), symbols (multiplication $\\times$, division $\\div$, plus/minus $\\pm$, etc.), and units ($kg \\cdot m/s^2$).
2. **ESCAPING:** You MUST use DOUBLE BACKSLASHES (e.g., \\\\times, \\\\frac{a}{b}) for all LaTeX commands within JSON strings.
3. **PACKAGING:** Enclose all LaTeX content in single dollar signs: $...$.

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
            model: 'gemini-3-pro-image-preview',
            contents: prompt,
            config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: "1K" } }
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
        model: "gemini-3-flash-preview",
        config: {
            systemInstruction: `You are an expert academic editor.
            STRICT MATH: Use professional LaTeX with double backslashes inside JSON. 
            NO REDUNDANT NUMBERING: The system handles all layout numbering. 
            Preserve the paper's original language strictly.`
        }
    });
};

export const getAiEditResponse = async (chat: Chat, instruction: string) => {
    const response = await chat.sendMessage({ message: instruction });
    return { functionCalls: response.functionCalls || null, text: response.text || null };
};

export const analyzePastedText = async (text: string): Promise<AnalysisResult> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this content into JSON for a question paper. Math MUST be LaTeX with DOUBLE backslashes. Text: ${text}`,
        config: { responseMimeType: "application/json" }
    });
    return parseAiJson(response.text as string) as AnalysisResult;
};

export const analyzeHandwrittenImages = async (imageParts: Part[]): Promise<AnalysisResult> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: { parts: [...imageParts, { text: "Perform professional OCR and structure these questions into JSON. Use LaTeX with double backslashes for all math formulas." }] },
        config: { responseMimeType: "application/json" }
    });
    return parseAiJson(response.text as string) as AnalysisResult;
};

// Fix: Add generateChatResponseStream to fix import errors in ChatbotInterface.
export const generateChatResponseStream = async (
    chat: Chat,
    parts: Part[],
    useSearch: boolean,
    useThinking: boolean
) => {
    const config: GenerateContentConfig = {};
    if (useSearch) {
        config.tools = [{ googleSearch: {} }];
    }
    if (useThinking) {
        // The chat is initialized with `gemini-flash-lite-latest`. Max budget for flash/lite is 24576.
        config.thinkingConfig = { thinkingBudget: 24576 }; 
    }
    
    return chat.sendMessageStream({
        message: parts,
        config: (Object.keys(config).length > 0) ? config : undefined,
    });
};

// Fix: Add generateTextToSpeech to fix import errors in ChatbotInterface.
export const generateTextToSpeech = async (text: string): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // Default voice
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio;
        }
        throw new Error("No audio data returned from TTS API.");

    } catch (error) {
        handleApiError(error, "generateTextToSpeech");
        throw error;
    }
};
