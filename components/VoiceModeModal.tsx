import React, { useState } from 'react';
import { type VoiceOption } from '../types';

const voices: VoiceOption[] = [
    { id: 'Zephyr', name: 'Zephyr' },
    { id: 'Puck', name: 'Puck' },
    { id: 'Kore', name: 'Kore' },
    { id: 'Fenrir', name: 'Fenrir' },
];

interface VoiceModeModalProps {
    onClose: () => void;
    onStart: (voice: VoiceOption) => void;
}

const VoiceModeModal: React.FC<VoiceModeModalProps> = ({ onClose, onStart }) => {
    const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(voices[0]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                 <>
                    <h3 className="text-2xl font-bold mb-2">Choose a Voice</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">Select the voice you'd like to hear from the AI assistant.</p>
                    <div className="space-y-3">
                        {voices.map(voice => (
                            <div
                                key={voice.id}
                                onClick={() => setSelectedVoice(voice)}
                                className={`p-4 border dark:border-slate-700 rounded-lg cursor-pointer transition-all ${selectedVoice.id === voice.id ? 'ring-2 ring-indigo-500 border-indigo-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <p className="font-semibold text-slate-800 dark:text-slate-200">{voice.name}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                            Cancel
                        </button>
                        <button onClick={() => onStart(selectedVoice)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors">
                            Start Conversation
                        </button>
                    </div>
                </>
            </div>
        </div>
    );
};

export default VoiceModeModal;
