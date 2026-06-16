"use client";

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
  if (projects.length === 0) {
    return (
      <p className="py-16 text-center text-[var(--muted)]">
        Nessun progetto ancora.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          selected={selectedProjectId === project.id}
          showPrivateBadge={showPrivateBadge}
          onClick={() => onSelectProject(project)}
        />
      ))}
    </div>
  );
}
