import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type, LiveServerMessage, Modality, Blob, Part } from "@google/genai";
import { type FormData, QuestionType, Difficulty, Taxonomy, type VoiceOption, type QuestionDistributionItem } from '../types';
import { rewriteTranscript } from '../services/geminiService';
import { MicIcon } from './icons/MicIcon';
import { StopIcon } from './icons/StopIcon';

// --- ICONS ---
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const MuteIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;

// --- TOOL DECLARATION ---
const generatePaperFunctionDeclaration: FunctionDeclaration = { name: 'generatePaper', description: 'Call this function ONLY when all necessary details for creating a question paper have been collected.', parameters: { type: Type.OBJECT, properties: { schoolName: { type: Type.STRING }, className: { type: Type.STRING }, subject: { type: Type.STRING }, topics: { type: Type.STRING }, timeAllowed: { type: Type.STRING }, questionDistribution: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING, enum: Object.values(QuestionType) }, count: { type: Type.INTEGER }, marks: { type: Type.INTEGER }, difficulty: { type: Type.STRING, enum: Object.values(Difficulty) }, taxonomy: { type: Type.STRING, enum: Object.values(Taxonomy) }, }, required: ['type', 'count', 'marks'] } }, language: { type: Type.STRING }, }, required: ['className', 'subject', 'topics', 'questionDistribution', 'timeAllowed'] } };
const systemInstruction = `You are an expert AI assistant for educators. Your primary goal is to help them create a question paper by having a natural conversation. You MUST collect all the necessary details: Class, Subject, Topics, Time Allowed, and a complete Question Distribution (including question type, count, and marks for each). Once all details are gathered, you MUST use the 'generatePaper' tool. Be conversational and guide the user through the process.`;

// --- AUDIO HELPERS ---
const encode = (bytes: Uint8Array) => { let binary = ''; const len = bytes.byteLength; for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); } return btoa(binary); };
const decode = (base64: string) => { const binaryString = atob(base64); const len = binaryString.length; const bytes = new Uint8Array(len); for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); } return bytes; };
async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> { const dataInt16 = new Int16Array(data.buffer); const frameCount = dataInt16.length; const buffer = ctx.createBuffer(1, frameCount, 24000); const channelData = buffer.getChannelData(0); for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i] / 32768.0; } return buffer; };
const createBlob = (data: Float32Array): Blob => { const int16 = new Int16Array(data.length); for (let i = 0; i < data.length; i++) { int16[i] = data[i] * 32768; } return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }; };

// --- MAIN COMPONENT ---
const VoiceAssistant: React.FC<{ onFormReady: (formData: FormData) => void }> = ({ onFormReady }) => {
    const [uiState, setUiState] = useState<'minimized' | 'full'>('minimized');
    const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const [rawTranscript, setRawTranscript] = useState('');
    const [displayTranscript, setDisplayTranscript] = useState('Listening...');
    const [isMuted, setIsMuted] = useState(false);

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    let nextStartTime = 0;
    
    const startSession = useCallback(async () => {
        if (!process.env.API_KEY) { setDisplayTranscript("API Key not configured."); return; }
        setVoiceState('listening'); setDisplayTranscript('Listening...'); setRawTranscript('');
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-25',
                callbacks: {
                    onopen: () => {
                        const source = audioContextRef.current!.createMediaStreamSource(stream);
                        const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        processor.onaudioprocess = (e) => {
                            if (isMuted) return;
                            const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
                            sessionPromiseRef.current?.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(processor);
                        processor.connect(audioContextRef.current!.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        if (msg.serverContent?.inputTranscription) {
                            setRawTranscript(msg.serverContent.inputTranscription.text);
                            setDisplayTranscript(msg.serverContent.inputTranscription.text);
                        }
                        if (msg.serverContent?.turnComplete) {
                            setVoiceState('processing');
                            setDisplayTranscript('Processing...');
                            const finalTranscript = rawTranscript;
                            if(finalTranscript.trim()) {
                                const rewritten = await rewriteTranscript(finalTranscript);
                                setDisplayTranscript(rewritten);
                            }
                        }
                        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData) {
                            setVoiceState('speaking');
                            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current!);
                            const source = outputAudioContextRef.current!.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current!.destination);
                            
                            nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current!.currentTime);
                            source.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                            
                            audioSourcesRef.current.add(source);
                            source.onended = () => {
                                audioSourcesRef.current.delete(source);
                                if (audioSourcesRef.current.size === 0) setVoiceState('listening');
                            };
                        }
                        if (msg.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(s => s.stop());
                            audioSourcesRef.current.clear();
                            nextStartTime = 0;
                        }
                        if (msg.toolCall?.functionCalls?.[0]?.name === 'generatePaper') {
                            setVoiceState('processing');
                            const args = msg.toolCall.functionCalls[0].args;
                            const totalMarks = (args.questionDistribution || []).reduce((acc: number, item: any) => acc + (item.count * item.marks), 0);
                            const formData = { ...args, totalMarks } as FormData;
                            onFormReady(formData);
                            setUiState('minimized');
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error(e);
                        setDisplayTranscript(`Error: ${e.message}`);
                        setVoiceState('idle');
                    },
                    onclose: () => {
                        mediaStreamRef.current?.getTracks().forEach(t => t.stop());
                        audioContextRef.current?.close();
                        outputAudioContextRef.current?.close();
                    }
                },
                config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, tools: [{ functionDeclarations: [generatePaperFunctionDeclaration] }], systemInstruction }
            });

        } catch (err) {
            console.error(err);
            setDisplayTranscript("Microphone access denied.");
            setVoiceState('idle');
        }
    }, [isMuted, onFormReady, rawTranscript]);

    const stopSession = useCallback(() => {
        sessionPromiseRef.current?.then(s => s.close());
        sessionPromiseRef.current = null;
        setVoiceState('idle');
    }, []);

    useEffect(() => {
        if (uiState === 'full' && voiceState === 'idle') {
            startSession();
        } else if (uiState === 'minimized' && voiceState !== 'idle') {
            stopSession();
        }
        return () => { if (voiceState !== 'idle') stopSession(); };
    }, [uiState]);

    if (uiState === 'minimized') {
        return (
            <button 
                onClick={() => setUiState('full')}
                className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-pulse hover:animate-none hover:scale-110 transition-transform z-50"
            >
                <MicIcon className="w-7 h-7 text-white" />
            </button>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-2xl z-[100] flex flex-col items-center justify-between p-8 animate-fade-in">
            <div />
            <div className="flex flex-col items-center justify-center text-white text-center">
                 <div className="relative w-36 h-36 flex items-center justify-center">
                    {/* Orb Animations */}
                    <div className={`absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full transition-all duration-500 ${voiceState === 'speaking' ? 'animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''} ${voiceState === 'listening' ? 'animate-pulse' : ''}`} style={{ animationDelay: '0.2s', opacity: 0.3 }}></div>
                    <div className={`absolute inset-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full transition-all duration-500 ${voiceState === 'speaking' ? 'animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}`} style={{ opacity: 0.5 }}></div>
                    <div className="absolute inset-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full shadow-2xl shadow-purple-500/50"></div>
                </div>
                <div className="mt-8 min-h-[64px]">
                    <p key={displayTranscript} className="text-2xl font-medium text-slate-200 max-w-xl animate-fade-in-up">{displayTranscript}</p>
                </div>
            </div>

            <div className="w-full max-w-xs flex justify-around items-center">
                <button onClick={() => setIsMuted(!isMuted)} className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500/80 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
                    {isMuted ? <MuteIcon /> : <MicIcon />}
                </button>
                <button onClick={() => setUiState('minimized')} className="p-5 bg-red-600 text-white rounded-full shadow-lg">
                    <StopIcon className="w-8 h-8"/>
                </button>
                <div className="w-16 h-16" />
            </div>
        </div>
    );
};

export default VoiceAssistant;
