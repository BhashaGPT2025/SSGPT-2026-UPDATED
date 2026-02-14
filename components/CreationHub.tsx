import React, { useRef, useState } from 'react';
import { type Part } from '@google/genai';
import { Page } from '../types';

const CreationHub = ({ onNavigate, onStartAnalysis, onStartImageAnalysis }: { onNavigate: (page: Page) => void; onStartAnalysis: (text: string) => void; onStartImageAnalysis: (images: Part[]) => void; }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const filePromises = Array.from(files).map((file: File) => {
      return new Promise<Part>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve({
          inlineData: {
            mimeType: file.type,
            data: (e.target.result as string).split(',')[1]
          }
        });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    try {
      const imageParts = await Promise.all(filePromises);
      onStartImageAnalysis(imageParts);
    } catch (error) {
        console.error("Error reading files:", error);
        alert("There was an error processing your files.");
    }
    
    if (event.target) event.target.value = ''; // Reset file input
  };
  
  const handleAnalyzePastedText = () => {
    if (!pastedText.trim()) {
      return;
    }
    onStartAnalysis(pastedText);
    setIsPasteModalOpen(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 animate-fade-in-up">
        {isPasteModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setIsPasteModalOpen(false)}>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Paste Your Questions</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">Paste your content below. The AI will analyze it and help you structure it into a formal question paper.</p>
                    <textarea
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Example: 1. What is the capital of France? (2 marks)..."
                        className="w-full h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none text-sm"
                    />
                    <div className="mt-6 flex justify-end gap-3">
                        <button onClick={() => setIsPasteModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"> Cancel </button>
                        <button onClick={handleAnalyzePastedText} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"> Analyze with AI </button>
                    </div>
                </div>
            </div>
        )}
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept="image/*"
        />
        <div className="text-center">
            <h1 className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">Create with AI</h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">How would you like to get started?</p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
            <CreationCard
                title="Paste the questions"
                description="Paste your preferred questions and let our AI handle the formatting and the rest for you."
                onClick={() => setIsPasteModalOpen(true)}
            />
            <CreationCard
                title="Fill the form"
                description="Fill in the detailed form to get the best paper you want."
                onClick={() => onNavigate('generate')}
            />
             <CreationCard
                title="Upload your handwritten questions"
                description="Upload images of handwritten questions and let our AI handle the rest for you."
                onClick={handleImportClick}
            />
        </div>
    </div>
  );
};

const CreationCard = ({ title, description, onClick }: { title: string; description: string; onClick: () => void; }) => {
    return (
        <button
            onClick={onClick}
            className="group text-left p-6 bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/50 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-start"
        >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 flex-grow">{description}</p>
        </button>
    );
};

export default CreationHub;