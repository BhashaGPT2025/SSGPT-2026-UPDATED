import React, { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { type QuestionPaperData } from '../types';
import { SSGPT_LOGO_URL } from '../constants';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface PublicPaperViewProps {
    paper: QuestionPaperData;
    onExit: () => void;
}

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

const PublicPaperView: React.FC<PublicPaperViewProps> = ({ paper, onExit }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [pagesHtml, setPagesHtml] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!paper.htmlContent) return;

        const paginate = () => {
            const stagingContainer = document.createElement('div');
            stagingContainer.style.position = 'absolute';
            stagingContainer.style.left = '-9999px';
            stagingContainer.style.width = `${A4_WIDTH_PX - 140}px`; // 70px padding left/right
            stagingContainer.style.visibility = 'hidden';
            stagingContainer.className = "prose dark:prose-invert max-w-none";
            stagingContainer.innerHTML = paper.htmlContent;
            document.body.appendChild(stagingContainer);

            const pageHeight = A4_HEIGHT_PX - 120; // 60px padding top/bottom
            const children = Array.from(stagingContainer.querySelector('div')?.children || []);
            const newPages: string[] = [];
            let currentPageContent = '';
            let currentHeight = 0;

            children.forEach(child => {
                const element = child as HTMLElement;
                const computedStyle = window.getComputedStyle(element);
                const elementHeight = element.offsetHeight + parseInt(computedStyle.marginTop, 10) + parseInt(computedStyle.marginBottom, 10);

                if (currentHeight + elementHeight > pageHeight && currentPageContent) {
                    newPages.push(currentPageContent);
                    currentPageContent = '';
                    currentHeight = 0;
                }
                currentPageContent += element.outerHTML;
                currentHeight += elementHeight;
            });

            if (currentPageContent) {
                newPages.push(currentPageContent);
            }

            document.body.removeChild(stagingContainer);
            setPagesHtml(newPages.length ? newPages : ['']);
            
            // Trigger math rendering
            setTimeout(() => {
                if (containerRef.current && (window as any).renderMathInElement) {
                    (window as any).renderMathInElement(containerRef.current, {
                        delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false},
                        ],
                        throwOnError: false
                    });
                }
            }, 50);
        };

        const timer = setTimeout(paginate, 100);
        return () => clearTimeout(timer);
    }, [paper.htmlContent]);

    const handleExport = async () => {
        setIsExporting(true);
        const printableArea = document.getElementById('printable-area');
        if (!printableArea) {
            console.error("Printable area not found.");
            setIsExporting(false);
            return;
        }

        const pages = printableArea.querySelectorAll('.paper-page');
        if (!pages || pages.length === 0) {
            alert("Nothing to export.");
            setIsExporting(false);
            return;
        }

        try {
            const pdf = new jsPDF('p', 'px', 'a4');
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i] as HTMLElement;
                const canvas = await html2canvas(page, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    windowWidth: page.scrollWidth,
                    windowHeight: page.scrollHeight,
                });
                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            }
            pdf.save(`${paper.subject.replace(/\s+/g, '_')}_paper.pdf`);
        } catch (error) {
            console.error("Failed to export PDF:", error);
            alert("An error occurred while exporting the PDF. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="bg-slate-200 dark:bg-gray-900 min-h-screen" ref={containerRef}>
            <header className="print:hidden sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg z-40 border-b border-slate-200/80 dark:border-slate-700/80 shadow-sm p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <img src={SSGPT_LOGO_URL} alt="SSGPT Logo" className="w-8 h-8" />
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{paper.subject}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Shared via SSGPT</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExport} disabled={isExporting} className="w-28 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-wait">
                        {isExporting ? <SpinnerIcon className="w-5 h-5" /> : 'Export'}
                    </button>
                    <button onClick={onExit} disabled={isExporting} className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Back to App</button>
                </div>
            </header>
            <main className="py-8 px-4">
                 <div id="printable-area">
                    {pagesHtml.map((html, index) => (
                        <div key={index} className="paper-page bg-white dark:bg-slate-900 shadow-2xl mx-auto mb-8" style={{ width: `${A4_WIDTH_PX}px`, height: `${A4_HEIGHT_PX}px` }}>
                            <div 
                                className="prose dark:prose-invert max-w-none" 
                                style={{padding: '60px 70px', height: '100%'}} 
                                dangerouslySetInnerHTML={{ __html: html }} 
                            />
                        </div>
                    ))}
                 </div>
            </main>
        </div>
    );
};
export default PublicPaperView;