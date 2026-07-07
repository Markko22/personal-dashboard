"use client";

import { useEffect, useState } from "react";
import { fetchProjectTimeline } from "@/lib/supabase";
import {
  CATEGORY_LABELS,
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
  mrrGoalProgress,
  type AziendaleProject,
  type PrivateProject,
  type RoadmapItem,
  type RoadmapItemStatus,
  type TimelineEvent,
} from "@/types/project";
import type { DashboardViewMode } from "./DashboardShell";
import StatusBadge from "./StatusBadge";

export type ProjectItem = AziendaleProject | PrivateProject;

type Props = {
  project: ProjectItem;
  viewMode: DashboardViewMode;
};

function formatUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function isPrivateProject(project: ProjectItem): project is PrivateProject {
  return "category" in project;
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
  viewMode,
}: Props) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const isAziendaleView = viewMode === "aziendale";

  useEffect(() => {
    if (isAziendaleView) return;

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
  }, [isAziendaleView, project.id]);

  const privateProject = isPrivateProject(project) ? project : null;

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
        {privateProject && viewMode === "private" && (
          <span className="shrink-0 rounded-full border border-zinc-500/30 bg-zinc-500/15 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {CATEGORY_LABELS[privateProject.category]}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        {project.tagline}
      </p>

      {viewMode === "private" && privateProject && (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
            Note private
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--foreground)]">
            {privateProject.private_notes || "—"}
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

      {!isAziendaleView && privateProject && (
        <>
          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
                  MRR attuale
                </h3>
                <p className="mt-1.5 text-sm text-[var(--foreground)]">
                  {formatMrrValue(privateProject.mrr)}
                </p>
              </div>
              <div>
                <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
                  vs mese scorso
                </h3>
                <p
                  className={`mt-1.5 text-sm ${
                    formatMrrDelta(privateProject.mrr, privateProject.mrr_prev)
                      .tone === "positive"
                      ? "text-emerald-400"
                      : formatMrrDelta(
                            privateProject.mrr,
                            privateProject.mrr_prev
                          ).tone === "negative"
                        ? "text-red-400"
                        : "text-[var(--muted)]"
                  }`}
                >
                  {
                    formatMrrDelta(privateProject.mrr, privateProject.mrr_prev)
                      .text
                  }
                </p>
              </div>
            </div>

            {privateProject.mrr_goal > 0 && (
              <div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--background)]">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${mrrGoalProgress(privateProject.mrr, privateProject.mrr_goal)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {formatMrrValue(privateProject.mrr)} di{" "}
                  {formatMrrValue(privateProject.mrr_goal)} obiettivo (
                  {mrrGoalProgress(
                    privateProject.mrr,
                    privateProject.mrr_goal
                  )}
                  %)
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
                  Utenti
                </h3>
                <p className="mt-1.5 text-sm text-[var(--foreground)]">
                  {privateProject.users_count > 0
                    ? privateProject.users_count
                    : "—"}
                </p>
              </div>
              <div>
                <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
                  Live da
                </h3>
                <p className="mt-1.5 text-sm text-[var(--foreground)]">
                  {formatDaysLive(privateProject.launch_date)}
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
                  {formatItalianMonth(privateProject.idea_date)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted-foreground)]">Inizio build</dt>
                <dd className="text-right text-[var(--foreground)]">
                  {formatItalianMonth(privateProject.build_start_date)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted-foreground)]">Lancio</dt>
                <dd className="text-right text-[var(--foreground)]">
                  {formatItalianMonth(privateProject.launch_date)}
                </dd>
              </div>
              {privateProject.idea_date && privateProject.build_start_date && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted-foreground)]">
                    Giorni idea→build
                  </dt>
                  <dd className="text-right text-[var(--foreground)]">
                    {formatDaysSpan(
                      daysBetweenDates(
                        privateProject.idea_date,
                        privateProject.build_start_date
                      )
                    )}
                  </dd>
                </div>
              )}
              {privateProject.build_start_date && privateProject.launch_date && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--muted-foreground)]">
                    Giorni build→lancio
                  </dt>
                  <dd className="text-right text-[var(--foreground)]">
                    {formatDaysSpan(
                      daysBetweenDates(
                        privateProject.build_start_date,
                        privateProject.launch_date
                      )
                    )}
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
            <RoadmapSection items={privateProject.roadmap} />
          </div>
        </>
      )}

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

      {project.url_site && (
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={project.url_site}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--muted-foreground)] underline underline-offset-4 transition-colors hover:text-[var(--foreground)]"
          >
            {formatUrl(project.url_site)} ↗
          </a>
        </div>
      )}

      {!isAziendaleView && privateProject && (
        <div className="mt-6 flex flex-wrap gap-3">
          {privateProject.url_repo && (
            <a
              href={privateProject.url_repo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--muted-foreground)] underline underline-offset-4 transition-colors hover:text-[var(--foreground)]"
            >
              GitHub ↗
            </a>
          )}
          {privateProject.url_substack && (
            <a
              href={privateProject.url_substack}
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
