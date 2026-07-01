"use client";

import { useEffect, useState } from "react";
import { fetchProjectTimeline } from "@/lib/supabase";
import {
  ROADMAP_PRIORITY_COLORS,
  ROADMAP_STATUS_LABELS,
  TIMELINE_DOT_COLORS,
  daysBetweenDates,
  formatDaysLive,
  formatDaysSpan,
  formatItalianDate,
  formatItalianMonth,
  formatMrrDelta,
  formatMrrValue,
  isPrivateProject,
  mrrGoalProgress,
  type PrivateProject,
  type PublicProject,
  type RoadmapItem,
  type RoadmapItemStatus,
  type TimelineEvent,
} from "@/types/project";
import StatusBadge from "./StatusBadge";

export type ProjectItem = PublicProject | PrivateProject;

type Props = {
  project: ProjectItem;
  privateView?: boolean;
};

function formatUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function RoadmapStatusIcon({ status }: { status: RoadmapItemStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/15 text-[10px] text-emerald-400">
        ✓
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--muted)] border-t-[var(--foreground)]" />
      </span>
    );
  }
  return (
    <span className="h-4 w-4 shrink-0 rounded-full border border-[var(--border)]" />
  );
}

const ROADMAP_STATUS_BORDER: Record<RoadmapItemStatus, string> = {
  todo: "border-zinc-500/40",
  in_progress: "border-amber-500/40",
  done: "border-emerald-500/40",
};

function RoadmapSection({ items }: { items: RoadmapItem[] }) {
  const groups: RoadmapItemStatus[] = ["in_progress", "todo", "done"];

  if (items.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--muted)]">Nessun item in roadmap.</p>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {groups.map((status) => {
        const groupItems = items.filter((item) => item.status === status);
        if (groupItems.length === 0) return null;

        return (
          <div key={status}>
            <h4 className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              {ROADMAP_STATUS_LABELS[status]}
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {groupItems.map((item) => {
                const priority = ROADMAP_PRIORITY_COLORS[item.priority];
                return (
                  <span
                    key={item.id}
                    className={`inline-flex items-center gap-1.5 rounded-full border bg-[var(--background)] px-3 py-1 text-sm ${ROADMAP_STATUS_BORDER[status]}`}
                  >
                    <RoadmapStatusIcon status={item.status} />
                    <span
                      className={
                        item.status === "done"
                          ? "text-[var(--muted)] line-through"
                          : "text-[var(--foreground)]"
                      }
                    >
                      {item.title}
                    </span>
                    <span
                      className={`rounded-full border px-1.5 py-px text-[9px] font-medium uppercase leading-none ${priority.bg} ${priority.text} ${priority.border}`}
                    >
                      {item.priority}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StoriaSection({
  events,
  loading,
}: {
  events: TimelineEvent[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="mt-3 text-sm text-[var(--muted)]">Caricamento storia…</p>
    );
  }

  if (events.length === 0) {
    return (
      <p className="mt-3 text-sm text-[var(--muted)]">Nessun evento registrato.</p>
    );
  }

  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  return (
    <div className="mt-3 h-[100px] overflow-x-auto pb-2">
      <div className="relative flex min-w-max items-start gap-6 px-1 pt-1">
        <div className="absolute left-0 right-0 top-[34px] h-px bg-[var(--border)]" />
        {sorted.map((event) => (
          <div
            key={event.id}
            className="relative flex w-[100px] shrink-0 flex-col items-center text-center"
          >
            <p className="mb-1 whitespace-nowrap text-[10px] text-[var(--muted)]">
              {formatItalianDate(event.event_date)}
            </p>
            <span
              className={`relative z-10 h-3 w-3 shrink-0 rounded-full ring-2 ring-[var(--card)] ${TIMELINE_DOT_COLORS[event.type]}`}
            />
            <p className="mt-2 line-clamp-2 text-xs font-medium leading-tight text-[var(--foreground)]">
              {event.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectDetailContent({
  project,
  privateView = false,
}: Props) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingTimeline(true);

    fetchProjectTimeline(project.id)
      .then((events) => {
        if (!cancelled) setTimeline(events);
      })
      .catch((err) => {
        console.error("Failed to fetch timeline:", err);
        if (!cancelled) setTimeline([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTimeline(false);
      });

    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const showPrivateDetails =
    privateView && isPrivateProject(project) && project.is_private;
  const privateNotes =
    privateView && isPrivateProject(project) ? project.private_notes : null;

  const mrrDelta = formatMrrDelta(project.mrr, project.mrr_prev);
  const goalProgress = mrrGoalProgress(project.mrr, project.mrr_goal);
  const deltaToneClass =
    mrrDelta.tone === "positive"
      ? "text-emerald-400"
      : mrrDelta.tone === "negative"
        ? "text-red-400"
        : "text-[var(--muted)]";

  const ideaToBuildDays =
    project.idea_date && project.build_start_date
      ? daysBetweenDates(project.idea_date, project.build_start_date)
      : null;
  const buildToLaunchDays =
    project.build_start_date && project.launch_date
      ? daysBetweenDates(project.build_start_date, project.launch_date)
      : null;

  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
        Progetto
      </span>

      <div className="mt-2 flex flex-wrap items-start gap-3">
        <h2 className="text-lg font-bold text-[var(--foreground)] sm:text-xl">
          {project.name}
        </h2>
        <StatusBadge status={project.status} />
        {showPrivateDetails && (
          <span className="shrink-0 rounded-full border border-zinc-500/30 bg-zinc-500/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            Privato
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        {project.tagline}
      </p>

      {privateView && isPrivateProject(project) && (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
            Note private
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--foreground)]">
            {privateNotes || "—"}
          </p>
        </div>
      )}

      {project.next_milestone && (
        <div className="mt-6">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
            Prossima milestone
          </h3>
          <p className="mt-1.5 text-sm text-[var(--foreground)]">
            {project.next_milestone}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
              MRR attuale
            </h3>
            <p className="mt-1.5 text-sm text-[var(--foreground)]">
              {formatMrrValue(project.mrr)}
            </p>
          </div>
          <div>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
              vs mese scorso
            </h3>
            <p className={`mt-1.5 text-sm ${deltaToneClass}`}>
              {mrrDelta.text}
            </p>
          </div>
        </div>

        {project.mrr_goal > 0 && (
          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--background)]">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              {formatMrrValue(project.mrr)} di {formatMrrValue(project.mrr_goal)}{" "}
              obiettivo ({goalProgress}%)
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
              Utenti
            </h3>
            <p className="mt-1.5 text-sm text-[var(--foreground)]">
              {project.users_count > 0 ? project.users_count : "—"}
            </p>
          </div>
          <div>
            <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
              Live da
            </h3>
            <p className="mt-1.5 text-sm text-[var(--foreground)]">
              {formatDaysLive(project.launch_date)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
          Date chiave
        </h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted-foreground)]">Idea</dt>
            <dd className="text-right text-[var(--foreground)]">
              {formatItalianMonth(project.idea_date)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted-foreground)]">Inizio build</dt>
            <dd className="text-right text-[var(--foreground)]">
              {formatItalianMonth(project.build_start_date)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted-foreground)]">Lancio</dt>
            <dd className="text-right text-[var(--foreground)]">
              {formatItalianMonth(project.launch_date)}
            </dd>
          </div>
          {ideaToBuildDays !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted-foreground)]">Giorni idea→build</dt>
              <dd className="text-right text-[var(--foreground)]">
                {formatDaysSpan(ideaToBuildDays)}
              </dd>
            </div>
          )}
          {buildToLaunchDays !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted-foreground)]">Giorni build→lancio</dt>
              <dd className="text-right text-[var(--foreground)]">
                {formatDaysSpan(buildToLaunchDays)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-6">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
          Storia
        </h3>
        <StoriaSection events={timeline} loading={loadingTimeline} />
      </div>

      <div className="mt-6">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
          Roadmap
        </h3>
        <RoadmapSection items={project.roadmap} />
      </div>

      {project.stack.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
            Stack
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {project.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 py-0.5 text-xs text-[var(--muted-foreground)]"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {(project.url_site || project.url_repo || project.url_substack) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {project.url_site && (
            <a
              href={project.url_site}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--muted-foreground)] underline underline-offset-4 transition-colors hover:text-[var(--foreground)]"
            >
              {formatUrl(project.url_site)} ↗
            </a>
          )}
          {project.url_repo && (
            <a
              href={project.url_repo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--muted-foreground)] underline underline-offset-4 transition-colors hover:text-[var(--foreground)]"
            >
              GitHub ↗
            </a>
          )}
          {project.url_substack && (
            <a
              href={project.url_substack}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--muted-foreground)] underline underline-offset-4 transition-colors hover:text-[var(--foreground)]"
            >
              Substack ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
