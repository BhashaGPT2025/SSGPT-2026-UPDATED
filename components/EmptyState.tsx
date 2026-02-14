
import React from 'react';

interface EmptyStateProps {
  onGenerateNew: () => void;
}

const EmptyStateIllustration: React.FC = () => (
    <div className="relative w-64 h-64 mb-8">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id="grad1_empty" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" style={{stopColor: 'rgba(129, 140, 248, 0.3)', stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: 'rgba(129, 140, 248, 0)', stopOpacity: 0}} />
                </radialGradient>
                 <linearGradient id="grad2_empty" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#a78bfa'}} />
                    <stop offset="100%" style={{stopColor: '#7c3aed'}} />
                </linearGradient>
            </defs>
            <circle cx="128" cy="128" r="128" fill="url(#grad1_empty)" />
            <path d="M78 206C89.3333 194.5 110.4 175.6 123 181L168 126L116.5 74.5L62 129L78 206Z" className="stroke-slate-300 dark:stroke-slate-600/80" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M129 60.5L181.5 113L167.5 127L115 74.5L129 60.5Z" className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M115 74.5L167.5 127L154.5 140L102 87.5L115 74.5Z" className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M102 87.5L154.5 140L141.5 153L89 100.5L102 87.5Z" className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M141.5 153L89 100.5L62 127.5L123 181L141.5 153Z" className="fill-slate-50 dark:fill-slate-700/50 stroke-slate-400 dark:stroke-slate-500" strokeWidth="2" strokeLinejoin="round"/>
             <path d="M173 50L198 75" stroke="url(#grad2_empty)" strokeWidth="5" strokeLinecap="round" className="opacity-80"/>
             <path d="M205 82L225 102" stroke="url(#grad2_empty)" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 8" className="opacity-80"/>
            <circle cx="70" cy="70" r="12" className="fill-purple-300/50 dark:fill-purple-900/50" />
            <circle cx="180" cy="190" r="18" className="fill-indigo-300/50 dark:fill-indigo-900/50" />
        </svg>
    </div>
);


const EmptyState: React.FC<EmptyStateProps> = ({ onGenerateNew }) => {
    return (
        <div className="text-center max-w-lg mx-auto p-10 flex flex-col items-center justify-center animate-fade-in-up mt-10">
            <EmptyStateIllustration />
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">Your Library is Ready!</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-sm">
                This is where all your generated question papers will live. Let's create your first one and bring your teaching to the next level.
            </p>
            <button
                onClick={onGenerateNew}
                className="mt-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 px-8 rounded-lg hover:shadow-2xl hover:shadow-indigo-500/30 transform hover:scale-105 transition-all text-lg"
            >
                ✨ Create Your First Paper
            </button>
        </div>
    );
};

export default EmptyState;
