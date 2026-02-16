
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import { QuestionPaperData } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ImageControlOverlay } from './EditorImage'; // Reusing this file for the overlay
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
        // Only set content if empty to prevent overwrites on hot reloads or state shifts
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
      // Clean up any internal selection artifacts if they exist
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

      // Basic Insert
      // We wrap it in a div to ensure block behavior if dropped between paragraphs,
      // but execCommand insertImage is safer for cursor position preservation.
      // However, insertImage doesn't support styling easily. 
      // We'll insert an img tag directly using range.
      
      const img = document.createElement('img');
      img.src = base64Data;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '10px auto';
      img.className = 'editor-image'; // Marker class

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(img);
          range.collapse(false); // Move cursor after image
      } else {
          // If no selection or selection outside, append to end
          editorRef.current.appendChild(img);
      }
      
      // Select the new image immediately
      setSelectedImage(img);
      handleSave(); // Auto-save state
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
          e.stopPropagation(); // Prevent text cursor placement on image click
      } else {
          setSelectedImage(null);
      }
  };

  const handleExportPDF = async () => {
    if (isExporting || !editorRef.current) return;
    setIsExporting(true);
    
    try {
        // Temporarily hide the selection overlay if active
        const wasSelected = selectedImage;
        setSelectedImage(null);
        
        // Wait for render cycle
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
        
        // Restore selection
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
                   <UploadIcon className="w-16 h-16 text-indigo-600 mb-4" />
                   <p className="text-2xl font-bold text-slate-800 dark:text-white">Drop image to insert</p>
               </div>
           </div>
        )}

      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center gap-4 shadow-sm z-10 h-16 shrink-0">
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors font-medium text-sm"
        >
            <UploadIcon className="w-4 h-4" />
            Insert Image
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => { handleFiles(e.target.files); if (e.target) e.target.value = ''; }} 
            className="hidden" 
            accept="image/*" 
        />
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-2" />
        <p className="text-xs text-slate-500 dark:text-slate-400">
            Click image to edit • Drag corners to resize • Drag & Drop files
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-200 dark:bg-slate-950 relative" id="editor-scroller">
        <div className="relative">
            <div 
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onClick={handleEditorClick}
                onInput={() => {/* Optional: Autosave logic could go here */}}
                className="bg-white text-black shadow-2xl transition-all prose-lg print:shadow-none outline-none"
                style={{
                    width: `${A4_WIDTH_PX}px`,
                    minHeight: `${A4_HEIGHT_PX}px`,
                    maxWidth: '100%',
                    padding: '0', 
                }}
            />
            {/* The Overlay component handles the UI for the selected image */}
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
