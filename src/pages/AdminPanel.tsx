import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, AlertCircle, CheckCircle2, GripVertical } from 'lucide-react';
import { DEFAULT_TOOLS, Tool } from './Dashboard';
import { checkIsAdmin, fetchToolCategories, updateToolCategory } from '../services/adminService';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AdminPanel() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [toolsState, setToolsState] = useState<{toolId: string; toolName: string; currentCategories: string[]; isHidden: boolean}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Derive categories from DEFAULT_TOOLS and toolsState
  const ALL_CATEGORIES = Array.from(new Set([
    ...DEFAULT_TOOLS.flatMap(t => Array.isArray(t.category) ? t.category : [t.category]),
    ...toolsState.flatMap(t => t.currentCategories),
    ...customCategories
  ])).sort();

  const handleAddGlobalCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const cat = newCategoryName.trim();
    if (!ALL_CATEGORIES.includes(cat)) {
      setCustomCategories(prev => [...prev, cat]);
    }
    setNewCategoryName("");
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserLocal = session?.user;
      const email = currentUserLocal?.email;
      const allowed = checkIsAdmin(email);
      setIsAdmin(allowed);
      if (allowed) {
        const overrides = await fetchToolCategories();
        const mapped = DEFAULT_TOOLS.map(t => {
          let overrideCats;
          let isHidden = false;
          if (overrides[t.id]) {
            const overrideVal = overrides[t.id] as any;
            if (Array.isArray(overrideVal)) {
              overrideCats = overrideVal;
            } else {
              overrideCats = overrideVal.categories;
              isHidden = overrideVal.is_hidden || false;
            }
          } else {
            overrideCats = Array.isArray(t.category) ? t.category : [t.category];
          }
          return {
            toolId: t.id,
            toolName: t.name,
            currentCategories: overrideCats,
            isHidden
          };
        });
        setToolsState(mapped);
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-8 flex items-center justify-center">
        <div className="text-xl text-slate-500">Authenticating...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-8">
        <div className="max-w-2xl mx-auto mt-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-red-200 dark:border-red-900/30 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You do not have permission to access the admin panel. Please log in with an authorized administrator account.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleToggleHide = (toolId: string) => {
    setToolsState(prev => prev.map(t => 
      t.toolId === toolId ? { ...t, isHidden: !t.isHidden } : t
    ));
  };

  const handleToggleCategory = (toolId: string, category: string) => {
    setToolsState(prev => prev.map(t => {
      if (t.toolId === toolId) {
        const has = t.currentCategories.includes(category);
        const newCats = has 
          ? t.currentCategories.filter(c => c !== category)
          : [...t.currentCategories, category];
        
        // Ensure at least one category remains
        if (newCats.length === 0) return t; 
        
        return { ...t, currentCategories: newCats };
      }
      return t;
    }));
  };

  const handleSave = async (toolId: string, categories: string[], isHidden: boolean) => {
    setSaving(toolId);
    const success = await updateToolCategory(toolId, categories, isHidden);
    
    if (success) {
      setMessage({ type: 'success', text: 'Tool category updated! Will sync for all users.' });
    } else {
      setMessage({ type: 'error', text: 'Error saving to Supabase. Make sure tool_categories table is created.' });
    }
    
    setSaving(null);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <Settings className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
              <p className="text-slate-500 dark:text-slate-400">Manage tool categories and layout</p>
            </div>
          </div>
          
          <button 
            onClick={async () => {
              const { supabase } = await import('../lib/supabase');
              await supabase.auth.signOut();
              navigate('/');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-xl transition-colors text-sm font-medium"
          >
            Sign Out
          </button>
        </div>

        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' 
                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
          </motion.div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Tool Category Assignments</h3>
                <p className="text-sm text-slate-500">Note: You must have created the `tool_categories` table in Supabase for this to persist globally.</p>
                <details className="mt-2 text-xs text-slate-500 cursor-pointer">
                  <summary>Show Supabase SQL Snippet</summary>
                  <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-900 rounded overflow-x-auto select-all">
{`CREATE TABLE IF NOT EXISTS tool_categories (
  tool_id TEXT PRIMARY KEY,
  categories JSONB NOT NULL,
  is_hidden BOOLEAN DEFAULT false
);`}
                  </pre>
                </details>
              </div>
              
              <form onSubmit={handleAddGlobalCategory} className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="New filter name..."
                  className="px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <button 
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  Add Filter
                </button>
              </form>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {toolsState.map(tool => (
              <div key={tool.toolId} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-slate-900 dark:text-white">{tool.toolName}</span>
                      <button
                        onClick={() => handleToggleHide(tool.toolId)}
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                          tool.isHidden 
                            ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' 
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                        }`}
                      >
                        {tool.isHidden ? 'Hidden' : 'Visible'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_CATEGORIES.map(cat => (
                        <button
                          key={cat}
                          onClick={() => handleToggleCategory(tool.toolId, cat)}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                            tool.currentCategories.includes(cat)
                              ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500/30 dark:text-indigo-400 font-medium'
                              : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSave(tool.toolId, tool.currentCategories, tool.isHidden)}
                    disabled={saving === tool.toolId}
                    className="flex-shrink-0 self-start md:self-center flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving === tool.toolId ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
