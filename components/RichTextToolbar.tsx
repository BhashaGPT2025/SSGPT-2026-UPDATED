import React, { useState, useEffect, useRef, useCallback } from 'react';

type Command = 'bold' | 'italic' | 'underline' | 'insertOrderedList' | 'insertUnorderedList' | 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'fontSize' | 'foreColor';

const fontSizes = [
    { label: 'Small', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Large', value: '5' },
    { label: 'Huge', value: '7' },
];

const ToolbarSeparator = () => <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>;

interface RichTextToolbarProps {
    editorRef: React.RefObject<HTMLDivElement>;
    isExporting?: boolean;
}

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ editorRef, isExporting }) => {
    const [toolbarState, setToolbarState] = useState<{
        visible: boolean;
        top: number;
        left: number;
        isBold: boolean;
        isItalic: boolean;
        isUnderline: boolean;
    }>({
        visible: false,
        top: 0,
        left: 0,
        isBold: false,
        isItalic: false,
        isUnderline: false,
    });

    const toolbarRef = useRef<HTMLDivElement>(null);

    const handleCommand = (command: Command, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus(); // Keep focus on the editor after command
    };

    const updateToolbar = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            setToolbarState(s => ({ ...s, visible: false }));
            return;
        }

        const range = selection.getRangeAt(0);
        const editorNode = editorRef.current;
        if (!editorNode || !editorNode.contains(range.commonAncestorContainer)) {
             setToolbarState(s => ({...s, visible: false }));
             return;
        }
        
        const rect = range.getBoundingClientRect();
        const editorRect = editorNode.getBoundingClientRect();
        const toolbarWidth = toolbarRef.current?.offsetWidth || 350;

        setToolbarState({
            visible: true,
            top: rect.top - editorRect.top - 55 + editorNode.scrollTop,
            left: Math.max(0, rect.left - editorRect.left + rect.width / 2 - toolbarWidth / 2),
            isBold: document.queryCommandState('bold'),
            isItalic: document.queryCommandState('italic'),
            isUnderline: document.queryCommandState('underline'),
        });
    }, [editorRef]);

    useEffect(() => {
        const handleInteraction = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
                // Use a small timeout to prevent the toolbar from disappearing when clicking on it
                 setTimeout(() => {
                    const newSelection = window.getSelection();
                    if (!newSelection || newSelection.isCollapsed) {
                         setToolbarState(s => ({...s, visible: false}));
                    }
                }, 200);
            } else {
                updateToolbar();
            }
        };

        const editorNode = editorRef.current;
        document.addEventListener('selectionchange', updateToolbar);
        document.addEventListener('mouseup', handleInteraction);
        editorNode?.addEventListener('scroll', updateToolbar);
        editorNode?.addEventListener('keyup', updateToolbar);
        
        return () => {
            document.removeEventListener('selectionchange', updateToolbar);
            document.removeEventListener('mouseup', handleInteraction);
            editorNode?.removeEventListener('scroll', updateToolbar);
            editorNode?.removeEventListener('keyup', updateToolbar);
        };
    }, [updateToolbar, editorRef]);

    if (!toolbarState.visible || isExporting) {
        return null;
    }

    return (
        <div
            ref={toolbarRef}
            className="absolute z-30 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border dark:border-slate-700 p-1.5 flex items-center justify-center gap-2 flex-wrap animate-fade-in-fast"
            style={{
                top: `${toolbarState.top}px`,
                left: `${toolbarState.left}px`,
            }}
            onMouseDown={e => e.preventDefault()}
        >
            <div className="flex items-center gap-1">
                <select onChange={(e) => handleCommand('fontSize', e.target.value)} className="p-1 h-9 bg-transparent dark:bg-slate-900 border-gray-300 dark:border-slate-700 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="3">Size</option>
                    {fontSizes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <input type="color" defaultValue="#000000" onChange={(e) => handleCommand('foreColor', e.target.value)} className="w-9 h-9 p-0 bg-transparent border-none rounded-md cursor-pointer" title="Text color" />
            </div>
            
            <ToolbarSeparator />

            <div className="flex items-center">
                <ToolbarButton command="bold" onClick={handleCommand} isActive={toolbarState.isBold}><BoldIcon /></ToolbarButton>
                <ToolbarButton command="italic" onClick={handleCommand} isActive={toolbarState.isItalic}><ItalicIcon /></ToolbarButton>
                <ToolbarButton command="underline" onClick={handleCommand} isActive={toolbarState.isUnderline}><UnderlineIcon /></ToolbarButton>
            </div>
            
            <ToolbarSeparator />
            
            <div className="flex items-center">
                <ToolbarButton command="insertUnorderedList" onClick={handleCommand}><ListIcon /></ToolbarButton>
                <ToolbarButton command="insertOrderedList" onClick={handleCommand}><ListOrderedIcon /></ToolbarButton>
            </div>
            
            <ToolbarSeparator />

            <div className="flex items-center">
                <ToolbarButton command="justifyLeft" onClick={handleCommand}><AlignLeftIcon /></ToolbarButton>
                <ToolbarButton command="justifyCenter" onClick={handleCommand}><AlignCenterIcon /></ToolbarButton>
                <ToolbarButton command="justifyRight" onClick={handleCommand}><AlignRightIcon /></ToolbarButton>
            </div>
        </div>
    );
};

const ToolbarButton: React.FC<{ command: Command; onClick: (cmd: Command, val?: string) => void; children: React.ReactNode; isActive?: boolean; }> = ({ command, onClick, children, isActive }) => (
    <button
        onMouseDown={e => e.preventDefault()}
        onClick={() => onClick(command)}
        className={`p-2 w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
        aria-label={command}
        aria-pressed={isActive}
    >
        {children}
    </button>
);

const BoldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>;
const ItalicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>;
const UnderlineIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>;
const ListIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const ListOrderedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>;
const AlignLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>;
const AlignCenterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="17" y1="6" x2="7" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="7" y2="18"/></svg>;
const AlignRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>;

export default RichTextToolbar;