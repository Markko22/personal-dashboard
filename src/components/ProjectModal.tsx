"use client";

import { useEffect } from "react";
import {
  formatMrr,
  STATUS_COLORS,
  STATUS_LABELS,
  type PublicProject,
} from "@/types/project";

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

  const colors = STATUS_COLORS[project.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Chiudi"
      />

      <div className="relative w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Chiudi"
        >
          ✕
        </button>

        <div className="flex items-start gap-3 pr-8">
          <h2 id="modal-title" className="text-xl font-medium text-zinc-100">
            {project.name}
          </h2>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
          >
            {STATUS_LABELS[project.status]}
          </span>
        </div>

        <p className="mt-2 text-sm text-zinc-500">{project.tagline}</p>

        {project.next_milestone && (
          <div className="mt-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Prossima milestone
            </h3>
            <p className="mt-1 text-sm text-zinc-300">{project.next_milestone}</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              MRR
            </h3>
            <p className="mt-1 text-sm text-zinc-300">
              {formatMrr(project.mrr)}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Utenti
            </h3>
            <p className="mt-1 text-sm text-zinc-300">
              {project.users_count > 0 ? project.users_count : "—"}
            </p>
          </div>
        </div>

        {project.stack.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-600">
              Stack
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {project.stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-400"
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
                className="text-sm text-zinc-400 underline underline-offset-4 hover:text-zinc-200 transition-colors"
              >
                {formatUrl(project.url_site)} ↗
              </a>
            )}
            {project.url_repo && (
              <a
                href={project.url_repo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 underline underline-offset-4 hover:text-zinc-200 transition-colors"
              >
                GitHub ↗
              </a>
            )}
            {project.url_substack && (
              <a
                href={project.url_substack}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 underline underline-offset-4 hover:text-zinc-200 transition-colors"
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
