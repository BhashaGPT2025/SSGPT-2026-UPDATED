
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { type QuestionPaperData, type PaperStyles } from '../types';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import RichTextToolbar from './RichTextToolbar';
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
                strict: false
            });
        } catch (err) {
            console.error("KaTeX render error:", err);
        }
        setTimeout(resolve, 300);
    });
};

const Editor = forwardRef<any, { paperData: QuestionPaperData; onSave: (p: QuestionPaperData) => void; onSaveAndExit: () => void; onReady: () => void; }>((props, ref) => {
    const { paperData, onSave, onSaveAndExit, onReady } = props;
    
    // State
    const [pagesHtml, setPagesHtml] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    
    // Refs
    const pagesContainerRef = useRef<HTMLDivElement>(null);
    
    // Styles (Defaults, since sidebar is removed)
    const styles: PaperStyles = { 
        fontFamily: "'Times New Roman', Times, serif", 
        headingColor: '#000000', 
        borderColor: '#000000', 
        borderWidth: 1, 
        borderStyle: 'solid' 
    };

    // Initial render & pagination
    useEffect(() => {
        onReady();
        paginate();
    }, []);

    const paginate = useCallback(async () => {
        // Create hidden container to measure content height
        const container = document.createElement('div');
        container.style.width = `${A4_WIDTH_PX}px`; 
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.padding = '60px'; 
        container.style.boxSizing = 'border-box';
        container.style.backgroundColor = 'white';
        container.style.fontFamily = styles.fontFamily;
        container.className = 'prose max-w-none print-container';

        // Generate HTML
        const htmlContent = generateHtmlFromPaperData(paperData, { 
            logoConfig: paperData.schoolLogo ? { src: paperData.schoolLogo, alignment: 'center' } : undefined
        });
        
        container.innerHTML = htmlContent;
        document.body.appendChild(container);

        // Wait for resources
        await document.fonts.ready;
        await triggerMathRendering(container);
        
        // Split content into pages
        const contentRoot = container.querySelector('#paper-root');
        const children = Array.from(contentRoot?.children || []);
        
        const pages: string[] = [];
        let currentPageHtml = ""; 
        let currentHeight = 0;
        const maxPageHeight = A4_HEIGHT_PX - 120 - 50; // Height - Padding - Buffer

        children.forEach(child => {
            const el = child as HTMLElement;
            const style = window.getComputedStyle(el);
            const marginTop = parseFloat(style.marginTop || '0');
            const marginBottom = parseFloat(style.marginBottom || '0');
            const rect = el.getBoundingClientRect();
            const elHeight = rect.height + marginTop + marginBottom;
            
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

        setPagesHtml(pages.length > 0 ? pages : [htmlContent]);
        
        // Re-trigger math rendering on the actual visible pages
        setTimeout(() => triggerMathRendering(pagesContainerRef.current), 100);
        
    }, [paperData]);

    const handleExportPDF = async () => {
        if (isExporting) return;
        setIsExporting(true);
        try {
            const pdf = new jsPDF('p', 'px', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const pageElements = pagesContainerRef.current?.querySelectorAll('.paper-page');
            
            if (!pageElements || pageElements.length === 0) return;
            
            for (let i = 0; i < pageElements.length; i++) {
                const el = pageElements[i] as HTMLElement;
                const canvas = await html2canvas(el, { 
                    scale: 2, 
                    useCORS: true, 
                    backgroundColor: '#ffffff',
                    logging: false,
                    scrollY: -window.scrollY, 
                    windowWidth: document.documentElement.offsetWidth,
                    windowHeight: document.documentElement.offsetHeight
                });
                
                const imgData = canvas.toDataURL('image/png');
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
            }
            pdf.save(`${paperData.subject.replace(/\s+/g, '_')}_Paper.pdf`);
        } catch (error) {
            console.error(error);
            alert("Export Failed");
        } finally {
            setIsExporting(false);
        }
    };

    useImperativeHandle(ref, () => ({
        handleSaveAndExitClick: onSaveAndExit,
        openExportModal: handleExportPDF,
        openAnswerKeyModal: () => {},
        paperSubject: paperData.subject,
        isAnswerKeyMode: false
    }));

    return (
        <div className="flex flex-col h-full bg-slate-200 dark:bg-gray-900 relative">
            {isExporting && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center text-white">
                    <SpinnerIcon className="w-16 h-16 mb-6 text-indigo-400" />
                    <h2 className="text-2xl font-black tracking-tight">Finalizing PDF</h2>
                </div>
            )}
            
            {/* Floating toolbar for basic text edits */}
            <RichTextToolbar editorRef={pagesContainerRef} />

            <main className="flex-1 overflow-auto p-8 bg-slate-300 dark:bg-slate-950/20" ref={pagesContainerRef}>
                {pagesHtml.map((html, i) => (
                    <div key={i} className="paper-page bg-white shadow-2xl mx-auto mb-10 relative print:shadow-none print:mb-0" 
                        style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, overflow: 'hidden' }}>
                        <div 
                             contentEditable={true}
                             suppressContentEditableWarning={true}
                             className="paper-page-content prose max-w-none outline-none selection:bg-indigo-100 selection:text-indigo-900" 
                             style={{ 
                                 fontFamily: styles.fontFamily, 
                                 height: '100%', 
                                 background: 'white', 
                                 padding: '60px',
                                 boxSizing: 'border-box',
                                 overflow: 'hidden'
                             }} 
                             dangerouslySetInnerHTML={{ __html: html }} 
                        />
                        <div className="absolute bottom-4 right-8 text-xs text-slate-300 pointer-events-none select-none">
                            Page {i + 1}
                        </div>
                    </div>
                ))}
                
                {/* Tip for user */}
                <div className="text-center text-slate-500 text-sm pb-10">
                    Tip: Click anywhere on the paper to edit text before exporting.
                </div>
            </main>
        </div>
    );
});

export default Editor;
