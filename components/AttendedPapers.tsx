import React from 'react';
import { type QuestionPaperData } from '../types';
import { PaperIcon } from './icons/PaperIcon';
import { ClockIcon } from './icons/ClockIcon';

interface AttendedPapersProps {
    papers: QuestionPaperData[];
    onViewPaper: (paper: QuestionPaperData) => void;
}

const PaperCard: React.FC<{paper: QuestionPaperData, onClick: () => void}> = ({ paper, onClick }) => (
    <button 
        onClick={onClick}
        className="group relative w-full text-left bg-white dark:bg-slate-800/50 rounded-2xl shadow-lg border dark:border-slate-700/50 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 hover:border-indigo-500/50 dark:hover:shadow-indigo-500/10 overflow-hidden p-5"
    >
        <div className="flex-grow space-y-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center">
                    <PaperIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate" title={paper.subject}>{paper.subject}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{paper.className} - {paper.totalMarks} Marks</p>
                </div>
             </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate font-medium pt-2">{paper.schoolName}</p>
             <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                <ClockIcon className="w-4 h-4" />
                <span>Viewed on {new Date(paper.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
    </button>
);


const AttendedPapers: React.FC<AttendedPapersProps> = ({ papers, onViewPaper }) => {
    return (
        <div className="max-w-7xl mx-auto animate-fade-in-up">
            <header className="mb-10">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">My Attended Papers</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Here are all the papers you've viewed.</p>
            </header>

            {papers.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white dark:bg-slate-800/50 rounded-2xl border-2 border-dashed dark:border-slate-700/50">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No Papers Yet</h3>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">When you view a paper from a link, it will appear here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {papers.map((paper, index) => (
                        <div key={paper.id} className="animate-stagger-in" style={{ animationDelay: `${index * 50}ms` }}>
                            <PaperCard paper={paper} onClick={() => onViewPaper(paper)} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AttendedPapers;