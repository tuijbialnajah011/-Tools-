import { supabase } from '../lib/supabase';

export interface ToolUsage {
  tool_id: string;
  usage_count: number;
}

const LOCAL_STORAGE_KEY = 'app_tool_usage_fallback';

function getLocalUsage(): Record<string, number> {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveLocalUsage(data: Record<string, number>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export const usageService = {
  /**
   * Increments the usage count for a specific tool.
   * This is a non-blocking call to ensure UX isn't affected by Supabase latency.
   */
  async incrementUsage(toolId: string) {
    // Always increment locally for immediate UI update / fallback
    const localUsage = getLocalUsage();
    localUsage[toolId] = (localUsage[toolId] || 0) + 1;
    saveLocalUsage(localUsage);

    try {
      // We use an RPC call to increment the counter atomically
      // This requires the 'increment_tool_usage' function to be defined in Supabase
      const { error } = await supabase.rpc('increment_tool_usage', { target_tool_id: toolId });
      
      if (error) {
        // If RPC fails (e.g. not defined yet), we fallback to a simple upsert
        // though RPC is preferred for atomic increments
        console.warn('RPC failed, falling back to upsert:', error.message);
        
        // Fetch current count
        const { data } = await supabase
          .from('tool_usage')
          .select('usage_count')
          .eq('tool_id', toolId)
          .single();
        
        const newCount = (data?.usage_count || 0) + 1;
        
        await supabase
          .from('tool_usage')
          .upsert({ tool_id: toolId, usage_count: newCount }, { onConflict: 'tool_id' });
      }
    } catch (err) {
      // Silently fail to not affect user experience
      console.error('Error incrementing usage in Supabase:', err);
    }
  },

  /**
   * Fetches all tool usage counts.
   */
  async getAllUsage(): Promise<Record<string, number>> {
    const localUsage = getLocalUsage();

    try {
      const { data, error } = await supabase
        .from('tool_usage')
        .select('tool_id, usage_count');
      
      if (error) throw error;

      const usageMap: Record<string, number> = { ...localUsage };
      data?.forEach((item: any) => {
        // Merge Supabase data with local data (use whatever is higher)
        usageMap[item.tool_id] = Math.max(item.usage_count, localUsage[item.tool_id] || 0);
      });
      
      // Keep local sync'd up with DB if DB has higher values
      saveLocalUsage(usageMap);
      return usageMap;
    } catch (err) {
      console.error('Error fetching usage from Supabase. Falling back to local storage:', err);
      // Return local fallback data if Supabase request fails (e.g., project paused/deleted)
      return localUsage;
    }
  }
};
