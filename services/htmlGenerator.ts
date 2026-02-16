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
    if (!text) return '';

    // This regex splits the text by math delimiters ($...$ or $$...$$)
    const regex = /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g;
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
        // Math parts are at odd indices because they are the captured separators.
        if (index % 2 === 1) {
            const isDisplayMath = part.startsWith('$$');
            const delimiter = isDisplayMath ? '$$' : '$';
            const mathContent = part.substring(delimiter.length, part.length - delimiter.length);

            // Regex for a string that is ONLY a \frac{...}{...}
            const singleFracRegex = /^\s*\\frac{([^}]+)}{([^}]+)}\s*$/;
            const match = mathContent.match(singleFracRegex);

            if (!isDisplayMath && match) {
                // If the entire inline math content is just one fraction, convert to plain text.
                return escapeHtml(`${match[1]}/${match[2]}`);
            }

            // Regex for simple numeric fractions like "1/2" or "1 1/2"
            const simpleNumericFractionRegex = /^\s*(\d+\s+)?\d+\s*\/\s*\d+\s*$/;
            if (!isDisplayMath && simpleNumericFractionRegex.test(mathContent) && !mathContent.includes('\\')) {
                // If it's a simple numeric fraction, render as plain text.
                return escapeHtml(mathContent);
            }

            // For all other cases, if there are any \frac commands, replace them with slash notation.
            // This handles expressions like "1 + \frac{1}{2}".
            const fracRegex = /\\frac{([^}]+)}{([^}]+)}/g;
            if (fracRegex.test(mathContent)) {
                 const simplifiedContent = mathContent.replace(fracRegex, '($1)/($2)');
                 // Return it with delimiters for KaTeX to process the rest of the expression.
                 return `${delimiter}${simplifiedContent}${delimiter}`;
            }

            // If no fraction conversions were applied, return the original math part for KaTeX.
            return part;
        } else { 
            // This is a regular text part. Escape HTML and handle newlines.
            return escapeHtml(part).replace(/\n/g, '<br/>');
        }
    }).join('');
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
const styles = {
    root: `font-family: inherit; color: #000; background: #fff; width: 100%; min-height: 100%; line-height: 1.6; font-size: 12pt;`,
    questionBlock: `break-inside: avoid; page-break-inside: avoid; margin-bottom: 24px; width: 100%; position: relative;`,
    questionTable: `width: 100%; border-collapse: collapse; margin-bottom: 8px;`,
    questionNumberTd: `vertical-align: top; width: 35px; font-weight: 700; font-size: 1.1em; padding-top: 2px;`,
    questionTextTd: `vertical-align: top; text-align: left; padding-right: 12px; padding-top: 2px;`,
    marksTd: `vertical-align: top; text-align: right; width: 60px; font-weight: 600; font-size: 1em; padding-top: 2px;`,
    optionGrid: `display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; padding-left: 35px;`,
    optionItem: `break-inside: avoid; line-height: 1.5;`,
    matchTable: `width: 100%; border-collapse: collapse; margin-top: 16px; border: 1px solid #000;`,
    matchTh: `padding: 8px; border: 1px solid #000; width: 50%; font-weight: 700; text-transform: uppercase; font-size: 0.9em; background-color: #f8fafc;`,
    matchTd: `padding: 8px; border: 1px solid #000; width: 50%; vertical-align: middle;`,
    headerContainer: `text-align: center; width: 100%; margin-bottom: 32px; break-inside: avoid; border-bottom: 2px solid #000; padding-bottom: 16px;`,
    headerSchool: `margin: 0; font-size: 24pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2; margin-bottom: 8px;`,
    headerSub: `margin: 4px 0; font-size: 14pt; font-weight: 600;`,
    metaTable: `width: 100%; margin-top: 16px; font-weight: 600; font-size: 1.1em; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 8px 0;`,
    sectionHeader: `text-align: center; margin: 24px 0 16px; break-inside: avoid; page-break-after: avoid;`,
    sectionTitle: `font-weight: 800; text-transform: uppercase; font-size: 1.2em; border-bottom: 2px solid #000; display: inline-block; padding: 0 16px 4px;`,
    sectionMeta: `display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 24px; font-weight: 600; font-style: italic; color: #475569;`
};

const renderOptions = (question: Question): string => {
    if (question.type === QuestionType.MultipleChoice && Array.isArray(question.options)) {
        const options = question.options as string[];
        // Use a grid layout for better spacing and alignment, robust for PDF
        return `<div style="${styles.optionGrid}">
            ${options.map((opt, i) => `<div style="${styles.optionItem}"><span style="font-weight: 600; margin-right: 4px;">(${String.fromCharCode(97 + i)})</span> ${formatText(opt)}</div>`).join('')}
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
        <div style="margin-top: 12px; padding: 12px; background-color: #f1f5f9; border-left: 4px solid #475569; font-size: 0.95em; break-inside: avoid;">
            <strong style="color: #334155; text-transform: uppercase; font-size: 0.85em; display: block; margin-bottom: 4px;">Solution:</strong>
            <div style="line-height: 1.5;">${formatText(typeof question.answer === 'string' ? question.answer : JSON.stringify(question.answer))}</div>
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

    let contentHtml = `
        <style>
            /* Base math styles for KaTeX */
            .katex { 
                font-size: 1.1em !important; 
                line-height: 1.2 !important; 
                vertical-align: baseline !important;
                color: #000 !important;
            }
            .katex-display {
                display: block;
                margin: 1em 0;
                text-align: center;
            }
            
            /* Ensure all math text is black for export */
            .katex * {
                color: #000 !important;
                border-color: #000 !important;
            }

            @media print {
               body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
               }
            }
            
            img { max-width: 100%; height: auto; display: block; margin: 8px auto; }
        </style>
    `;

    // Render Header
    const logoSrc = options?.logoConfig?.src;
    const logoAlignment = options?.logoConfig?.alignment ?? 'center';
    const logoImgTag = logoSrc ? `<img src="${logoSrc}" alt="Logo" style="max-height: 90px; margin-bottom: 16px; display: block; margin-left: auto; margin-right: auto;" />` : '';
    
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