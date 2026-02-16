
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { type QuestionPaperData, type PaperStyles, WatermarkState, LogoState, UploadedImage } from '../types';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import EditorSidebar from './EditorToolbar';
import { ImageResizeOverlay } from './ImageResizeOverlay';
import CoEditorChat, { type CoEditorMessage } from './CoEditorChat';
import { AiIcon } from './icons/AiIcon';
import { GalleryIcon } from './icons/GalleryIcon';
import { ImageGallery } from './ImageGallery';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ProImageEditor } from './ProImageEditor';

const A4_WIDTH_PX = 794; 
// Standard A4 height at 96 DPI is approx 1123px. 
// We use this for visual page breaks.
const A4_HEIGHT_PX = 1123;

const Editor = forwardRef<any, { paperData: QuestionPaperData; onSave: (p: QuestionPaperData) => void; onSaveAndExit: () => void; onReady: () => void; }>((props, ref) => {
    const { paperData, onSave, onSaveAndExit, onReady } = props;
    
    // -- EDITOR STATE --
    const [styles, setStyles] = useState<PaperStyles>({ fontFamily: "'Times New Roman', Times, serif", headingColor: '#000000', borderColor: '#000000', borderWidth: 1, borderStyle: 'solid' });
    const [logo, setLogo] = useState<LogoState>({ src: paperData.schoolLogo, position: paperData.schoolLogo ? 'header-center' : 'none', size: 150, opacity: 1 });
    const [watermark, setWatermark] = useState<WatermarkState>({ type: 'none', text: 'DRAFT', color: '#cccccc', fontSize: 80, opacity: 0.1, rotation: -45 });
    
    const [isExporting, setIsExporting] = useState(false);
    const [isAnswerKeyMode, setIsAnswerKeyMode] = useState(false);
    const [sidebarView, setSidebarView] = useState<'design' | 'chat' | 'gallery'>('design');
    
    // -- AI STATE --
    const [coEditorMessages, setCoEditorMessages] = useState<CoEditorMessage[]>([{ id: '1', sender: 'bot', text: "Paper ready. I can edit the content for you—just ask!" }]);
    const [isCoEditorTyping, setIsCoEditorTyping] = useState(false);

    // -- IMAGE STATE --
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const [imageToCrop, setImageToCrop] = useState<UploadedImage | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Track last selection to insert images correctly even if focus is lost
    const lastSelectionRange = useRef<Range | null>(null);

    // -- REFS --
    const editorContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initialize content
        if (editorContentRef.current) {
            const html = generateHtmlFromPaperData(paperData, {
                logoConfig: logo.src ? { src: logo.src, alignment: 'center' } : undefined,
                isAnswerKey: isAnswerKeyMode
            });
            editorContentRef.current.innerHTML = html;
            onReady();
        }
    }, [paperData]); // Initial load only

    // Dynamic Style Updates
    useEffect(() => {
        if(editorContentRef.current) {
            editorContentRef.current.style.fontFamily = styles.fontFamily;
            editorContentRef.current.style.color = styles.headingColor;
        }
    }, [styles]);

    // Keep track of cursor position
    const saveSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (editorContentRef.current?.contains(range.commonAncestorContainer)) {
                lastSelectionRange.current = range.cloneRange();
            }
        }
    };

    // Handle Image Selection inside Editor
    const handleEditorClick = (e: React.MouseEvent) => {
        saveSelection();
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG' && editorContentRef.current?.contains(target)) {
            setSelectedImage(target as HTMLImageElement);
            e.stopPropagation();
        } else {
            setSelectedImage(null);
        }
    };

    const handleEditorKeyUp = () => {
        saveSelection();
    };

    // Insert Image Logic
    const insertImageAtCursor = (url: string) => {
        if (!editorContentRef.current) return;
        
        // Restore selection if lost, or default to end of doc
        const selection = window.getSelection();
        selection?.removeAllRanges();
        if (lastSelectionRange.current) {
            selection?.addRange(lastSelectionRange.current);
        } else {
            // Focus and move to end
            editorContentRef.current.focus();
            const range = document.createRange();
            range.selectNodeContents(editorContentRef.current);
            range.collapse(false);
            selection?.addRange(range);
        }
        
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '80%'; // Default size
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '10px auto';
        img.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        
        // Insert
        const range = selection?.getRangeAt(0);
        if (range) {
            range.deleteContents();
            range.insertNode(img);
            // Move cursor after image
            range.setStartAfter(img);
            range.setEndAfter(img);
            selection?.removeAllRanges();
            selection?.addRange(range);
            lastSelectionRange.current = range;
        }
        
        // Auto-select the new image for resizing
        setTimeout(() => setSelectedImage(img), 100);
    };

    // Handle File Upload from Sidebar Button
    const handleFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => e.target?.result && insertImageAtCursor(e.target.result as string);
            reader.readAsDataURL(file);
        }
    };

    // Drag and Drop Logic
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 1. Calculate drop position
        let range: Range | undefined;
        // Standard way to get range from point
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(e.clientX, e.clientY) || undefined;
        } else if ((document as any).caretPositionFromPoint) {
            // Firefox fallback
            const pos = (document as any).caretPositionFromPoint(e.clientX, e.clientY);
            if (pos) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.collapse(true);
            }
        }

        // Set the selection to the drop point
        if (range && editorContentRef.current?.contains(range.commonAncestorContainer)) {
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            lastSelectionRange.current = range;
        }

        // 2. Handle files dragged from desktop
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
            return;
        }

        // 3. Handle images dragged from Gallery
        const imgSrc = e.dataTransfer.getData('image/src');
        if (imgSrc) {
            insertImageAtCursor(imgSrc);
        }
    };

    // Handling Crop/Edit Request from Overlay
    const handleRequestCrop = (src: string) => {
        // We create a temp UploadedImage object to pass to ProImageEditor
        setImageToCrop({
            id: 'temp-crop',
            url: src,
            name: 'Editing Image',
            width: selectedImage?.naturalWidth || 800,
            height: selectedImage?.naturalHeight || 600,
            size: 0, type: 'image/png', thumbnailUrl: src, folderId: null, createdAt: 0, updatedAt: 0, tags: []
        });
    };

    const handleCropSave = (newUrl: string) => {
        if (selectedImage) {
            selectedImage.src = newUrl;
            // Force refresh overlay dimensions
            const temp = selectedImage;
            setSelectedImage(null);
            setTimeout(() => setSelectedImage(temp), 50);
        }
        setImageToCrop(null);
    };

    const handleExportPDF = async () => {
        if (isExporting || !editorContentRef.current) return;
        setIsExporting(true);
        setSelectedImage(null); // Deselect image before capture
        await new Promise(r => setTimeout(r, 100)); // Wait for overlay to disappear

        try {
            const canvas = await html2canvas(editorContentRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
              position = heightLeft - imgHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
              heightLeft -= pdfHeight;
            }

            pdf.save(`${paperData.subject}.pdf`);
        } catch (e) {
            alert("Export failed.");
        } finally {
            setIsExporting(false);
        }
    };

    useImperativeHandle(ref, () => ({
        handleSaveAndExitClick: onSaveAndExit,
        openExportModal: handleExportPDF,
        openAnswerKeyModal: () => setIsAnswerKeyMode(p => !p),
        paperSubject: paperData.subject,
        isAnswerKeyMode
    }));

    return (
        <div className="flex h-full bg-slate-200 dark:bg-gray-900 overflow-hidden relative">
            {isExporting && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center text-white">
                    <SpinnerIcon className="w-12 h-12 mb-4" />
                    <p className="text-xl font-bold">Generating PDF...</p>
                </div>
            )}
            
            {imageToCrop && (
                <ProImageEditor 
                    image={imageToCrop} 
                    onClose={() => setImageToCrop(null)} 
                    onSave={handleCropSave}
                />
            )}

            {/* --- SIDEBAR --- */}
            <div className="w-80 bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col shadow-xl z-20">
                <div className="flex border-b dark:border-slate-800">
                    <button onClick={() => setSidebarView('design')} className={`flex-1 p-3 text-xs font-bold uppercase tracking-wider ${sidebarView === 'design' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Design</button>
                    <button onClick={() => setSidebarView('chat')} className={`flex-1 p-3 text-xs font-bold uppercase tracking-wider ${sidebarView === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><AiIcon className="w-4 h-4 mx-auto"/></button>
                    <button onClick={() => setSidebarView('gallery')} className={`flex-1 p-3 text-xs font-bold uppercase tracking-wider ${sidebarView === 'gallery' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><GalleryIcon className="w-4 h-4 mx-auto"/></button>
                </div>
                <div className="flex-1 overflow-y-auto chat-scrollbar">
                    {sidebarView === 'design' && (
                        <EditorSidebar 
                            styles={styles} 
                            onStyleChange={(k, v) => setStyles(s => ({...s, [k]: v}))} 
                            paperSize="a4" 
                            onPaperSizeChange={()=>{}} 
                            logo={logo} 
                            watermark={watermark} 
                            onBrandingUpdate={u => { if(u.logo) setLogo(l=>({...l,...u.logo})); if(u.watermark) setWatermark(w=>({...w,...u.watermark})); }} 
                            onOpenImageModal={() => {}} 
                            onUploadImageClick={() => fileInputRef.current?.click()} 
                            isAnswerKeyMode={isAnswerKeyMode}
                            onToggleShowQuestions={() => setIsAnswerKeyMode(p => !p)}
                        />
                    )}
                    {sidebarView === 'chat' && <CoEditorChat messages={coEditorMessages} isTyping={isCoEditorTyping} onSendMessage={() => {}} />}
                    {sidebarView === 'gallery' && <ImageGallery isCompact onEditImage={() => {}} onInsertImage={insertImageAtCursor} />}
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-200 dark:bg-slate-950/30">
                <input type="file" ref={fileInputRef} onChange={e => handleFiles(e.target.files)} className="hidden" accept="image/*" />

                <div className="flex-1 overflow-y-auto p-8 flex justify-center relative" id="editor-scroller"
                     onDrop={handleDrop}
                     onDragOver={e => e.preventDefault()}
                     onClick={() => setSelectedImage(null)}
                >
                    <div className="relative pb-20">
                        {/* Page Container */}
                        <div 
                            ref={editorContentRef}
                            contentEditable
                            suppressContentEditableWarning
                            onClick={handleEditorClick}
                            onKeyUp={handleEditorKeyUp}
                            className="bg-white text-black shadow-2xl transition-all prose-lg print:shadow-none outline-none relative"
                            style={{
                                width: `${A4_WIDTH_PX}px`,
                                minHeight: `${A4_HEIGHT_PX}px`,
                                maxWidth: '100%',
                                padding: '60px',
                                boxSizing: 'border-box',
                                // Visual Page Break Simulation using gradient
                                backgroundImage: `linear-gradient(to bottom, transparent calc(${A4_HEIGHT_PX}px - 20px), #e2e8f0 calc(${A4_HEIGHT_PX}px - 20px), #e2e8f0 ${A4_HEIGHT_PX}px, transparent ${A4_HEIGHT_PX}px)`,
                                backgroundSize: `100% ${A4_HEIGHT_PX}px`,
                                backgroundRepeat: 'repeat-y'
                            }}
                        />
                        
                        {/* Inline Image Resizing Overlay */}
                        {selectedImage && (
                            <ImageResizeOverlay 
                                imageElement={selectedImage} 
                                onDeselect={() => setSelectedImage(null)} 
                                onEdit={handleRequestCrop}
                                containerRef={editorContentRef}
                            />
                        )}

                        {/* Watermark Rendering Overlay */}
                        {watermark.type !== 'none' && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0" style={{ opacity: watermark.opacity, height: '100%' }}>
                                {watermark.type === 'text' && (
                                    <div style={{ 
                                        transform: `rotate(${watermark.rotation}deg)`, 
                                        fontSize: `${watermark.fontSize}px`, 
                                        color: watermark.color,
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap',
                                        position: 'fixed', // Fixed to view so it repeats mentally, or actually repeat it if we could
                                        top: '50%',
                                        left: '50%'
                                    }}>
                                        {watermark.text}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default Editor;
