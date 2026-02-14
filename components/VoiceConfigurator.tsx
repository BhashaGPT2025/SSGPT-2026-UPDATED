import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { MicIcon } from './icons/MicIcon';
import { StopIcon } from './icons/StopIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { extractConfigFromTranscript } from '../services/geminiService';

export const VoiceConfigurator: React.FC<{ onConfigExtracted: (config: any) => void }> = ({ onConfigExtracted }) => {
    const [isActive, setIsActive] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [transcript, setTranscript] = useState('');
    const sessionPromiseRef = useRef<Promise<any> | null>(null);

    const startSession = async () => {
        setIsActive(true); setTranscript('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const inputAudioContext = new AudioContext({ sampleRate: 16000 });
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                callbacks: {
                    onopen: () => {
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const processor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        processor.onaudioprocess = (e) => {
                            const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
                            sessionPromiseRef.current?.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(processor); processor.connect(inputAudioContext.destination);
                    },
                    onmessage: (m) => {
                        if (m.serverContent?.inputTranscription) {
                            setTranscript(t => t + ' ' + m.serverContent!.inputTranscription!.text);
                        }
                    },
                    onerror: (e) => console.error(e),
                    onclose: () => { stream.getTracks().forEach(t => t.stop()); inputAudioContext.close(); }
                },
                config: { 
                    responseModalities: [Modality.AUDIO], 
                    inputAudioTranscription: {}, 
                    systemInstruction: "Transcribe the user requirements for an exam accurately. Just capture the details like subject, grade, topics, and marks distribution." 
                }
            });
        } catch (err) { console.error(err); setIsActive(false); }
    };

    const stopSession = async () => {
        sessionPromiseRef.current?.then(s => s.close()); setIsActive(false);
        if (transcript.trim()) {
            setIsExtracting(true);
            try {
                const config = await extractConfigFromTranscript(transcript);
                if (config) onConfigExtracted(config);
            } catch (e) { alert("Failed to extract configuration."); }
            finally { setIsExtracting(false); }
        }
    };

    const createBlob = (data: Float32Array): Blob => {
        const i16 = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) i16[i] = data[i] * 32768;
        return { data: btoa(Array.from(new Uint8Array(i16.buffer)).map(c => String.fromCharCode(c)).join('')), mimeType: 'audio/pcm;rate=16000' };
    };

    return (
        <div className="relative">
            <button type="button" onClick={isActive ? stopSession : startSession} disabled={isExtracting} className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-lg ${isActive ? 'bg-red-500 text-white' : 'bg-white dark:bg-slate-700 text-indigo-600'}`}>
                {isExtracting ? <SpinnerIcon className="w-5 h-5" /> : isActive ? <StopIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
                {isExtracting ? 'Applying...' : isActive ? 'Listening...' : 'Voice Builder'}
            </button>
            {isActive && <div className="absolute top-full left-0 mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border w-64 z-50 animate-fade-in text-sm italic">{transcript || 'Start speaking...'}</div>}
        </div>
    );
};