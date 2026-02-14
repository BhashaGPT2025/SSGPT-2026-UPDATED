
import React, { useState } from 'react';
import { type Question, QuestionType } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface AnswerKeyProps {
    questions: Question[];
    onClose: () => void;
    subject: string;
    className: string;
}

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);


const renderAnswer = (question: Question) => {
    if (question.type === QuestionType.MatchTheFollowing && typeof question.answer === 'object' && question.answer !== null) {
        return (
            <ul className="list-disc pl-5">
                {Object.entries(question.answer).map(([key, value]) => (
                    <li key={key}>{key} &rarr; {value}</li>
                ))}
            </ul>
        );
    }
    
    // Handle all other answer types
    const answer = question.answer;
    
    if (answer === null || answer === undefined || (typeof answer === 'string' && answer.trim() === '')) {
         return <p className="inline italic text-slate-500 dark:text-slate-400">Answer not provided</p>;
    }
    
    // For string, number, boolean, etc.
    const answerString = String(answer);

    return <p className="inline whitespace-pre-wrap">{answerString}</p>;
};

const AnswerKey: React.FC<AnswerKeyProps> = ({ questions, subject, className, onClose }) => {
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [showQuestions, setShowQuestions] = useState(true);
    
    const getFileName = () => `Answer_Key_${subject.replace(/\s+/g, '_')}_${className.replace(/\s+/g, '_')}`;

    const handleExportText = () => {
        setIsExporting(true);
        try {
            const textContent = questions.map(q => {
                let answerText = '';
                if (q.type === QuestionType.MatchTheFollowing && typeof q.answer === 'object' && q.answer !== null) {
                    answerText = Object.entries(q.answer).map(([key, value]) => `  ${key} -> ${value}`).join('\n');
                } else {
                    const answer = q.answer;
                    if (answer === null || answer === undefined || (typeof answer === 'string' && answer.trim() === '')) {
                        answerText = 'Answer not provided';
                    } else {
                        answerText = String(answer);
                    }
                }
                const questionLine = showQuestions ? `Q${q.questionNumber}. ${q.questionText}\n` : `Q${q.questionNumber}. `;
                return `${questionLine}Ans: ${answerText}\n\n`;
            }).join('');

            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${getFileName()}.txt`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) { console.error("Error exporting Text:", error); alert("Sorry, there was an error exporting the text file.");
        } finally { setIsExporting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Answer Key</h2>
                        <div className="flex items-center gap-2 mt-2">
                            <label htmlFor="show-questions-toggle" className="text-sm font-medium text-slate-600 dark:text-slate-400">Show Questions</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="show-questions-toggle" className="sr-only peer" checked={showQuestions} onChange={() => setShowQuestions(s => !s)} />
                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {questions.map(q => (
                             <div key={q.questionNumber} className="border-b dark:border-slate-700 pb-4 last:border-b-0">
                                {showQuestions && <p className="font-semibold text-slate-800 dark:text-slate-200">Q${q.questionNumber}. ${q.questionText}</p>}
                                <div className={`mt-2 text-green-700 dark:text-green-400 ${showQuestions ? 'pl-4' : 'pl-0'}`}>
                                    {!showQuestions && <span className="font-semibold text-slate-800 dark:text-slate-200">Q${q.questionNumber}. </span>}
                                    <span className="font-bold">Ans: </span>
                                    {renderAnswer(q)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="p-4 border-t dark:border-slate-700 flex justify-end shrink-0 gap-3">
                    <button onClick={handleExportText} disabled={isExporting} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors w-32">
                        {isExporting ? <SpinnerIcon className="w-5 h-5"/> : 'Export as Text'}
                    </button>
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnswerKey;
