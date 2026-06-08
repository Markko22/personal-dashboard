import { createClient } from "@supabase/supabase-js";
import {
  PUBLIC_PROJECT_COLUMNS,
  type PublicProject,
} from "@/types/project";

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

function getAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

/** Browser / SSR public client — read-only via RLS. */
export function createPublicClient() {
  return createClient(getSupabaseUrl(), getAnonKey());
}

/** Server-only admin client — bypasses RLS for bot writes. */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function fetchPublicProjects(): Promise<PublicProject[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PUBLIC_PROJECT_COLUMNS)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PublicProject[];
}
