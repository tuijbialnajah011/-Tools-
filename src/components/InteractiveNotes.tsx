import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, Award, Zap, Brain, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Flashcards } from './Flashcards';
import { MindMap } from './MindMap';

export interface MCQ {
  question: string;
  options: string[];
  answerIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface InteractiveData {
  mcqs: MCQ[];
  matching: MatchPair[];
  flashcards?: { term: string; definition: string }[];
  mindMap?: {
    nodes: { id: string; label: string; type: 'root' | 'sub' | 'leaf' }[];
    edges: { from: string; to: string }[];
  };
}

export function InteractiveNotes({ data }: { data: InteractiveData }) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanations, setShowExplanations] = useState<Record<number, boolean>>({});
  
  // Match the following state
  const [leftItems, setLeftItems] = useState<string[]>([]);
  const [rightItems, setRightItems] = useState<string[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [wrongMatch, setWrongMatch] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineCoords, setLineCoords] = useState<{x1: number, y1: number, x2: number, y2: number, id: string}[]>([]);

  // Update line coordinates when matchedPairs changes or window resizes
  const updateLines = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newCoords: {x1: number, y1: number, x2: number, y2: number, id: string}[] = [];

    Object.entries(matchedPairs).forEach(([left, right]) => {
      const leftEl = containerRef.current?.querySelector(`[data-left="${left}"]`);
      const rightEl = containerRef.current?.querySelector(`[data-right="${right}"]`);

      if (leftEl && rightEl) {
        const leftRect = leftEl.getBoundingClientRect();
        const rightRect = rightEl.getBoundingClientRect();

        newCoords.push({
          x1: leftRect.right - containerRect.left,
          y1: leftRect.top + leftRect.height / 2 - containerRect.top,
          x2: rightRect.left - containerRect.left,
          y2: rightRect.top + rightRect.height / 2 - containerRect.top,
          id: `${left}-${right}`
        });
      }
    });
    setLineCoords(newCoords);
  };

  useEffect(() => {
    updateLines();
    window.addEventListener('resize', updateLines);
    return () => window.removeEventListener('resize', updateLines);
  }, [matchedPairs, leftItems, rightItems]);

  useEffect(() => {
    if (data?.matching) {
      setLeftItems(data.matching.map(m => m.left));
      // Shuffle right items
      const shuffledRight = [...data.matching.map(m => m.right)].sort(() => Math.random() - 0.5);
      setRightItems(shuffledRight);
    }
  }, [data]);

  useEffect(() => {
    if (selectedLeft && selectedRight) {
      // Check if match is correct
      const isCorrect = data.matching.find(m => m.left === selectedLeft && m.right === selectedRight);
      
      if (isCorrect) {
        setMatchedPairs(prev => ({ ...prev, [selectedLeft]: selectedRight }));
        setSelectedLeft(null);
        setSelectedRight(null);
      } else {
        setWrongMatch(true);
        setTimeout(() => {
          setWrongMatch(false);
          setSelectedLeft(null);
          setSelectedRight(null);
        }, 1000);
      }
    }
  }, [selectedLeft, selectedRight, data]);

  if (!data) return null;

  const handleOptionClick = (qIndex: number, optIndex: number) => {
    if (selectedAnswers[qIndex] !== undefined) return; // Already answered
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
    setShowExplanations(prev => ({ ...prev, [qIndex]: true }));
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'hard': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  const getDifficultyIcon = (diff: string) => {
    switch (diff) {
      case 'easy': return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'medium': return <Zap className="w-3 h-3 mr-1" />;
      case 'hard': return <Brain className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="mt-16 border-t border-slate-200 dark:border-slate-800 pt-16 space-y-24">
      
      {/* Mind Map Section */}
      {data.mindMap && data.mindMap.nodes && data.mindMap.nodes.length > 0 && (
        <MindMap data={data.mindMap} />
      )}

      {/* Flashcards Section */}
      {data.flashcards && data.flashcards.length > 0 && (
        <Flashcards cards={data.flashcards} />
      )}

      {/* Match the Following Section */}
      {data.matching && data.matching.length > 0 && (
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              Interactive Challenge
            </div>
            <h2 className="text-4xl font-serif font-light text-slate-900 dark:text-white tracking-tight">Match the Following</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">Connect the terms on the left with their corresponding definitions on the right.</p>
          </div>

          <div 
            ref={containerRef}
            className="relative grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 max-w-5xl mx-auto p-4 sm:p-8"
          >
            {/* SVG Layer for Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <AnimatePresence>
                {lineCoords.map((line) => (
                  <motion.line
                    key={line.id}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="url(#lineGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="8,8"
                    className="drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                  />
                ))}
              </AnimatePresence>
            </svg>

            {/* Left Column */}
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Terms</h3>
                <div className="h-px flex-1 mx-4 bg-slate-200 dark:bg-slate-800 opacity-50" />
              </div>
              {leftItems.map((item, idx) => {
                const isMatched = !!matchedPairs[item];
                const isSelected = selectedLeft === item;
                return (
                  <motion.button
                    key={`left-${idx}`}
                    data-left={item}
                    disabled={isMatched}
                    whileHover={!isMatched ? { scale: 1.02, x: 5 } : {}}
                    whileTap={!isMatched ? { scale: 0.98 } : {}}
                    onClick={() => setSelectedLeft(isSelected ? null : item)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 relative group ${
                      isMatched 
                        ? 'bg-emerald-50/30 border-emerald-200/50 text-emerald-700/50 dark:bg-emerald-900/10 dark:border-emerald-800/30 dark:text-emerald-400/50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-400 dark:text-indigo-300 shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-500/10'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:border-indigo-700 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium tracking-tight">{item}</span>
                      {isMatched && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {isSelected && (
                        <motion.div 
                          layoutId="active-indicator-left"
                          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <ArrowRight className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Right Column */}
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between mb-6 px-2">
                <div className="h-px flex-1 mx-4 bg-slate-200 dark:bg-slate-800 opacity-50" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Definitions</h3>
              </div>
              {rightItems.map((item, idx) => {
                const isMatched = Object.values(matchedPairs).includes(item);
                const isSelected = selectedRight === item;
                return (
                  <motion.button
                    key={`right-${idx}`}
                    data-right={item}
                    disabled={isMatched}
                    whileHover={!isMatched ? { scale: 1.02, x: -5 } : {}}
                    whileTap={!isMatched ? { scale: 0.98 } : {}}
                    onClick={() => setSelectedRight(isSelected ? null : item)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 relative group ${
                      isMatched 
                        ? 'bg-emerald-50/30 border-emerald-200/50 text-emerald-700/50 dark:bg-emerald-900/10 dark:border-emerald-800/30 dark:text-emerald-400/50 cursor-not-allowed'
                        : isSelected
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-400 dark:text-indigo-300 shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-500/10'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:border-indigo-700 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {isSelected && (
                        <motion.div 
                          layoutId="active-indicator-right"
                          className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        </motion.div>
                      )}
                      <span className="text-sm leading-relaxed font-medium">{item}</span>
                      {isMatched && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
          
          <AnimatePresence>
            {Object.keys(matchedPairs).length === leftItems.length && leftItems.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center gap-4 p-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-[2rem] border border-emerald-100 dark:border-emerald-800/50 max-w-md mx-auto shadow-xl shadow-emerald-500/10"
              >
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <h4 className="text-xl font-bold text-emerald-900 dark:text-emerald-300">Perfect Match!</h4>
                  <p className="text-emerald-700/70 dark:text-emerald-400/70 text-sm">You've successfully paired all terms.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* MCQs Section */}
      {data.mcqs && data.mcqs.length > 0 && (
        <div className="space-y-10">
          <div className="text-center space-y-2 mb-12">
            <h2 className="text-3xl font-serif font-light text-slate-900 dark:text-white">Knowledge Check</h2>
            <p className="text-slate-500 dark:text-slate-400">Test your understanding with {data.mcqs.length} questions.</p>
          </div>

          <div className="space-y-8 max-w-4xl mx-auto">
            {data.mcqs.map((mcq, qIndex) => {
              const isAnswered = selectedAnswers[qIndex] !== undefined;
              const isCorrect = selectedAnswers[qIndex] === mcq.answerIndex;

              return (
                <div key={qIndex} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <h3 className="text-lg sm:text-xl font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                      <span className="text-slate-400 font-bold mr-2">{qIndex + 1}.</span>
                      {mcq.question}
                    </h3>
                    <span className={`flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getDifficultyColor(mcq.difficulty)}`}>
                      {getDifficultyIcon(mcq.difficulty)}
                      {mcq.difficulty}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {mcq.options.map((option, optIndex) => {
                      let btnClass = "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20";
                      let icon = null;

                      if (isAnswered) {
                        if (optIndex === mcq.answerIndex) {
                          btnClass = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm";
                          icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
                        } else if (optIndex === selectedAnswers[qIndex]) {
                          btnClass = "bg-rose-50 dark:bg-rose-900/20 border-rose-500 text-rose-800 dark:text-rose-300";
                          icon = <XCircle className="w-5 h-5 text-rose-500" />;
                        } else {
                          btnClass = "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-50";
                        }
                      }

                      return (
                        <button
                          key={optIndex}
                          disabled={isAnswered}
                          onClick={() => handleOptionClick(qIndex, optIndex)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 text-left ${btnClass}`}
                        >
                          <span className="font-medium">{option}</span>
                          {icon}
                        </button>
                      );
                    })}
                  </div>

                  {showExplanations[qIndex] && (
                    <div className={`mt-6 p-5 rounded-2xl border flex gap-4 animate-in slide-in-from-top-4 duration-500 ${
                      isCorrect 
                        ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' 
                        : 'bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30'
                    }`}>
                      <div className="mt-0.5">
                        <HelpCircle className={`w-5 h-5 ${isCorrect ? 'text-emerald-500' : 'text-amber-500'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold mb-1 ${isCorrect ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
                          {isCorrect ? 'Correct!' : 'Incorrect.'}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {mcq.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
