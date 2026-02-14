
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { type QuestionPaperData, type User } from '../types';
import EmptyState from './EmptyState';
import { PaperIcon } from './icons/PaperIcon';
import { ClockIcon } from './icons/ClockIcon';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';
import { ShareIcon } from './icons/ShareIcon';
import ShareModal from './ShareModal';
import { AnimatedButton } from './AnimatedButton';

interface MyPapersProps {
    user: User;
    papers: QuestionPaperData[];
    onEdit: (paper: QuestionPaperData) => void;
    onDelete: (paperId: string) => void;
    onGenerateNew: () => void;
    onRename: (paperId: string, newSubject: string) => void;
    onDuplicate: (paperId: string) => void;
}

// --- Local Icons ---
const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> );
const KebabIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg> );
const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg> );
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>);

const StatCard: React.FC<{icon: React.ReactNode, label: string, value: string | number}> = ({ icon, label, value }) => (
    <div className="bg-white dark:bg-slate-800/50 p-5 rounded-2xl shadow-lg border dark:border-slate-700/50 flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const RenameModal: React.FC<{paper: QuestionPaperData, onSave: (newName: string) => void, onClose: () => void}> = ({ paper, onSave, onClose }) => {
    const [name, setName] = useState(paper.subject);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm animate-zoom-in" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Rename Paper</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter a new name for "{paper.subject}".</p>
                    <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        className="mt-4 block w-full rounded-lg border-0 py-2 px-3 text-gray-900 dark:text-white bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                    />
                </div>
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700/80 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">Save</button>
                </div>
            </div>
        </div>
    );
};

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

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation(); // Prevent card click
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef} onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsOpen(o => !o)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <KebabIcon />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border dark:border-slate-700 p-2 z-20 animate-zoom-in">
                    <ul className="space-y-1">
                        <li><button onClick={(e) => handleAction(e, onEdit)} className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><EditIcon className="w-4 h-4" /> Edit</button></li>
                        <li><button onClick={(e) => handleAction(e, onRename)} className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg> Rename</button></li>
                        <li><button onClick={(e) => handleAction(e, onDuplicate)} className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><CopyIcon className="w-4 h-4" /> Duplicate</button></li>
                        <li><button onClick={(e) => handleAction(e, onShare)} className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><ShareIcon className="w-4 h-4" /> Share</button></li>
                        <li><div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div></li>
                        <li><button onClick={(e) => handleAction(e, onDelete)} className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><DeleteIcon className="w-4 h-4" /> Delete</button></li>
                    </ul>
                </div>
            )}
        </div>
    );
};


const PaperCard: React.FC<{paper: QuestionPaperData, onEdit: () => void, onRename: () => void, onDuplicate: () => void, onShare: () => void, onDelete: () => void}> = ({ paper, onEdit, onRename, onDuplicate, onShare, onDelete }) => {
    return (
        <div className="group relative bg-white dark:bg-slate-800/50 rounded-2xl shadow-lg border dark:border-slate-700/50 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 hover:border-indigo-500/50 dark:hover:shadow-indigo-500/10 overflow-hidden">
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <PaperActionsMenu onEdit={onEdit} onRename={onRename} onDuplicate={onDuplicate} onShare={onShare} onDelete={onDelete} />
            </div>
            <div className="p-5 flex-grow space-y-3 cursor-pointer" onClick={onEdit}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center shadow-inner">
                        <PaperIcon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="overflow-hidden">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate" title={paper.subject}>{paper.subject}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{paper.className} • {paper.totalMarks} Marks</p>
                    </div>
                 </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 truncate font-medium pt-2 border-t border-slate-100 dark:border-slate-700/50 mt-2">{paper.schoolName}</p>
                 <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    <ClockIcon className="w-4 h-4" />
                    <span>{new Date(paper.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
}

const MyPapers: React.FC<MyPapersProps> = ({ user, papers, onEdit, onDelete, onGenerateNew, onRename, onDuplicate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [paperToShare, setPaperToShare] = useState<QuestionPaperData | null>(null);
    const [paperToRename, setPaperToRename] = useState<QuestionPaperData | null>(null);

    const userName = user.email.split('@')[0];
    const capitalizedUserName = userName.charAt(0).toUpperCase() + userName.slice(1);

    const filteredPapers = useMemo(() => {
        if (!searchTerm) return papers;
        return papers.filter(paper => 
            paper.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            paper.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
            paper.schoolName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [papers, searchTerm]);
    
    const totalQuestions = useMemo(() => papers.reduce((sum, paper) => sum + paper.questions.length, 0), [papers]);

    const handleOpenShareModal = (paper: QuestionPaperData) => {
        setPaperToShare(paper);
        setIsShareModalOpen(true);
    };

    const handleOpenRenameModal = (paper: QuestionPaperData) => {
        setPaperToRename(paper);
    };

    const handleRenameSave = (newName: string) => {
        if (paperToRename) {
            onRename(paperToRename.id, newName);
        }
        setPaperToRename(null);
    };
    
    const shareUrl = useMemo(() => {
        if (!paperToShare) return '';
        try {
            const jsonString = JSON.stringify(paperToShare);
            const bytes = new TextEncoder().encode(jsonString);
            const binaryString = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
            const base64String = btoa(binaryString);
            return `${window.location.origin}${window.location.pathname}#paper/${base64String}`;
        } catch (error) {
            console.error("Failed to create share link:", error);
            return '';
        }
    }, [paperToShare]);


    if (papers.length === 0) {
        return <EmptyState onGenerateNew={onGenerateNew} />;
    }

    return (
        <div className="max-w-7xl mx-auto animate-fade-in-up">
             {paperToRename && <RenameModal paper={paperToRename} onSave={handleRenameSave} onClose={() => setPaperToRename(null)} />}
             <header className="mb-10">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Welcome back, {capitalizedUserName}!</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Here's an overview of your question paper library.</p>
             </header>

             <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 items-center">
                 <StatCard icon={<PaperIcon className="w-6 h-6"/>} label="Total Papers" value={papers.length} />
                 <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>} label="Total Questions" value={totalQuestions} />
                 
                 <div className="flex justify-center sm:justify-end">
                    <AnimatedButton 
                        icon={<PlusIcon className="w-6 h-6" />}
                        label="Create New Paper"
                        onClick={onGenerateNew}
                        variant="primary"
                        className="w-full sm:w-auto"
                    />
                 </div>
             </section>

             <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight shrink-0">My Papers ({filteredPapers.length})</h2>
                <div className="relative w-full sm:max-w-xs">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <input 
                        type="text"
                        placeholder="Search papers..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-lg border-0 bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-shadow focus:shadow-md"
                    />
                </div>
            </div>

            {filteredPapers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredPapers.map((paper, index) => (
                        <div key={paper.id} className="animate-stagger-in" style={{ animationDelay: `${index * 50}ms` }}>
                            <PaperCard 
                               paper={paper} 
                               onEdit={() => onEdit(paper)} 
                               onDelete={() => onDelete(paper.id)}
                               onShare={() => handleOpenShareModal(paper)}
                               onRename={() => handleOpenRenameModal(paper)}
                               onDuplicate={() => onDuplicate(paper.id)}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-6 bg-white dark:bg-slate-800/50 rounded-2xl border dark:border-slate-700/50">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No Papers Found</h3>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">Your search for "{searchTerm}" did not match any papers.</p>
                </div>
            )}
            
            {paperToShare && (
                 <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    shareUrl={shareUrl}
                    paperTitle={paperToShare.subject}
                />
            )}
        </div>
    );
};

export default MyPapers;
