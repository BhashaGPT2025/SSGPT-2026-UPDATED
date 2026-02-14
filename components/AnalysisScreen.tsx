import React, { useState, useEffect } from 'react';
import { type Part } from '@google/genai';
import { analyzePastedText, analyzeHandwrittenImages } from '../services/geminiService';
import { type FormData, type AnalysisResult, type QuestionPaperData, Question, QuestionType } from '../types';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { generateHtmlFromPaperData } from '../services/htmlGenerator';

interface AnalysisScreenProps {
  textToAnalyze?: string;
  imagesToAnalyze?: Part[];
  onComplete: (paperData: QuestionPaperData) => void;
  onCancel: () => void;
}

const analysisMessages = [
  "Reading your content...",
  "Identifying question types...",
  "Extracting key details...",
  "Structuring the paper layout...",
  "Preparing the final form..."
];

const fieldLabels: Record<string, string> = {
    schoolName: "School Name",
    className: "Class / Grade",
    subject: "Subject",
    timeAllowed: "Time Allowed",
    totalMarks: "Total Marks"
};

const FormField: React.FC<{name: string, label: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, placeholder?: string}> = ({ name, label, value, onChange, type = 'text', placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="block w-full rounded-lg border-0 py-2.5 px-4 text-gray-900 dark:text-white bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 transition"
        />
    </div>
);


const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ textToAnalyze, imagesToAnalyze, onComplete, onCancel }) => {
  const [status, setStatus] = useState<'analyzing' | 'collecting' | 'error'>('analyzing');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [missingData, setMissingData] = useState<Partial<AnalysisResult['extractedData']>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState(analysisMessages[0]);

  useEffect(() => {
    const performAnalysis = async () => {
      try {
        let result: AnalysisResult;
        if (textToAnalyze) {
          result = await analyzePastedText(textToAnalyze);
        } else if (imagesToAnalyze) {
          result = await analyzeHandwrittenImages(imagesToAnalyze);
        } else {
          throw new Error("No content provided for analysis.");
        }
        setAnalysisResult(result);
        setStatus('collecting');
      } catch (e) {
        console.error("Analysis Error:", e);
        setErrorMessage("Internal Error Occurred");
        setStatus('error');
      }
    };

    performAnalysis();
  }, [textToAnalyze, imagesToAnalyze]);

  useEffect(() => {
    if (status === 'analyzing') {
        const intervalId = setInterval(() => {
            setCurrentMessage(prev => {
                const currentIndex = analysisMessages.indexOf(prev);
                return analysisMessages[(currentIndex + 1) % analysisMessages.length];
            });
        }, 2000);
        return () => clearInterval(intervalId);
    }
  }, [status]);
  
  const handleMissingDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setMissingData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysisResult) return;

    const finalMetadata = {
        ...analysisResult.extractedData,
        ...missingData,
    };

    const processedQuestions: Question[] = analysisResult.extractedQuestions.map((q, index) => {
        let parsedOptions: any = null;
        if ((q as any).options && typeof (q as any).options === 'string') {
            try {
                parsedOptions = JSON.parse((q as any).options);
            } catch (e) {
                console.warn(`Could not parse options JSON string: "${(q as any).options}"`, e);
            }
        }

        let parsedAnswer: any = q.answer;
        if (q.type === QuestionType.MatchTheFollowing && typeof q.answer === 'string') {
            try {
                parsedAnswer = JSON.parse(q.answer);
            } catch (e) {
                console.warn(`Could not parse answer JSON string for Matching question: "${q.answer}"`, e);
            }
        }

        return {
            ...(q as Omit<Question, 'questionNumber' | 'styles'>),
            options: parsedOptions,
            answer: parsedAnswer,
            questionNumber: index + 1
        };
    });

    const calculatedTotalMarks = processedQuestions.reduce((acc, q) => acc + q.marks, 0);

    const paper: QuestionPaperData = {
        id: `paper-${Date.now()}`,
        schoolName: finalMetadata.schoolName || '',
        className: finalMetadata.className || '',
        subject: finalMetadata.subject || '',
        timeAllowed: finalMetadata.timeAllowed || '',
        totalMarks: String(finalMetadata.totalMarks || calculatedTotalMarks),
        questions: processedQuestions,
        htmlContent: '', 
        createdAt: new Date().toISOString(),
    };

    paper.htmlContent = generateHtmlFromPaperData(paper);

    onComplete(paper);
  };


  if (status === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center animate-fade-in h-[calc(100vh-4rem)]">
        <SpinnerIcon className="w-16 h-16 text-indigo-500" />
        <h2 className="mt-6 text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
          AI is Analyzing Your Content
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400 h-6 transition-opacity duration-500">
          {currentMessage}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
        <div className="text-center mt-20 max-w-lg mx-auto p-8 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 animate-fade-in-up">
          <h3 className="text-xl font-semibold text-red-500 mb-4">Operation Failed</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6 whitespace-pre-wrap">{errorMessage}</p>
          <button
            onClick={onCancel}
            className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors"
          >
            Go Back
          </button>
        </div>
    );
  }

  if (status === 'collecting' && analysisResult) {
      return (
          <div className="max-w-2xl mx-auto animate-fade-in-up p-4 sm:p-6 lg:p-8">
              <form onSubmit={handleSubmit} noValidate>
                  <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-2xl border dark:border-slate-700/50 space-y-8">
                      <div>
                          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Just a few more details...</h2>
                          <p className="mt-2 text-slate-600 dark:text-slate-400">The AI has structured your questions. Please provide any missing information below to finalize the paper.</p>
                      </div>

                      <div className="space-y-6 border-t dark:border-slate-700 pt-8">
                        {analysisResult.missingFields.length > 0 ? (
                            analysisResult.missingFields.map(field => (
                                <FormField
                                    key={field}
                                    name={field}
                                    label={fieldLabels[field] || field}
                                    value={missingData[field as keyof typeof missingData] as string || ''}
                                    onChange={handleMissingDataChange}
                                    type={field === 'totalMarks' ? 'number' : 'text'}
                                />
                            ))
                        ) : (
                            <p className="text-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                                ✅ AI has extracted all the necessary details! You can proceed to format the paper.
                            </p>
                        )}
                      </div>
                  </div>

                  <div className="mt-8 flex justify-end items-center gap-4">
                       <button type="button" onClick={onCancel} className="text-slate-600 dark:text-slate-400 font-semibold py-3 px-6 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                           Cancel
                       </button>
                      <button
                          type="submit"
                          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-lg"
                      >
                          ✨ Format Paper
                      </button>
                  </div>
              </form>
          </div>
      )
  }

  return null;
};

export default AnalysisScreen;