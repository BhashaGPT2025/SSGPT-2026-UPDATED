
import React from 'react';

const AssignedPapers: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up text-center">
             <div className="bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-2xl border dark:border-slate-700/50">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Assigned Papers</h1>
                <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                    This feature is coming soon!
                </p>
                <p className="mt-2 text-slate-500 dark:text-slate-500">
                    Here you will find question papers assigned to you by your teacher.
                </p>
             </div>
        </div>
    );
};

export default AssignedPapers;
