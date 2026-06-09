"use client";

import type { PublicProject } from "@/types/project";
import ProjectLogo from "./ProjectLogo";
import StatusBadge from "./StatusBadge";

type Props = {
  project: PublicProject;
  onClick: () => void;
};

export default function ProjectCard({ project, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-[200px] w-[280px] shrink-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-left transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
          Progetto
        </span>
        <ProjectLogo name={project.name} variant="card" />
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold leading-tight text-[var(--foreground)] group-hover:text-white">
            {project.name}
          </h2>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {project.tagline}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>
    </button>
  );
}
