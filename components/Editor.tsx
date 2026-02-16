
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { type QuestionPaperData, type PaperStyles, type ImageState, type TextBoxState, WatermarkState, LogoState } from '../types';
import { editPaperContent, generateHtmlFromPaperData } from '../services/geminiService';
import EditorSidebar from './EditorToolbar';
import { FormattingToolbar } from './FormattingToolbar';
import { ImageControlOverlay } from './EditorImage';
import CoEditorChat, { type CoEditorMessage } from './CoEditorChat';
import { AiIcon } from './icons/AiIcon';
import { GalleryIcon } from './icons/GalleryIcon';
import { ImageGallery } from './ImageGallery';
import { SpinnerIcon } from './icons/SpinnerIcon';

const A4_WIDTH_PX = 794; 
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
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    }, [paperData]);

    // Handle styles updating dynamically without re-rendering innerHTML (to preserve cursor/selection)
    useEffect(() => {
        if(editorContentRef.current) {
            editorContentRef.current.style.fontFamily = styles.fontFamily;
            editorContentRef.current.style.color = styles.headingColor;
        }
    }, [styles]);

    const handleAiEdit = async (instruction: string) => {
        if (!editorContentRef.current || isCoEditorTyping) return;
        
        setIsCoEditorTyping(true);
        setCoEditorMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: instruction }]);
        
        try {
            const currentHtml = editorContentRef.current.innerHTML;
            const newHtml = await editPaperContent(currentHtml, instruction);
            
            if (newHtml && newHtml !== currentHtml) {
                editorContentRef.current.innerHTML = newHtml;
                setCoEditorMessages(prev => [...prev, { id: (Date.now()+1).toString(), sender: 'bot', text: "I've updated the paper." }]);
                onSave({ ...paperData, htmlContent: newHtml }); // Auto-save
            } else {
                setCoEditorMessages(prev => [...prev, { id: (Date.now()+1).toString(), sender: 'bot', text: "I couldn't make any meaningful changes based on that instruction." }]);
            }
        } catch (e) {
            console.error(e);
            setCoEditorMessages(prev => [...prev, { id: (Date.now()+1).toString(), sender: 'bot', text: "Sorry, I encountered an error while editing." }]);
        } finally {
            setIsCoEditorTyping(false);
        }
    };

    const handleExportPDF = async () => {
        if (isExporting || !editorContentRef.current) return;
        setIsExporting(true);
        
        // Temporarily hide UI overlays
        const wasSelected = selectedImage;
        setSelectedImage(null);
        await new Promise(r => setTimeout(r, 50));

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
            if (wasSelected) setSelectedImage(wasSelected);
        } catch (e) {
            alert("Export failed.");
        } finally {
            setIsExporting(false);
        }
    };

    // --- Image Handling (Native Drag & Drop + Click) ---
    const insertImageAtCursor = (base64Data: string) => {
        if (!editorContentRef.current) return;
        editorContentRef.current.focus();
        
        const img = document.createElement('img');
        img.src = base64Data;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.margin = '10px auto';
        
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && editorContentRef.current.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);
            range.collapse(false);
        } else {
            editorContentRef.current.appendChild(img);
        }
        setSelectedImage(img);
    };

    const handleFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => e.target?.result && insertImageAtCursor(e.target.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleEditorClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            setSelectedImage(target as HTMLImageElement);
            e.stopPropagation();
        } else {
            setSelectedImage(null);
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
        <div className="flex h-full bg-slate-100 dark:bg-gray-900 overflow-hidden relative">
            {isExporting && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center text-white">
                    <SpinnerIcon className="w-12 h-12 mb-4" />
                    <p className="text-xl font-bold">Generating PDF...</p>
                </div>
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
                    {sidebarView === 'chat' && <CoEditorChat messages={coEditorMessages} isTyping={isCoEditorTyping} onSendMessage={handleAiEdit} />}
                    {sidebarView === 'gallery' && <ImageGallery isCompact onEditImage={() => {}} />}
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-200 dark:bg-slate-950/30">
                <FormattingToolbar onInsertImage={() => fileInputRef.current?.click()} />
                <input type="file" ref={fileInputRef} onChange={e => handleFiles(e.target.files)} className="hidden" accept="image/*" />

                <div className="flex-1 overflow-y-auto p-8 flex justify-center relative" id="editor-scroller"
                     onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                     onDragOver={e => e.preventDefault()}
                >
                    <div className="relative">
                        <div 
                            ref={editorContentRef}
                            contentEditable
                            suppressContentEditableWarning
                            onClick={handleEditorClick}
                            className="bg-white text-black shadow-2xl transition-all prose-lg print:shadow-none outline-none"
                            style={{
                                width: `${A4_WIDTH_PX}px`,
                                minHeight: `${A4_HEIGHT_PX}px`,
                                maxWidth: '100%',
                                padding: '60px', // Standard print padding
                                boxSizing: 'border-box'
                            }}
                        />
                        
                        {/* Overlay Controls */}
                        {selectedImage && (
                            <ImageControlOverlay 
                                imageElement={selectedImage} 
                                onDeselect={() => setSelectedImage(null)} 
                                containerRef={editorContentRef}
                            />
                        )}

                        {/* Watermark Rendering Overlay (Pointer Events None) */}
                        {watermark.type !== 'none' && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0" style={{ opacity: watermark.opacity }}>
                                {watermark.type === 'text' && (
                                    <div style={{ 
                                        transform: `rotate(${watermark.rotation}deg)`, 
                                        fontSize: `${watermark.fontSize}px`, 
                                        color: watermark.color,
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap'
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
