import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat, FunctionDeclaration, Type, LiveServerMessage, Modality, Blob, Part } from "@google/genai";
import { type FormData, QuestionType, Difficulty, Taxonomy, type VoiceOption } from '../types';
import { generateChatResponseStream, generateTextToSpeech } from '../services/geminiService';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { AttachmentIcon } from './icons/AttachmentIcon';
import { VoiceIcon } from './icons/VoiceIcon';
import { StopIcon } from './icons/StopIcon';
import VoiceModeModal from './VoiceModeModal';
import { SSGPT_LOGO_URL } from '../constants';

// --- Types ---
type Message = { id: string; sender: 'bot' | 'user'; text: string; grounding?: any[] };
type AttachedFile = { name: string; data: string; mimeType: string; };
type ConversationTurn = { user: string; ai: string; id: number };

// --- Icons ---
const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>);
const NewChatIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>);
const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor" {...props}><path d="M3.4 20.4l17.45-7.48c.81-.35.81-1.49 0-1.84L3.4 3.6c-.66-.29-1.39.2-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"></path></svg>);
const SpeakIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>);

const generatePaperFunctionDeclaration: FunctionDeclaration = { name: 'generatePaper', description: 'Call this function ONLY when all necessary details for creating a question paper have been collected. This is a specialized tool and should not be used for general queries.', parameters: { type: Type.OBJECT, properties: { schoolName: { type: Type.STRING, description: "The name of the school or institution." }, className: { type: Type.STRING, description: "The grade or class level (e.g., '10th Grade')." }, subject: { type: Type.STRING, description: "The subject of the exam (e.g., 'Physics')." }, topics: { type: Type.STRING, description: "A comma-separated list of topics to be covered." }, timeAllowed: { type: Type.STRING, description: "The total time allowed for the exam, e.g., '2 hours 30 minutes'." }, sourceMaterials: { type: Type.STRING, description: "Optional text, URLs, or references provided by the user that should be used as a primary source for generating questions." }, sourceMode: { type: Type.STRING, enum: ['strict', 'reference'], description: "Determines how the source materials are used. 'strict' means only use the provided materials. 'reference' means use them as a primary guide but allow other relevant questions. Default to 'reference' if unsure." }, questionDistribution: { type: Type.ARRAY, description: "The breakdown of questions by type, count, marks, difficulty, and taxonomy.", items: { type: Type.OBJECT, properties: { type: { type: Type.STRING, enum: Object.values(QuestionType) }, count: { type: Type.INTEGER }, marks: { type: Type.INTEGER }, difficulty: { type: Type.STRING, enum: Object.values(Difficulty) }, taxonomy: { type: Type.STRING, enum: Object.values(Taxonomy) }, }, required: ['type', 'count', 'marks', 'difficulty', 'taxonomy'] } }, language: { type: Type.STRING, description: "The language the paper should be written in (e.g., 'English')." }, }, required: ['schoolName', 'className', 'subject', 'topics', 'questionDistribution', 'language', 'timeAllowed'] } };
const systemInstruction = `You are SSGPT, a state-of-the-art, multi-purpose AI assistant integrated into an application for educators. You are a versatile and powerful AI, like Gemini, capable of handling a wide array of tasks.

**Your Core Capabilities:**
1.  **General Assistant:** You can answer questions, write code, brainstorm ideas, summarize text, translate languages, and perform any other general AI task a user might ask for. Be helpful, creative, and knowledgeable.
2.  **Expert Exam Creator:** You have a special tool, \`generatePaper\`, which is your primary function within this specific application. You must guide educators through the process of creating a question paper. If the user uploads images of handwritten questions, analyze them using OCR and start the conversation to build a question paper from them.

**Interaction Guidelines:**
- **Persona:** Be friendly, professional, and proactive. Start with a warm welcome and make it clear you can help with anything, not just making papers.
- **Primary Goal:** Your main objective is to assist the user. If they want to generate a paper, you MUST collaboratively gather all the required details: School Name, Class, Subject, Topics, Time Allowed, a complete Question Distribution, and Language. Also, ask if they have any source materials to provide. If they provide source materials, you should also ask them if the questions should be **strictly** from the materials or if the materials should be used as a **reference**.
- **Tool Usage:**
  - Use the \`generatePaper\` function ONLY when you have gathered ALL the necessary information.
  - If the user provides text or attaches a file (including images), treat it as potential source material and include it in the 'sourceMaterials' argument when calling the 'generatePaper' tool. Set 'sourceMode' to 'strict' or 'reference' based on their preference. Default to 'reference' if they don't specify.
  - For any other request (e.g., "What is photosynthesis?", "Write a python script", "Give me ideas for a class project"), provide a direct text-based answer. Do NOT use the \`generatePaper\` tool for these.
- **Initiating Conversation:** Start by introducing yourself and highlighting your dual capabilities. For example: "Hello! I'm SSGPT, your AI assistant. I can help you with a variety of tasks, or we can jump right into creating the perfect question paper. What's on your mind today?"`;

const blobToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onloadend = () => resolve((reader.result as string).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
function parseMarkdownToHTML(text: string) { let html = text.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); html = html.replace(/```([\s\S]*?)```/g, (match, code) => `<pre><code>${code.trim()}</code></pre>`); html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); html = html.replace(/\*(.*?)\*/g, '<em>$1</em>'); html = html.replace(/^([ \t]*)([\*\-]) (.*$)/gm, (match, indent, bullet, content) => `${indent}<ul><li>${content}</li></ul>`); html = html.replace(/<\/ul>\s*<ul>/g, ''); html = html.replace(/^([ \t]*)\d+\. (.*$)/gm, (match, indent, content) => `${indent}<ol><li>${content}</li></ol>`); html = html.replace(/<\/ol>\s*<ol>/g, ''); html = html.replace(/\n/g, '<br />').replace(/(<br \/>\s*){2,}/g, '<br />'); return html; }

const WelcomeScreen: React.FC<{ onSuggestionClick: (text: string) => void }> = ({ onSuggestionClick }) => ( <div className="flex-1 flex flex-col items-center justify-center text-center p-4 h-full animate-fade-in-up"> <img src={SSGPT_LOGO_URL} alt="SSGPT Logo" className="w-16 h-16 mb-4 rounded-full shadow-lg" /> <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">How can I help you today?</h2> <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto w-full"> <SuggestionChip onClick={onSuggestionClick} text="Create a history test for 12th grade" /> <SuggestionChip onClick={onSuggestionClick} text="Explain the concept of black holes" /> <SuggestionChip onClick={onSuggestionClick} text="Brainstorm ideas for a science fair project" /> <SuggestionChip onClick={onSuggestionClick} text="Write a python script to sort a list" /> </div> </div>);
const SuggestionChip: React.FC<{text: string, onClick: (text: string) => void}> = ({ text, onClick }) => ( <button onClick={() => onClick(text)} className="p-4 bg-white dark:bg-slate-800/50 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700/80 shadow-sm"> <p className="font-semibold text-slate-700 dark:text-slate-300">{text}</p> </button>);
const TypingIndicator: React.FC = () => ( <div className="flex items-end gap-3 justify-start animate-slide-in-left"> <img src={SSGPT_LOGO_URL} alt="SSGPT Logo" className="w-8 h-8 rounded-full self-start flex-shrink-0" /> <div className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 rounded-bl-none text-slate-800 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700/80"> <div className="flex items-center gap-1.5"> <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span> <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span> <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span> </div> </div> </div>);
const MessageBubble: React.FC<{ message: Message, onSpeak: (text: string) => void }> = ({ message, onSpeak }) => ( <div className={`group flex items-start gap-3 w-full ${message.sender === 'user' ? 'justify-end animate-slide-in-right' : 'justify-start animate-slide-in-left'}`}> {message.sender === 'bot' && <img src={SSGPT_LOGO_URL} alt="SSGPT Logo" className="w-8 h-8 rounded-full self-start flex-shrink-0" />} <div className={`prose-chat px-4 py-3 rounded-2xl max-w-xl lg:max-w-2xl break-words shadow-md border ${message.sender === 'bot' ? 'bg-white dark:bg-slate-800 rounded-bl-none text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80' : 'bg-green-100 dark:bg-green-900/40 text-slate-800 dark:text-slate-200 rounded-br-none border-green-200 dark:border-green-800/50'}`}> <div dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(message.text) }} /> {message.grounding && message.grounding.length > 0 && ( <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700"> <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400">Sources:</h4> <div className="flex flex-wrap gap-2 mt-1"> {message.grounding.map((chunk, index) => chunk.web && ( <a href={chunk.web.uri} key={index} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md hover:underline">{chunk.web.title || new URL(chunk.web.uri).hostname}</a> ))} </div> </div> )} </div> <div className="self-center flex-shrink-0 flex gap-1"> {message.sender === 'bot' && ( <> <button onClick={() => onSpeak(message.text)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" title="Read aloud"><SpeakIcon /></button> <button onClick={() => navigator.clipboard.writeText(message.text)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" title="Copy text"><CopyIcon /></button> </> )} </div> </div>);
const InputBar: React.FC<{ userInput: string; setUserInput: (value: string) => void; onSendMessage: (message: string) => void; onAttachmentClick: () => void; onVoiceClick: () => void; isBotTyping: boolean; attachedFiles: AttachedFile[]; onRemoveAttachment: (fileName: string) => void; useSearch: boolean; setUseSearch: (val: boolean) => void; useThinking: boolean; setUseThinking: (val: boolean) => void; }> = ({ userInput, setUserInput, onSendMessage, onAttachmentClick, onVoiceClick, isBotTyping, attachedFiles, onRemoveAttachment, useSearch, setUseSearch, useThinking, setUseThinking }) => { const textareaRef = useRef<HTMLTextAreaElement>(null); useEffect(() => { const el = textareaRef.current; if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }, [userInput]); return ( <div className="w-full max-w-3xl mx-auto px-4 sm:px-0"> <div className="relative bg-white dark:bg-slate-800/80 backdrop-blur-md border dark:border-slate-700/80 rounded-2xl shadow-2xl"> {attachedFiles.length > 0 && ( <div className="absolute bottom-full left-4 mb-2 flex flex-wrap items-center gap-2 max-w-[calc(100%-2rem)]"> {attachedFiles.map(file => ( <div key={file.name} className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full text-sm animate-fade-in-fast"> <span className="font-medium text-blue-700 dark:text-blue-300 truncate max-w-[150px]">{file.name}</span> <button onClick={() => onRemoveAttachment(file.name)} className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg></button> </div> ))} </div> )} <textarea ref={textareaRef} rows={1} value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage(userInput); } }} placeholder="Message SSGPT..." className="w-full pl-12 pr-28 py-4 bg-transparent rounded-2xl focus:outline-none resize-none text-base transition-all max-h-48" disabled={isBotTyping} /> <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center"> <button onClick={onAttachmentClick} className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"><AttachmentIcon className="w-6 h-6" /></button> </div> <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2"> <button onClick={onVoiceClick} className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"><VoiceIcon className="w-6 h-6" /></button> <button onClick={() => onSendMessage(userInput)} disabled={isBotTyping || (!userInput.trim() && attachedFiles.length === 0)} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:scale-100 hover:scale-105"><SendIcon className="w-5 h-5" /></button> </div> </div> <div className="flex justify-center items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400"> <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={useSearch} onChange={e => setUseSearch(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-indigo-500"/> Search the web</label> <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={useThinking} onChange={e => setUseThinking(e.target.checked)} className="w-4 h-4 rounded text-purple-600 bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-purple-500"/> Thinking Mode</label> </div> </div>); };

const ChatbotInterface: React.FC<{ onGenerate: (formData: FormData) => void }> = ({ onGenerate }) => {
  const [messages, setMessages] = useState<Message[]>([]); const [chat, setChat] = useState<Chat | null>(null); const [userInput, setUserInput] = useState(''); const [isBotTyping, setIsBotTyping] = useState(false); const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]); const messagesEndRef = useRef<HTMLDivElement>(null); const fileInputRef = useRef<HTMLInputElement>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false); const [isLiveSessionActive, setIsLiveSessionActive] = useState(false); const [isAiSpeaking, setIsAiSpeaking] = useState(false); const sessionPromiseRef = useRef<Promise<any> | null>(null); const outputAudioContextRef = useRef<AudioContext | null>(null); let nextStartTime = 0;
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]); const [currentUserText, setCurrentUserText] = useState(''); const [currentAiText, setCurrentAiText] = useState(''); const userUtteranceRef = useRef(''); const aiUtteranceRef = useRef(''); const conversationEndRef = useRef<HTMLDivElement>(null);
  const [useSearch, setUseSearch] = useState(false); const [useThinking, setUseThinking] = useState(false);
  const audioPlaybackSource = useRef<AudioBufferSourceNode | null>(null);

  const initChat = useCallback(async () => {
    setIsBotTyping(true); setMessages([]);
    try {
      if (!process.env.API_KEY) throw new Error("API_KEY is not configured.");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const newChat = ai.chats.create({ model: 'gemini-2.5-flash-lite', config: { systemInstruction, tools: [{ functionDeclarations: [generatePaperFunctionDeclaration] }] } });
      setChat(newChat);
      const importedFilesRaw = sessionStorage.getItem('ssgpt_imported_files');
      if (!importedFilesRaw) {
        const responseStream = await newChat.sendMessageStream({ message: "Start conversation" });
        const newBotMessage: Message = { id: `bot-${Date.now()}`, sender: 'bot', text: '' };
        setMessages([newBotMessage]);
        for await (const chunk of responseStream) { setMessages(prev => prev.map(msg => msg.id === newBotMessage.id ? {...msg, text: msg.text + chunk.text} : msg)); }
      }
    } catch (error) { console.error("Failed to initialize chatbot:", error); setMessages([{ id: 'bot-error', sender: 'bot', text: "Sorry, I'm having trouble connecting right now. Please check your API key or try again later." }]);
    } finally { setIsBotTyping(false); }
  }, []);
    
  useEffect(() => { initChat(); outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); return () => { isLiveSessionActive && sessionPromiseRef.current?.then(session => session.close()); }; }, [initChat]);
  useEffect(() => {
    const importedFilesRaw = sessionStorage.getItem('ssgpt_imported_files');
    if (importedFilesRaw) {
        sessionStorage.removeItem('ssgpt_imported_files');
        try {
            const importedFiles = JSON.parse(importedFilesRaw);
            if (Array.isArray(importedFiles) && importedFiles.length > 0) {
                setAttachedFiles(prev => [...prev, ...importedFiles]);
                const fileNames = importedFiles.map(f => f.name).join(', ');
                const prompt = `I've uploaded ${fileNames}. Can you analyze these images of handwritten questions and help me create a question paper?`;
                setUserInput(prompt);
            }
        } catch (e) {
            console.error("Could not parse imported files from session storage", e);
        }
    }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isBotTyping]);
  useEffect(() => { conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversationHistory, currentUserText, currentAiText]);

  const handleSendMessage = async (messageText: string, filesToAttach: AttachedFile[] | null = null) => {
    const text = messageText.trim();
    const files = filesToAttach || attachedFiles;
    if ((!text && files.length === 0) || isBotTyping || !chat) return;
    
    let userMessageForUI = text;
    if (files.length > 0) {
        const fileNames = files.map(f => f.name).join(', ');
        userMessageForUI = text ? `${text}\n[Files attached: ${fileNames}]` : `[Files attached: ${fileNames}]`;
    }
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: userMessageForUI }]);
    setUserInput(''); setIsBotTyping(true);
    
    try {
      const messageParts: Part[] = [];
      if (text) messageParts.push({ text });
      files.forEach(file => {
          messageParts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
      });
      setAttachedFiles([]); // Clear after sending

      const responseStream = await generateChatResponseStream(chat, messageParts, useSearch, useThinking);
      const newBotMessage: Message = { id: `bot-${Date.now()}`, sender: 'bot', text: '', grounding: [] };
      setMessages(prev => [...prev, newBotMessage]);
      let functionCalls: any[] = [];
      for await (const chunk of responseStream) {
        if (chunk.functionCalls) functionCalls = functionCalls.concat(chunk.functionCalls);
        if (chunk.candidates?.[0]?.groundingMetadata?.groundingChunks) newBotMessage.grounding = chunk.candidates[0].groundingMetadata.groundingChunks;
        if(chunk.text) setMessages(prev => prev.map(msg => msg.id === newBotMessage.id ? {...msg, text: msg.text + chunk.text, grounding: newBotMessage.grounding } : msg));
      }
      if (functionCalls.length > 0 && functionCalls[0].name === 'generatePaper' && functionCalls[0].args) { handleTriggerGeneration(functionCalls[0].args); return; }
    } catch (error) { console.error("Error sending message to Gemini:", error); setMessages(prev => [...prev, { id: 'bot-error-send', sender: 'bot', text: "I encountered an error. Please try again." }]);
    } finally { setIsBotTyping(false); }
  };
  
  const handleTriggerGeneration = (args: any) => { 
    const formData: Partial<FormData> = { ...args }; 
    formData.totalMarks = (formData.questionDistribution || []).reduce((acc: number, item: any) => acc + (item.count * item.marks), 0); 
    formData.questionDistribution?.forEach((item: any) => { item.id = `dist-${Date.now()}-${Math.random()}`});
    if (!formData.sourceMode) {
        formData.sourceMode = 'reference';
    }
    setMessages(prev => [...prev, { id: 'bot-gen', sender: 'bot', text: "Perfect, I have all the details! Generating your question paper now..." }]); 
    setIsBotTyping(false); 
    onGenerate(formData as FormData); 
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { alert("File size cannot exceed 20MB."); return; }
      try {
        const base64Data = await blobToBase64(file);
        setAttachedFiles(prev => [...prev, { name: file.name, data: base64Data, mimeType: file.type }]);
      } catch (error) { console.error("Error processing file:", error); alert("Sorry, there was an error processing that file."); }
    }
    if(event.target) event.target.value = ''; 
  };
    
  const handleSpeak = async (text: string) => {
      if (audioPlaybackSource.current) { audioPlaybackSource.current.stop(); audioPlaybackSource.current = null; }
      try {
          const audioBase64 = await generateTextToSpeech(text);
          const audioData = decode(audioBase64);
          const audioBuffer = await decodeAudioData(audioData, outputAudioContextRef.current!, 24000, 1);
          const source = outputAudioContextRef.current!.createBufferSource();
          source.buffer = audioBuffer; source.connect(outputAudioContextRef.current!.destination); source.start();
          audioPlaybackSource.current = source;
      } catch (error) { console.error("TTS Error:", error); alert("Failed to generate audio."); }
  };

  const startLiveSession = async (voice: VoiceOption) => {
    setIsVoiceModalOpen(false); setIsLiveSessionActive(true); setConversationHistory([]); setCurrentUserText('Connecting...'); setCurrentAiText(''); userUtteranceRef.current = ''; aiUtteranceRef.current = '';
    if (!process.env.API_KEY) { setCurrentUserText("Error: API_KEY is not configured."); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch(err) { setCurrentUserText("Microphone access denied."); setIsLiveSessionActive(false); return; }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }); const sources = new Set<AudioBufferSourceNode>(); nextStartTime = 0;
    sessionPromiseRef.current = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => { setCurrentUserText("Connected! You can start talking now."); const source = inputAudioContext.createMediaStreamSource(stream); const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1); scriptProcessor.onaudioprocess = (audioProcessingEvent) => { const pcmBlob = createBlob(audioProcessingEvent.inputBuffer.getChannelData(0)); sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob })); }; source.connect(scriptProcessor); scriptProcessor.connect(inputAudioContext.destination); },
        onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) userUtteranceRef.current = message.serverContent.inputTranscription.text; if (message.serverContent?.outputTranscription) aiUtteranceRef.current = message.serverContent.outputTranscription.text; setCurrentUserText(userUtteranceRef.current); setCurrentAiText(aiUtteranceRef.current);
            if (message.serverContent?.turnComplete) { if (userUtteranceRef.current || aiUtteranceRef.current) setConversationHistory(prev => [...prev, { user: userUtteranceRef.current, ai: aiUtteranceRef.current, id: Date.now() }]); userUtteranceRef.current = ''; aiUtteranceRef.current = ''; setCurrentUserText(''); setCurrentAiText(''); }
            if (message.toolCall?.functionCalls?.[0]?.name === 'generatePaper') { handleTriggerGeneration(message.toolCall.functionCalls[0].args); endLiveSession(); return; }
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) { setIsAiSpeaking(true); const outputAudioContext = outputAudioContextRef.current!; nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime); const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1); const source = outputAudioContext.createBufferSource(); source.buffer = audioBuffer; source.connect(outputAudioContext.destination); source.addEventListener('ended', () => { sources.delete(source); if(sources.size === 0) setIsAiSpeaking(false); }); source.start(nextStartTime); nextStartTime = nextStartTime + audioBuffer.duration; sources.add(source); }
            if (message.serverContent?.interrupted) { for (const source of sources.values()) source.stop(); sources.clear(); nextStartTime = 0; setIsAiSpeaking(false); }
        },
        onerror: (e: ErrorEvent) => { console.error(e); setCurrentUserText(`An error occurred: ${e.message}. Please try again.`); endLiveSession(); },
        onclose: (e: CloseEvent) => { stream?.getTracks().forEach(track => track.stop()); inputAudioContext.close(); },
      },
      config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.id }}}, systemInstruction, tools: [{ functionDeclarations: [generatePaperFunctionDeclaration] }], inputAudioTranscription: {}, outputAudioTranscription: {} },
    });
  };
  const endLiveSession = () => { sessionPromiseRef.current?.then(session => session.close()); setIsLiveSessionActive(false); setCurrentUserText(''); setCurrentAiText(''); setIsAiSpeaking(false); };

  return ( <> <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*,application/pdf,.txt,.md" /> <div className="relative flex flex-col h-full w-full bg-slate-50 dark:bg-black"> <button onClick={initChat} title="New Chat" className="absolute top-4 left-4 z-20 w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-full shadow-md border dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"> <NewChatIcon className="w-5 h-5 text-slate-600 dark:text-slate-300"/> </button> <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto"> <div className="max-w-3xl mx-auto w-full space-y-6"> {messages.map((msg) => <MessageBubble key={msg.id} message={msg} onSpeak={handleSpeak} />)} {messages.length === 0 && !isBotTyping && <WelcomeScreen onSuggestionClick={(text) => handleSendMessage(text)} />} {isBotTyping && <TypingIndicator />} </div> <div ref={messagesEndRef} /> </div> <div className="sticky bottom-0 w-full pt-2 pb-4 sm:pb-6 bg-gradient-to-t from-slate-50 dark:from-black"> <InputBar userInput={userInput} setUserInput={setUserInput} onSendMessage={() => handleSendMessage(userInput)} isBotTyping={isBotTyping} onAttachmentClick={() => fileInputRef.current?.click()} onVoiceClick={() => setIsVoiceModalOpen(true)} attachedFiles={attachedFiles} onRemoveAttachment={(name) => setAttachedFiles(files => files.filter(f => f.name !== name))} useSearch={useSearch} setUseSearch={setUseSearch} useThinking={useThinking} setUseThinking={setUseThinking} /> </div> </div> {isVoiceModalOpen && <VoiceModeModal onClose={() => setIsVoiceModalOpen(false)} onStart={startLiveSession} />} {isLiveSessionActive && ( <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-2xl flex flex-col items-center justify-center z-50 animate-fade-in p-4"> <div className="relative w-48 h-48 flex items-center justify-center shrink-0"> <div className={`absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full transition-transform duration-500 ${isAiSpeaking ? 'scale-150 animate-pulse opacity-30' : 'scale-100 opacity-20'}`}></div> <div className={`absolute inset-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full transition-transform duration-500 ${isAiSpeaking ? 'scale-125 animate-pulse [animation-delay:0.2s] opacity-40' : 'scale-100 opacity-30'}`}></div> <img src={SSGPT_LOGO_URL} alt="SSGPT Logo" className={`relative w-24 h-24 transition-transform duration-500 ${isAiSpeaking ? 'scale-110' : 'scale-100'}`} /> </div> <div className="w-full max-w-3xl flex-1 overflow-y-auto space-y-4 text-white text-xl my-8 p-4"> {conversationHistory.map(turn => ( <React.Fragment key={turn.id}> {turn.user && <div className="text-right"><span className="px-4 py-2 rounded-2xl inline-block bg-blue-600 rounded-br-none max-w-full break-words">{turn.user}</span></div>} {turn.ai && <div className="text-left"><span className="px-4 py-2 rounded-2xl inline-block bg-slate-700 rounded-bl-none max-w-full break-words">{turn.ai}</span></div>} </React.Fragment> ))} {currentUserText && <div className="text-right"><span className="px-4 py-2 rounded-2xl inline-block bg-blue-600 rounded-br-none opacity-70 max-w-full break-words">{currentUserText}</span></div>} {currentAiText && <div className="text-left"><span className="px-4 py-2 rounded-2xl inline-block bg-slate-700 rounded-bl-none opacity-70 max-w-full break-words">{currentAiText}</span></div>} <div ref={conversationEndRef} /> </div> <button onClick={endLiveSession} className="shrink-0 bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 flex items-center gap-2 shadow-lg transition-transform hover:scale-105"> <StopIcon className="w-6 h-6" /> End Session </button> </div> )} </> ); };

function encode(bytes: Uint8Array) { let binary = ''; const len = bytes.byteLength; for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); } return btoa(binary); }
function decode(base64: string) { const binaryString = atob(base64); const len = binaryString.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); } return bytes; }
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> { const dataInt16 = new Int16Array(data.buffer); const frameCount = dataInt16.length / numChannels; const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate); for (let channel = 0; channel < numChannels; channel++) { const channelData = buffer.getChannelData(channel); for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; } } return buffer; }
function createBlob(data: Float32Array): Blob { const l = data.length; const int16 = new Int16Array(l); for (let i = 0; i < l; i++) { int16[i] = data[i] * 32768; } return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }; }

export default ChatbotInterface;