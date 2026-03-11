import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
let browserClient: SupabaseClient | undefined;

function getPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return { url, anonKey };
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, anonKey } = getPublicEnv();
    browserClient = createBrowserClient(url, anonKey);
  }
  return browserClient;
}
