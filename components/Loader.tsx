import React, { useState, useEffect } from 'react';
import { AnimatedLoaderIcon } from './icons/AnimatedLoaderIcon';

const messages = [
  "Consulting pedagogical frameworks...",
  "Crafting questions at the right difficulty...",
  "Aligning questions with Bloom's Taxonomy...",
  "Assembling your custom assessment...",
  "Applying final linguistic polish...",
  "Almost ready, preparing the editor..."
];

const Loader: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
        setIsFading(false);
      }, 500); // Wait for fade-out to complete
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-10 text-center animate-fade-in-up min-h-[300px]">
      <AnimatedLoaderIcon className="w-24 h-24 mb-4 text-indigo-500" />
      
      <h2 className="mt-6 text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight animate-subtle-pulse">
          Generating Your Question Paper
      </h2>
      <p className={`mt-2 text-slate-600 dark:text-slate-400 h-6 transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
          {messages[messageIndex]}
      </p>
    </div>
  );
};

export default Loader;