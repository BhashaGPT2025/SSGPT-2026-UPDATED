
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { type QuestionPaperData, type PaperStyles } from '../types';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import RichTextToolbar from './RichTextToolbar';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { UploadIcon } from './icons/UploadIcon';

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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragItemRef = useRef<{ el: HTMLElement, startX: number, startY: number, initialLeft: number, initialTop: number } | null>(null);
    
    // Styles
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
        if (paperData.htmlContent && !paperData.htmlContent.includes('<div class="question-block"')) {
             // If htmlContent seems to be already processed/paginated string or empty, might need regeneration
             // For now, always regenerate from data to ensure fresh pagination
             paginate();
        } else if (paperData.htmlContent) {
             // If we have saved content, we might try to use it, but re-paginating is safer for layout consistency
             paginate();
        } else {
             paginate();
        }
    }, []);

    // Custom Drag Handler for Absolute Images
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('draggable-image')) {
                e.preventDefault(); // Prevent default drag behavior
                dragItemRef.current = {
                    el: target,
                    startX: e.clientX,
                    startY: e.clientY,
                    initialLeft: parseFloat(target.style.left || '0'),
                    initialTop: parseFloat(target.style.top || '0')
                };
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragItemRef.current) return;
            e.preventDefault();
            const { el, startX, startY, initialLeft, initialTop } = dragItemRef.current;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = `${initialLeft + dx}px`;
            el.style.top = `${initialTop + dy}px`;
        };

        const handleMouseUp = () => {
            dragItemRef.current = null;
        };

        const container = pagesContainerRef.current;
        if (container) {
            container.addEventListener('mousedown', handleMouseDown);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            if (container) container.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const paginate = useCallback(async () => {
        const container = document.createElement('div');
        container.style.width = `${A4_WIDTH_PX}px`; 
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.padding = '60px'; 
        container.style.boxSizing = 'border-box';
        container.style.backgroundColor = 'white';
        container.style.fontFamily = styles.fontFamily;
        container.className = 'prose max-w-none print-container';

        // Use existing htmlContent if it looks like a full render, otherwise regenerate
        const htmlContent = generateHtmlFromPaperData(paperData, { 
            logoConfig: paperData.schoolLogo ? { src: paperData.schoolLogo, alignment: 'center' } : undefined
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
        const maxPageHeight = A4_HEIGHT_PX - 120 - 50; 

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
        setTimeout(() => triggerMathRendering(pagesContainerRef.current), 100);
    }, [paperData]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            
            // Find which page is currently in view or active
            // For simplicity, we append to the first page, or user can drag it
            const firstPageContent = pagesContainerRef.current?.querySelector('.paper-page-content');
            
            if (firstPageContent) {
                const img = document.createElement('img');
                img.src = base64;
                img.className = 'draggable-image';
                img.style.position = 'absolute';
                img.style.top = '100px';
                img.style.left = '100px';
                img.style.width = '200px';
                img.style.zIndex = '50';
                img.style.cursor = 'move';
                img.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                
                // Prevent native drag
                img.draggable = false;
                
                firstPageContent.appendChild(img);
            } else {
                alert("Could not find a page to insert the image.");
            }
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input
    };

    const handleSaveInternal = () => {
        if (!pagesContainerRef.current) return;
        
        // Reconstruct the full HTML from the pages
        let fullHtml = '';
        const pages = pagesContainerRef.current.querySelectorAll('.paper-page-content');
        pages.forEach(page => {
            fullHtml += page.innerHTML;
        });
        
        const updatedPaper = { ...paperData, htmlContent: fullHtml };
        onSave(updatedPaper);
        return updatedPaper;
    };

    const handleExportPDF = async () => {
        if (isExporting) return;
        setIsExporting(true);
        // Ensure latest edits are captured in state before export? 
        // html2canvas captures DOM state, so explicit save isn't strictly needed for export visualization,
        // but good practice to sync.
        
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
        handleSaveAndExitClick: () => {
            handleSaveInternal();
            onSaveAndExit();
        },
        openExportModal: handleExportPDF,
        openAnswerKeyModal: () => {},
        paperSubject: paperData.subject,
        isAnswerKeyMode: false,
        isSaving: false
    }));

    return (
        <div className="flex flex-col h-full bg-slate-200 dark:bg-gray-900 relative">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/png, image/jpeg, image/jpg" 
                className="hidden" 
            />

            {isExporting && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center text-white">
                    <SpinnerIcon className="w-16 h-16 mb-6 text-indigo-400" />
                    <h2 className="text-2xl font-black tracking-tight">Finalizing PDF</h2>
                </div>
            )}
            
            {/* Floating Image Button */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="fixed top-24 right-8 z-50 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-indigo-700 transition-all font-semibold text-sm hover:scale-105"
            >
                <UploadIcon className="w-4 h-4" />
                Add Image
            </button>
            
            <RichTextToolbar editorRef={pagesContainerRef} />

            <main className="flex-1 overflow-auto p-8 bg-slate-300 dark:bg-slate-950/20" ref={pagesContainerRef}>
                {pagesHtml.map((html, i) => (
                    <div key={i} className="paper-page bg-white shadow-2xl mx-auto mb-10 relative print:shadow-none print:mb-0" 
                        style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, overflow: 'hidden', position: 'relative' }}>
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
                                 overflow: 'hidden',
                                 position: 'relative' // Needed for absolute children
                             }} 
                             dangerouslySetInnerHTML={{ __html: html }} 
                        />
                        <div className="absolute bottom-4 right-8 text-xs text-slate-300 pointer-events-none select-none">
                            Page {i + 1}
                        </div>
                    </div>
                ))}
                
                <div className="text-center text-slate-500 text-sm pb-10">
                    Tip: Click text to edit. Add images using the button top-right. Drag images to position them.
                </div>
            </main>
        </div>
    );
});

export default Editor;
