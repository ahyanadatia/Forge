import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://gpdyrtcaloafwzpibjya.supabase.co', // Replace with your Supabase project URL
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZHlydGNhbG9hZnd6cGlianlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTE1MzIsImV4cCI6MjA4NzU4NzUzMn0.F5k9wCzsrYxuq0cGFJjebtz5M7tse0so9J9oSfhQq0U' // Replace with your Supabase anon public key
);
