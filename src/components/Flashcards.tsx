import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';

interface Flashcard {
  term: string;
  definition: string;
}

interface FlashcardsProps {
  cards: Flashcard[];
}

export function Flashcards({ cards }: FlashcardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!cards || cards.length === 0) return null;

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="space-y-8 py-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" />
          Active Recall
        </div>
        <h2 className="text-4xl font-serif font-light text-slate-900 dark:text-white tracking-tight">Smart Flashcards</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">Master key terms and definitions through interactive recall.</p>
      </div>

      <div className="max-w-xl mx-auto perspective-1000 px-4">
        <div className="relative h-80 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex + (isFlipped ? '-back' : '-front')}
              initial={{ rotateY: isFlipped ? -180 : 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: isFlipped ? 180 : -180, opacity: 0 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
              onClick={handleFlip}
              className={`absolute inset-0 w-full h-full cursor-pointer rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-colors duration-500 border-2 ${
                isFlipped 
                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
              }`}
            >
              <div className="absolute top-6 left-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                {isFlipped ? 'Definition' : 'Term'}
              </div>
              <div className="absolute top-6 right-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                {currentIndex + 1} / {cards.length}
              </div>
              
              <h3 className={`text-2xl md:text-3xl font-serif leading-tight ${isFlipped ? 'font-light italic' : 'font-bold'}`}>
                {isFlipped ? cards[currentIndex].definition : cards[currentIndex].term}
              </h3>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-40">
                <RotateCcw className="w-3 h-3" />
                Click to flip
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6">
          <button
            onClick={handlePrev}
            className="p-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex gap-2">
            {cards.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'w-8 bg-indigo-500' : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="p-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-500 transition-all shadow-lg hover:shadow-indigo-500/10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
