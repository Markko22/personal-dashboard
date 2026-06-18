"use client";

import { useState } from "react";
import type { PrivateProject, PublicProject } from "@/types/project";
import ProjectCard from "./ProjectCard";

type ProjectItem = PublicProject | PrivateProject;

type Props = {
  projects: ProjectItem[];
  selectedProjectId: string | null;
  onSelectProject: (project: ProjectItem) => void;
  showPrivateBadge?: boolean;
};

export default function ProjectGrid({
  projects,
  selectedProjectId,
  onSelectProject,
  showPrivateBadge = false,
}: Props) {
  const [hideCompany, setHideCompany] = useState(false);

  if (projects.length === 0) {
    return (
      <p className="py-16 text-center text-[var(--muted)]">
        Nessun progetto ancora.
      </p>
    );
  }

  const visibleProjects = hideCompany
    ? projects.filter((p) => !p.is_company)
    : projects;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setHideCompany((prev) => !prev)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            hideCompany
              ? "bg-[var(--accent)]/20 text-[var(--accent)]"
              : "bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {hideCompany ? "Mostra aziendali" : "Nascondi aziendali"}
        </button>
      </div>

      {visibleProjects.length === 0 ? (
        <p className="py-16 text-center text-[var(--muted)]">
          Nessun progetto da mostrare.
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              selected={selectedProjectId === project.id}
              showPrivateBadge={showPrivateBadge}
              onClick={() => onSelectProject(project)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
