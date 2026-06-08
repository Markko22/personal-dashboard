export const PROJECT_STATUSES = [
  "idea",
  "building",
  "beta",
  "live",
  "paused",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Full row — server/admin only. Never expose private_notes to the client. */
export type Project = {
  id: string;
  name: string;
  tagline: string;
  status: ProjectStatus;
  next_milestone: string | null;
  mrr: number;
  users_count: number;
  stack: string[];
  url_site: string | null;
  url_repo: string | null;
  url_substack: string | null;
  private_notes: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

/** Safe subset for frontend — no private_notes field at all. */
export type PublicProject = {
  id: string;
  name: string;
  tagline: string;
  status: ProjectStatus;
  next_milestone: string | null;
  mrr: number;
  users_count: number;
  stack: string[];
  url_site: string | null;
  url_repo: string | null;
  url_substack: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export const PUBLIC_PROJECT_COLUMNS =
  "id, name, tagline, status, next_milestone, mrr, users_count, stack, url_site, url_repo, url_substack, order_index, created_at, updated_at";

/** Strip private_notes from a DB row (e.g. Realtime payload). */
export function toPublicProject(row: Record<string, unknown>): PublicProject {
  return {
    id: row.id as string,
    name: row.name as string,
    tagline: row.tagline as string,
    status: row.status as ProjectStatus,
    next_milestone: (row.next_milestone as string | null) ?? null,
    mrr: (row.mrr as number) ?? 0,
    users_count: (row.users_count as number) ?? 0,
    stack: (row.stack as string[]) ?? [],
    url_site: (row.url_site as string | null) ?? null,
    url_repo: (row.url_repo as string | null) ?? null,
    url_substack: (row.url_substack as string | null) ?? null,
    order_index: (row.order_index as number) ?? 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: "Idea",
  building: "Building",
  beta: "Beta",
  live: "Live",
  paused: "Paused",
  archived: "Archived",
};

export const STATUS_COLORS: Record<
  ProjectStatus,
  { bg: string; text: string; border: string }
> = {
  idea: {
    bg: "bg-zinc-500/15",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
  },
  building: {
    bg: "bg-orange-500/15",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  beta: {
    bg: "bg-yellow-500/15",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  live: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  paused: {
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  archived: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
  },
};
