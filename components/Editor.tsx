
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { type QuestionPaperData, type PaperStyles, type ImageState, type WatermarkState, type LogoState } from '../types';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import RichTextToolbar from './RichTextToolbar';
import EditorSidebar from './EditorToolbar';
import { SpinnerIcon } from './icons/SpinnerIcon';
import EditableImage from './EditableImage';
import WatermarkOverlay from './WatermarkOverlay';
import AnswerKey from './AnswerKey';
import ImageGenerationModal from './ImageGenerationModal';
import { useMathRenderer } from '../hooks/useMathRenderer';

const A4_WIDTH_PX = 794; 
const A4_HEIGHT_PX = 1123;
// Padding 60px top/bottom + safety buffer
const MAX_PAGE_HEIGHT = A4_HEIGHT_PX - 120 - 20; 

const Editor = forwardRef<any, { paperData: QuestionPaperData; onSave: (p: QuestionPaperData) => void; onSaveAndExit: () => void; onReady: () => void; }>((props, ref) => {
    const { paperData, onSave, onSaveAndExit, onReady } = props;
    
    // Content State
    const [pagesHtml, setPagesHtml] = useState<string[]>([]);
    const [images, setImages] = useState<ImageState[]>([]);
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false);
    const [isAnswerKeyMode, setIsAnswerKeyMode] = useState(false);
    
    // Styling & Config State
    const [styles, setStyles] = useState<PaperStyles>({ 
        fontFamily: "'Times New Roman', Times, serif", 
        headingColor: '#000000', 
        borderColor: '#000000', 
        borderWidth: 0, 
        borderStyle: 'solid' 
    });
    const [watermark, setWatermark] = useState<WatermarkState>({
        type: 'none', color: 'rgba(255, 0, 0, 0.5)', fontSize: 50, opacity: 0.5, rotation: -45, text: 'DRAFT', src: ''
    });
    const [logo, setLogo] = useState<LogoState>({
        src: paperData.schoolLogo, position: 'header-center', size: 100, opacity: 1
    });
    const [paperSize, setPaperSize] = useState<'a4'|'letter'>('a4');

    // Refs
    const pagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Use Math Renderer Hook
    useMathRenderer(pagesContainerRef, [pagesHtml, isAnswerKeyMode]);

    // Robust Pagination Logic
    useEffect(() => {
        const paginate = async () => {
            // 1. Create a hidden staging container to render the full content
            const container = document.createElement('div');
            Object.assign(container.style, {
                width: `${A4_WIDTH_PX}px`, 
                position: 'absolute', 
                left: '-9999px',
                padding: '60px', 
                boxSizing: 'border-box', 
                backgroundColor: 'white',
                fontFamily: styles.fontFamily,
                visibility: 'hidden'
            });
            container.className = 'prose max-w-none';
            
            // Pass branding and answer key mode to HTML generator
            const htmlContent = generateHtmlFromPaperData(paperData, { 
                logoConfig: logo.position !== 'none' ? { src: logo.src, alignment: logo.position.includes('left') ? 'left' : logo.position.includes('right') ? 'right' : 'center' } : undefined,
                isAnswerKey: isAnswerKeyMode
            });
            
            container.innerHTML = htmlContent;
            document.body.appendChild(container);

            // 2. Wait for fonts/images
            await document.fonts.ready;
            await new Promise(resolve => setTimeout(resolve, 50)); 
            
            const contentRoot = container.querySelector('#paper-root');
            if (!contentRoot) {
                document.body.removeChild(container);
                return;
            }

            const children = Array.from(contentRoot.children);
            const pages: string[] = [];
            let currentPageHtml = ""; 
            let currentHeight = 0;

            // 3. Iterate through blocks and distribute into pages
            for (let i = 0; i < children.length; i++) {
                const el = children[i] as HTMLElement;
                
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                const marginTop = parseFloat(style.marginTop) || 0;
                const marginBottom = parseFloat(style.marginBottom) || 0;
                const elementTotalHeight = rect.height + marginTop + marginBottom;

                if (currentHeight + elementTotalHeight > MAX_PAGE_HEIGHT) { 
                    if (currentPageHtml) pages.push(currentPageHtml);
                    currentPageHtml = el.outerHTML; 
                    currentHeight = elementTotalHeight; 
                } else {
                    currentPageHtml += el.outerHTML; 
                    currentHeight += elementTotalHeight;
                }
            }

            if (currentPageHtml) pages.push(currentPageHtml);
            
            document.body.removeChild(container);
            setPagesHtml(pages.length > 0 ? pages : [htmlContent]);
            onReady();
        };
        paginate();
    }, [paperData, styles.fontFamily, isAnswerKeyMode, logo]);

    // --- Handlers ---

    const handleStyleChange = (key: keyof PaperStyles, value: string | number) => {
        setStyles(prev => ({ ...prev, [key]: value }));
    };

    const handleBrandingUpdate = (updates: Partial<{ logo: LogoState; watermark: WatermarkState }>) => {
        if (updates.logo) setLogo(prev => ({ ...prev, ...updates.logo }));
        if (updates.watermark) setWatermark(prev => ({ ...prev, ...updates.watermark }));
    };

    const handleImageUpdate = (id: string, updates: Partial<ImageState>) => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
    };

    const handleDeleteImage = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
        setSelectedImageId(null);
    };

    const insertImage = (src: string, width: number, height: number) => {
        // Calculate centered position for current view or default to page 1
        const pageIndex = 0; 
        const aspectRatio = width / height;
        const displayWidth = Math.min(300, width);
        const displayHeight = displayWidth / aspectRatio;
        
        const newImage: ImageState = {
            id: `img-${Date.now()}`,
            src,
            x: (A4_WIDTH_PX - displayWidth) / 2,
            y: 100, 
            width: displayWidth, 
            height: displayHeight, 
            pageIndex, 
            rotation: 0
        };
        setImages(prev => [...prev, newImage]);
        setSelectedImageId(newImage.id);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            const imgObj = new Image();
            imgObj.onload = () => insertImage(src, imgObj.width, imgObj.height);
            imgObj.src = src;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent, pageIndex: number) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        const file = files[0];
        if (!file.type.startsWith('image/')) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const reader = new FileReader();
        reader.onload = (event) => {
            const src = event.target?.result as string;
            const imgObj = new Image();
            imgObj.onload = () => {
                const aspectRatio = imgObj.width / imgObj.height;
                const displayWidth = 200;
                const displayHeight = displayWidth / aspectRatio;

                const newImage: ImageState = {
                    id: `img-${Date.now()}`,
                    src,
                    x: x - (displayWidth / 2),
                    y: y - (displayHeight / 2),
                    width: displayWidth,
                    height: displayHeight,
                    pageIndex,
                    rotation: 0
                };
                setImages(prev => [...prev, newImage]);
                setSelectedImageId(newImage.id);
            };
            imgObj.src = src;
        };
        reader.readAsDataURL(file);
    };

    const handleExportPDF = async () => {
        if (isExporting) return;
        setIsExporting(true);
        setSelectedImageId(null); 

        try {
            const pdf = new jsPDF('p', 'px', 'a4');
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const pageElements = pagesContainerRef.current?.querySelectorAll('.paper-page');
            
            if (pageElements) {
                for (let i = 0; i < pageElements.length; i++) {
                    const el = pageElements[i] as HTMLElement;
                    const canvas = await html2canvas(el, { 
                        scale: 2, 
                        useCORS: true, 
                        backgroundColor: '#ffffff',
                        logging: false
                    });
                    const imgData = canvas.toDataURL('image/png');
                    if (i > 0) pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
                }
            }
            pdf.save(`${paperData.subject.replace(/\s+/g, '_')}_Paper.pdf`);
        } catch (error) {
            console.error(error);
            alert("Export Failed: " + (error as any).message);
        } finally {
            setIsExporting(false);
        }
    };

    useImperativeHandle(ref, () => ({
        handleSaveAndExitClick: onSaveAndExit,
        openExportModal: handleExportPDF,
        openAnswerKeyModal: () => setShowAnswerKeyModal(true),
        paperSubject: paperData.subject,
        isSaving: false,
        isAnswerKeyMode
    }));

    return (
        <div className="flex h-screen bg-slate-200 dark:bg-gray-900 overflow-hidden relative">
            {/* Left Sidebar: Controls */}
            <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-full overflow-y-auto z-20 shrink-0">
                <EditorSidebar 
                    styles={styles}
                    onStyleChange={handleStyleChange}
                    paperSize={paperSize}
                    onPaperSizeChange={setPaperSize}
                    logo={logo}
                    watermark={watermark}
                    onBrandingUpdate={handleBrandingUpdate}
                    onOpenImageModal={() => setIsImageModalOpen(true)}
                    onUploadImageClick={() => fileInputRef.current?.click()}
                    isAnswerKeyMode={isAnswerKeyMode}
                    onToggleShowQuestions={() => setIsAnswerKeyMode(!isAnswerKeyMode)}
                />
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col h-full relative">
                <RichTextToolbar editorRef={pagesContainerRef} isExporting={isExporting} />
                
                <main 
                    className="flex-1 overflow-auto p-8 bg-slate-300 dark:bg-slate-950/20 flex flex-col items-center" 
                    ref={pagesContainerRef} 
                    onClick={() => setSelectedImageId(null)}
                >
                    {pagesHtml.map((html, i) => (
                        <div 
                            key={i} 
                            className="paper-page bg-white shadow-2xl mb-10 relative print:shadow-none print:mb-0 group transition-all" 
                            style={{ 
                                width: A4_WIDTH_PX, 
                                height: A4_HEIGHT_PX, 
                                position: 'relative', 
                                overflow: 'hidden',
                                borderColor: styles.borderColor,
                                borderWidth: `${styles.borderWidth}px`,
                                borderStyle: styles.borderStyle,
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, i)}
                        >
                            {/* Watermark */}
                            <WatermarkOverlay config={watermark} />

                            {/* Content */}
                            <div 
                                 contentEditable={!isAnswerKeyMode}
                                 suppressContentEditableWarning={true}
                                 className="paper-page-content prose max-w-none outline-none relative z-10" 
                                 style={{ 
                                     fontFamily: styles.fontFamily, 
                                     height: '100%', 
                                     padding: '60px',
                                     boxSizing: 'border-box',
                                     color: styles.headingColor // Applies to text mostly
                                 }} 
                                 dangerouslySetInnerHTML={{ __html: html }} 
                            />

                            {/* Images */}
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

                            <div className="absolute bottom-4 right-8 text-xs text-slate-300 pointer-events-none select-none z-20">
                                Page {i + 1}
                            </div>
                        </div>
                    ))}
                    
                    {pagesHtml.length === 0 && (
                        <div className="flex flex-col items-center justify-center mt-20 text-slate-500">
                            <SpinnerIcon className="w-8 h-8 mb-2" />
                            <p>Formatting paper...</p>
                        </div>
                    )}
                </main>
            </div>

            {/* Hidden Input & Modals */}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            
            {isImageModalOpen && (
                <ImageGenerationModal 
                    onClose={() => setIsImageModalOpen(false)} 
                    onInsertImage={insertImage} 
                />
            )}

            {showAnswerKeyModal && (
                <AnswerKey 
                    questions={paperData.questions} 
                    subject={paperData.subject} 
                    className={paperData.className} 
                    onClose={() => setShowAnswerKeyModal(false)} 
                />
            )}

            {isExporting && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white">
                    <SpinnerIcon className="w-16 h-16 mb-4 text-indigo-400" />
                    <h2>Generating PDF... Please wait.</h2>
                </div>
            )}
        </div>
    );
});

export default Editor;
