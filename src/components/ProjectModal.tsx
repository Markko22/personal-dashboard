"use client";

import { useEffect } from "react";
import {
  daysBetweenDates,
  formatDaysLive,
  formatDaysSpan,
  formatItalianMonth,
  formatMrrDelta,
  formatMrrValue,
  mrrGoalProgress,
  type PublicProject,
} from "@/types/project";
import StatusBadge from "./StatusBadge";

type Props = {
  project: PublicProject | null;
  onClose: () => void;
};

function formatUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default function ProjectModal({ project, onClose }: Props) {
  useEffect(() => {
    if (!project) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [project, onClose]);

  if (!project) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#0a0f18]/80 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Chiudi"
      />

      <div className="relative w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
          aria-label="Chiudi"
        >
          ✕
        </button>

        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
          Progetto
        </span>

        <div className="mt-2 flex items-start gap-3 pr-8">
          <h2
            id="modal-title"
            className="text-xl font-bold text-[var(--foreground)]"
          >
            {project.name}
          </h2>
          <StatusBadge status={project.status} />
        </div>

        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {project.tagline}
        </p>

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
            Timeline
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
    </div>
  );
}
