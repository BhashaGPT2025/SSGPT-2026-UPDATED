
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
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
const PAGE_PADDING_Y = 120; // 60px top + 60px bottom

interface PageData {
    id: string;
    htmlContent: string;
    images: ImageState[];
}

// --- PaperPage Sub-Component (Memoized) ---
const PaperPage = React.memo(({ 
    pageData, 
    isActive, 
    styles,
    selectedImageId, 
    onPageClick, 
    onUpdateContent, 
    onOverflow, 
    onImageSelect, 
    onImageUpdate 
}: {
    pageData: PageData;
    isActive: boolean;
    styles: PaperStyles;
    selectedImageId: string | null;
    onPageClick: (id: string) => void;
    onUpdateContent: (id: string, html: string) => void;
    onOverflow: (id: string, content: string) => void;
    onImageSelect: (id: string | null) => void;
    onImageUpdate: (pageId: string, img: ImageState) => void;
}) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Sync content to parent state ONLY on blur to prevent cursor jumps
    const handleBlur = () => {
        if (editorRef.current) {
            onUpdateContent(pageData.id, editorRef.current.innerHTML);
        }
    };

    // Auto-Pagination Logic
    const handleInput = useCallback(() => {
        const el = editorRef.current;
        if (!el) return;

        if (el.scrollHeight > el.clientHeight) {
            // Find the last significant node to move
            let lastNode = el.lastElementChild;
            
            // Skip empty text nodes or BRs at the very end
            while (lastNode && (lastNode.nodeName === 'BR' || (lastNode.nodeType === Node.TEXT_NODE && !lastNode.textContent?.trim()))) {
                lastNode.remove();
                lastNode = el.lastElementChild;
            }

            if (lastNode) {
                const contentToMove = lastNode.outerHTML;
                lastNode.remove(); // Remove from DOM immediately
                onOverflow(pageData.id, contentToMove); // Trigger parent to add to next page
            }
        }
    }, [onOverflow, pageData.id]);

    // Handle initial HTML load
    useEffect(() => {
        if (editorRef.current && pageData.htmlContent && editorRef.current.innerHTML !== pageData.htmlContent) {
            // Only update innerHTML if it's significantly different (e.g. initial load or external update)
            // But if we are active, we generally trust our local DOM state unless strictly forced.
            // For this implementation, we allow initial load.
            if (!isActive) {
                 editorRef.current.innerHTML = pageData.htmlContent;
            } else if (editorRef.current.innerHTML === '') {
                 editorRef.current.innerHTML = pageData.htmlContent;
            }
        }
    }, [pageData.htmlContent, isActive]);

    // Ensure focus if active
    useEffect(() => {
        if (isActive && editorRef.current && document.activeElement !== editorRef.current) {
            // Check if we clicked on an image, if so, don't steal focus
            if (!selectedImageId) {
                editorRef.current.focus();
            }
        }
    }, [isActive, selectedImageId]);

    return (
        <div 
            className={`paper-page relative bg-white shadow-2xl transition-all duration-300 print:shadow-none print:m-0 group ${isActive ? 'ring-4 ring-indigo-500/20' : ''}`}
            style={{
                width: `${A4_WIDTH_PX}px`,
                height: `${A4_HEIGHT_PX}px`,
                minWidth: `${A4_WIDTH_PX}px`,
                minHeight: `${A4_HEIGHT_PX}px`,
                overflow: 'hidden',
                position: 'relative'
            }}
            onMouseDown={() => onPageClick(pageData.id)}
        >
            {/* Text Layer */}
            <div 
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="w-full h-full p-[60px] outline-none prose max-w-none box-border"
                style={{ 
                    fontFamily: styles.fontFamily,
                    color: styles.headingColor,
                }}
                onBlur={handleBlur}
                onInput={handleInput}
            />

            {/* Image Layer */}
            <div className="absolute inset-0 pointer-events-none z-10">
                {pageData.images.map(img => (
                    <EditableImage 
                        key={img.id}
                        imageState={img}
                        isSelected={selectedImageId === img.id}
                        onSelect={() => {
                            onPageClick(pageData.id);
                            onImageSelect(img.id);
                        }}
                        onUpdate={(newState) => onImageUpdate(pageData.id, newState)}
                    />
                ))}
            </div>

            {/* Page Footer */}
            <div className="absolute bottom-2 right-4 text-xs text-gray-300 pointer-events-none print:hidden font-mono">
                {pageData.id}
            </div>
        </div>
    );
}, (prev, next) => {
    // Optimization: Don't re-render active page on text updates from parent (since we have local state)
    // Re-render if: images changed, active state changed, styles changed, or selected image changed.
    const isImagesChanged = prev.pageData.images !== next.pageData.images;
    const isActiveChanged = prev.isActive !== next.isActive;
    const isSelectionChanged = prev.selectedImageId !== next.selectedImageId;
    const isStylesChanged = prev.styles !== next.styles;
    
    // If active, ignore htmlContent prop changes to prevent cursor reset
    if (next.isActive && !isActiveChanged && !isImagesChanged && !isSelectionChanged && !isStylesChanged) {
        return true; 
    }
    
    return !isImagesChanged && !isActiveChanged && !isSelectionChanged && !isStylesChanged && prev.pageData.htmlContent === next.pageData.htmlContent;
});


const Editor = forwardRef<any, { paperData: QuestionPaperData; onSave: (p: QuestionPaperData) => void; onSaveAndExit: () => void; onReady: () => void; }>((props, ref) => {
    const { paperData, onSave, onSaveAndExit, onReady } = props;
    
    // --- STATE ---
    const [pages, setPages] = useState<PageData[]>([]);
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [styles, setStyles] = useState<PaperStyles>({ fontFamily: "Times New Roman", headingColor: '#000000', borderColor: '#000000', borderWidth: 1, borderStyle: 'solid' });
    const [isExporting, setIsExporting] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // --- HANDLERS ---

    const handlePageClick = useCallback((id: string) => {
        setActivePageId(id);
        // Deselect image if clicking on page body
        // setSelectedImageId(null); // Moved to container click
    }, []);

    const handleUpdateContent = useCallback((pageId: string, html: string) => {
        setPages(prev => prev.map(p => p.id === pageId ? { ...p, htmlContent: html } : p));
    }, []);

    const handleOverflow = useCallback((pageId: string, contentToMove: string) => {
        setPages(prev => {
            const index = prev.findIndex(p => p.id === pageId);
            if (index === -1) return prev;

            const newPages = [...prev];
            const nextPage = newPages[index + 1];

            if (nextPage) {
                newPages[index + 1] = {
                    ...nextPage,
                    htmlContent: contentToMove + nextPage.htmlContent
                };
                // We'll switch focus to next page in useEffect or timeout
            } else {
                const newId = `page-${Date.now()}`;
                newPages.push({
                    id: newId,
                    htmlContent: contentToMove,
                    images: []
                });
            }
            return newPages;
        });
        
        // Auto-switch focus to next page shortly after overflow
        setTimeout(() => {
            setPages(currentPages => {
                const idx = currentPages.findIndex(p => p.id === pageId);
                if (idx !== -1 && idx + 1 < currentPages.length) {
                    setActivePageId(currentPages[idx + 1].id);
                }
                return currentPages;
            });
        }, 50);
    }, []);

    const handleImageUpdate = useCallback((pageId: string, updatedImg: ImageState) => {
        setPages(prev => prev.map(p => p.id === pageId ? {
            ...p,
            images: p.images.map(img => img.id === updatedImg.id ? updatedImg : img)
        } : p));
    }, []);

    const handleImageSelect = useCallback((imgId: string | null) => {
        setSelectedImageId(imgId);
    }, []);

    const addPage = useCallback(() => {
        const newId = `page-${Date.now()}`;
        setPages(prev => [...prev, {
            id: newId,
            htmlContent: '',
            images: []
        }]);
        setActivePageId(newId);
    }, []);

    const execCommand = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activePageId) return;
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            const newImage: ImageState = {
                id: `img-${Date.now()}`,
                src,
                x: 100, y: 100, width: 200, height: 200, rotation: 0, pageIndex: 0
            };
            setPages(prev => prev.map(p => p.id === activePageId ? { ...p, images: [...p.images, newImage] } : p));
            setSelectedImageId(newImage.id);
        };
        reader.readAsDataURL(file);
        if (e.target) e.target.value = '';
    };

    const deleteSelectedObject = () => {
        if (!selectedImageId) return;
        setPages(prev => prev.map(p => ({
            ...p,
            images: p.images.filter(img => img.id !== selectedImageId)
        })));
        setSelectedImageId(null);
    };

    // --- EXPORT ---
    const handleExport = async () => {
        setIsExporting(true);
        setSelectedImageId(null);
        await new Promise(r => setTimeout(r, 200));

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageElements = document.querySelectorAll('.paper-page');
            
            for (let i = 0; i < pageElements.length; i++) {
                if (i > 0) pdf.addPage();
                const canvas = await html2canvas(pageElements[i] as HTMLElement, {
                    scale: 2,
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
            // Simple serialization: Concatenate all pages with a separator
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

            <StickyToolbar 
                onStyleChange={execCommand}
                onInsertImage={() => fileInputRef.current?.click()}
                onAddPage={addPage}
                onDeleteObject={deleteSelectedObject}
                canDeleteObject={!!selectedImageId}
                styles={styles}
            />

            <div 
                className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 scroll-smooth pb-40" 
                onClick={() => setSelectedImageId(null)}
            >
                {pages.map((page) => (
                    <PaperPage 
                        key={page.id}
                        pageData={page}
                        isActive={activePageId === page.id}
                        styles={styles}
                        selectedImageId={selectedImageId}
                        onPageClick={handlePageClick}
                        onUpdateContent={handleUpdateContent}
                        onOverflow={handleOverflow}
                        onImageSelect={handleImageSelect}
                        onImageUpdate={handleImageUpdate}
                    />
                ))}
                
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
