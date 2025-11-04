// This file configures Supabase client using environment variables.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Read from Vite env (define in .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase env vars: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Enhanced session recovery
    storageKey: 'supabase.auth.token'
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
      // Do not include Authorization or apikey here to avoid conflicts with Edge Functions
    }
  },
  // Enhanced error handling for RLS debugging
  db: {
    schema: 'public'
  }
});