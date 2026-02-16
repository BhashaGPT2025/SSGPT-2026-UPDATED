
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { type QuestionPaperData, type PaperStyles, type ImageState, WatermarkState } from '../types';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import { StickyToolbar } from './StickyToolbar';
import EditableImage from './EditableImage';
import { SpinnerIcon } from './icons/SpinnerIcon';

// A4 Dimensions in Pixels at ~96 DPI
const A4_WIDTH_PX = 794; 
const A4_HEIGHT_PX = 1123;

interface PageData {
    id: string;
    htmlContent: string;
    images: ImageState[];
    isOverflowing?: boolean;
}

const Editor = forwardRef<any, { paperData: QuestionPaperData; onSave: (p: QuestionPaperData) => void; onSaveAndExit: () => void; onReady: () => void; }>((props, ref) => {
    const { paperData, onSave, onSaveAndExit, onReady } = props;
    
    // --- STATE ---
    const [pages, setPages] = useState<PageData[]>([]);
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [styles, setStyles] = useState<PaperStyles>({ fontFamily: "Times New Roman", headingColor: '#000000', borderColor: '#000000', borderWidth: 1, borderStyle: 'solid' });
    const [isExporting, setIsExporting] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // --- INITIALIZATION ---
    useEffect(() => {
        const initialHtml = generateHtmlFromPaperData(paperData, {
            logoConfig: paperData.schoolLogo ? { src: paperData.schoolLogo, alignment: 'center' } : undefined
        });
        
        const initialPageId = 'page-1';
        setPages([{
            id: initialPageId,
            htmlContent: initialHtml,
            images: []
        }]);
        setActivePageId(initialPageId);
        onReady();
    }, []);

    // --- PAGE ACTIVATION ---
    const handlePageClick = (pageId: string) => {
        setActivePageId(pageId);
    };

    // --- TEXT ENGINE (NO-JUMP) ---
    const handleTextChange = (pageId: string, content: string) => {
        setPages(prev => prev.map(p => {
            if (p.id === pageId) {
                // Check overflow
                const el = editorRefs.current[pageId];
                const isOverflowing = el ? el.scrollHeight > el.clientHeight : false;
                return { ...p, htmlContent: content, isOverflowing };
            }
            return p;
        }));
    };

    const execCommand = (command: string, value?: string) => {
        // Ensure the active page text area has focus if it's not currently focused
        if (activePageId && editorRefs.current[activePageId]) {
            const activeEl = editorRefs.current[activePageId];
            if (document.activeElement !== activeEl) {
                activeEl?.focus();
            }
        }
        document.execCommand(command, false, value);
        
        // Sync state after command
        if (activePageId && editorRefs.current[activePageId]) {
            handleTextChange(activePageId, editorRefs.current[activePageId]!.innerHTML);
        }
    };

    // --- PAGE MANAGEMENT ---
    const addPage = () => {
        const newPageId = `page-${Date.now()}`;
        setPages(prev => [...prev, {
            id: newPageId,
            htmlContent: '<div class="p-8"></div>',
            images: []
        }]);
        // Automatically focus new page
        setTimeout(() => {
            setActivePageId(newPageId);
            const el = editorRefs.current[newPageId];
            el?.focus();
        }, 100);
    };

    const deletePage = (pageId: string) => {
        if (pages.length <= 1) {
            alert("You cannot delete the last page.");
            return;
        }
        if (confirm("Are you sure you want to delete this page?")) {
            setPages(prev => prev.filter(p => p.id !== pageId));
            if (activePageId === pageId) {
                setActivePageId(pages[0].id);
            }
        }
    };

    // --- IMAGE ENGINE (Per Page) ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Default to the first page if no active page is selected (though one should be)
        const targetPageId = activePageId || pages[0].id;

        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target?.result as string;
            const newImage: ImageState = {
                id: `img-${Date.now()}`,
                src,
                x: 100, // Default position
                y: 100,
                width: 200,
                height: 200,
                rotation: 0, 
                pageIndex: 0 // Legacy field, not strictly needed with new structure
            };

            setPages(prev => prev.map(p => p.id === targetPageId ? {
                ...p,
                images: [...p.images, newImage]
            } : p));
            setSelectedImageId(newImage.id);
        };
        reader.readAsDataURL(file);
        if (e.target) e.target.value = '';
    };

    const updateImage = (pageId: string, updatedImg: ImageState) => {
        setPages(prev => prev.map(p => p.id === pageId ? {
            ...p,
            images: p.images.map(img => img.id === updatedImg.id ? updatedImg : img)
        } : p));
    };

    const deleteSelectedObject = () => {
        if (!selectedImageId) return;
        setPages(prev => prev.map(p => ({
            ...p,
            images: p.images.filter(img => img.id !== selectedImageId)
        })));
        setSelectedImageId(null);
    };

    // --- EXPORT ENGINE ---
    const handleExport = async () => {
        setIsExporting(true);
        setSelectedImageId(null); // Deselect everything
        await new Promise(r => setTimeout(r, 200)); // Wait for render

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageElements = document.querySelectorAll('.paper-page'); // Select by class
            
            for (let i = 0; i < pageElements.length; i++) {
                if (i > 0) pdf.addPage();
                
                const canvas = await html2canvas(pageElements[i] as HTMLElement, {
                    scale: 2, // 2x scale is usually sufficient for print and faster than 3
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                
                const imgData = canvas.toDataURL('image/jpeg', 0.85); 
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            }
            
            pdf.save(`${paperData.subject}_Paper.pdf`);
        } catch (e) {
            console.error(e);
            alert("Export failed.");
        } finally {
            setIsExporting(false);
        }
    };

    useImperativeHandle(ref, () => ({
        handleSaveAndExitClick: () => {
            const fullHtml = pages.map(p => `<div class="page-break-wrapper">${p.htmlContent}</div>`).join('<hr class="page-break"/>');
            onSave({ ...paperData, htmlContent: fullHtml });
            onSaveAndExit();
        },
        openExportModal: handleExport,
        paperSubject: paperData.subject
    }));

    return (
        <div className="flex flex-col h-screen bg-gray-200 dark:bg-gray-900 overflow-hidden font-sans">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            
            {isExporting && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-md">
                    <SpinnerIcon className="w-12 h-12 mb-4 text-indigo-500" />
                    <p className="text-xl font-bold">Rendering High-Quality PDF...</p>
                </div>
            )}

            {/* --- TOP STICKY TOOLBAR --- */}
            <StickyToolbar 
                onStyleChange={execCommand}
                onInsertImage={() => fileInputRef.current?.click()}
                onAddPage={addPage}
                onDeleteObject={deleteSelectedObject}
                canDeleteObject={!!selectedImageId}
                styles={styles}
            />

            {/* --- WORKSPACE --- */}
            <div 
                className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 scroll-smooth pb-40" 
                onClick={() => setSelectedImageId(null)} 
            >
                {pages.map((page, index) => (
                    <div key={page.id} className="relative group">
                        {/* Page Container */}
                        <div 
                            className={`paper-page relative bg-white shadow-2xl transition-all duration-300 print:shadow-none print:m-0 ${activePageId === page.id ? 'ring-4 ring-indigo-500/20' : ''}`}
                            style={{
                                width: `${A4_WIDTH_PX}px`,
                                height: `${A4_HEIGHT_PX}px`,
                                minWidth: `${A4_WIDTH_PX}px`,
                                minHeight: `${A4_HEIGHT_PX}px`,
                                overflow: 'hidden', // Enforce A4 clipping
                                position: 'relative' // Essential for absolute children
                            }}
                            onMouseDown={() => handlePageClick(page.id)}
                        >
                            {/* --- LAYER 1: TEXT (Bottom) --- */}
                            <div 
                                ref={el => {
                                    editorRefs.current[page.id] = el;
                                }}
                                contentEditable
                                suppressContentEditableWarning
                                className="w-full h-full p-[60px] outline-none prose max-w-none"
                                style={{ 
                                    fontFamily: styles.fontFamily,
                                    color: styles.headingColor,
                                    boxSizing: 'border-box'
                                }}
                                dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                                onBlur={(e) => handleTextChange(page.id, e.currentTarget.innerHTML)}
                                onInput={(e) => {
                                    // Real-time overflow check
                                    const el = e.currentTarget;
                                    if (el.scrollHeight > el.clientHeight && !page.isOverflowing) {
                                        setPages(prev => prev.map(p => p.id === page.id ? { ...p, isOverflowing: true } : p));
                                    } else if (el.scrollHeight <= el.clientHeight && page.isOverflowing) {
                                        setPages(prev => prev.map(p => p.id === page.id ? { ...p, isOverflowing: false } : p));
                                    }
                                }}
                                onClick={(e) => { e.stopPropagation(); handlePageClick(page.id); }} 
                            />

                            {/* --- LAYER 2: IMAGES (Overlay) --- */}
                            <div className="absolute inset-0 pointer-events-none z-10">
                                {page.images.map(img => (
                                    <EditableImage 
                                        key={img.id}
                                        imageState={img}
                                        isSelected={selectedImageId === img.id}
                                        onSelect={() => {
                                            setActivePageId(page.id); // Ensure page becomes active when image is selected
                                            setSelectedImageId(img.id);
                                        }}
                                        onUpdate={(newState) => updateImage(page.id, newState)}
                                    />
                                ))}
                            </div>

                            {/* Page Number Indicator */}
                            <div className="absolute bottom-2 right-4 text-xs text-gray-300 pointer-events-none print:hidden font-mono">
                                Page {index + 1}
                            </div>
                        </div>

                        {/* Page Tools (Delete, etc.) */}
                        <div className="absolute top-0 -right-12 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => deletePage(page.id)}
                                className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white shadow-sm transition-colors"
                                title="Delete Page"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                            </button>
                        </div>

                        {/* Overflow Warning */}
                        {page.isOverflowing && (
                            <div className="absolute bottom-0 left-0 w-full bg-red-500/90 text-white text-xs py-1 text-center font-bold animate-pulse shadow-lg pointer-events-none z-20">
                                ⚠️ Text Overflowing - Content cut off in export
                            </div>
                        )}
                    </div>
                ))}
                
                {/* Add Page Button at Bottom */}
                <button 
                    onClick={addPage}
                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-indigo-600 font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Add Page
                </button>
            </div>
        </div>
    );
});

export default Editor;
