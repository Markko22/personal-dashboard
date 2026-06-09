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
  mrr_goal: number;
  mrr_prev: number;
  launch_date: string | null;
  idea_date: string | null;
  build_start_date: string | null;
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
  mrr_goal: number;
  mrr_prev: number;
  launch_date: string | null;
  idea_date: string | null;
  build_start_date: string | null;
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
  "id, name, tagline, status, next_milestone, mrr, mrr_goal, mrr_prev, launch_date, idea_date, build_start_date, users_count, stack, url_site, url_repo, url_substack, order_index, created_at, updated_at";

/** Strip private_notes from a DB row (e.g. Realtime payload). */
export function toPublicProject(row: Record<string, unknown>): PublicProject {
  return {
    id: row.id as string,
    name: row.name as string,
    tagline: row.tagline as string,
    status: row.status as ProjectStatus,
    next_milestone: (row.next_milestone as string | null) ?? null,
    mrr: Number(row.mrr) || 0,
    mrr_goal: Number(row.mrr_goal) || 0,
    mrr_prev: Number(row.mrr_prev) || 0,
    launch_date: (row.launch_date as string | null) ?? null,
    idea_date: (row.idea_date as string | null) ?? null,
    build_start_date: (row.build_start_date as string | null) ?? null,
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

const eurFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMrr(mrr: number): string {
  if (mrr <= 0) return "—";
  return eurFormatter.format(mrr);
}

export function formatMrrValue(mrr: number): string {
  return eurFormatter.format(mrr);
}

export function formatMrrDelta(mrr: number, mrrPrev: number): {
  text: string;
  tone: "positive" | "negative" | "neutral";
} {
  const delta = Math.round((mrr - mrrPrev) * 100) / 100;
  if (delta === 0) {
    return { text: eurFormatter.format(0), tone: "neutral" };
  }
  const sign = delta > 0 ? "+" : "";
  return {
    text: `${sign}${eurFormatter.format(delta)}`,
    tone: delta > 0 ? "positive" : "negative",
  };
}

export function mrrGoalProgress(mrr: number, mrrGoal: number): number {
  if (mrrGoal <= 0) return 0;
  return Math.min(100, Math.round((mrr / mrrGoal) * 100));
}

export function daysSinceLaunch(launchDate: string | null): number | null {
  if (!launchDate) return null;
  const launch = new Date(`${launchDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - launch.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatDaysLive(launchDate: string | null): string {
  const days = daysSinceLaunch(launchDate);
  if (days === null) return "—";
  return days === 1 ? "1 giorno" : `${days} giorni`;
}

export function projectSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function projectInitials(name: string): string {
  const parts = name.split(/[\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const italianMonthFormatter = new Intl.DateTimeFormat("it-IT", {
  month: "long",
  year: "numeric",
});

export function formatItalianMonth(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  return italianMonthFormatter.format(parsed);
}

export function daysBetweenDates(
  startDate: string,
  endDate: string
): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatDaysSpan(days: number): string {
  return days === 1 ? "1 giorno" : `${days} giorni`;
}

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
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
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
