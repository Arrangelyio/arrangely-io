import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jowuhdfznveuopeqwzzd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvd3VoZGZ6bnZldW9wZXF3enpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNjEyMjMsImV4cCI6MjA2ODgzNzIyM30.KFMkZdBXK5X-LY0r8xreRe2CxvkC3G1o9lFq_ZTeZ8A';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
