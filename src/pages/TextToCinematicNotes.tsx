import React, { useState, useRef, useEffect, useDeferredValue } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Copy, Check, Loader2, Sparkles, Settings, Trash2, Clipboard, Languages } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { saveAs } from 'file-saver';
import { generateNotes } from '../utils/summarizer';
import { generateCinematicHTML } from '../utils/cinematicGenerator';
import { InteractiveNotes, InteractiveData } from '../components/InteractiveNotes';
import { Flowchart } from '../components/Flowchart';
import { VisualCard } from '../components/VisualCard';

type SummaryLength = 'short' | 'medium' | 'long';

export default function TextToCinematicNotes() {
  const [inputText, setInputText] = useState<string>('');
  const [inputMode, setInputMode] = useState<'paste' | 'prompt'>('paste');
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState<string>('');
  const [generatedTitle, setGeneratedTitle] = useState<string>('Study Notes');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('medium');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [selectedTheme, setSelectedTheme] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [interactiveData, setInteractiveData] = useState<InteractiveData | null>(null);
  const [cleanNotes, setCleanNotes] = useState<string>('');
  const [flowcharts, setFlowcharts] = useState<Record<string, { title: string, steps: string[] }>>({});
  const [visualCards, setVisualCards] = useState<Record<string, { title: string, emoji: string, items: { icon: string, text: string }[] }>>({});

  const themes = [
    'Editorial', 'Obsidian', 'Sage', 'Monochrome', 
    'Gallery', 'Sepia', 'Midnight', 'High Contrast'
  ];
  const languages = ['English', 'Hindi', 'Hinglish', 'Spanish', 'French', 'German'];
  const notesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of notes while generating
  useEffect(() => {
    if (isGenerating && notesEndRef.current) {
      notesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [notes, isGenerating]);

  const handleGenerateNotes = async () => {
    if (!inputText.trim()) return;

    setIsGenerating(true);
    setNotes('');
    setCleanNotes('');
    setInteractiveData(null);
    setFlowcharts({});
    setVisualCards({});
    setErrorMsg('');
    
    let lastUpdateTime = 0;
    const UPDATE_INTERVAL = 500; // ms

    try {
      const generatedNotes = await generateNotes(inputText, summaryLength, (currentText) => {
        const now = Date.now();

        // Throttle updates to prevent lag
        if (now - lastUpdateTime < UPDATE_INTERVAL) return;
        lastUpdateTime = now;

        processContent(currentText);
      }, inputMode, selectedLanguage);
      
      if (!generatedNotes) {
         setErrorMsg("Could not generate notes. The text might be too short or complex.");
      } else {
        // Final process to ensure everything is captured
        processContent(generatedNotes);
        
        // Final title extraction
        const titleMatch = generatedNotes.match(/^# (.*$)/m);
        if (titleMatch && titleMatch[1]) {
          setGeneratedTitle(titleMatch[1].trim());
        }
      }
    } catch (err: any) {
      console.error("Error generating notes:", err);
      setErrorMsg("An error occurred while generating notes.");
    } finally {
      setIsGenerating(false);
    }
  };

  const processContent = (currentText: string) => {
    // Extract JSON block if present
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = currentText.match(jsonRegex);
    
    if (match && match[1]) {
      try {
        const parsedData = JSON.parse(match[1]);
        setInteractiveData(parsedData);
      } catch (e) {
        // Still parsing JSON
      }
    }

    let cleaned = currentText.replace(jsonRegex, '').trim();
    const notesForCinematic = cleaned;
    
    // Extract flowcharts
    const flowRegex = /### 🔄 FLOW: (.*?)\n([\s\S]*?)(?=\n### |$)/g;
    const extractedFlows: Record<string, { title: string, steps: string[] }> = {};
    let flowMatch;
    let flowIndex = 0;
    
    let notesWithPlaceholders = cleaned;
    
    while ((flowMatch = flowRegex.exec(cleaned)) !== null) {
      const title = flowMatch[1].trim();
      const stepsText = flowMatch[2];
      const steps = stepsText.match(/\d+\.\s*\*\*(.*?)\*\*(?::\s*(.*))?/g)?.map(step => {
        return step.replace(/^\d+\.\s*/, '').trim();
      }) || [];
      
      if (steps.length > 0) {
        const placeholder = `[FLOWCHART_PLACEHOLDER_${flowIndex}]`;
        extractedFlows[placeholder] = { title, steps };
        notesWithPlaceholders = notesWithPlaceholders.replace(flowMatch[0], `\n\n${placeholder}\n\n`);
        flowIndex++;
      }
    }
    
    // Extract visual cards
    const visualRegex = /### 🎨 VISUAL: (.*?)\n([\s\S]*?)(?=\n### |$)/g;
    const extractedVisuals: Record<string, { title: string, emoji: string, items: { icon: string, text: string }[] }> = {};
    let visualMatch;
    let visualIndex = 0;
    
    while ((visualMatch = visualRegex.exec(cleaned)) !== null) {
      const title = visualMatch[1].trim();
      const content = visualMatch[2];
      
      const emojiMatch = content.match(/- EMOJI:\s*(.*)/);
      const emoji = emojiMatch ? emojiMatch[1].trim() : '✨';
      
      const items = content.match(/- ITEM:\s*(.*?)\s*\|\s*(.*)/g)?.map(item => {
        const parts = item.match(/- ITEM:\s*(.*?)\s*\|\s*(.*)/);
        return {
          icon: parts ? parts[1].trim() : 'sparkles',
          text: parts ? parts[2].trim() : ''
        };
      }) || [];
      
      if (items.length > 0) {
        const placeholder = `[VISUAL_CARD_PLACEHOLDER_${visualIndex}]`;
        extractedVisuals[placeholder] = { title, emoji, items };
        notesWithPlaceholders = notesWithPlaceholders.replace(visualMatch[0], `\n\n${placeholder}\n\n`);
        visualIndex++;
      }
    }
    
    setFlowcharts(extractedFlows);
    setVisualCards(extractedVisuals);
    setCleanNotes(notesForCinematic);
    setNotes(notesWithPlaceholders);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCinematicHTML = () => {
    if (!notes) return;
    const html = generateCinematicHTML(generatedTitle, cleanNotes || notes, selectedTheme, interactiveData);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const safeTitle = generatedTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(blob, `𝙱𝙹𝙴_Clan_${safeTitle}_notes.html`);
  };

  const openCinematicView = () => {
    if (!notes) return;
    const html = generateCinematicHTML(generatedTitle, cleanNotes || notes, selectedTheme, interactiveData);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const clearAll = () => {
    setInputText('');
    setNotes('');
    setCleanNotes('');
    setInteractiveData(null);
    setFlowcharts({});
    setVisualCards({});
    setErrorMsg('');
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputText(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setErrorMsg('Clipboard access blocked. Please use Ctrl+V (Cmd+V) to paste manually.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const deferredNotes = useDeferredValue(cleanNotes || notes);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020617] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        <div className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-black tracking-tight text-slate-900 dark:text-white sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 pb-2">
              Text to Cinematic Notes
            </h1>
            <div className="h-1.5 w-24 bg-gradient-to-r from-indigo-600 to-purple-600 mx-auto rounded-full mt-2"></div>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium"
          >
            Paste raw text and transform it into a stunning cinematic study experience.
            <span className="block text-sm mt-2 font-mono text-indigo-500 uppercase tracking-widest">Powered by 𝙱𝙹𝙴 ~ Clan</span>
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Input */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-indigo-500/5 border border-white/20 dark:border-slate-800/50 flex flex-col h-[700px]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Input Content
              </h2>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Length</span>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['short', 'medium', 'long'] as SummaryLength[]).map((len) => (
                      <button
                        key={len}
                        onClick={() => setSummaryLength(len)}
                        className={`px-2 py-1 text-[9px] font-black uppercase tracking-tighter rounded-lg transition-all ${
                          summaryLength === len 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Theme</span>
                  <select 
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(Number(e.target.value))}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-tighter rounded-lg px-2 py-1 outline-none border-none cursor-pointer"
                  >
                    {themes.map((t, i) => (
                      <option key={t} value={i}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lang</span>
                  <select 
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-tighter rounded-lg px-2 py-1 outline-none border-none cursor-pointer"
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setInputMode('paste')}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  inputMode === 'paste' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Paste Text
              </button>
              <button
                onClick={() => setInputMode('prompt')}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  inputMode === 'prompt' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI Prompt
              </button>
            </div>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={inputMode === 'paste' 
                ? "Paste your long text, articles, or research papers here..." 
                : "Enter a topic or prompt (e.g., 'Explain Quantum Computing', 'History of the Roman Empire')..."
              }
              className="flex-1 w-full p-6 bg-slate-50/50 dark:bg-slate-800/30 border-2 border-slate-100 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none text-slate-700 dark:text-slate-300 font-medium leading-relaxed custom-scrollbar"
            />

            <div className="mt-6 flex gap-4">
              <button
                onClick={handleGenerateNotes}
                disabled={!inputText.trim() || isGenerating}
                className="flex-1 py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="animate-pulse">Transforming...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Transform to Cinematic
                  </>
                )}
              </button>
              
              <button
                onClick={clearAll}
                className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                title="Clear input"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Right Column: Preview */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-slate-100 dark:border-slate-800 flex flex-col h-[700px] overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30 relative z-20">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                Cinematic Preview
              </h2>
              
              {notes && !isGenerating && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openCinematicView}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 group"
                  >
                    <Sparkles className="w-4 h-4 group-hover:scale-125 transition-transform" />
                    <span className="text-sm font-bold">Open Full View</span>
                  </button>
                  <button
                    onClick={downloadCinematicHTML}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 group"
                  >
                    <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                    <span className="text-sm font-bold">Download HTML</span>
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                    title="Copy notes"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              )}
            </div>

            <div 
              className="flex-1 min-w-0 bg-white dark:bg-slate-900 p-8 sm:p-12 overflow-y-auto relative custom-scrollbar"
            >
              {errorMsg ? (
                <div className="h-full flex flex-col items-center justify-center text-red-500 space-y-4 text-center px-4">
                  <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                    <FileText className="w-10 h-10 opacity-50" />
                  </div>
                  <p className="text-sm font-bold">{errorMsg}</p>
                </div>
              ) : (notes || isGenerating) ? (
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200
                  [&_h1]:text-5xl [&_h1]:font-serif [&_h1]:font-light [&_h1]:text-center [&_h1]:mb-16 [&_h1]:tracking-tight
                  [&_h2]:text-3xl [&_h2]:font-serif [&_h2]:font-light [&_h2]:mt-20 [&_h2]:mb-10 [&_h2]:border-b [&_h2]:border-slate-200 dark:[&_h2]:border-slate-800 [&_h2]:pb-4
                  [&_h3]:text-xl [&_h3]:font-medium [&_h3]:tracking-widest [&_h3]:uppercase [&_h3]:mt-12 [&_h3]:mb-6 [&_h3]:text-slate-500
                  [&_p]:text-lg [&_p]:leading-relaxed [&_p]:font-light [&_p]:mb-8
                  [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-8 [&_blockquote]:py-2 [&_blockquote]:italic [&_blockquote]:font-serif [&_blockquote]:text-2xl [&_blockquote]:text-slate-600 dark:[&_blockquote]:text-slate-400 [&_blockquote]:my-12 [&_blockquote]:bg-transparent [&_blockquote]:rounded-none [&_blockquote]:shadow-none
                  [&_li]:text-lg [&_li]:font-light [&_li]:mb-4 marker:[&_li]:text-indigo-400
                  [&_strong]:font-semibold
                  [&_table]:block [&_table]:overflow-x-auto [&_table]:whitespace-nowrap [&_table]:border-collapse [&_table]:w-full [&_table]:my-12 [&_table]:border-y [&_table]:border-slate-200 dark:[&_table]:border-slate-800 [&_table]:rounded-none
                  [&_thead]:bg-transparent [&_thead]:text-slate-500 dark:[&_thead]:text-slate-400 [&_thead]:border-b [&_thead]:border-slate-200 dark:[&_thead]:border-slate-800
                  [&_th]:px-4 [&_th]:py-4 [&_th]:text-left [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-xs [&_th]:min-w-[150px]
                  [&_td]:px-4 [&_td]:py-4 [&_td]:border-b [&_td]:border-slate-100 dark:[&_td]:border-slate-800/50 [&_td]:text-slate-600 dark:[&_td]:text-slate-300 [&_td]:min-w-[150px] [&_td]:font-light
                  [&>*:first-child]:mt-0">
                  <Markdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({node, ...props}) => (
                        <div className="overflow-x-auto my-12 w-full custom-scrollbar">
                          <table className="w-full border-collapse text-sm" {...props} />
                        </div>
                      ),
                      th: ({node, ...props}) => <th className="px-4 py-4 text-left font-medium uppercase tracking-widest text-xs border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 min-w-[150px]" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800/50 text-slate-600 dark:text-slate-300 font-light min-w-[150px]" {...props} />,
                      p: ({node, children, ...props}) => {
                        const findPlaceholder = (child: any): string | null => {
                          if (typeof child === 'string') {
                            const text = child.trim();
                            if (text.startsWith('[FLOWCHART_PLACEHOLDER_') || text.startsWith('[VISUAL_CARD_PLACEHOLDER_')) {
                              return text;
                            }
                          }
                          if (Array.isArray(child)) {
                            for (const c of child) {
                              const found = findPlaceholder(c);
                              if (found) return found;
                            }
                          }
                          return null;
                        };

                        const placeholder = findPlaceholder(children);
                        if (placeholder) {
                          if (placeholder.startsWith('[FLOWCHART_PLACEHOLDER_')) {
                            if (flowcharts[placeholder]) {
                              return <Flowchart title={flowcharts[placeholder].title} steps={flowcharts[placeholder].steps} />;
                            }
                          }
                          if (placeholder.startsWith('[VISUAL_CARD_PLACEHOLDER_')) {
                            if (visualCards[placeholder]) {
                              return <VisualCard title={visualCards[placeholder].title} emoji={visualCards[placeholder].emoji} items={visualCards[placeholder].items} />;
                            }
                          }
                        }
                        return <p {...props}>{children}</p>;
                      }
                    }}
                  >
                    {deferredNotes}
                  </Markdown>
                  
                  {interactiveData && !isGenerating && (
                    <InteractiveNotes data={interactiveData} />
                  )}

                  {isGenerating && (
                    <div className="flex items-center gap-3 mt-12">
                      <div className="flex gap-1">
                        <motion.span 
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="w-2 h-2 bg-indigo-600 rounded-full"
                        ></motion.span>
                        <motion.span 
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                          className="w-2 h-2 bg-indigo-600 rounded-full"
                        ></motion.span>
                        <motion.span 
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                          className="w-2 h-2 bg-indigo-600 rounded-full"
                        ></motion.span>
                      </div>
                      {notes.trim().length === 0 && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-black animate-pulse text-xl italic tracking-tight">Synthesizing Notes...</span>
                      )}
                    </div>
                  )}
                  <div ref={notesEndRef} className="h-20" />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6 text-center">
                  <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center rotate-12">
                    <Sparkles className="w-12 h-12 opacity-20 -rotate-12" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Empty Preview</p>
                    <p className="text-sm max-w-[250px] mx-auto">Paste text and click Transform to see the cinematic preview.</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
