
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { type QuestionPaperData } from '../types';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';
import { SpinnerIcon } from './icons/SpinnerIcon';

const A4_WIDTH_PX = 794; 
const A4_HEIGHT_PX = 1123;

const Editor = forwardRef<any, { paperData: QuestionPaperData; onSave: (p: QuestionPaperData) => void; onSaveAndExit: () => void; onReady: () => void; }>((props, ref) => {
    const { paperData, onSave, onSaveAndExit, onReady } = props;
    
    // Minimal state
    const [isExporting, setIsExporting] = useState(false);
    const [isAnswerKeyMode, setIsAnswerKeyMode] = useState(false);
    
    const editorContentRef = useRef<HTMLDivElement>(null);

    // Initialize content
    useEffect(() => {
        if (editorContentRef.current) {
            const html = generateHtmlFromPaperData(paperData, {
                // Use default logo config if exists in paperData
                logoConfig: paperData.schoolLogo ? { src: paperData.schoolLogo, alignment: 'center' } : undefined,
                isAnswerKey: isAnswerKeyMode
            });
            editorContentRef.current.innerHTML = html;
            onReady();
        }
    }, [paperData, isAnswerKeyMode, onReady]);

    const handleExportPDF = async () => {
        if (isExporting || !editorContentRef.current) return;
        setIsExporting(true);
        
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
            console.error(e);
            alert("Export failed.");
        } finally {
            setIsExporting(false);
        }
    };

    useImperativeHandle(ref, () => ({
        handleSaveAndExitClick: () => {
            if(editorContentRef.current) {
                onSave({ ...paperData, htmlContent: editorContentRef.current.innerHTML });
            }
            onSaveAndExit();
        },
        openExportModal: handleExportPDF,
        openAnswerKeyModal: () => setIsAnswerKeyMode(p => !p),
        paperSubject: paperData.subject,
        isAnswerKeyMode,
        undo: () => document.execCommand('undo'),
        redo: () => document.execCommand('redo'),
        canUndo: true,
        canRedo: true,
        isSaving: false
    }));

    return (
        <div className="flex h-full bg-slate-100 dark:bg-gray-900 overflow-hidden relative justify-center">
            {isExporting && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center text-white">
                    <SpinnerIcon className="w-12 h-12 mb-4" />
                    <p className="text-xl font-bold">Generating PDF...</p>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-8 flex justify-center relative" id="editor-scroller">
                <div className="relative">
                    <div 
                        ref={editorContentRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="bg-white text-black shadow-2xl transition-all prose-lg print:shadow-none outline-none"
                        style={{
                            width: `${A4_WIDTH_PX}px`,
                            minHeight: `${A4_HEIGHT_PX}px`,
                            maxWidth: '100%',
                            padding: '60px',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
            </div>
        </div>
    );
});

export default Editor;
