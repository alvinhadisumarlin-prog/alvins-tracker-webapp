import { createClient } from '@supabase/supabase-js';

// Question Bank project - for questions, mark schemes, and synthetic training data
const QUESTION_BANK_URL = 'https://hpemnbczooxoumypndye.supabase.co';
const QUESTION_BANK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwZW1uYmN6b294b3VteXBuZHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMzQ4MjgsImV4cCI6MjA4OTgxMDgyOH0.Ra0mQXNnaAZJ4Y64sERrdAHP8gyNwkPAr0oQipYX14c';

export const supabaseQB = createClient(QUESTION_BANK_URL, QUESTION_BANK_ANON_KEY);
