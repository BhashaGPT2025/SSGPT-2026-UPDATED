
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { type QuestionPaperData } from '../types';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import RichTextToolbar from './RichTextToolbar';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { UploadIcon } from './icons/UploadIcon';

const Editor = forwardRef<any, { paperData: QuestionPaperData; onSave: (p: QuestionPaperData) => void; onSaveAndExit: () => void; onReady: () => void; }>((props, ref) => {
    const { paperData, onSave, onSaveAndExit, onReady } = props;
    const editorRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Initial load
    useEffect(() => {
        if (editorRef.current) {
            // Load the generated HTML into the editable area
            editorRef.current.innerHTML = generateHtmlFromPaperData(paperData);
            
            // Attempt to trigger KaTeX rendering if available globally
            if ((window as any).renderMathInElement) {
                try {
                    (window as any).renderMathInElement(editorRef.current, {
                        delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false},
                            {left: '\\(', right: '\\)', display: false},
                            {left: '\\[', right: '\\]', display: true}
                        ],
                        throwOnError: false
                    });
                } catch (e) {
                    console.warn('Math rendering failed', e);
                }
            }
        }
        onReady();
    }, [paperData, onReady]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            // Insert image at cursor or append if no focus
            if (document.activeElement === editorRef.current) {
                document.execCommand('insertImage', false, result);
            } else {
                // Fallback: append to end
                const img = document.createElement('img');
                img.src = result;
                img.style.maxWidth = '100%';
                img.style.display = 'block';
                img.style.margin = '10px auto';
                editorRef.current?.appendChild(img);
            }
        };
        reader.readAsDataURL(file);
        // Reset input
        e.target.value = '';
    };

    const handleExportPDF = async () => {
        if (!editorRef.current) return;
        setIsExporting(true);
        
        // Wait a bit for UI to update
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const element = editorRef.current;
            
            // High quality capture
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pdfWidth = 210;
            const pdfHeight = 297;
            
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            // Add first page
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
            
            // Add subsequent pages if content overflows
            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`${paperData.subject.replace(/\s+/g, '_')}_Paper.pdf`);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Could not export PDF. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleSaveInternal = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            onSave({ ...paperData, htmlContent: html });
        }
    };

    useImperativeHandle(ref, () => ({
        handleSaveAndExitClick: () => {
            handleSaveInternal();
            onSaveAndExit();
        },
        openExportModal: handleExportPDF,
        openAnswerKeyModal: () => alert("Answer Key view is available in dashboard."),
        undo: () => document.execCommand('undo'),
        redo: () => document.execCommand('redo'),
        canUndo: true,
        canRedo: true,
        isAnswerKeyMode: false,
        isSaving: false,
        paperSubject: paperData.subject
    }));

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center pt-8 pb-20 overflow-y-auto">
            {isExporting && (
                <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <SpinnerIcon className="w-12 h-12 text-indigo-500 mb-4" />
                    <p className="text-xl font-bold">Generating PDF...</p>
                </div>
            )}

            <RichTextToolbar editorRef={editorRef} />

            <div className="w-full max-w-[210mm] mb-4 flex justify-between items-center px-4 md:px-0">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Editable Preview
                </span>
                <label className="cursor-pointer flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-semibold">
                    <UploadIcon className="w-4 h-4" />
                    <span>Insert Image</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
            </div>

            <div className="relative shadow-2xl print:shadow-none">
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="bg-white text-black min-h-[297mm] w-[210mm] p-[20mm] outline-none prose max-w-none shadow-sm selection:bg-indigo-200 selection:text-indigo-900"
                    style={{
                        fontFamily: "'Times New Roman', Times, serif",
                        lineHeight: '1.5'
                    }}
                />
            </div>
            
            <div className="mt-8 text-center text-slate-400 text-sm">
                <p>Tip: You can edit text directly on the page.</p>
            </div>
        </div>
    );
});

export default Editor;
