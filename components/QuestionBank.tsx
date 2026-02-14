
import React, { useState, useEffect, useMemo } from 'react';
import { authService } from '../services/authService';
import { type BankQuestion, QuestionType, Difficulty, Taxonomy } from '../types';
import { QUESTION_TYPES, DIFFICULTY_LEVELS, BLOOM_TAXONOMY_LEVELS } from '../constants';
import { EditIcon } from './icons/EditIcon';
import { DeleteIcon } from './icons/DeleteIcon';

const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

const EmptyBankState: React.FC<{onAdd: () => void}> = ({ onAdd }) => (
    <div className="text-center py-16 px-6 bg-white dark:bg-slate-800/50 rounded-2xl border-2 border-dashed dark:border-slate-700/50 mt-8">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Your Question Bank is Empty</h3>
        <p className="mt-2 text-slate-500 dark:text-slate-400">Add your first question to start building your personal library.</p>
        <button onClick={onAdd} className="mt-6 flex items-center justify-center gap-2 mx-auto bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
            <PlusIcon /> Add New Question
        </button>
    </div>
);


const QuestionCard: React.FC<{question: BankQuestion, onEdit: () => void, onDelete: () => void}> = ({ question, onEdit, onDelete }) => (
    <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl shadow-lg border dark:border-slate-700/50 space-y-3 flex flex-col justify-between">
        <div>
            <p className="text-sm text-slate-800 dark:text-slate-200 mb-2" dangerouslySetInnerHTML={{ __html: question.questionText.replace(/\n/g, '<br />') }} />
            <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-md font-medium">{question.type}</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 rounded-md font-medium">{question.difficulty}</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 rounded-md font-medium">{question.marks} Marks</span>
                 <span className="px-2 py-1 bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 rounded-md font-medium">{question.subject}</span>
                 <span className="px-2 py-1 bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 rounded-md font-medium">{question.className}</span>
            </div>
        </div>
        <div className="flex justify-end items-center gap-2 pt-3 border-t dark:border-slate-700/50 mt-3">
             <button onClick={onEdit} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"><EditIcon className="w-4 h-4" /></button>
             <button onClick={onDelete} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md"><DeleteIcon className="w-4 h-4" /></button>
        </div>
    </div>
);

const AddQuestionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    questionToEdit: BankQuestion | null;
}> = ({ isOpen, onClose, onSave, questionToEdit }) => {
    
    const initialFormState = {
      subject: '', className: '', type: QuestionType.ShortAnswer, questionText: '', 
      options: ['','','',''], answer: '', marks: 1, difficulty: Difficulty.Medium, taxonomy: Taxonomy.Understanding,
      matchA: ['',''], matchB: ['','']
    };

    const [formState, setFormState] = useState(initialFormState);
    
    useEffect(() => {
      if (questionToEdit) {
        let options = ['','','',''];
        let answer = '';
        let matchA = ['',''];
        let matchB = ['',''];

        if (questionToEdit.type === QuestionType.MultipleChoice) {
            options = Array.isArray(questionToEdit.options) ? [...questionToEdit.options, ...Array(4 - questionToEdit.options.length).fill('')] : options;
            answer = String(questionToEdit.answer);
        } else if (questionToEdit.type === QuestionType.MatchTheFollowing) {
            const matchOptions = questionToEdit.options as { columnA: string[], columnB: string[] };
            matchA = matchOptions.columnA || ['',''];
            matchB = matchOptions.columnB || ['',''];
        } else {
             answer = String(questionToEdit.answer);
        }
        
        setFormState({
            subject: questionToEdit.subject, className: questionToEdit.className, type: questionToEdit.type, questionText: questionToEdit.questionText,
            options, answer, marks: questionToEdit.marks, difficulty: questionToEdit.difficulty, taxonomy: questionToEdit.taxonomy,
            matchA, matchB
        });

      } else {
        setFormState(initialFormState);
      }
    }, [questionToEdit, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({...prev, [name]: value}));
    };
    
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...formState.options];
        newOptions[index] = value;
        setFormState(prev => ({...prev, options: newOptions}));
    };
    
    const handleMatchChange = (col: 'A' | 'B', index: number, value: string) => {
        const key = col === 'A' ? 'matchA' : 'matchB';
        const newCol = [...formState[key]];
        newCol[index] = value;
        setFormState(prev => ({...prev, [key]: newCol}));
    };

    const handleSave = () => {
        // Validation
        if (!formState.subject || !formState.className || !formState.questionText) {
            alert("Subject, Class, and Question Text are required.");
            return;
        }

        let questionPayload: Omit<BankQuestion, 'id' | 'createdAt'> = {
            subject: formState.subject, className: formState.className, type: formState.type, questionText: formState.questionText,
            options: null, answer: '', marks: Number(formState.marks), difficulty: formState.difficulty, taxonomy: formState.taxonomy, styles: {}
        };

        if (formState.type === QuestionType.MultipleChoice) {
            questionPayload.options = formState.options.filter(o => o.trim() !== '');
            questionPayload.answer = formState.answer;
        } else if (formState.type === QuestionType.MatchTheFollowing) {
            const columnA = formState.matchA.filter(i => i.trim() !== '');
            const columnB = formState.matchB.filter(i => i.trim() !== '');
            if(columnA.length !== columnB.length || columnA.length === 0) {
                alert("For Matching questions, both columns must have the same number of non-empty items.");
                return;
            }
            questionPayload.options = { columnA, columnB };
            // For matching, the answer needs to be a map created by the user or assumed.
            // For simplicity, we'll store the direct mapping as the answer.
            const answerMap: {[key: string]: string} = {};
            columnA.forEach((item, index) => {
                answerMap[item] = columnB[index];
            });
            questionPayload.answer = answerMap;
        } else {
            questionPayload.answer = formState.answer;
        }
        
        if (questionToEdit) {
            authService.updateQuestionInBank({ ...questionPayload, id: questionToEdit.id, createdAt: questionToEdit.createdAt });
        } else {
            authService.saveQuestionToBank(questionPayload);
        }
        
        onSave();
        onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{questionToEdit ? 'Edit Question' : 'Add New Question'}</h2>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Subject" name="subject" value={formState.subject} onChange={handleChange} />
                    <FormField label="Class/Grade" name="className" value={formState.className} onChange={handleChange} />
                </div>
                <FormField as="select" label="Question Type" name="type" value={formState.type} onChange={handleChange}>
                    {QUESTION_TYPES.map(qt => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
                </FormField>
                <FormField as="textarea" label="Question Text" name="questionText" value={formState.questionText} onChange={handleChange} />
                
                {formState.type === QuestionType.MultipleChoice && (
                    <div className="space-y-2 p-3 border rounded-md dark:border-slate-700">
                        <label className="text-sm font-medium">Options & Answer</label>
                        {formState.options.map((opt, i) => (
                           <div key={i} className="flex items-center gap-2">
                               <input type="radio" name="answer" value={opt} checked={formState.answer === opt} onChange={handleChange} className="mt-1"/>
                               <input type="text" placeholder={`Option ${i+1}`} value={opt} onChange={e => handleOptionChange(i, e.target.value)} className="w-full p-2 text-sm rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600"/>
                           </div>
                        ))}
                    </div>
                )}
                
                {formState.type === QuestionType.MatchTheFollowing && (
                    <div className="p-3 border rounded-md dark:border-slate-700 grid grid-cols-2 gap-4">
                        <div>
                             <label className="text-sm font-medium mb-2 block">Column A</label>
                             {formState.matchA.map((item, i) => <input key={i} type="text" value={item} onChange={e => handleMatchChange('A', i, e.target.value)} className="w-full p-2 text-sm rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 mb-2"/>)}
                        </div>
                        <div>
                             <label className="text-sm font-medium mb-2 block">Column B</label>
                             {formState.matchB.map((item, i) => <input key={i} type="text" value={item} onChange={e => handleMatchChange('B', i, e.target.value)} className="w-full p-2 text-sm rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 mb-2"/>)}
                        </div>
                    </div>
                )}
                
                {(formState.type !== QuestionType.MultipleChoice && formState.type !== QuestionType.MatchTheFollowing) && (
                     <FormField as="textarea" label="Answer" name="answer" value={String(formState.answer)} onChange={handleChange} />
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField type="number" label="Marks" name="marks" value={String(formState.marks)} onChange={handleChange} />
                    <FormField as="select" label="Difficulty" name="difficulty" value={formState.difficulty} onChange={handleChange}>
                        {DIFFICULTY_LEVELS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </FormField>
                    <FormField as="select" label="Taxonomy" name="taxonomy" value={formState.taxonomy} onChange={handleChange}>
                        {BLOOM_TAXONOMY_LEVELS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </FormField>
                </div>
            </div>
            <div className="p-4 border-t dark:border-slate-700 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 font-semibold hover:bg-slate-300 dark:hover:bg-slate-500">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Save Question</button>
            </div>
        </div>
      </div>
    );
};

const FormField: React.FC<{name: string, label: string, value: string, onChange: (e: any) => void, as?: 'input' | 'textarea' | 'select', type?: string, children?: React.ReactNode}> = ({ name, label, value, onChange, as='input', type='text', children }) => {
    const commonProps = { id: name, name, value, onChange, className: "block w-full rounded-lg border-0 py-2.5 px-3 text-gray-900 dark:text-white bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm" };
    const renderField = () => {
        if (as === 'textarea') return <textarea {...commonProps} rows={3} />;
        if (as === 'select') return <select {...commonProps}>{children}</select>;
        return <input type={type} {...commonProps} />;
    };
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2">{label}</label>
            {renderField()}
        </div>
    );
};

const QuestionBank: React.FC = () => {
    const [allQuestions, setAllQuestions] = useState<BankQuestion[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');

    const loadQuestions = () => {
        setAllQuestions(authService.getQuestionsFromBank());
    };

    useEffect(loadQuestions, []);

    const filteredQuestions = useMemo(() => {
        return allQuestions.filter(q => {
            const matchesSearch = searchTerm === '' || 
                q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.className.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === '' || q.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [allQuestions, searchTerm, filterType]);

    const handleOpenAddModal = () => {
        setEditingQuestion(null);
        setIsModalOpen(true);
    };
    
    const handleOpenEditModal = (question: BankQuestion) => {
        setEditingQuestion(question);
        setIsModalOpen(true);
    };

    const handleDeleteQuestion = (questionId: string) => {
        if(window.confirm("Are you sure you want to delete this question?")) {
            authService.deleteQuestionFromBank(questionId);
            loadQuestions();
        }
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in-up">
            <AddQuestionModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={loadQuestions}
                questionToEdit={editingQuestion}
            />
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Question Bank</h1>
                    <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Manage your reusable questions.</p>
                </div>
                 <button onClick={handleOpenAddModal} className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-2.5 px-5 rounded-lg hover:bg-indigo-700 transition-colors shadow-md">
                    <PlusIcon /> Add New Question
                </button>
            </header>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border dark:border-slate-700/50">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <input 
                        type="text"
                        placeholder="Search by keyword, subject, class..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 rounded-lg border-0 bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700"
                    />
                </div>
                <select 
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="sm:max-w-xs w-full rounded-lg border-0 py-2.5 px-3 bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700"
                >
                    <option value="">All Question Types</option>
                    {QUESTION_TYPES.map(qt => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
                </select>
            </div>

            {allQuestions.length === 0 ? (
                <EmptyBankState onAdd={handleOpenAddModal} />
            ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-16 px-6 bg-white dark:bg-slate-800/50 rounded-2xl border dark:border-slate-700/50 mt-8">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No Questions Found</h3>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">Your search and filter criteria did not match any questions.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuestions.map(q => (
                        <QuestionCard 
                            key={q.id} 
                            question={q}
                            onEdit={() => handleOpenEditModal(q)}
                            onDelete={() => handleDeleteQuestion(q.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuestionBank;