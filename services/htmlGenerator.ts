import { type QuestionPaperData, type Question, QuestionType } from '../types';

const escapeHtml = (unsafe: string | undefined | null): string => {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const formatText = (text: string = ''): string => {
    const escaped = escapeHtml(text);
    // Replace newlines with <br> but ensure there is some spacing
    return escaped.trim().replace(/\n/g, '<br/>');
};

const toRoman = (num: number): string => {
    const roman = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let str = '';
    for (let i of Object.keys(roman)) {
        const romanKey = i as keyof typeof roman;
        let q = Math.floor(num / roman[romanKey]);
        num -= q * roman[romanKey];
        str += i.repeat(q);
    }
    return str;
};

// CSS styles injected directly into elements to ensure html2canvas captures them correctly
// Using Times New Roman and 1.6 line height as requested for better readability and structure
const styles = {
    root: `font-family: 'Times New Roman', serif; color: #000; background: #fff; width: 100%; min-height: 100%; font-size: 12pt;`,
    questionBlock: `break-inside: avoid; page-break-inside: avoid; margin-bottom: 12px; width: 100%; position: relative; padding-bottom: 4px;`,
    questionTable: `width: 100%; border-collapse: collapse; margin-bottom: 4px;`,
    questionNumberTd: `vertical-align: top; width: 35px; font-weight: 700; font-size: 1.1em; padding-top: 2px;`,
    questionTextTd: `vertical-align: top; text-align: left; padding-right: 12px; padding-top: 2px;`,
    marksTd: `vertical-align: top; text-align: right; width: 60px; font-weight: 600; font-size: 1em; padding-top: 2px;`,
    optionGrid: `display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; padding-left: 35px;`,
    optionItem: `break-inside: avoid; line-height: 1.6; display: flex; align-items: baseline; margin-left: 20px; margin-bottom: 4px;`,
    matchTable: `width: 100%; border-collapse: collapse; margin-top: 12px; border: 1px solid #000;`,
    matchTh: `padding: 8px; border: 1px solid #000; width: 50%; font-weight: 700; text-transform: uppercase; font-size: 0.9em; background-color: #f8fafc;`,
    matchTd: `padding: 8px; border: 1px solid #000; width: 50%; vertical-align: middle; line-height: 1.6;`,
    headerContainer: `text-align: center; width: 100%; margin-bottom: 24px; break-inside: avoid; border-bottom: 2px solid #000; padding-bottom: 12px;`,
    headerSchool: `margin: 0; font-size: 24pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2; margin-bottom: 8px;`,
    headerSub: `margin: 4px 0; font-size: 14pt; font-weight: 600;`,
    metaTable: `width: 100%; margin-top: 12px; font-weight: 600; font-size: 1.1em; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 8px 0;`,
    sectionHeader: `text-align: center; margin: 24px 0 16px; break-inside: avoid; page-break-after: avoid;`,
    sectionTitle: `font-weight: 800; text-transform: uppercase; font-size: 1.2em; border-bottom: 2px solid #000; display: inline-block; padding: 0 16px 4px;`,
    sectionMeta: `display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 16px; font-weight: 600; font-style: italic; color: #475569;`
};

const renderOptions = (question: Question): string => {
    if (question.type === QuestionType.MultipleChoice && Array.isArray(question.options)) {
        const options = question.options as string[];
        return `<div style="${styles.optionGrid}">
            ${options.map((opt, i) => `<div style="${styles.optionItem}"><span style="font-weight: 600; margin-right: 8px; min-width: 24px;">(${String.fromCharCode(97 + i)})</span> <span>${formatText(opt)}</span></div>`).join('')}
        </div>`;
    } else if (question.type === QuestionType.MatchTheFollowing) {
        let colA: string[] = [];
        let colB: string[] = [];

        const opts = question.options as any;
        if (opts && typeof opts === 'object') {
            if ('columnA' in opts && 'columnB' in opts) {
                colA = opts.columnA || [];
                colB = opts.columnB || [];
            } else {
                colA = Object.keys(opts);
                colB = Object.values(opts) as string[];
            }
        }

        if (colA.length === 0) return '';

        const rows = colA.map((item, index) => `
            <tr>
                <td style="${styles.matchTd}">(${index + 1}) ${formatText(item)}</td>
                <td style="${styles.matchTd}">${colB[index] ? `(${String.fromCharCode(97 + index)}) ${formatText(colB[index])}` : ''}</td>
            </tr>
        `).join('');

        return `
            <table style="${styles.matchTable}">
                <thead>
                    <tr>
                        <th style="${styles.matchTh}">Column A</th>
                        <th style="${styles.matchTh}">Column B</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
    }
    return '';
};

const renderQuestion = (question: Question, isAnswerKey: boolean): string => {
    const optionsHtml = renderOptions(question);
    const answerHtml = isAnswerKey ? `
        <div style="margin-top: 8px; padding: 8px 12px; background-color: #f1f5f9; border-left: 4px solid #475569; font-size: 0.95em; break-inside: avoid;">
            <strong style="color: #334155; text-transform: uppercase; font-size: 0.85em; display: block; margin-bottom: 2px;">Solution:</strong>
            <div style="line-height: 1.6;">${formatText(typeof question.answer === 'string' ? question.answer : JSON.stringify(question.answer))}</div>
        </div>
    ` : '';

    return `<div class="question-block" style="${styles.questionBlock}">
            <table style="${styles.questionTable}">
                <tbody>
                    <tr>
                        <td style="${styles.questionNumberTd}">${question.questionNumber}.</td>
                        <td style="${styles.questionTextTd}">${formatText(question.questionText)}</td>
                        <td style="${styles.marksTd}">[${question.marks}]</td>
                    </tr>
                </tbody>
            </table>
            ${optionsHtml}
            ${answerHtml}
        </div>`;
};

export const generateHtmlFromPaperData = (paperData: QuestionPaperData, options?: { logoConfig?: { src?: string; alignment: 'left' | 'center' | 'right' }, isAnswerKey?: boolean }): string => {
    const sectionOrder = [
        QuestionType.MultipleChoice, 
        QuestionType.FillInTheBlanks, 
        QuestionType.TrueFalse, 
        QuestionType.MatchTheFollowing, 
        QuestionType.ShortAnswer, 
        QuestionType.LongAnswer
    ];
    let questionCounter = 0;
    let sectionCount = 0;
    const isAnswerKey = options?.isAnswerKey ?? false;

    // Strict CSS injection for proper math rendering in PDF exports
    let contentHtml = `
        <style>
            /* Base math styles */
            .katex { font-size: 1.15em; text-rendering: optimizeLegibility; }
            .katex-display { margin: 0.8em 0; overflow-x: auto; overflow-y: hidden; }
            
            /* Export specific fixes */
            .katex, .MathJax, .math, .fraction {
                line-height: normal !important;
                vertical-align: middle !important;
                display: inline-block !important;
                transform: none !important;
                white-space: nowrap !important;
            }
            
            /* Fraction positioning fix */
            .katex .frac-line, .MathJax .mfrac {
                position: relative !important;
                top: 0 !important;
                border-bottom-width: 0.04em !important;
            }
            
            /* Prevent denominator overlap */
            .katex .vlist-t2 {
                margin-right: 0 !important;
            }

            /* Container spacing */
            .export-container {
                line-height: 1.6 !important;
                letter-spacing: 0.3px;
            }
            
            @media print {
                .katex, .MathJax, .math, .fraction {
                    line-height: normal !important;
                    vertical-align: middle !important;
                    display: inline-block !important;
                    transform: none !important;
                }
                .katex .frac-line, .MathJax .mfrac {
                    position: relative !important;
                    top: 0 !important;
                }
            }
            
            img { max-width: 100%; height: auto; display: block; margin: 8px auto; }
        </style>
    `;

    const logoSrc = options?.logoConfig?.src;
    const logoAlignment = options?.logoConfig?.alignment ?? 'center';
    const logoImgTag = logoSrc ? `<img src="${logoSrc}" alt="Logo" style="max-height: 90px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;" />` : '';
    
    contentHtml += `
        <div style="${styles.headerContainer}">
            ${logoAlignment === 'center' ? logoImgTag : ''}
            <h1 style="${styles.headerSchool}">${escapeHtml(paperData.schoolName)}</h1>
            <div style="${styles.headerSub}">${escapeHtml(paperData.subject)}${isAnswerKey ? ' - ANSWER KEY' : ''}</div>
            <div style="font-size: 1.1em; font-weight: 500;">Class: ${escapeHtml(paperData.className)}</div>
            
            <table style="${styles.metaTable}">
                <tr>
                    <td style="text-align: left; padding-left: 8px;">Time: ${escapeHtml(paperData.timeAllowed)}</td>
                    <td style="text-align: right; padding-right: 8px;">Max Marks: ${escapeHtml(paperData.totalMarks)}</td>
                </tr>
            </table>
        </div>
    `;

    sectionOrder.forEach(type => {
        const qs = paperData.questions.filter(q => q.type === type);
        if (qs.length === 0) return;
        sectionCount++;
        const sectionTotal = qs.reduce((acc, q) => acc + q.marks, 0);
        
        contentHtml += `
            <div style="${styles.sectionHeader}">
                <span style="${styles.sectionTitle}">SECTION ${String.fromCharCode(64 + sectionCount)}</span>
            </div>
            <div style="${styles.sectionMeta}">
                <span>${toRoman(sectionCount)}. ${type} Questions</span>
                <span>[${qs.length} &times; ${qs[0].marks} = ${sectionTotal} Marks]</span>
            </div>
        `;

        qs.forEach(q => {
            questionCounter++;
            contentHtml += renderQuestion({ ...q, questionNumber: questionCounter }, isAnswerKey);
        });
    });

    return `<div id="paper-root" style="${styles.root}">${contentHtml}</div>`;
};