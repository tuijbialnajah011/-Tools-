import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Define the Tool interface here or import it if the app moves it. I'll just keep it inline or `any` for ease, but wait, `Dashboard.tsx` defines it inside. I'll change `Dashboard.tsx` to export it soon.
export const ADMIN_EMAILS = [
  'tuijbialnajah@gmail.com',
  'tuijbialnajah0@gmail.com',
  'pintrestk11@gmail.com',
  'nadiaparveen1526@gmail.com'
];

export async function checkIsAdmin(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) return false;
  return ADMIN_EMAILS.includes(session.user.email.toLowerCase());
}

export async function fetchToolCategories(): Promise<Record<string, string[]>> {
  try {
    const { data, error } = await supabase.from('tool_categories').select('*');
    if (error) {
      console.warn("Could not fetch tool categories from Supabase (table might not exist). Falling back to local/default.");
      const localStr = localStorage.getItem('tool_categories_override');
      return localStr ? JSON.parse(localStr) : {};
    }
    
    // Supabase success
    const mapping: Record<string, string[]> = {};
    if (data) {
      data.forEach((row: any) => {
        mapping[row.tool_id] = row.categories;
      });
      // cache locally
      localStorage.setItem('tool_categories_override', JSON.stringify(mapping));
    }
    return mapping;
  } catch (err) {
    const localStr = localStorage.getItem('tool_categories_override');
    return localStr ? JSON.parse(localStr) : {};
  }
}

export async function updateToolCategory(toolId: string, categories: string[]): Promise<boolean> {
  try {
    console.log("Updating tool category in Supabase:", toolId, categories);
    const { error } = await supabase.from('tool_categories').upsert({
      tool_id: toolId,
      categories: categories
    });
    
    if (error) {
      console.warn("Supabase upsert failed, updating locally only.", error);
    }
    
    // Always update locally for immediate UX
    const localStr = localStorage.getItem('tool_categories_override');
    const localMap = localStr ? JSON.parse(localStr) : {};
    localMap[toolId] = categories;
    localStorage.setItem('tool_categories_override', JSON.stringify(localMap));
    
    // Trigger custom event so Dashboard can reload
    window.dispatchEvent(new Event('tool_categories_updated'));
    return true;
  } catch (err) {
    console.error("Error updating category", err);
    return false;
  }
}

export function useToolCategoryOverride(defaultTools: any[]) {
  const [tools, setTools] = useState<any[]>(defaultTools);

  useEffect(() => {
    let _mounted = true;
    const loadOverrides = async () => {
      const overrides = await fetchToolCategories();
      if (!_mounted) return;
      const newTools = defaultTools.map(t => {
        if (overrides[t.id]) {
          return { ...t, category: overrides[t.id] };
        }
        return t;
      });
      setTools(newTools);
    };

    loadOverrides();

    const handleUpdate = () => {
      loadOverrides();
    };

    window.addEventListener('tool_categories_updated', handleUpdate);
    return () => {
      _mounted = false;
      window.removeEventListener('tool_categories_updated', handleUpdate);
    }
  }, [defaultTools]);

  return { tools };
}
