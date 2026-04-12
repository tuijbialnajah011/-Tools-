import React from 'react';
import { ArrowDown } from 'lucide-react';

interface FlowchartProps {
  title: string;
  steps: string[];
}

export function Flowchart({ title, steps }: FlowchartProps) {
  return (
    <div className="my-16 p-8 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl">
      <h3 className="text-2xl font-serif font-light text-center mb-10 text-slate-900 dark:text-white italic">
        {title}
      </h3>
      <div className="flex flex-col items-center gap-4">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex items-center gap-6 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900/50 p-6 rounded-2xl w-full max-w-lg shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono font-bold text-xl shrink-0">
                {index + 1}
              </div>
              <div className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
                {step}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="text-indigo-300 dark:text-indigo-700">
                <ArrowDown className="w-8 h-8" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
