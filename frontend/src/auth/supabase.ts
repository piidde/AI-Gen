import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const supabasePublishableKey = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey,
);

export const SUPABASE_CONFIG_ERROR =
  "Supabase Auth ist noch nicht konfiguriert. Bitte die VITE_SUPABASE_* Werte setzen.";

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;
