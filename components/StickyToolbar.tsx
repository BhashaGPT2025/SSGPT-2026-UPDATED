
import React from 'react';
import { type PaperStyles } from '../types';

interface StickyToolbarProps {
    onStyleChange: (command: string, value?: string) => void;
    onInsertImage: () => void;
    onAddPage: () => void;
    onDeleteObject: () => void;
    canDeleteObject: boolean;
    styles: PaperStyles;
}

const ToolbarButton = ({ onClick, children, active, title, disabled }: any) => (
    <button
        onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        disabled={disabled}
        title={title}
        className={`p-2 rounded-md transition-all duration-200 flex items-center justify-center
            ${active 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow-sm' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-sm'}
            ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
        `}
    >
        {children}
    </button>
);

const Divider = () => <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-2 self-center" />;

export const StickyToolbar: React.FC<StickyToolbarProps> = ({ 
    onStyleChange, 
    onInsertImage, 
    onAddPage,
    onDeleteObject,
    canDeleteObject,
    styles 
}) => {
    return (
        <div className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm px-4 py-2 flex items-center gap-1 justify-center flex-wrap print:hidden transition-all">
            
            {/* Text Formatting Group */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700/50">
                <select 
                    onChange={(e) => onStyleChange('fontName', e.target.value)}
                    className="h-8 text-sm bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 w-32 cursor-pointer"
                    defaultValue="Times New Roman"
                >
                    <option value="Inter">Inter</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Arial">Arial</option>
                    <option value="Courier New">Courier New</option>
                </select>
                <Divider />
                <ToolbarButton onClick={() => onStyleChange('bold')} title="Bold (Ctrl+B)">
                    <strong className="font-bold serif">B</strong>
                </ToolbarButton>
                <ToolbarButton onClick={() => onStyleChange('italic')} title="Italic (Ctrl+I)">
                    <em className="italic serif">I</em>
                </ToolbarButton>
                <ToolbarButton onClick={() => onStyleChange('underline')} title="Underline (Ctrl+U)">
                    <span className="underline serif">U</span>
                </ToolbarButton>
                <div className="relative ml-1 group">
                    <div className="w-6 h-6 rounded border border-slate-300 flex items-center justify-center cursor-pointer overflow-hidden">
                        <input 
                            type="color" 
                            onChange={(e) => onStyleChange('foreColor', e.target.value)}
                            className="w-8 h-8 -m-1 cursor-pointer p-0 border-0"
                            title="Text Color"
                        />
                    </div>
                </div>
            </div>

            {/* Paragraph Group */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700/50 ml-2">
                <ToolbarButton onClick={() => onStyleChange('justifyLeft')} title="Align Left">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/></svg>
                </ToolbarButton>
                <ToolbarButton onClick={() => onStyleChange('justifyCenter')} title="Align Center">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm3 7h12v2H6v-2zm-3 7h18v2H3v-2z"/></svg>
                </ToolbarButton>
                <ToolbarButton onClick={() => onStyleChange('justifyRight')} title="Align Right">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm6 7h12v2H9v-2zm-6 7h18v2H3v-2z"/></svg>
                </ToolbarButton>
                <Divider />
                <ToolbarButton onClick={() => onStyleChange('insertUnorderedList')} title="Bullet List">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h2v2H4V6zm0 5h2v2H4v-2zm0 5h2v2H4v-2zm4-10h14v2H8V6zm0 5h14v2H8v-2zm0 5h14v2H8v-2z"/></svg>
                </ToolbarButton>
            </div>

            {/* Objects Group */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700/50 ml-2">
                <ToolbarButton onClick={onInsertImage} title="Insert Image">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                    <span className="ml-1 text-xs font-semibold">Image</span>
                </ToolbarButton>
                <Divider />
                <ToolbarButton onClick={onDeleteObject} disabled={!canDeleteObject} title="Delete Selected Object">
                    <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </ToolbarButton>
            </div>

            {/* Page Controls */}
            <div className="flex items-center ml-auto">
                <button 
                    onClick={onAddPage}
                    className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                    Add Page
                </button>
            </div>
        </div>
    );
};
