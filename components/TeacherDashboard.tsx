
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { type QuestionPaperData, type User, type Page } from '../types';
import { PaperIcon } from './icons/PaperIcon';
import { EditIcon } from './icons/EditIcon';
import { ShareIcon } from './icons/ShareIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import ShareModal from './ShareModal';

interface TeacherDashboardProps {
    user: User;
    papers: QuestionPaperData[];
    onNavigate: (page: Page) => void;
    onEditPaper: (paper: QuestionPaperData) => void;
    onRenamePaper: (paperId: string, newSubject: string) => void;
    onDuplicatePaper: (paperId: string) => void;
    onDeletePaper: (paperId: string) => void;
}

// --- Local Icons ---
const KebabIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg> );
const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg> );

const StatCard: React.FC<{icon: React.ReactNode, label: string, value: string | number}> = ({ icon, label, value }) => (
    <div className="bg-white dark:bg-slate-800/50 p-5 rounded-2xl shadow-lg border dark:border-slate-700/50 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const PaperActionsMenu: React.FC<{onEdit: () => void, onRename: () => void, onDuplicate: () => void, onShare: () => void, onDelete: () => void}> = ({ onEdit, onRename, onDuplicate, onShare, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    const handleAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    const menuItems = [
        { label: 'Edit', icon: <EditIcon className="w-4 h-4" />, action: onEdit },
        { label: 'Rename', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>, action: onRename },
        { label: 'Duplicate', icon: <CopyIcon className="w-4 h-4" />, action: onDuplicate },
        { label: 'Share', icon: <ShareIcon className="w-4 h-4" />, action: onShare },
    ];

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(o => !o)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <KebabIcon />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border dark:border-slate-700 p-2 z-20 animate-zoom-in">
                    <ul className="space-y-1">
                        {menuItems.map(item => (
                            <li key={item.label}>
                                <button onClick={() => handleAction(item.action)} className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                    {item.icon}
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        ))}
                        <li><div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div></li>
                        <li>
                            <button onClick={() => handleAction(onDelete)} className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                <DeleteIcon className="w-4 h-4" />
                                <span>Delete</span>
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};


const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, papers, onNavigate, onEditPaper, onRenamePaper, onDuplicatePaper, onDeletePaper }) => {
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [currentPaperToShare, setCurrentPaperToShare] = useState<QuestionPaperData | null>(null);
    
    const userName = user.email.split('@')[0];
    const capitalizedUserName = userName.charAt(0).toUpperCase() + userName.slice(1);

    const totalQuestions = useMemo(() => papers.reduce((sum, paper) => sum + paper.questions.length, 0), [papers]);
    
    const handleOpenShareModal = (paper: QuestionPaperData) => {
        setCurrentPaperToShare(paper);
        setIsShareModalOpen(true);
    };

    const shareUrl = useMemo(() => {
        if (!currentPaperToShare) return '';
        try {
            const jsonString = JSON.stringify(currentPaperToShare);
            const bytes = new TextEncoder().encode(jsonString);
            const binaryString = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
            const base64String = btoa(binaryString);
            return `${window.location.origin}${window.location.pathname}#paper/${base64String}`;
        } catch (error) {
            console.error("Failed to create share link:", error);
            return '';
        }
    }, [currentPaperToShare]);

    return (
        <div className="max-w-7xl mx-auto animate-fade-in-up">
             <header className="mb-10">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Welcome back, {capitalizedUserName}!</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Here's an overview of your question paper library.</p>
             </header>

             <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                 <StatCard icon={<PaperIcon className="w-6 h-6"/>} label="Total Papers" value={papers.length} />
                 <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>} label="Total Questions" value={totalQuestions} />
                 <button onClick={() => onNavigate('generate')} className="group bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg flex flex-col items-center justify-center p-5 text-center transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/30 transform hover:-translate-y-1">
                    <span className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    </span>
                    <p className="font-bold text-lg">Create New Paper</p>
                 </button>
             </section>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border dark:border-slate-700/50">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <button onClick={() => onNavigate('generate')} className="w-full text-left p-3 rounded-lg bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold">Start from Scratch</button>
                        <button onClick={() => onNavigate('creationHub')} className="w-full text-left p-3 rounded-lg bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold">Import & Format</button>
                        <button onClick={() => onNavigate('myPapers')} className="w-full text-left p-3 rounded-lg bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800 font-semibold">View All My Papers</button>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl shadow-lg border dark:border-slate-700/50">
                     <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Recent Papers</h3>
                     {papers.length > 0 ? (
                        <div className="space-y-3">
                            {papers.slice(0, 3).map(paper => (
                                <div key={paper.id} className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900/50 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{paper.subject}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{paper.className}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <PaperActionsMenu
                                            onEdit={() => onEditPaper(paper)}
                                            onRename={() => alert("Rename available on 'My Papers' page.")}
                                            onDuplicate={() => onDuplicatePaper(paper.id)}
                                            onShare={() => handleOpenShareModal(paper)}
                                            onDelete={() => onDeletePaper(paper.id)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                     ) : (
                        <p className="text-slate-500 dark:text-slate-400">No papers created yet.</p>
                     )}
                </div>
             </div>
             {currentPaperToShare && (
                 <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    shareUrl={shareUrl}
                    paperTitle={currentPaperToShare.subject}
                />
            )}
        </div>
    );
};

export default TeacherDashboard;