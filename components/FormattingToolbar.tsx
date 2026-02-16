
import React from 'react';

interface FormattingToolbarProps {
    onInsertImage: () => void;
}

const BoldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>;
const ItalicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>;
const UnderlineIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>;
const AlignLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>;
const AlignCenterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>;
const AlignRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
const OrderedListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>;

export const FormattingToolbar: React.FC<FormattingToolbarProps> = () => {
    const exec = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
    };

    const Button = ({ onClick, children, title }: any) => (
        <button
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={title}
        >
            {children}
        </button>
    );

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm select-none">
            <div className="flex items-center gap-1 mr-2 pr-2 border-r border-slate-200 dark:border-slate-700">
                <Button onClick={() => exec('bold')} title="Bold"><BoldIcon /></Button>
                <Button onClick={() => exec('italic')} title="Italic"><ItalicIcon /></Button>
                <Button onClick={() => exec('underline')} title="Underline"><UnderlineIcon /></Button>
            </div>
            
            <div className="flex items-center gap-1 mr-2 pr-2 border-r border-slate-200 dark:border-slate-700">
                <Button onClick={() => exec('justifyLeft')} title="Align Left"><AlignLeftIcon /></Button>
                <Button onClick={() => exec('justifyCenter')} title="Align Center"><AlignCenterIcon /></Button>
                <Button onClick={() => exec('justifyRight')} title="Align Right"><AlignRightIcon /></Button>
            </div>

            <div className="flex items-center gap-1">
                <Button onClick={() => exec('insertUnorderedList')} title="Bullet List"><ListIcon /></Button>
                <Button onClick={() => exec('insertOrderedList')} title="Numbered List"><OrderedListIcon /></Button>
            </div>
        </div>
    );
};
