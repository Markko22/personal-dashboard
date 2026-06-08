"use client";

import {
  STATUS_COLORS,
  STATUS_LABELS,
  type PublicProject,
} from "@/types/project";

type Props = {
  project: PublicProject;
  onClick: () => void;
};

export default function ProjectCard({ project, onClick }: Props) {
  const colors = STATUS_COLORS[project.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 transition-colors hover:border-zinc-600 hover:bg-zinc-900/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-medium text-zinc-100 group-hover:text-white">
          {project.name}
        </h2>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
        >
          {STATUS_LABELS[project.status]}
        </span>
      </div>

      <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
        {project.tagline}
      </p>

      {project.url_site && (
        <p className="mt-4 text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors truncate">
          {project.url_site.replace(/^https?:\/\//, "")}
        </p>
      )}
    </button>
  );
}
