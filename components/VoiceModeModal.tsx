import React, { useState } from 'react';
import { type VoiceOption } from '../types';

interface VoiceModeModalProps {
    onClose: () => void;
    onStart: (voice: VoiceOption) => void;
}

const VOICES: VoiceOption[] = [
    { id: 'Zephyr', name: 'Zephyr (Deep, Male)' },
    { id: 'Kore', name: 'Kore (Warm, Female)' },
    { id: 'Puck', name: 'Puck (Youthful, Male)' },
    { id: 'Charon', name: 'Charon (Mature, Male)' },
    { id: 'Fenrir', name: 'Fenrir (Strong, Male)' },
];

const VoiceModeModal: React.FC<VoiceModeModalProps> = ({ onClose, onStart }) => {
    const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VOICES[0]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-slate-700">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Start Voice Conversation</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose a voice and start talking to the AI.</p>
                </div>
                <div className="p-6">
                    <label htmlFor="voice-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select a Voice</label>
                    <select
                        id="voice-select"
                        value={selectedVoice.id}
                        onChange={(e) => setSelectedVoice(VOICES.find(v => v.id === e.target.value) || VOICES[0])}
                        className="block w-full rounded-lg border-0 py-2.5 px-3 text-gray-900 dark:text-white bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                    >
                        {VOICES.map(voice => (
                            <option key={voice.id} value={voice.id}>{voice.name}</option>
                        ))}
                    </select>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 font-semibold hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
                    <button onClick={() => onStart(selectedVoice)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Start Talking</button>
                </div>
            </div>
        </div>
    );
};

export default VoiceModeModal;