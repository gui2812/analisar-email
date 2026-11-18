// src/lib/supabase.js
// Cliente único do Supabase para toda a aplicação.
// Instalar antes: npm install @supabase/supabase-js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
