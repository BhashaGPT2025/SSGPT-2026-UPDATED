import React, { useState } from 'react';
import { type User, type Page } from '../types';

interface StudentDashboardProps {
    user: User;
    onNavigate: (page: Page) => void;
    onViewPaperFromUrl: (url: string) => void;
}

const ActionCard: React.FC<{title: string, description: string, onClick: () => void}> = ({ title, description, onClick }) => (
    <button onClick={onClick} className="group text-left p-6 bg-white dark:bg-slate-800/50 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-700/50 hover:border-indigo-500/50 dark:hover:border-indigo-400/50 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{description}</p>
        <span className="mt-4 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline">
            Go &rarr;
        </span>
    </button>
);

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onNavigate, onViewPaperFromUrl }) => {
    const [paperUrl, setPaperUrl] = useState('');
    const userName = user.email.split('@')[0];
    const capitalizedUserName = userName.charAt(0).toUpperCase() + userName.slice(1);

    const handleViewClick = () => {
        if (paperUrl.trim()) {
            onViewPaperFromUrl(paperUrl);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up">
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Hello, {capitalizedUserName}!</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Ready to start learning? Here are your options.</p>
            </header>
            
            <div className="mb-10 bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border dark:border-slate-700/50">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Have a paper link?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Paste a link shared by your teacher to view and save it.</p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <input 
                        type="text" 
                        value={paperUrl} 
                        onChange={e => setPaperUrl(e.target.value)} 
                        placeholder="Paste link here..."
                        className="flex-grow block w-full rounded-lg border-0 py-2.5 px-4 text-gray-900 dark:text-white bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                    />
                    <button 
                        onClick={handleViewClick}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md disabled:bg-indigo-400"
                        disabled={!paperUrl.trim()}
                    >
                        View Paper
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ActionCard 
                    title="Practice Test Generator"
                    description="Create a custom practice test on any subject to sharpen your skills."
                    onClick={() => onNavigate('practice')}
                />
                 <ActionCard 
                    title="Assigned Papers"
                    description="View and complete exams that have been assigned to you by your teacher."
                    onClick={() => onNavigate('assignedPapers')}
                />
                 <ActionCard 
                    title="My Attended Papers"
                    description="Review your performance on papers you have already completed."
                    onClick={() => onNavigate('attendedPapers')}
                />
                 <ActionCard 
                    title="Settings"
                    description="Manage your account preferences and settings."
                    onClick={() => onNavigate('settings')}
                />
            </div>
        </div>
    );
};

export default StudentDashboard;