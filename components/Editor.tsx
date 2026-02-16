
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import { QuestionPaperData } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ImageControlOverlay } from './EditorImage';
import { EditorToolbar } from './EditorToolbar';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- Constants ---
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PIXELS_PER_MM = 3.7795275591; 
const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * PIXELS_PER_MM);
const A4_HEIGHT_PX = Math.round(A4_HEIGHT_MM * PIXELS_PER_MM);

interface EditorProps {
  paperData: QuestionPaperData;
  onSave: (p: QuestionPaperData) => void;
  onSaveAndExit: () => void;
  onReady: () => void;
}

const Editor = React.forwardRef<any, EditorProps>(({ paperData, onSaveAndExit, onReady, onSave }, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isExporting, setIsExporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  
  // Initialize content once
  useEffect(() => {
    if (editorRef.current && paperData) {
        if (!editorRef.current.innerHTML) {
            const initialHtml = generateHtmlFromPaperData(paperData);
            editorRef.current.innerHTML = initialHtml;
        }
        onReady();
    }
  }, [paperData, onReady]);

  // Handle outside clicks to deselect images
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (selectedImage && editorRef.current && !editorRef.current.contains(e.target as Node)) {
            setSelectedImage(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedImage]);

  // Expose methods to parent
  React.useImperativeHandle(ref, () => ({
    handleSaveAndExitClick: () => {
        handleSave();
        onSaveAndExit();
    },
    openExportModal: handleExportPDF,
    paperSubject: paperData.subject,
    openAnswerKeyModal: () => {},
    isAnswerKeyMode: false,
    isSaving: false,
    undo: () => document.execCommand('undo'),
    redo: () => document.execCommand('redo'),
    canUndo: true, 
    canRedo: true, 
  }));

  const handleSave = () => {
      if (!editorRef.current) return;
      const content = editorRef.current.innerHTML;
      onSave({
          ...paperData,
          htmlContent: content
      });
  };

  // --- Image Handling ---

  const insertImageAtCursor = (base64Data: string) => {
      if (!editorRef.current) return;
      editorRef.current.focus();
      
      const img = document.createElement('img');
      img.src = base64Data;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '10px auto';
      img.className = 'editor-image';

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(img);
          range.collapse(false);
      } else {
          editorRef.current.appendChild(img);
      }
      
      setSelectedImage(img);
      handleSave();
  };

  const handleFiles = (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
              if (e.target?.result) {
                  insertImageAtCursor(e.target.result as string);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // --- Interaction Handlers ---

  const handleEditorClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
          setSelectedImage(target as HTMLImageElement);
          e.stopPropagation();
      } else {
          setSelectedImage(null);
      }
  };

  const handleExportPDF = async () => {
    if (isExporting || !editorRef.current) return;
    setIsExporting(true);
    
    try {
        const wasSelected = selectedImage;
        setSelectedImage(null);
        await new Promise(r => setTimeout(r, 50));

        const canvas = await html2canvas(editorRef.current, {
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

        pdf.save(`${paperData.subject || 'paper'}.pdf`);
        if (wasSelected) setSelectedImage(wasSelected);

    } catch (error) {
        console.error("Export failed", error);
        alert("Could not export PDF. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div 
        className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={handleDrop}
    >
        {isExporting && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center text-white">
                <SpinnerIcon className="w-12 h-12 mb-4" />
                <p className="text-xl font-bold">Generating PDF...</p>
            </div>
        )}

        {isDragOver && (
           <div className="absolute inset-0 z-50 bg-indigo-500/10 backdrop-blur-sm flex items-center justify-center border-4 border-indigo-500 border-dashed m-4 rounded-xl pointer-events-none transition-all">
               <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center animate-bounce">
                   <p className="text-2xl font-bold text-slate-800 dark:text-white">Drop image to insert</p>
               </div>
           </div>
        )}

      {/* Editor Toolbar at the top */}
      <EditorToolbar onInsertImage={() => fileInputRef.current?.click()} />
      
      <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => { handleFiles(e.target.files); if (e.target) e.target.value = ''; }} 
          className="hidden" 
          accept="image/*" 
      />

      <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-200 dark:bg-slate-950 relative" id="editor-scroller">
        <div className="relative">
            <div 
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onClick={handleEditorClick}
                onInput={() => {/* Autosave logic if needed */}}
                className="bg-white text-black shadow-2xl transition-all prose-lg print:shadow-none outline-none"
                style={{
                    width: `${A4_WIDTH_PX}px`,
                    minHeight: `${A4_HEIGHT_PX}px`,
                    maxWidth: '100%',
                    padding: '0', 
                }}
            />
            {selectedImage && (
                <ImageControlOverlay 
                    imageElement={selectedImage} 
                    onDeselect={() => setSelectedImage(null)} 
                    containerRef={editorRef}
                />
            )}
        </div>
      </div>
    </div>
  );
});

export default Editor;
