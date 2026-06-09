"use client";

import type { PublicProject } from "@/types/project";
import ProjectLogo from "./ProjectLogo";
import StatusBadge from "./StatusBadge";

type Props = {
  project: PublicProject;
  onClick: () => void;
};

function formatDisplayUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default function ProjectCard({ project, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[148px] w-full flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-3.5 text-left transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <div className="flex items-start justify-between gap-2">
        <ProjectLogo name={project.name} />
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
          Progetto
        </span>
      </div>

      <h2 className="mt-2.5 text-lg font-bold leading-tight text-[var(--foreground)] group-hover:text-white">
        {project.name}
      </h2>

      <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
        {project.tagline}
      </p>

      <div className="mt-3 flex items-end justify-between gap-2">
        {project.url_site ? (
          <span className="truncate text-[11px] text-[var(--muted)] transition-colors group-hover:text-[var(--muted-foreground)]">
            {formatDisplayUrl(project.url_site)}
          </span>
        ) : (
          <span />
        )}
        <StatusBadge status={project.status} />
      </div>
    </button>
  );
}
