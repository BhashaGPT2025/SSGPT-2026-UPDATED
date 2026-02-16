
import { GoogleGenAI, Type, FunctionDeclaration, Modality, Chat, Part, GenerateContentResponse } from "@google/genai";
import { type FormData, type QuestionPaperData, Question, AnalysisResult } from '../types';
import { generateHtmlFromPaperData } from "./htmlGenerator";
export { generateHtmlFromPaperData };

const handleApiError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    const errorMessage = error?.message?.toLowerCase() || '';

    if (errorMessage.includes("safety")) {
        throw new Error("The content was flagged by safety filters. Please adjust your topics to comply with academic standards.");
    }
    
    if (errorMessage.includes("quota") || errorMessage.includes("resource has been exhausted")) {
        throw new Error(
            "API Quota Exceeded. Try again later or upgrade your plan."
        );
    }
    
    throw new Error(`AI Generation Failed (${context}). Please check your connection or try again.`);
};

const parseAiJson = (text: string) => {
    try {
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error("JSON Parse Error. Raw text:", text);
        throw new Error("The AI returned an invalid response format.");
    }
};

export const rewriteTranscript = async (rawText: string): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    if (!rawText.trim()) return rawText;
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Rewrite cleanly: "${rawText}"`,
        });
        return response.text?.trim() || rawText;
    } catch (error) {
        return rawText; 
    }
};

export const generateChatResponseStream = async (
  chat: Chat,
  messageParts: Part[],
  useSearch: boolean,
  useThinking: boolean,
): Promise<AsyncIterable<GenerateContentResponse>> => {
  const config: any = {};
  if (useSearch) config.tools = [{ googleSearch: {} }];
  if (useThinking) config.thinkingConfig = { thinkingBudget: 8192 };

  return chat.sendMessageStream({
    message: messageParts,
    ...(Object.keys(config).length > 0 && { config }),
  });
};

export const generateTextToSpeech = async (text: string): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API Key not found");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, 
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) return base64Audio;
        throw new Error("Failed to generate audio.");
    } catch (error) {
        handleApiError(error, "generateTextToSpeech");
        throw error;
    }
};

export const generateQuestionPaper = async (formData: FormData): Promise<QuestionPaperData> => {
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const { schoolName, className, subject, topics, questionDistribution, totalMarks, language, timeAllowed, sourceMaterials, sourceFiles, modelQuality } = formData;
    
    const modelToUse = modelQuality === 'pro' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    const finalPrompt = `
You are a Senior Academic Examiner. Generate a question paper in JSON format.
Language: **${language}**.
Subject: ${subject} | Grade: ${className} | Topics: ${topics} | Total Marks: ${totalMarks} | Time: ${timeAllowed}
Structure: ${JSON.stringify(questionDistribution)}
${sourceMaterials ? `Context: ${sourceMaterials}` : ''}

Use LaTeX ($...$) for math. Double escape backslashes (\\\\).
Return a JSON array of question objects.
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
                            options: { description: "Array of strings or object for matching" },
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
        if (!Array.isArray(generatedQuestionsRaw)) throw new Error("Invalid AI response");

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

// New function to handle direct HTML editing
export const editPaperContent = async (currentHtml: string, instruction: string): Promise<string> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // We only send a portion of HTML to save tokens if it's too large, 
    // but for now assume paper fits in context.
    const prompt = `
    You are an expert academic editor.
    User Instruction: "${instruction}"
    
    TASK: Modify the provided HTML content based *strictly* on the user's instruction.
    RULES:
    1. Return ONLY the valid, updated HTML string.
    2. Do NOT use markdown code blocks (no \`\`\`html).
    3. Maintain existing styles and classes.
    4. Ensure Math is formatted with LaTeX $...$.
    5. Do not add generic <html> or <body> tags, just the inner content.

    CURRENT HTML:
    ${currentHtml}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        
        let text = response.text || currentHtml;
        // Cleanup if model adds markdown despite instructions
        text = text.replace(/^```html\s*/i, '').replace(/```$/, '');
        return text;
    } catch (e) {
        console.error("AI Edit failed", e);
        throw e;
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
    // Legacy placeholder, actual editing is now done via editPaperContent
    if (!process.env.API_KEY) throw new Error("Internal Error Occurred");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai.chats.create({ model: "gemini-3-flash-preview" });
};

export const getAiEditResponse = async (chat: Chat, instruction: string) => {
    return { text: "Use editPaperContent instead." };
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
