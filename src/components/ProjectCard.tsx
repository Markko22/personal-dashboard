"use client";

import {
  isPrivateProject,
  type PrivateProject,
  type ProjectStatus,
  type PublicProject,
} from "@/types/project";
import ProjectLogo from "./ProjectLogo";
import StatusBadge from "./StatusBadge";

function getCardBackground(status: ProjectStatus): string {
  switch (status) {
    case "live":
      return "bg-green-500/10 border-green-500/30";
    case "building":
      return "bg-yellow-500/10 border-yellow-500/30";
    case "beta":
      return "bg-orange-500/10 border-orange-500/30";
    case "paused":
      return "bg-blue-500/10 border-blue-500/30";
    case "archived":
      return "bg-zinc-800/50 border-zinc-700 opacity-60";
    case "idea":
    default:
      return "bg-zinc-900 border-zinc-800";
  }
}

type Props = {
  project: PublicProject | PrivateProject;
  selected?: boolean;
  showPrivateBadge?: boolean;
  onClick: () => void;
};

export default function ProjectCard({
  project,
  selected = false,
  showPrivateBadge = false,
  onClick,
}: Props) {
  const isPrivate =
    showPrivateBadge && isPrivateProject(project) && project.is_private;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex h-[200px] w-full flex-col rounded-lg border p-4 text-left transition-colors duration-300 hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${getCardBackground(project.status)} ${
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
            Progetto
          </span>
          {isPrivate && (
            <span className="rounded-full border border-zinc-500/30 bg-zinc-500/15 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-zinc-400">
              Privato
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {project.is_company && (
            <span className="rounded-sm bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
              Aziendale
            </span>
          )}
          <ProjectLogo name={project.name} variant="card" />
        </div>
      </div>

      <div className="mt-auto pt-3">
        <h2 className="truncate text-base font-bold leading-tight text-[var(--foreground)] group-hover:text-white sm:text-lg">
          {project.name}
        </h2>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {project.tagline}
        </p>
        <div className="mt-3 flex justify-end">
          <StatusBadge status={project.status} />
        </div>
      </div>
    </button>
  );
}
