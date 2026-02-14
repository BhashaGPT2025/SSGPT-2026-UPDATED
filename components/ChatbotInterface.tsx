import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { GoogleGenAI, Chat, FunctionDeclaration, Type, LiveServerMessage, Modality, Blob, Part, GenerateContentResponse } from "@google/genai";
import { type FormData, QuestionType, Difficulty, Taxonomy, type VoiceOption } from '../types';
import { generateChatResponseStream, generateTextToSpeech } from '../services/geminiService';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { AttachmentIcon } from './icons/AttachmentIcon';
import { VoiceIcon } from './icons/VoiceIcon';
import { StopIcon } from './icons/StopIcon';
import { MicIcon } from './icons/MicIcon';
import VoiceModeModal from './VoiceModeModal';
import { SSGPT_LOGO_URL } from '../constants';

type Message = { id: string; sender: 'bot' | 'user'; text: string; grounding?: any[] };
const SendIcon = (props: any) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="currentColor" {...props}><path d="M3.4 20.4l17.45-7.48c.81-.35.81-1.49 0-1.84L3.4 3.6c-.66-.29-1.39.2-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"></path></svg>);

const systemInstruction = `You are SSGPT. Help educators create exams. 
STRICT MATH: For any mathematical content, symbols (like multiply/divide), or formulas, you MUST use LaTeX wrapped in $ delimiters. 
Example: "Calculate $5 \\times 4$". 
ALWAYS use double backslashes for commands in your thoughts. 
NEVER use plain text math. Call 'generatePaper' when all details are ready.`;

const generatePaperTool: FunctionDeclaration = { 
  name: 'generatePaper', 
  description: 'Generate paper once all details are gathered.', 
  parameters: { 
    type: Type.OBJECT, 
    properties: { 
      schoolName: { type: Type.STRING }, className: { type: Type.STRING }, subject: { type: Type.STRING }, topics: { type: Type.STRING }, 
      timeAllowed: { type: Type.STRING }, language: { type: Type.STRING },
      questionDistribution: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, count: { type: Type.INTEGER }, marks: { type: Type.INTEGER }, difficulty: { type: Type.STRING }, taxonomy: { type: Type.STRING } }, required: ['type', 'count', 'marks'] } },
    }, 
    required: ['schoolName', 'className', 'subject', 'topics', 'questionDistribution', 'language', 'timeAllowed'] 
  } 
};

const MessageBubble = memo(({ message }: { message: Message }) => {
    const bubbleRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (bubbleRef.current && (window as any).renderMathInElement) {
            try {
                (window as any).renderMathInElement(bubbleRef.current, { 
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false},
                        {left: '\\(', right: '\\)', display: false},
                        {left: '\\[', right: '\\]', display: true}
                    ], 
                    throwOnError: false 
                });
            } catch (err) {
                console.warn("Math rendering failed in bubble", err);
            }
        }
    }, [message.text]);

    return (
        <div className={`flex items-start gap-3 w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.sender === 'bot' && <img src={SSGPT_LOGO_URL} alt="AI" className="w-8 h-8 rounded-full flex-shrink-0" />}
            <div ref={bubbleRef} className={`px-4 py-3 rounded-2xl max-w-xl shadow-md border ${message.sender === 'bot' ? 'bg-white dark:bg-slate-800' : 'bg-green-100 dark:bg-green-900/40 text-slate-800 dark:text-slate-200'}`}>
                <div className="prose-chat text-sm" dangerouslySetInnerHTML={{ __html: message.text.replace(/\n/g, '<br/>') }} />
            </div>
        </div>
    );
});

const ChatbotInterface: React.FC<{ onGenerate: (formData: FormData) => void }> = ({ onGenerate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiLiveTranscript, setAiLiveTranscript] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  let nextStartTime = 0;

  useEffect(() => {
    if (!process.env.API_KEY) return;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    setChat(ai.chats.create({ 
        model: 'gemini-3-pro-preview', 
        config: { systemInstruction, tools: [{ functionDeclarations: [generatePaperTool] }] } 
    }));
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isBotTyping || !chat) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text }]);
    setUserInput('');
    setIsBotTyping(true);
    try {
      const responseStream = await generateChatResponseStream(chat, [{ text }], false, false);
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMsgId, sender: 'bot', text: '' }]);
      let fullText = "";
      for await (const chunk of responseStream) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: fullText } : m));
        }
        if (chunk.functionCalls?.length) {
            onGenerate(chunk.functionCalls[0].args as FormData);
        }
      }
    } catch (e) { console.error(e); }
    finally { setIsBotTyping(false); }
  };

  const startLiveSession = async (voice: VoiceOption) => {
    setIsVoiceModalOpen(false); setIsLiveSessionActive(true);
    setTranscript(''); setAiLiveTranscript('');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const inputCtx = new AudioContext({ sampleRate: 16000 });
    
    sessionPromiseRef.current = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          const source = inputCtx.createMediaStreamSource(stream);
          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
            sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(processor); processor.connect(inputCtx.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) setTranscript(t => t + message.serverContent!.inputTranscription!.text);
          if (message.serverContent?.outputTranscription) setAiLiveTranscript(t => t + message.serverContent!.outputTranscription!.text);
          if (message.serverContent?.turnComplete) { setTranscript(''); setAiLiveTranscript(''); }
          
          const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            const outCtx = outputAudioContextRef.current!;
            nextStartTime = Math.max(nextStartTime, outCtx.currentTime);
            const buffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
            const source = outCtx.createBufferSource();
            source.buffer = buffer; source.connect(outCtx.destination);
            source.start(nextStartTime); nextStartTime += buffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }
          if (message.toolCall?.functionCalls?.length) {
              onGenerate(message.toolCall.functionCalls[0].args as FormData);
              endLiveSession();
          }
        },
        onclose: () => { stream.getTracks().forEach(t => t.stop()); inputCtx.close(); setIsLiveSessionActive(false); }
      },
      config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice.id } } }, systemInstruction, tools: [{ functionDeclarations: [generatePaperTool] }], inputAudioTranscription: {}, outputAudioTranscription: {} }
    });
  };

  const endLiveSession = () => {
    setIsLiveSessionActive(false);
    sessionPromiseRef.current?.then(s => s.close());
  };

  const handleDictate = async () => {
    if (isDictating) {
        sessionPromiseRef.current?.then(s => s.close());
        setIsDictating(false);
        return;
    }
    setIsDictating(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const inputCtx = new AudioContext({ sampleRate: 16000 });
    sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
            onopen: () => {
                const source = inputCtx.createMediaStreamSource(stream);
                const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                processor.onaudioprocess = (e) => {
                    const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
                    sessionPromiseRef.current?.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                };
                source.connect(processor); processor.connect(inputCtx.destination);
            },
            onmessage: (m) => { if (m.serverContent?.inputTranscription) setUserInput(p => p + m.serverContent!.inputTranscription!.text); },
            onclose: () => { stream.getTracks().forEach(t => t.stop()); inputCtx.close(); setIsDictating(false); }
        },
        config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, systemInstruction: "Transcribe ONLY. Be silent." }
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-black overflow-hidden relative">
      <div className="flex-1 p-4 overflow-y-auto space-y-6 chat-scrollbar">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.map(m => <MessageBubble key={m.id} message={m} />)}
          {isBotTyping && <div className="animate-pulse text-slate-400 text-xs pl-12">AI is writing...</div>}
        </div>
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-800">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage(userInput)} placeholder="Message SSGPT..." className="flex-1 p-3 rounded-xl border dark:border-slate-700 bg-transparent text-sm" />
          <button onClick={handleDictate} className={`p-3 rounded-xl transition-colors ${isDictating ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`} title="Dictate"><MicIcon className="w-5 h-5"/></button>
          <button onClick={() => setIsVoiceModalOpen(true)} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg"><VoiceIcon className="w-5 h-5"/></button>
          <button onClick={() => handleSendMessage(userInput)} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg"><SendIcon className="w-5 h-5"/></button>
        </div>
      </div>
      {isVoiceModalOpen && <VoiceModeModal onClose={() => setIsVoiceModalOpen(false)} onStart={startLiveSession} />}
      {isLiveSessionActive && (
        <div className="fixed inset-0 bg-slate-950/95 z-[100] flex flex-col items-center justify-center p-8 animate-fade-in text-center">
          <div className="relative mb-12">
            <div className="w-40 h-40 bg-indigo-500/20 rounded-full animate-ping absolute inset-0" />
            <div className="w-40 h-40 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/10 relative z-10">
                <VoiceIcon className="w-16 h-16 text-white" />
            </div>
          </div>
          <div className="max-w-md space-y-4">
            <p className="text-indigo-400 text-xl font-bold italic h-8">{transcript || "Listening..."}</p>
            <p className="text-white text-lg opacity-80 h-12 overflow-hidden">{aiLiveTranscript}</p>
          </div>
          <button onClick={endLiveSession} className="mt-12 px-12 py-4 bg-red-600 text-white rounded-full font-black text-lg hover:scale-105 transition-transform shadow-xl shadow-red-900/40">End Voice Mode</button>
        </div>
      )}
    </div>
  );
};

// Encoding/Decoding helpers
const createBlob = (d: Float32Array): Blob => { 
    const i16 = new Int16Array(d.length); 
    for(let i=0; i<d.length; i++) i16[i] = d[i]*32768; 
    return { 
        data: btoa(Array.from(new Uint8Array(i16.buffer)).map(c => String.fromCharCode(c)).join('')), 
        mimeType: 'audio/pcm;rate=16000' 
    }; 
};
const decode = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, rate: number, ch: number) { 
    const i16 = new Int16Array(data.buffer); 
    const buf = ctx.createBuffer(ch, i16.length/ch, rate); 
    for(let c=0; c<ch; c++) { 
        const d = buf.getChannelData(c); 
        for(let i=0; i<d.length; i++) d[i] = i16[i*ch+c]/32768.0; 
    } 
    return buf; 
}

export default ChatbotInterface;