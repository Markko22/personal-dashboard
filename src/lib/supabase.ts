import { createClient } from "@supabase/supabase-js";
import {
  PUBLIC_PROJECT_COLUMNS,
  toPublicProject,
  type PublicProject,
  type TimelineEvent,
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
  console.log("columns:", PUBLIC_PROJECT_COLUMNS);

  const supabase = createClient(getSupabaseUrl(), getAnonKey(), {
    global: {
      fetch: (url, init = {}) =>
        fetch(url, {
          ...init,
          cache: "no-store",
          headers: {
            ...((init.headers as Record<string, string> | undefined) ?? {}),
            "Cache-Control": "no-cache",
          },
        }),
    },
  });

  const { data } = await supabase
    .from("projects")
    .select(PUBLIC_PROJECT_COLUMNS)
    .order("order_index", { ascending: true })
    .throwOnError();

  console.log("raw roadmap from DB:", data?.[0]?.roadmap);

  return data.map((row) => toPublicProject(row as Record<string, unknown>));
}

export async function fetchProjectTimeline(
  projectId: string
): Promise<TimelineEvent[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("project_timeline")
    .select("id, project_id, event_date, title, description, type, created_at")
    .eq("project_id", projectId)
    .order("event_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TimelineEvent[];
}
