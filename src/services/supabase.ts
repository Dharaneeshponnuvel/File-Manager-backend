import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://iifrqchsujoqptmnbzwb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpZnJxY2hzdWpvcXB0bW5iendiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTMyMzUsImV4cCI6MjA3MDA2OTIzNX0.j1WF7kZ_Y_qrVVbKytOUfCshs91S4XVePtKWq_FE2MM';

if (!supabaseUrl) throw new Error("SUPABASE_URL not defined in .env");
if (!supabaseAnonKey) throw new Error("SUPABASE_ANON_KEY not defined in .env");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
