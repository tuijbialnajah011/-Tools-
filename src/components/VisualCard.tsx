import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Info, CheckCircle2, Zap, Star, Target } from 'lucide-react';

interface VisualCardProps {
  title: string;
  emoji: string;
  items: { icon: string; text: string }[];
}

const iconMap: Record<string, any> = {
  'sparkles': Sparkles,
  'info': Info,
  'check': CheckCircle2,
  'zap': Zap,
  'star': Star,
  'target': Target,
};

export function VisualCard({ title, emoji, items }: VisualCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl shadow-indigo-500/5 relative overflow-hidden group"
    >
      {/* Decorative shapes */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full -ml-12 -mb-12 blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>

      <div className="relative z-10 flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
            {emoji}
          </div>
          <h3 className="text-2xl font-serif font-light text-slate-900 dark:text-white italic tracking-tight">
            {title}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item, index) => {
            const Icon = iconMap[item.icon] || Sparkles;
            return (
              <div 
                key={index}
                className="flex items-start gap-4 p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all hover:translate-x-1"
              >
                <div className="mt-1 p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-indigo-500">
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
