import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Chat } from '@google/genai';
import { type QuestionPaperData, type PaperStyles, type ImageState, type TextBoxState, Question, WatermarkState, LogoState, QuestionType, UploadedImage, Difficulty, Taxonomy } from '../types';
import { createEditingChat, getAiEditResponse, generateHtmlFromPaperData } from '../services/geminiService';
import EditorSidebar from './EditorToolbar';
import EditableImage from './EditableImage';
import CoEditorChat, { type CoEditorMessage } from './CoEditorChat';
import { AiIcon } from './icons/AiIcon';
import { GalleryIcon } from './icons/GalleryIcon';
import { ImageGallery } from './ImageGallery';
import { SpinnerIcon } from './icons/SpinnerIcon';

const A4_WIDTH_PX = 794; 
const A4_HEIGHT_PX = 1123;

const triggerMathRendering = (element: HTMLElement | null): Promise<void> => {
    return new Promise((resolve) => {
        if (!element || !(window as any).renderMathInElement) {
            resolve();
            return;
        }
        try {
            (window as any).renderMathInElement(element, { 
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ], 
                throwOnError: false,
                output: 'html', 
                strict: false,
                trust: true
            });
        } catch (err) {
            console.error("KaTeX render error:", err);
        }
        // Increased wait time significantly to ensure complex fractions layout correctly before measurement
        setTimeout(resolve, 800);
    });
};

const Editor = forwardRef<any, { paperData: QuestionPaperData; onSave: (p: QuestionPaperData) => void; onSaveAndExit: () => void; onReady: () => void; }>((props, ref) => {
    const { paperData, onSave, onSaveAndExit, onReady } = props;
    
    const [state, setState] = useState<{
        paper: QuestionPaperData;
        styles: PaperStyles;
        images: ImageState[];
        logo: LogoState;
        watermark: WatermarkState;
    }>({
        paper: paperData,
        styles: { fontFamily: "'Times New Roman', Times, serif", headingColor: '#000000', borderColor: '#000000', borderWidth: 1, borderStyle: 'solid' },
        images: [],
        logo: { src: paperData.schoolLogo, position: paperData.schoolLogo ? 'header-center' : 'none', size: 150, opacity: 0.1 },
        watermark: { type: 'none', text: 'DRAFT', color: '#cccccc', fontSize: 80, opacity: 0.1, rotation: -45 },
    });

    const [isExporting, setIsExporting] = useState(false);
    const [isAnswerKeyMode, setIsAnswerKeyMode] = useState(false);
    const [sidebarView, setSidebarView] = useState<'toolbar' | 'chat' | 'gallery'>('toolbar');
    const [coEditorMessages, setCoEditorMessages] = useState<CoEditorMessage[]>([]);
    const [isCoEditorTyping, setIsCoEditorTyping] = useState(false);
    const [editingChat, setEditingChat] = useState<Chat | null>(null);
    const [pagesHtml, setPagesHtml] = useState<string[]>([]);
    const pagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setEditingChat(createEditingChat(paperData));
        setCoEditorMessages([{ id: '1', sender: 'bot', text: "Paper formatting optimized for board standards. Ready for review." }]);
        onReady();
    }, []);

    const paginate = useCallback(async () => {
        const container = document.createElement('div');
        container.style.width = `${A4_WIDTH_PX}px`; 
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.visibility = 'hidden'; 
        container.style.padding = '60px'; 
        container.style.boxSizing = 'border-box';
        container.style.backgroundColor = 'white';
        container.style.fontFamily = state.styles.fontFamily;
        
        container.className = 'prose max-w-none export-container';

        const htmlContent = generateHtmlFromPaperData(state.paper, { 
            logoConfig: state.logo.src ? { src: state.logo.src, alignment: 'center' } : undefined,
            isAnswerKey: isAnswerKeyMode
        });
        
        container.innerHTML = htmlContent; 
        document.body.appendChild(container);

        await document.fonts.ready;
        await triggerMathRendering(container);
        
        const contentRoot = container.querySelector('#paper-root');
        const children = Array.from(contentRoot?.children || []);
        
        const pages: string[] = [];
        let currentPageHtml = ""; 
        let currentHeight = 0;
        
        // Revised safety buffer
        const maxPageHeight = A4_HEIGHT_PX - 120 - 40; 

        children.forEach(child => {
            const el = child as HTMLElement;
            
            const style = window.getComputedStyle(el);
            const marginTop = parseFloat(style.marginTop || '0');
            const marginBottom = parseFloat(style.marginBottom || '0');
            // Use offsetHeight as a baseline, checking scrollHeight for expanded content
            const elHeight = Math.max(el.offsetHeight, el.scrollHeight) + marginTop + marginBottom;
            
            if (currentHeight > 0 && currentHeight + elHeight > maxPageHeight) { 
                pages.push(currentPageHtml); 
                currentPageHtml = ""; 
                currentHeight = 0; 
            }
            
            currentPageHtml += el.outerHTML; 
            currentHeight += elHeight;
        });

        if (currentPageHtml) pages.push(currentPageHtml);
        
        document.body.removeChild(container);

        if (pages.length === 0 && htmlContent) {
            setPagesHtml([htmlContent]); 
        } else {
            setPagesHtml(pages);
        }
        
    }, [state.paper, state.styles.fontFamily, state.logo, isAnswerKeyMode]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            paginate().then(() => {
                setTimeout(() => triggerMathRendering(pagesContainerRef.current), 100);
            });
        }, 100);
        return () => clearTimeout(timeoutId);
    }, [paginate]);

    const handleExportPDF = async () => {
        if (isExporting) return;
        setIsExporting(true);
        
        // Wait longer to ensure DOM is stable and fonts are loaded
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const pdf = new jsPDF('p', 'px', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const pageElements = pagesContainerRef.current?.querySelectorAll('.paper-page');
            
            if (!pageElements || pageElements.length === 0) {
                alert("Nothing to export.");
                setIsExporting(false);
                return;
            }
            
            for (let i = 0; i < pageElements.length; i++) {
                const el = pageElements[i] as HTMLElement;
                
                const canvas = await html2canvas(el, { 
                    scale: 3, // High scale for text quality, but not 4 to avoid crashing on large docs
                    useCORS: true, 
                    backgroundColor: '#ffffff',
                    logging: false,
                    allowTaint: true,
                    // Critical for preventing layout shift during capture
                    windowWidth: 1200, // Fixed desktop width
                    windowHeight: 1600,
                    onclone: (clonedDoc) => {
                        const clonedEl = clonedDoc.querySelector('.paper-page') as HTMLElement;
                        if (clonedEl) {
                            clonedEl.style.fontFamily = state.styles.fontFamily;
                            const contentDiv = clonedEl.querySelector('.paper-page-content');
                            if (contentDiv) {
                                contentDiv.classList.add('export-container');
                            }
                        }
                    }
                });
                
                const imgData = canvas.toDataURL('image/png', 1.0);
                if (i > 0) pdf.addPage();
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
            }
            const suffix = isAnswerKeyMode ? '_Answer_Key' : '_Question_Paper';
            pdf.save(`${state.paper.subject.replace(/\s+/g, '_')}${suffix}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Internal Error Occurred during export.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleCoEditorSend = async (msg: string) => {
        if (!editingChat || isCoEditorTyping) return;
        setCoEditorMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: msg }]);
        setIsCoEditorTyping(true);
        try {
            const res = await getAiEditResponse(editingChat, msg);
            if (res.text) {
                setCoEditorMessages(prev => [...prev, { id: (Date.now()+1).toString(), sender: 'bot', text: res.text || "Updated." }]);
                setTimeout(() => triggerMathRendering(document.querySelector('.chat-scrollbar')), 100);
            }
        } catch (e) { console.error(e); }
        finally { setIsCoEditorTyping(false); }
    };

    useImperativeHandle(ref, () => ({
        handleSaveAndExitClick: onSaveAndExit,
        openExportModal: handleExportPDF,
        openAnswerKeyModal: () => setIsAnswerKeyMode(prev => !prev),
        paperSubject: state.paper.subject,
        isAnswerKeyMode
    }));

    return (
        <div className="flex h-full bg-slate-200 dark:bg-gray-900 overflow-hidden relative">
            {isExporting && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center text-white">
                    <SpinnerIcon className="w-16 h-16 mb-6 text-indigo-400" />
                    <h2 className="text-2xl font-black tracking-tight">Finalizing PDF</h2>
                    <p className="text-slate-400 mt-2 px-10 text-center">Optimizing math rendering and layout quality...</p>
                </div>
            )}
            <div className="w-80 bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col shadow-2xl z-10">
                <div className="flex border-b dark:border-slate-800">
                    <button onClick={() => setSidebarView('toolbar')} className={`flex-1 p-3 text-xs font-black tracking-tighter uppercase ${sidebarView === 'toolbar' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Design</button>
                    <button onClick={() => setSidebarView('chat')} className={`flex-1 p-3 text-xs font-black tracking-tighter uppercase ${sidebarView === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}><AiIcon className="w-4 h-4 mx-auto"/></button>
                    <button onClick={() => setSidebarView('gallery')} className={`flex-1 p-3 text-xs font-black tracking-tighter uppercase ${sidebarView === 'gallery' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}><GalleryIcon className="w-4 h-4 mx-auto"/></button>
                </div>
                <div className="flex-1 overflow-y-auto chat-scrollbar">
                    {sidebarView === 'toolbar' && (
                        <EditorSidebar 
                            styles={state.styles} 
                            onStyleChange={(k, v) => setState(s => ({...s, styles: {...s.styles, [k]: v}}))} 
                            paperSize="a4" 
                            onPaperSizeChange={()=>{}} 
                            logo={state.logo} 
                            watermark={state.watermark} 
                            onBrandingUpdate={u => setState(s => ({...s, ...u}))} 
                            onOpenImageModal={() => {}} 
                            onUploadImageClick={() => {}} 
                            isAnswerKeyMode={isAnswerKeyMode}
                            onToggleShowQuestions={() => setIsAnswerKeyMode(p => !p)}
                        />
                    )}
                    {sidebarView === 'chat' && <CoEditorChat messages={coEditorMessages} isTyping={isCoEditorTyping} onSendMessage={handleCoEditorSend} />}
                    {sidebarView === 'gallery' && <ImageGallery isCompact onEditImage={() => {}} />}
                </div>
            </div>
            <main className="flex-1 overflow-auto p-8 bg-slate-300 dark:bg-slate-950/20" ref={pagesContainerRef}>
                {pagesHtml.map((html, i) => (
                    <div key={i} className="paper-page bg-white shadow-2xl mx-auto mb-10 relative print:shadow-none print:mb-0" 
                        style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, overflow: 'hidden' }}>
                        <div className="paper-page-content prose max-w-none export-container" 
                             style={{ 
                                 fontFamily: state.styles.fontFamily, 
                                 height: '100%', 
                                 background: 'white', 
                                 padding: '60px',
                                 boxSizing: 'border-box',
                                 overflow: 'hidden',
                             }} 
                             dangerouslySetInnerHTML={{ __html: html }} 
                        />
                        {state.watermark.type !== 'none' && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden" style={{ opacity: state.watermark.opacity }}>
                                {state.watermark.type === 'text' && (
                                    <div style={{ 
                                        transform: `rotate(${state.watermark.rotation}deg)`, 
                                        fontSize: `${state.watermark.fontSize}px`, 
                                        color: state.watermark.color,
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {state.watermark.text}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </main>
        </div>
    );
});
export default Editor;