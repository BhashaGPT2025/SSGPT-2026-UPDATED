
import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import { QuestionPaperData } from '../types';
import { CustomImage } from './EditorImage';
import { UploadIcon } from './icons/UploadIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
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

const Editor = React.forwardRef<any, EditorProps>(({ paperData, onSaveAndExit, onReady }, ref) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
      }),
      Placeholder.configure({
        placeholder: 'Start typing your question paper...',
      }),
      CustomImage.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: '', 
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[1000px] p-12 outline-none',
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (coordinates) {
                const node = schema.nodes.image.create({ src: e.target?.result });
                const transaction = view.state.tr.insert(coordinates.pos, node);
                view.dispatch(transaction);
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      }
    },
  });

  useEffect(() => {
    if (editor && paperData) {
      // Small delay to ensure editor is mounted
      setTimeout(() => {
          const initialHtml = generateHtmlFromPaperData(paperData);
          editor.commands.setContent(initialHtml);
          onReady();
      }, 100);
    }
  }, [editor, paperData, onReady]);

  React.useImperativeHandle(ref, () => ({
    handleSaveAndExitClick: onSaveAndExit,
    openExportModal: handleExportPDF,
    paperSubject: paperData.subject,
    openAnswerKeyModal: () => {},
    isAnswerKeyMode: false,
    isSaving: false,
    undo: () => editor?.chain().focus().undo().run(),
    redo: () => editor?.chain().focus().redo().run(),
    canUndo: editor?.can().undo(),
    canRedo: editor?.can().redo(),
  }));

  const insertImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      editor?.chain().focus().setImage({ src: event.target?.result as string }).run();
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) insertImage(file);
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        insertImage(file);
      }
    }
  };

  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    // Target the specific Prosemirror content div
    const element = document.querySelector('.ProseMirror');
    if (!element) {
        setIsExporting(false);
        return;
    }

    try {
        const canvas = await html2canvas(element as HTMLElement, {
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

    } catch (error) {
        console.error("Export failed", error);
        alert("Could not export PDF. Please try again.");
    } finally {
        setIsExporting(false);
    }
  };

  if (!editor) {
    return <div className="flex items-center justify-center h-screen"><SpinnerIcon className="w-8 h-8 text-indigo-600" /></div>;
  }

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
            onChange={handleImageUpload} 
            className="hidden" 
            accept="image/*" 
        />
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-2" />
        <p className="text-xs text-slate-500 dark:text-slate-400">
            Click anywhere to edit text • Drag image handles to resize • Drag & Drop to upload
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-200 dark:bg-slate-950">
        <div 
            className="bg-white text-black shadow-2xl transition-all prose-lg print:shadow-none"
            style={{
                width: `${A4_WIDTH_PX}px`,
                minHeight: `${A4_HEIGHT_PX}px`,
                maxWidth: '100%',
                padding: '0', 
            }}
        >
            <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});

export default Editor;
