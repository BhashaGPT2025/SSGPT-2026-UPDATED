
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { type QuestionPaperData, type PaperStyles, type ImageState, type WatermarkState } from '../types';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import RichTextToolbar from './RichTextToolbar';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { UploadIcon } from './icons/UploadIcon';
import EditableImage from './EditableImage';
import WatermarkOverlay from './WatermarkOverlay';
import { useMathRenderer } from '../hooks/useMathRenderer';

const A4_WIDTH_PX = 794; 
const A4_HEIGHT_PX = 1123;

const Editor = forwardRef<any, { paperData: QuestionPaperData; onSave: (p: QuestionPaperData) => void; onSaveAndExit: () => void; onReady: () => void; }>((props, ref) => {
    const { paperData, onSave, onSaveAndExit, onReady } = props;
    
    // Content State
    const [pagesHtml, setPagesHtml] = useState<string[]>([]);
    const [images, setImages] = useState<ImageState[]>([]);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    
    // Configuration State (Should ideally come from props/parent, defaulted here for now)
    const [watermark, setWatermark] = useState<WatermarkState>({
        type: 'none', color: 'rgba(0,0,0,0.1)', fontSize: 40, opacity: 0.2, rotation: -45
    });

    // Refs
    const pagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Use Math Renderer Hook
    useMathRenderer(pagesContainerRef, [pagesHtml]);

    const styles: PaperStyles = { 
        fontFamily: "'Times New Roman', Times, serif", 
        headingColor: '#000000', 
        borderColor: '#000000', 
        borderWidth: 1, 
        borderStyle: 'solid' 
    };

    // Initial Pagination Logic
    useEffect(() => {
        const paginate = async () => {
            const container = document.createElement('div');
            Object.assign(container.style, {
                width: `${A4_WIDTH_PX}px`, position: 'absolute', left: '-9999px',
                padding: '60px', boxSizing: 'border-box', backgroundColor: 'white',
                fontFamily: styles.fontFamily
            });
            container.className = 'prose max-w-none';
            
            const htmlContent = generateHtmlFromPaperData(paperData, { 
                logoConfig: paperData.schoolLogo ? { src: paperData.schoolLogo, alignment: 'center' } : undefined
            });
            container.innerHTML = htmlContent;
            document.body.appendChild(container);

            // Wait for fonts?
            await document.fonts.ready;
            
            const contentRoot = container.querySelector('#paper-root');
            const children = Array.from(contentRoot?.children || []);
            const pages: string[] = [];
            let currentPageHtml = ""; 
            let currentHeight = 0;
            const maxPageHeight = A4_HEIGHT_PX - 120; // Padding

            children.forEach(child => {
                const el = child as HTMLElement;
                const rect = el.getBoundingClientRect();
                if (currentHeight + rect.height > maxPageHeight) { 
                    pages.push(currentPageHtml); 
                    currentPageHtml = ""; 
                    currentHeight = 0; 
                }
                currentPageHtml += el.outerHTML; 
                currentHeight += rect.height;
            });

            if (currentPageHtml) pages.push(currentPageHtml);
            document.body.removeChild(container);
            setPagesHtml(pages.length > 0 ? pages : [htmlContent]);
            onReady();
        };
        paginate();
    }, [paperData]);

    // Image Handlers
    const handleImageUpdate = (id: string, updates: Partial<ImageState>) => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
    };

    const handleDeleteImage = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
        setSelectedImageId(null);
    };

    const handleDrop = (e: React.DragEvent, pageIndex: number) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files) as File[];
        if (files.length === 0) return;

        const file = files[0];
        if (!file.type.startsWith('image/')) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target?.result as string;
            const newImage: ImageState = {
                id: `img-${Date.now()}`,
                src,
                x: x - 100, // Center on mouse
                y: y - 100,
                width: 200,
                height: 200, // Placeholder, usually wait for onload to get aspect ratio
                pageIndex,
                rotation: 0
            };
            setImages(prev => [...prev, newImage]);
            setSelectedImageId(newImage.id);
        };
        reader.readAsDataURL(file);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            const newImage: ImageState = {
                id: `img-${Date.now()}`,
                src,
                x: 100, y: 100, width: 200, height: 200, pageIndex: 0, rotation: 0
            };
            setImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleExportPDF = async () => {
        if (isExporting) return;
        setIsExporting(true);
        setSelectedImageId(null); // Deselect to hide handles

        try {
            const pdf = new jsPDF('p', 'px', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const pageElements = pagesContainerRef.current?.querySelectorAll('.paper-page');
            
            if (pageElements) {
                for (let i = 0; i < pageElements.length; i++) {
                    const el = pageElements[i] as HTMLElement;
                    const canvas = await html2canvas(el, { 
                        scale: 2, useCORS: true, backgroundColor: '#ffffff' 
                    });
                    const imgData = canvas.toDataURL('image/png');
                    if (i > 0) pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
                }
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
        setWatermarkConfig: setWatermark, // Expose setter for parent toolbar
        isSaving: false
    }));

    return (
        <div className="flex flex-col h-full bg-slate-200 dark:bg-gray-900 relative">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            
            {isExporting && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white">
                    <SpinnerIcon className="w-16 h-16 mb-4 text-indigo-400" />
                    <h2>Generating PDF...</h2>
                </div>
            )}

            <button 
                onClick={() => fileInputRef.current?.click()}
                className="fixed top-24 right-8 z-50 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-indigo-700 transition-all font-semibold text-sm hover:scale-105"
            >
                <UploadIcon className="w-4 h-4" /> Add Image
            </button>

            <RichTextToolbar editorRef={pagesContainerRef} isExporting={isExporting} />

            <main className="flex-1 overflow-auto p-8 bg-slate-300 dark:bg-slate-950/20" ref={pagesContainerRef} onClick={() => setSelectedImageId(null)}>
                {pagesHtml.map((html, i) => (
                    <div 
                        key={i} 
                        className="paper-page bg-white shadow-2xl mx-auto mb-10 relative print:shadow-none print:mb-0 group" 
                        style={{ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, position: 'relative', overflow: 'hidden' }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, i)}
                    >
                        {/* 1. Watermark Layer (Background) */}
                        <WatermarkOverlay config={watermark} />

                        {/* 2. Text Content Layer (Middle) */}
                        <div 
                             contentEditable={true}
                             suppressContentEditableWarning={true}
                             className="paper-page-content prose max-w-none outline-none relative z-10" 
                             style={{ 
                                 fontFamily: styles.fontFamily, 
                                 height: '100%', 
                                 padding: '60px',
                                 boxSizing: 'border-box'
                             }} 
                             dangerouslySetInnerHTML={{ __html: html }} 
                        />

                        {/* 3. Image Layer (Top) */}
                        {images.filter(img => img.pageIndex === i).map(img => (
                            <EditableImage
                                key={img.id}
                                imageState={img}
                                isSelected={selectedImageId === img.id}
                                onSelect={() => setSelectedImageId(img.id)}
                                onUpdateImage={handleImageUpdate}
                                onDelete={() => handleDeleteImage(img.id)}
                            />
                        ))}

                        <div className="absolute bottom-4 right-8 text-xs text-slate-300 pointer-events-none select-none z-0">
                            Page {i + 1}
                        </div>
                    </div>
                ))}
                
                {pagesHtml.length === 0 && (
                    <div className="text-center text-slate-500 mt-20">Loading content...</div>
                )}
            </main>
        </div>
    );
});

export default Editor;
