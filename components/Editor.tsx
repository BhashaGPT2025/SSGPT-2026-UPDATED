
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { type QuestionPaperData, type PaperStyles } from '../types';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import RichTextToolbar from './RichTextToolbar';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { UploadIcon } from './icons/UploadIcon';
import Cropper from 'react-cropper';
import "cropperjs/dist/cropper.css";

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
    
    // Crop State
    const [cropState, setCropState] = useState<{ isOpen: boolean; img: HTMLImageElement | null; src: string }>({ isOpen: false, img: null, src: '' });
    const [cropper, setCropper] = useState<any>();

    // Refs
    const pagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
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
        paginate();
    }, []);

    // Advanced Image Interaction (Drag, Resize, Select)
    useEffect(() => {
        let activeOverlay: HTMLElement | null = null;
        let isDragging = false;
        let isResizing = false;
        let startX = 0, startY = 0;
        let startLeft = 0, startTop = 0, startWidth = 0, startHeight = 0;
        let activeHandle = '';
        let currentImg: HTMLElement | null = null;

        const clearSelection = () => {
            if (activeOverlay) {
                activeOverlay.remove();
                activeOverlay = null;
                currentImg = null;
            }
        };

        const updateOverlayPosition = () => {
            if (!activeOverlay || !currentImg) return;
            activeOverlay.style.top = currentImg.style.top;
            activeOverlay.style.left = currentImg.style.left;
            activeOverlay.style.width = currentImg.style.width;
            activeOverlay.style.height = currentImg.style.height;
        };

        const createSelection = (img: HTMLElement) => {
            clearSelection();
            currentImg = img;
            
            // Create overlay box
            const overlay = document.createElement('div');
            overlay.className = 'absolute border-2 border-indigo-600 z-50 selection-overlay'; 
            overlay.style.pointerEvents = 'none'; // Let events pass to document, but handles will capture
            overlay.style.top = img.style.top;
            overlay.style.left = img.style.left;
            overlay.style.width = img.style.width;
            overlay.style.height = img.style.height;
            overlay.style.boxSizing = 'border-box';
            
            // Create resize handles
            const handles = ['nw', 'ne', 'sw', 'se'];
            handles.forEach(pos => {
                const handle = document.createElement('div');
                handle.className = `absolute w-3 h-3 bg-white border border-indigo-600 pointer-events-auto`;
                handle.style.cursor = `${pos}-resize`;
                handle.style.zIndex = '51';
                
                // Position handles
                if (pos.includes('n')) handle.style.top = '-6px'; else handle.style.bottom = '-6px';
                if (pos.includes('w')) handle.style.left = '-6px'; else handle.style.right = '-6px';
                
                handle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    isResizing = true;
                    activeHandle = pos;
                    startX = e.clientX;
                    startY = e.clientY;
                    startWidth = parseFloat(img.style.width);
                    startHeight = parseFloat(img.style.height);
                    startLeft = parseFloat(img.style.left);
                    startTop = parseFloat(img.style.top);
                });
                
                overlay.appendChild(handle);
            });

            // Append to the same container as the image (the page content)
            img.parentElement?.appendChild(overlay);
            activeOverlay = overlay;
        };

        const handleMouseDown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // If dragging selection handle, handled by listener above.
            // Check if clicking an image
            if (target.classList.contains('draggable-image')) {
                // If it's a different image or no image selected, select it
                if (currentImg !== target) {
                    createSelection(target);
                }
                
                // Start dragging
                isDragging = true;
                currentImg = target;
                startX = e.clientX;
                startY = e.clientY;
                startLeft = parseFloat(target.style.left || '0');
                startTop = parseFloat(target.style.top || '0');
                e.preventDefault(); // Prevent text selection
            } else if (!target.closest('.selection-overlay') && !isResizing) {
                // Clicked elsewhere, deselect
                clearSelection();
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (isResizing && currentImg) {
                e.preventDefault();
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;

                // Simple resize logic
                if (activeHandle.includes('e')) newWidth += dx;
                if (activeHandle.includes('w')) { newWidth -= dx; newLeft += dx; }
                if (activeHandle.includes('s')) newHeight += dy;
                if (activeHandle.includes('n')) { newHeight -= dy; newTop += dy; }

                if (newWidth > 20 && newHeight > 20) {
                    currentImg.style.width = `${newWidth}px`;
                    currentImg.style.height = `${newHeight}px`;
                    currentImg.style.left = `${newLeft}px`;
                    currentImg.style.top = `${newTop}px`;
                    updateOverlayPosition();
                }
            } else if (isDragging && currentImg) {
                e.preventDefault();
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                currentImg.style.left = `${startLeft + dx}px`;
                currentImg.style.top = `${startTop + dy}px`;
                updateOverlayPosition();
            }
        };

        const handleMouseUp = () => {
            isDragging = false;
            isResizing = false;
        };

        // Double Click to Crop
        const handleDblClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('draggable-image') && target instanceof HTMLImageElement) {
                setCropState({ isOpen: true, img: target, src: target.src });
                clearSelection(); // Clear selection box during crop
            }
        };

        const container = pagesContainerRef.current;
        if (container) {
            container.addEventListener('mousedown', handleMouseDown);
            container.addEventListener('dblclick', handleDblClick);
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            if (container) {
                container.removeEventListener('mousedown', handleMouseDown);
                container.removeEventListener('dblclick', handleDblClick);
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            clearSelection();
        };
    }, [pagesHtml]); // Re-bind if pages change, though pagesHtml changes rarely after init

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
            // Find visible page or default to first
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
                img.draggable = false;
                firstPageContent.appendChild(img);
            } else {
                alert("Could not find a page to insert the image.");
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleSaveInternal = () => {
        if (!pagesContainerRef.current) return;
        // Clean up overlays before saving
        const overlays = pagesContainerRef.current.querySelectorAll('.selection-overlay');
        overlays.forEach(o => o.remove());

        let fullHtml = '';
        const pages = pagesContainerRef.current.querySelectorAll('.paper-page-content');
        pages.forEach(page => {
            fullHtml += page.innerHTML;
        });
        
        const updatedPaper = { ...paperData, htmlContent: fullHtml };
        onSave(updatedPaper);
        return updatedPaper;
    };

    const handleCropApply = () => {
        if (cropper && cropState.img) {
            const croppedData = cropper.getCroppedCanvas().toDataURL();
            cropState.img.src = croppedData;
            // Reset dimensions to match new aspect ratio if needed, or keep bounds? 
            // Usually valid to reset styles if ratio changed drastically, but let's keep width and auto height
            cropState.img.style.height = 'auto'; 
            setCropState({ isOpen: false, img: null, src: '' });
        }
    };

    const handleExportPDF = async () => {
        if (isExporting) return;
        setIsExporting(true);
        // Clear selection handles before export
        const overlays = pagesContainerRef.current?.querySelectorAll('.selection-overlay');
        overlays?.forEach(o => o.remove());

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

            {/* Cropper Modal */}
            {cropState.isOpen && (
                <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-4xl h-[70vh] bg-black">
                        <Cropper
                            src={cropState.src}
                            style={{ height: '100%', width: '100%' }}
                            initialAspectRatio={NaN}
                            guides={true}
                            viewMode={1}
                            dragMode="move"
                            cropBoxMovable={true}
                            cropBoxResizable={true}
                            onInitialized={(instance) => setCropper(instance)}
                        />
                    </div>
                    <div className="mt-4 flex gap-4">
                        <button 
                            onClick={() => setCropState({ isOpen: false, img: null, src: '' })}
                            className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 font-bold"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleCropApply}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-bold"
                        >
                            Apply Crop
                        </button>
                    </div>
                </div>
            )}

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
                                 position: 'relative' 
                             }} 
                             dangerouslySetInnerHTML={{ __html: html }} 
                        />
                        <div className="absolute bottom-4 right-8 text-xs text-slate-300 pointer-events-none select-none">
                            Page {i + 1}
                        </div>
                    </div>
                ))}
                
                <div className="text-center text-slate-500 text-sm pb-10">
                    Tip: Click text to edit. <b>Double-click images to crop.</b> Click & drag corners to resize.
                </div>
            </main>
        </div>
    );
});

export default Editor;
