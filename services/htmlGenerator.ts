import { type QuestionPaperData, type Question, QuestionType } from '../types';

const escapeHtml = (unsafe: string | undefined): string => {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const formatText = (text: string = ''): string => {
    // Keep LaTeX intact, only handle basic line breaks for readability
    return text.trim().replace(/\n/g, '<br/>');
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

const renderOptions = (question: Question): string => {
    if (question.type === QuestionType.MultipleChoice && Array.isArray(question.options)) {
        const options = question.options as string[];
        // Professional 2x2 grid for MCQs if they are short, otherwise 1x4
        const isShort = options.every(opt => opt.length < 25);
        
        if (isShort && options.length === 4) {
            return `<table style="width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed;"><tbody>
                    <tr>
                        <td style="width: 50%; vertical-align: top; padding: 2px 0;">(a) ${formatText(options[0])}</td>
                        <td style="width: 50%; vertical-align: top; padding: 2px 0;">(b) ${formatText(options[1])}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; vertical-align: top; padding: 2px 0;">(c) ${formatText(options[2])}</td>
                        <td style="width: 50%; vertical-align: top; padding: 2px 0;">(d) ${formatText(options[3])}</td>
                    </tr>
                </tbody></table>`;
        }
        
        return `<div style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">
            ${options.map((opt, i) => `<div>(${String.fromCharCode(97 + i)}) ${formatText(opt)}</div>`).join('')}
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
                <td style="padding: 6px 10px; border: 1px solid #000; width: 50%;">${index + 1}. ${formatText(item)}</td>
                <td style="padding: 6px 10px; border: 1px solid #000; width: 50%;">${colB[index] ? `${String.fromCharCode(97 + index)}. ${formatText(colB[index])}` : ''}</td>
            </tr>
        `).join('');

        return `
            <table style="width: 100%; border-collapse: collapse; margin-top: 12px; border: 1px solid #000; font-size: 0.95em;">
                <thead>
                    <tr style="text-align: left; background-color: #f8fafc;">
                        <th style="padding: 6px 10px; border: 1px solid #000;">Column A</th>
                        <th style="padding: 6px 10px; border: 1px solid #000;">Column B</th>
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
        <div style="margin-top: 6px; padding: 6px 10px; background-color: #f1f5f9; border-left: 3px solid #64748b; font-style: italic; font-size: 0.9em;">
            <strong>Ans:</strong> ${formatText(typeof question.answer === 'string' ? question.answer : JSON.stringify(question.answer))}
        </div>
    ` : '';

    return `<div class="question-block" style="margin-bottom: 1.2rem; break-inside: avoid; page-break-inside: avoid;">
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                <tr>
                    <td style="width: 25px; vertical-align: top; font-weight: bold;">${question.questionNumber}.</td>
                    <td style="vertical-align: top; padding-right: 10px; line-height: 1.4;">${formatText(question.questionText)}</td>
                    <td style="width: 40px; vertical-align: top; text-align: right; font-weight: bold;">[${question.marks}]</td>
                </tr>
            </table>
            ${optionsHtml ? `<div style="padding-left: 25px;">${optionsHtml}</div>` : ''}
            ${answerHtml ? `<div style="padding-left: 25px;">${answerHtml}</div>` : ''}
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

    let contentHtml = '';

    // Render Clean Header
    contentHtml += `
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="margin: 0 0 5px 0; font-size: 22pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(paperData.schoolName)}</h1>
            <h2 style="margin: 0 0 5px 0; font-size: 16pt; text-decoration: underline;">${escapeHtml(paperData.subject)}${isAnswerKey ? ' (Answer Key)' : ''}</h2>
            <p style="margin: 0; font-size: 13pt; font-weight: 500;">Class: ${escapeHtml(paperData.className)}</p>
            
            <div style="margin-top: 15px; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 5px 0;">
                <table style="width: 100%; font-weight: bold; font-size: 11pt;">
                    <tr>
                        <td style="text-align: left;">Time Allowed: ${escapeHtml(paperData.timeAllowed)}</td>
                        <td style="text-align: right;">Total Marks: ${escapeHtml(paperData.totalMarks)}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    sectionOrder.forEach(type => {
        const qs = paperData.questions.filter(q => q.type === type);
        if (qs.length === 0) return;
        sectionCount++;
        const sectionTotal = qs.reduce((acc, q) => acc + q.marks, 0);
        
        contentHtml += `
            <div style="text-align: center; margin: 25px 0 10px 0; break-inside: avoid;">
                <span style="font-size: 14pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 2px;">SECTION ${String.fromCharCode(64 + sectionCount)}</span>
            </div>
            <div style="margin-bottom: 15px; font-weight: bold; font-size: 11pt; border-bottom: 1px solid #eee; padding-bottom: 4px;">
                ${toRoman(sectionCount)}. ${type} Questions <span style="float: right;">[${qs.length} &times; ${qs[0].marks} = ${sectionTotal} Marks]</span>
                <div style="clear: both;"></div>
            </div>
        `;

        qs.forEach(q => {
            questionCounter++;
            contentHtml += renderQuestion({ ...q, questionNumber: questionCounter }, isAnswerKey);
        });
    });

    return `<div id="paper-root" style="font-family: inherit; color: #000; width: 100%;">${contentHtml}</div>`;
};