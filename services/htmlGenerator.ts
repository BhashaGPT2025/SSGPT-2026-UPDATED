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
        if (options.length >= 4) {
            return `<table style="width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; font-family: inherit;"><tbody>
                    <tr>
                        <td style="width: 50%; vertical-align: top; padding: 6px 10px 6px 0; font-size: 1.1em;">(a) ${formatText(options[0])}</td>
                        <td style="width: 50%; vertical-align: top; padding: 6px 0 6px 10px; font-size: 1.1em;">(b) ${formatText(options[1])}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; vertical-align: top; padding: 6px 10px 6px 0; font-size: 1.1em;">(c) ${formatText(options[2])}</td>
                        <td style="width: 50%; vertical-align: top; padding: 6px 0 6px 10px; font-size: 1.1em;">(d) ${formatText(options[3])}</td>
                    </tr>
                </tbody></table>`;
        }
        return `<div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 1.1em;">
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
                <td style="padding: 12px; border: 2px solid #000; width: 50%; vertical-align: middle; font-size: 1.05em;">(${toRoman(index + 1).toLowerCase()}) ${formatText(item)}</td>
                <td style="padding: 12px; border: 2px solid #000; width: 50%; vertical-align: middle; font-size: 1.05em;">${colB[index] ? `(${String.fromCharCode(97 + index)}) ${formatText(colB[index])}` : ''}</td>
            </tr>
        `).join('');

        return `
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 2px solid #000; background-color: #fff; break-inside: avoid;">
                <thead>
                    <tr style="text-align: left; background-color: #f8fafc; border-bottom: 2px solid #000;">
                        <th style="padding: 12px; border: 2px solid #000; width: 50%; font-weight: 800; text-transform: uppercase; font-size: 0.9em; letter-spacing: 0.5px;">Column A</th>
                        <th style="padding: 12px; border: 2px solid #000; width: 50%; font-weight: 800; text-transform: uppercase; font-size: 0.9em; letter-spacing: 0.5px;">Column B</th>
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
        <div style="margin-top: 12px; padding: 12px; background-color: #f8fafc; border-left: 6px solid #4f46e5; border-radius: 4px; font-size: 1.05em; break-inside: avoid;">
            <strong style="color: #4f46e5; text-transform: uppercase; font-size: 0.85em;">Correct Answer:</strong>
            <div style="margin-top: 4px;">${formatText(typeof question.answer === 'string' ? question.answer : JSON.stringify(question.answer))}</div>
        </div>
    ` : '';

    return `<div class="question-block" style="break-inside: avoid; page-break-inside: avoid; margin-bottom: 3rem; width: 100%;">
            <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                    <tr>
                        <td style="vertical-align: top; width: 40px; font-weight: bold; font-size: 1.2em;">${question.questionNumber}.</td>
                        <td style="vertical-align: top; text-align: left; line-height: 1.6; font-size: 1.2em; padding-right: 15px;">${formatText(question.questionText)}</td>
                        <td style="vertical-align: top; text-align: right; width: 80px; font-weight: bold; font-size: 1.15em;">[${question.marks}]</td>
                    </tr>
                </tbody>
            </table>
            ${optionsHtml ? `<div style="padding-left: 40px;">${optionsHtml}</div>` : ''}
            ${answerHtml ? `<div style="padding-left: 40px;">${answerHtml}</div>` : ''}
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
    const logoImgTag = logoSrc ? `<img src="${logoSrc}" alt="Logo" style="max-height: 100px; margin-bottom: 20px; display: inline-block;" />` : '';
    
    contentHtml += `
        <div style="text-align: center; width: 100%; margin-bottom: 35px; break-inside: avoid;">
            ${logoAlignment === 'center' ? logoImgTag : ''}
            <h1 style="margin: 0; font-size: 32px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(paperData.schoolName)}</h1>
            <h2 style="margin: 10px 0; font-size: 24px; text-decoration: underline; font-weight: bold;">${escapeHtml(paperData.subject)}${isAnswerKey ? ' - ANSWER KEY' : ''}</h2>
            <p style="margin: 5px 0; font-weight: 600; font-size: 1.4em;">Class: ${escapeHtml(paperData.className)}</p>
            <hr style="border: 0; border-top: 4px solid #000; margin-top: 20px;">
            <table style="width: 100%; margin: 12px 0; font-weight: bold; font-size: 1.3em;">
                <tr>
                    <td style="text-align: left;">Time Allowed: ${escapeHtml(paperData.timeAllowed)}</td>
                    <td style="text-align: right;">Total Marks: ${escapeHtml(paperData.totalMarks)}</td>
                </tr>
            </table>
            <hr style="border: 0; border-top: 2px solid #000; margin-bottom: 45px;">
        </div>
    `;

    sectionOrder.forEach(type => {
        const qs = paperData.questions.filter(q => q.type === type);
        if (qs.length === 0) return;
        sectionCount++;
        const sectionTotal = qs.reduce((acc, q) => acc + q.marks, 0);
        
        contentHtml += `
            <div style="text-align: center; margin: 60px 0 25px; font-weight: 900; text-transform: uppercase; text-decoration: underline; font-size: 1.6em; break-inside: avoid;">Section ${String.fromCharCode(64 + sectionCount)}</div>
            <div style="display: flex; justify-content: space-between; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 40px; font-weight: bold; break-inside: avoid;">
                <span style="font-size: 1.4em;">${toRoman(sectionCount)}. ${type} Questions</span>
                <span style="font-size: 1.3em;">[${qs.length} &times; ${qs[0].marks} = ${sectionTotal} Marks]</span>
            </div>
        `;

        qs.forEach(q => {
            questionCounter++;
            contentHtml += renderQuestion({ ...q, questionNumber: questionCounter }, isAnswerKey);
        });
    });

    return `<div id="paper-root" style="font-family: inherit; color: #000; background: #fff; width: 100%; min-height: 100%;">${contentHtml}</div>`;
};
