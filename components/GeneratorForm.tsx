import React, { useState, useMemo, useEffect, useRef } from 'react';
import { type FormData, QuestionType, type QuestionDistributionItem, Difficulty, Taxonomy, User } from '../types';
import { LANGUAGES, QUESTION_TYPES, DIFFICULTY_LEVELS, BLOOM_TAXONOMY_LEVELS } from '../constants';
import { VoiceConfigurator } from './VoiceConfigurator';

interface GeneratorFormProps {
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
  user: User;
}

const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
);

const DragHandleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <circle cx="9" cy="12" r="1.5"></circle><circle cx="9" cy="5" r="1.5"></circle><circle cx="9" cy="19" r="1.5"></circle>
        <circle cx="15" cy="12" r="1.5"></circle><circle cx="15" cy="5" r="1.5"></circle><circle cx="15" cy="19" r="1.5"></circle>
    </svg>
);

const FormField: React.FC<{name: string, label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, error?: string, as?: 'textarea' | 'input', placeholder?: string}> = ({ name, label, value, onChange, error, as='input', placeholder }) => {
    const commonProps = {
        id: name,
        name: name,
        value: value,
        onChange: onChange,
        placeholder,
        className: `block w-full rounded-lg border-0 py-2.5 px-4 text-gray-900 dark:text-white bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 transition ${error ? 'ring-red-500' : ''}`
    };
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2">{label}</label>
            { as === 'textarea' ? <textarea {...commonProps} rows={4} /> : <input type="text" {...commonProps} /> }
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    )
}

const GeneratorForm: React.FC<GeneratorFormProps> = ({ onSubmit, isLoading, user }) => {
  const [formData, setFormData] = useState({
    schoolName: user.defaultSchoolName || '',
    className: '',
    subject: '',
    topics: '',
    language: 'English',
    timeAllowed: '',
    sourceMaterials: '',
    sourceMode: 'reference' as 'strict' | 'reference',
    modelQuality: 'flash' as 'flash' | 'pro',
  });
  
  useEffect(() => {
    setFormData(prev => ({...prev, schoolName: user.defaultSchoolName || ''}));
  }, [user.defaultSchoolName]);

  const [questionDistribution, setQuestionDistribution] = useState<QuestionDistributionItem[]>([
    { id: `dist-${Date.now()}`, type: QuestionType.MultipleChoice, count: 5, marks: 2, difficulty: Difficulty.Medium, taxonomy: Taxonomy.Applying },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; data: string; mimeType: string; }[]>([]);

  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const totalMarks = useMemo(() => {
    return questionDistribution.reduce((acc, item) => acc + (item.count * item.marks), 0);
  }, [questionDistribution]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVoiceConfig = (extracted: any) => {
      setFormData(prev => ({
          ...prev,
          schoolName: extracted.schoolName || prev.schoolName,
          className: extracted.className || prev.className,
          subject: extracted.subject || prev.subject,
          topics: extracted.topics || prev.topics,
          timeAllowed: extracted.timeAllowed || prev.timeAllowed,
      }));
      
      if (extracted.questionDistribution && Array.isArray(extracted.questionDistribution)) {
          const newDist: QuestionDistributionItem[] = extracted.questionDistribution.map((d: any, i: number) => ({
              id: `voice-dist-${Date.now()}-${i}`,
              type: d.type as QuestionType,
              count: d.count || 5,
              marks: d.marks || 1,
              difficulty: extracted.difficulty || Difficulty.Medium,
              taxonomy: d.taxonomy || Taxonomy.Understanding
          }));
          setQuestionDistribution(newDist);
      }
      
      alert("Voice configuration applied successfully.");
  };

  const blobToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error('Failed to read file as data URL.'));
        }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files) as File[]) {
        if (file.size > 20 * 1024 * 1024) { 
            alert(`File ${file.name} is too large. Please keep files under 20MB.`);
            continue;
        }

        if (file.type.startsWith('text/')) {
            const text = await file.text();
            setFormData(prev => ({
                ...prev,
                sourceMaterials: (prev.sourceMaterials ? prev.sourceMaterials + `\n\n--- CONTENT FROM ${file.name} ---\n\n` : '') + text
            }));
        } else {
            try {
                const base64Data = await blobToBase64(file);
                setAttachedFiles(prev => [...prev.filter(f => f.name !== file.name), { name: file.name, data: base64Data, mimeType: file.type }]);
            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
            }
        }
    }

    if (event.target) event.target.value = '';
  };

  const removeAttachedFile = (fileName: string) => {
    setAttachedFiles(prev => prev.filter(f => f.name !== fileName));
  };


  const handleDistributionChange = (id: string, field: keyof Omit<QuestionDistributionItem, 'id'>, value: string | number) => {
    setQuestionDistribution(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: (field === 'type' || field === 'difficulty' || field === 'taxonomy') ? value : Number(value) || 0 } : item
      )
    );
  };
  
  const addQuestionType = () => {
    const usedTypes = new Set(questionDistribution.map(d => d.type));
    const availableType = QUESTION_TYPES.find(qt => !usedTypes.has(qt.value as QuestionType));
    
    const newType = availableType ? availableType.value as QuestionType : QuestionType.ShortAnswer;
    
    setQuestionDistribution(prev => [...prev, { id: `dist-${Date.now()}`, type: newType, count: 5, marks: 1, difficulty: Difficulty.Easy, taxonomy: Taxonomy.Remembering }]);
  };

  const removeQuestionType = (id: string) => {
    if (questionDistribution.length > 1) {
      setQuestionDistribution(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
      dragItemIndex.current = index;
      setDraggingIndex(index);
      e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
      dragOverItemIndex.current = index;
      const newDistribution = [...questionDistribution];
      if (dragItemIndex.current !== null) {
          const draggedItemContent = newDistribution[dragItemIndex.current];
          newDistribution.splice(dragItemIndex.current, 1);
          newDistribution.splice(index, 0, draggedItemContent);
          dragItemIndex.current = index;
          setQuestionDistribution(newDistribution);
      }
  };

  const handleDragEnd = () => {
      dragItemIndex.current = null;
      dragOverItemIndex.current = null;
      setDraggingIndex(null);
  };

  const handleTrySample = () => {
    setFormData({
      ...formData,
      schoolName: 'JSS SMCS',
      className: '7',
      subject: 'Maths',
      topics: "Integers, Fractions, Decimals and Rational Numbers",
      language: 'English',
      timeAllowed: '2 hours 30 minutes',
      sourceMaterials: 'Focusing on rational number operations and basic fractions.',
      sourceMode: 'reference'
    });
    setQuestionDistribution([
      { id: `dist-${Date.now()}-1`, type: QuestionType.MultipleChoice, count: 10, marks: 1, difficulty: Difficulty.Easy, taxonomy: Taxonomy.Remembering },
    ]);
    setAttachedFiles([]);
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.schoolName.trim()) newErrors.schoolName = "School name is required.";
    if (!formData.className.trim()) newErrors.className = "Class/Grade is required.";
    if (!formData.subject.trim()) newErrors.subject = "Subject is required.";
    if (!formData.topics.trim()) newErrors.topics = "Topics are required.";
    if (!formData.timeAllowed.trim()) newErrors.timeAllowed = "Time allowed is required.";
    if (questionDistribution.some(d => d.count <= 0 || d.marks < 0)) {
        newErrors.distribution = "Question count must be positive.";
    }
    if (totalMarks <= 0) {
        newErrors.totalMarks = "Total marks must be greater than zero.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
        onSubmit({
            ...formData,
            questionDistribution,
            totalMarks,
            sourceFiles: attachedFiles,
        });
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
        <form onSubmit={handleSubmit} noValidate>
            <div className="bg-white dark:bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-2xl border dark:border-slate-700/50 space-y-10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Create a New Question Paper</h2>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">Fill in the details below or use Voice Builder.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <VoiceConfigurator onConfigExtracted={handleVoiceConfig} />
                        <button
                            type="button"
                            onClick={handleTrySample}
                            className="shrink-0 bg-white dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-semibold py-2 px-4 rounded-full border border-slate-200 dark:border-slate-600/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm text-sm"
                        >
                            🧪 Sample
                        </button>
                    </div>
                </div>

                <div className="space-y-6 border-t dark:border-slate-700 pt-8">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">1. Paper Details</h3>
                        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                            <button 
                                type="button" 
                                onClick={() => setFormData(prev => ({...prev, modelQuality: 'flash'}))}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.modelQuality === 'flash' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                            >
                                Fast (Flash)
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setFormData(prev => ({...prev, modelQuality: 'pro'}))}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${formData.modelQuality === 'pro' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                            >
                                Pro (Complex)
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField name="schoolName" label="School Name" value={formData.schoolName} onChange={handleChange} error={errors.schoolName} />
                        <FormField name="className" label="Class / Grade" value={formData.className} onChange={handleChange} error={errors.className} />
                        <FormField name="subject" label="Subject" value={formData.subject} onChange={handleChange} error={errors.subject} />
                        <FormField name="timeAllowed" label="Time Allowed" value={formData.timeAllowed} onChange={handleChange} error={errors.timeAllowed} placeholder="e.g., 2 hours 30 minutes" />
                        <div className="md:col-span-2">
                             <FormField name="topics" label="Topics to Cover" as="textarea" value={formData.topics} onChange={handleChange} error={errors.topics} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="language" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2">Language</label>
                            <select id="language" name="language" value={formData.language} onChange={handleChange} className="block w-full rounded-lg border-0 py-2.5 px-3 text-gray-900 dark:text-white bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                                {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t dark:border-slate-700 pt-8 space-y-6">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">2. Source Materials (Optional)</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2">Upload File(s)</label>
                             <div className="flex items-center gap-4">
                                <label htmlFor="file-upload" className="cursor-pointer bg-white dark:bg-slate-900/50 px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <span>Choose files</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt,.md,image/*" />
                                </label>
                            </div>
                            {attachedFiles.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {attachedFiles.map(file => (
                                        <div key={file.name} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-sm">
                                            <span className="font-medium text-indigo-700 dark:text-indigo-300 truncate max-w-[200px]">{file.name}</span>
                                            <button type="button" onClick={() => removeAttachedFile(file.name)} className="text-indigo-500 hover:text-indigo-700">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <FormField name="sourceMaterials" label="Paste Lesson Notes" as="textarea" value={formData.sourceMaterials} onChange={handleChange} placeholder="Paste text here..." />
                    </div>
                </div>
                
                <div className="border-t dark:border-slate-700 pt-8 space-y-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">3. Question Distribution</h3>
                    <div className="space-y-4">
                        {questionDistribution.map((dist, index) => (
                             <div 
                                key={dist.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                className={`flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-700/50 transition-shadow ${draggingIndex === index ? 'opacity-50 shadow-2xl' : ''}`}
                             >
                                <div className="cursor-move text-slate-400 dark:text-slate-500 touch-none">
                                    <DragHandleIcon className="w-6 h-6" />
                                </div>
                                <div className="flex flex-wrap gap-4 items-end flex-grow">
                                    <div className="w-full md:w-auto md:flex-1 min-w-[150px]">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Type</label>
                                        <select value={dist.type} onChange={(e) => handleDistributionChange(dist.id, 'type', e.target.value)} className="w-full mt-1 p-2 rounded-md bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm text-sm">
                                            {QUESTION_TYPES.map(qt => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-20">
                                        <label className="text-xs font-medium">Count</label>
                                        <input type="number" min="1" value={dist.count} onChange={(e) => handleDistributionChange(dist.id, 'count', e.target.value)} className="w-full mt-1 p-2 rounded-md bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm text-sm" />
                                    </div>
                                    <div className="w-20">
                                        <label className="text-xs font-medium">Marks</label>
                                        <input type="number" min="0" step="0.5" value={dist.marks} onChange={(e) => handleDistributionChange(dist.id, 'marks', e.target.value)} className="w-full mt-1 p-2 rounded-md bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm text-sm" />
                                    </div>
                                    <div className="flex-1 min-w-[120px]">
                                        <label className="text-xs font-medium">Taxonomy</label>
                                        <select value={dist.taxonomy} onChange={(e) => handleDistributionChange(dist.id, 'taxonomy', e.target.value)} className="w-full mt-1 p-2 rounded-md bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm text-sm">
                                            {BLOOM_TAXONOMY_LEVELS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {questionDistribution.length > 1 && (
                                     <button type="button" onClick={() => removeQuestionType(dist.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors"><TrashIcon className="w-5 h-5 mx-auto"/></button>
                                )}
                            </div>
                        ))}
                         {errors.distribution && <p className="mt-1 text-xs text-red-500">{errors.distribution}</p>}
                    </div>
                     <button type="button" onClick={addQuestionType} className="mt-4 flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                        <PlusIcon className="w-5 h-5"/> Add Question Type
                    </button>
                </div>
            </div>

             <div className="mt-8 flex flex-col sm:flex-row justify-end items-center gap-6">
                <div>
                    <span className="text-slate-600 dark:text-slate-400">Total Marks:</span>
                    <span className="ml-2 text-2xl font-bold text-slate-900 dark:text-white">{totalMarks}</span>
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-lg disabled:opacity-50"
                >
                    ✨ {isLoading ? 'Generating...' : 'Generate Paper'}
                </button>
            </div>
        </form>
    </div>
  );
};

export default GeneratorForm;