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

const triggerMathRendering = (element: HTMLElement | null) => {
    if (!element || !(window as any).renderMathInElement) return;
    try {
        (window as any).renderMathInElement(element, { 
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ], 
            throwOnError: false,
            strict: false,
            trust: true
        });
    } catch (err) {
        console.error("KaTeX render error:", err);
    }
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
        // Notify parent that editor is mounted/ready
        onReady();
    }, []);

    const paginate = useCallback(() => {
        // Create a hidden staging area to render content and measure heights
        const container = document.createElement('div');
        container.style.width = `${A4_WIDTH_PX - 120}px`; // 60px padding on each side
        container.style.fontFamily = state.styles.fontFamily;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.visibility = 'hidden';
        
        const htmlContent = generateHtmlFromPaperData(state.paper, { 
            logoConfig: state.logo.src ? { src: state.logo.src, alignment: 'center' } : undefined,
            isAnswerKey: isAnswerKeyMode
        });
        
        container.innerHTML = htmlContent;
        document.body.appendChild(container);
        
        const contentRoot = container.querySelector('#paper-root') || container.children[0];
        const children = Array.from(contentRoot?.children || []);
        
        const pages: string[] = [];
        let currentPageHtml = ""; 
        let currentHeight = 0;
        // Conservative page height to prevent clipping
        const maxPageHeight = A4_HEIGHT_PX - 140; // ~70px padding top/bottom

        // Iterate through all blocks (headers, sections, questions)
        for (const child of children) {
            const el = child as HTMLElement;
            // Force a layout calc
            const height = el.getBoundingClientRect().height;
            const style = window.getComputedStyle(el);
            const marginY = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
            const totalHeight = height + marginY;

            // If an element is taller than a single page, we have to let it flow/clip 
            // OR put it on a new page and hope for best. 
            // Here, we check if it fits on CURRENT page.
            if (currentHeight + totalHeight > maxPageHeight) {
                // If the current page is not empty, push it and start a new one
                if (currentPageHtml.length > 0) {
                    pages.push(currentPageHtml);
                    currentPageHtml = "";
                    currentHeight = 0;
                }
            }
            
            currentPageHtml += el.outerHTML; 
            currentHeight += totalHeight;
        }
        
        // Push the last page if it has content
        if (currentPageHtml.length > 0) {
            pages.push(currentPageHtml);
        }

        // Failsafe: If for some reason we have 0 pages but have content, dump it all in one page
        // This handles cases where height calcs might fail completely
        if (pages.length === 0 && htmlContent.length > 0) {
            pages.push(htmlContent);
        }

        document.body.removeChild(container);
        setPagesHtml(pages);
        
        // Wait for React to render the pages, then trigger math
        setTimeout(() => triggerMathRendering(pagesContainerRef.current), 100);
    }, [state.paper, state.styles.fontFamily, state.logo, isAnswerKeyMode]);

    useEffect(() => {
        paginate();
    }, [paginate]);

    const handleExportPDF = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const pdf = new jsPDF('p', 'px', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const pageElements = pagesContainerRef.current?.querySelectorAll('.paper-page-content');
            
            if (!pageElements || pageElements.length === 0) {
                alert("Nothing to export. Please try regenerating.");
                return;
            }
            
            for (let i = 0; i < pageElements.length; i++) {
                const el = pageElements[i] as HTMLElement;
                
                // Use html2canvas with specific settings for best text clarity
                const canvas = await html2canvas(el, { 
                    scale: 2, // Good balance of quality and file size
                    useCORS: true, 
                    backgroundColor: '#ffffff',
                    logging: false,
                    allowTaint: true,
                    // Ensure full height is captured even if scrolled
                    height: el.scrollHeight, 
                    windowHeight: el.scrollHeight
                });
                
                const imgData = canvas.toDataURL('image/png');
                if (i > 0) pdf.addPage();
                
                // Add image to PDF exactly fitting the A4 dimensions
                pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
            }
            
            const suffix = isAnswerKeyMode ? '_Answer_Key' : '_Question_Paper';
            pdf.save(`${state.paper.subject.replace(/\s+/g, '_')}${suffix}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Internal Error Occurred during export. Please check console.");
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
                // Trigger formatting update manually if needed, or rely on effect
                // paginate(); 
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
                    <p className="text-slate-400 mt-2 px-10 text-center">Applying professional grade formatting and math rendering.</p>
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
                    <div key={i} className="paper-page bg-white shadow-2xl mx-auto mb-10 relative overflow-hidden" 
                        style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX }}>
                        <div className="paper-page-content prose max-w-none p-[60px]" 
                             style={{ fontFamily: state.styles.fontFamily, minHeight: '100%', background: 'white' }} 
                             dangerouslySetInnerHTML={{ __html: html }} />
                    </div>
                ))}
            </main>
        </div>
    );
});
export default Editor;