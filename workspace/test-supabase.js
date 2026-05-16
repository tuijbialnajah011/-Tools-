import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jaatnjdgxnluuhfvinzc.supabase.co';
const supabaseKey = 'sb_publishable_3bGOvR7tOU0PhLE-yHoEAA_JmI_nLhe';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('tool_usage').select('*');
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
