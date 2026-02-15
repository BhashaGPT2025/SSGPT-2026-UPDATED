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

const renderOptions = (question: Question): string => {
    if (question.type === QuestionType.MultipleChoice && Array.isArray(question.options)) {
        const options = question.options as string[];
        if (options.length >= 4) {
            return `<table style="width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed; font-family: inherit;"><tbody>
                    <tr>
                        <td style="width: 50%; vertical-align: top; padding: 4px 10px 4px 0; font-size: 1.05em; line-height: 1.8;">(a) ${formatText(options[0])}</td>
                        <td style="width: 50%; vertical-align: top; padding: 4px 0 4px 10px; font-size: 1.05em; line-height: 1.8;">(b) ${formatText(options[1])}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; vertical-align: top; padding: 4px 10px 4px 0; font-size: 1.05em; line-height: 1.8;">(c) ${formatText(options[2])}</td>
                        <td style="width: 50%; vertical-align: top; padding: 4px 0 4px 10px; font-size: 1.05em; line-height: 1.8;">(d) ${formatText(options[3])}</td>
                    </tr>
                </tbody></table>`;
        }
        return `<div style="margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 1.05em; line-height: 1.8;">
            ${options.map((opt, i) => `<div style="break-inside: avoid;">(${String.fromCharCode(97 + i)}) ${formatText(opt)}</div>`).join('')}
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
                <td style="padding: 8px; border: 1px solid #000; width: 50%; vertical-align: middle; font-size: 1em; line-height: 1.7;">(${index + 1}) ${formatText(item)}</td>
                <td style="padding: 8px; border: 1px solid #000; width: 50%; vertical-align: middle; font-size: 1em; line-height: 1.7;">${colB[index] ? `(${String.fromCharCode(97 + index)}) ${formatText(colB[index])}` : ''}</td>
            </tr>
        `).join('');

        return `
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; border: 1.5px solid #000; background-color: #fff; break-inside: avoid;">
                <thead>
                    <tr style="text-align: left; background-color: #f1f5f9; border-bottom: 1.5px solid #000;">
                        <th style="padding: 8px; border: 1px solid #000; width: 50%; font-weight: 700; text-transform: uppercase; font-size: 0.85em; letter-spacing: 0.5px;">Column A</th>
                        <th style="padding: 8px; border: 1px solid #000; width: 50%; font-weight: 700; text-transform: uppercase; font-size: 0.85em; letter-spacing: 0.5px;">Column B</th>
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
        <div style="margin-top: 8px; padding: 8px; background-color: #f8fafc; border-left: 4px solid #334155; border-radius: 2px; font-size: 1em; break-inside: avoid; line-height: 1.7;">
            <strong style="color: #334155; text-transform: uppercase; font-size: 0.75em;">Solution:</strong>
            <div style="margin-top: 2px;">${formatText(typeof question.answer === 'string' ? question.answer : JSON.stringify(question.answer))}</div>
        </div>
    ` : '';

    return `<div class="question-block" style="break-inside: avoid; page-break-inside: avoid; margin-bottom: 1.5rem; width: 100%;">
            <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                    <tr>
                        <td style="vertical-align: top; width: 30px; font-weight: bold; font-size: 1.1em; line-height: 1.8;">${question.questionNumber}.</td>
                        <td style="vertical-align: top; text-align: left; line-height: 1.8; font-size: 1.1em; padding-right: 10px;">${formatText(question.questionText)}</td>
                        <td style="vertical-align: top; text-align: right; width: 60px; font-weight: bold; font-size: 1em; line-height: 1.8;">[${question.marks}]</td>
                    </tr>
                </tbody>
            </table>
            ${optionsHtml ? `<div style="padding-left: 30px;">${optionsHtml}</div>` : ''}
            ${answerHtml ? `<div style="padding-left: 30px;">${answerHtml}</div>` : ''}
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

    // Render Header
    const logoSrc = options?.logoConfig?.src;
    const logoAlignment = options?.logoConfig?.alignment ?? 'center';
    const logoImgTag = logoSrc ? `<img src="${logoSrc}" alt="Logo" style="max-height: 80px; margin-bottom: 15px; display: inline-block;" />` : '';
    
    contentHtml += `
        <div style="text-align: center; width: 100%; margin-bottom: 25px; break-inside: avoid;">
            ${logoAlignment === 'center' ? logoImgTag : ''}
            <h1 style="margin: 0; font-size: 24pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(paperData.schoolName)}</h1>
            <h2 style="margin: 8px 0; font-size: 16pt; text-decoration: none; font-weight: 700; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 2px;">${escapeHtml(paperData.subject)}${isAnswerKey ? ' - OFFICIAL ANSWER KEY' : ''}</h2>
            <p style="margin: 4px 0; font-weight: 600; font-size: 1.2em;">Class: ${escapeHtml(paperData.className)}</p>
            <hr style="border: 0; border-top: 2px solid #000; margin-top: 15px;">
            <table style="width: 100%; margin: 8px 0; font-weight: bold; font-size: 1.1em;">
                <tr>
                    <td style="text-align: left;">Time Allowed: ${escapeHtml(paperData.timeAllowed)}</td>
                    <td style="text-align: right;">Max. Marks: ${escapeHtml(paperData.totalMarks)}</td>
                </tr>
            </table>
            <hr style="border: 0; border-top: 1px solid #000; margin-bottom: 30px;">
        </div>
    `;

    sectionOrder.forEach(type => {
        const qs = paperData.questions.filter(q => q.type === type);
        if (qs.length === 0) return;
        sectionCount++;
        const sectionTotal = qs.reduce((acc, q) => acc + q.marks, 0);
        
        contentHtml += `
            <div style="text-align: center; margin: 30px 0 15px; font-weight: 800; text-transform: uppercase; font-size: 1.3em; break-inside: avoid;">
                <span style="border-bottom: 1.5px solid #000; padding: 0 20px 2px;">SECTION ${String.fromCharCode(64 + sectionCount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 20px; font-weight: 700; font-style: italic; color: #475569; break-inside: avoid;">
                <span style="font-size: 1em;">${toRoman(sectionCount)}. ${type} Questions</span>
                <span style="font-size: 0.95em;">[${qs.length} &times; ${qs[0].marks} = ${sectionTotal} Marks]</span>
            </div>
        `;

        qs.forEach(q => {
            questionCounter++;
            contentHtml += renderQuestion({ ...q, questionNumber: questionCounter }, isAnswerKey);
        });
    });

    return `<div id="paper-root" style="font-family: inherit; color: #000; background: #fff; width: 100%; min-height: 100%;">${contentHtml}</div>`;
};