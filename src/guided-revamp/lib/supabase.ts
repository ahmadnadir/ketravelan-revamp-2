import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const missingVars: string[] = [];

if (!supabaseUrl) {
  missingVars.push('VITE_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  missingVars.push('VITE_SUPABASE_ANON_KEY');
}

if (missingVars.length > 0) {
  throw new Error(
    `Missing Supabase environment variables: ${missingVars.join(', ')}. Add them to a .env file in the project root and restart the dev server.`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
