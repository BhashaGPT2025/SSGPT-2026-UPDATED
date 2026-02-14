
import React, { useState } from 'react';
import { type FormData, QuestionType, type QuestionDistributionItem, Difficulty, Taxonomy, User } from '../types';
import { QUESTION_TYPES } from '../constants';

interface PracticeGeneratorProps {
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
  user: User;
}

const PracticeGenerator: React.FC<PracticeGeneratorProps> = ({ onSubmit, isLoading, user }) => {
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !topics.trim()) {
        setError('Please provide a subject and topics.');
        return;
    }
    setError('');

    const formData: FormData = {
      schoolName: "Practice Test",
      className: "Practice",
      subject,
      topics,
      language: 'English',
      timeAllowed: 'N/A',
      sourceMaterials: '',
      sourceMode: 'reference',
      totalMarks: numQuestions,
      questionDistribution: [
        {
          id: 'practice-dist',
          type: QuestionType.MultipleChoice,
          count: numQuestions,
          marks: 1,
          difficulty: Difficulty.Medium,
          taxonomy: Taxonomy.Understanding,
        }
      ],
    };
    onSubmit(formData);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up p-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Practice Test Generator</h1>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Create a quick practice test on any topic.</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/50 p-8 rounded-2xl shadow-2xl border dark:border-slate-700/50 space-y-6">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2">Subject</label>
          <input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Biology"
            className="block w-full rounded-lg border-0 py-2.5 px-4 text-gray-900 dark:text-white bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          />
        </div>
        <div>
          <label htmlFor="topics" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2">Topics</label>
          <textarea
            id="topics"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="e.g., Cell structure, photosynthesis"
            rows={3}
            className="block w-full rounded-lg border-0 py-2.5 px-4 text-gray-900 dark:text-white bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
          />
        </div>
        <div>
          <label htmlFor="numQuestions" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white mb-2">Number of Questions: {numQuestions}</label>
          <input
            id="numQuestions"
            type="range"
            min="5"
            max="25"
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        {error && <p className="text-sm text-red-500">{error}</p>}
        
        <div className="pt-4">
            <button
                type="submit"
                disabled={isLoading}
                className="w-full px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all text-lg disabled:opacity-50"
            >
                {isLoading ? 'Generating...' : 'Start Practice'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default PracticeGenerator;
