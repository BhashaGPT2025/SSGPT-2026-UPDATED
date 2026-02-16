
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

interface PageData {
    id: string;
    htmlContent: string; // Text content
    images: ImageState[];
}

const Editor = forwardRef<any, { paperData: QuestionPaperData; onSave: (p: QuestionPaperData) => void; onSaveAndExit: () => void; onReady: () => void; }>((props, ref) => {
    const { paperData, onSave, onSaveAndExit, onReady } = props;
    
    // --- STATE ---
    const [pages, setPages] = useState<PageData[]>([]);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [styles, setStyles] = useState<PaperStyles>({ fontFamily: "Times New Roman", headingColor: '#000000', borderColor: '#000000', borderWidth: 1, borderStyle: 'solid' });
    const [isExporting, setIsExporting] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // --- INITIALIZATION ---
    useEffect(() => {
        // Initialize with one page containing the generated content
        const initialHtml = generateHtmlFromPaperData(paperData, {
            logoConfig: paperData.schoolLogo ? { src: paperData.schoolLogo, alignment: 'center' } : undefined
        });
        
        setPages([{
            id: 'page-1',
            htmlContent: initialHtml,
            images: []
        }]);
        onReady();
    }, []);

    // --- TEXT ENGINE (NO-JUMP) ---
    // We do NOT bind value={page.htmlContent} to the div. We only set it initially.
    // We update the state only on blur or specific actions to avoid cursor jumping.
    
    const handleTextChange = (pageId: string, content: string) => {
        setPages(prev => prev.map(p => p.id === pageId ? { ...p, htmlContent: content } : p));
    };

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        // Sync current page content
        const activeEl = document.activeElement;
        if (activeEl?.getAttribute('contenteditable') === 'true') {
            // Find which page this belongs to
            const pageId = Object.keys(editorRefs.current).find(key => editorRefs.current[key] === activeEl);
            if (pageId && activeEl) {
                handleTextChange(pageId, activeEl.innerHTML);
            }
        }
    };

    // --- PAGE MANAGEMENT ---
    const addPage = () => {
        setPages(prev => [...prev, {
            id: `page-${Date.now()}`,
            htmlContent: '<div class="p-8">New Page</div>',
            images: []
        }]);
    };

    // --- IMAGE ENGINE (CANVA-STYLE) ---
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target?.result as string;
            // Add image to the currently "active" page or the first page if none active
            // For simplicity, we add to the last page or Page 1
            const targetPageId = pages[pages.length - 1].id;
            
            const newImage: ImageState = {
                id: `img-${Date.now()}`,
                src,
                x: 100, y: 100, width: 200, height: 200, rotation: 0, pageIndex: 0 // pageIndex unused in new model
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
                    scale: 3, // High Quality 300 DPIish
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                
                const imgData = canvas.toDataURL('image/jpeg', 0.9); // JPEG for smaller file size
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
            // Combine all pages into one HTML string for storage
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
                className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 scroll-smooth" 
                onClick={() => setSelectedImageId(null)} // Deselect on background click
            >
                {pages.map((page, index) => (
                    <div 
                        key={page.id}
                        className="paper-page relative bg-white shadow-2xl transition-shadow hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] print:shadow-none print:m-0"
                        style={{
                            width: `${A4_WIDTH_PX}px`,
                            height: `${A4_HEIGHT_PX}px`,
                            minWidth: `${A4_WIDTH_PX}px`,
                            minHeight: `${A4_HEIGHT_PX}px`,
                            overflow: 'hidden' // Clip content to A4
                        }}
                    >
                        {/* --- LAYER 1: TEXT (Bottom) --- */}
                        <div 
                            ref={el => editorRefs.current[page.id] = el}
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
                            onClick={(e) => e.stopPropagation()} // Allow text selection
                        />

                        {/* --- LAYER 2: IMAGES (Overlay) --- */}
                        <div className="absolute inset-0 pointer-events-none no-export-handles">
                            {page.images.map(img => (
                                <EditableImage 
                                    key={img.id}
                                    imageState={img}
                                    isSelected={selectedImageId === img.id}
                                    onSelect={() => setSelectedImageId(img.id)}
                                    onUpdate={(newState) => updateImage(page.id, newState)}
                                />
                            ))}
                        </div>

                        {/* Page Number Indicator */}
                        <div className="absolute bottom-2 right-4 text-xs text-gray-300 pointer-events-none print:hidden">
                            Page {index + 1}
                        </div>
                    </div>
                ))}
                
                {/* Spacer for bottom scroll */}
                <div className="h-20" />
            </div>
        </div>
    );
});

export default Editor;
