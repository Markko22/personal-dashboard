"use client";

import {
  CATEGORY_LABELS,
  type AziendaleProject,
  type PrivateProject,
  type ProjectCategory,
} from "@/types/project";
import ProjectCard from "./ProjectCard";

type ProjectItem = AziendaleProject | PrivateProject;

type Props = {
  projects: ProjectItem[];
  selectedProjectId: string | null;
  onSelectProject: (project: ProjectItem) => void;
  showCategoryBadge?: boolean;
  groupByCategory?: boolean;
};

function sortByOrder(projects: ProjectItem[]) {
  return [...projects].sort((a, b) => a.order_index - b.order_index);
}

function renderGrid(
  items: ProjectItem[],
  selectedProjectId: string | null,
  showCategoryBadge: boolean,
  onSelectProject: (project: ProjectItem) => void
) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
      {items.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          selected={selectedProjectId === project.id}
          showCategoryBadge={showCategoryBadge}
          onClick={() => onSelectProject(project)}
        />
      ))}
    </div>
  );
}

export default function ProjectGrid({
  projects,
  selectedProjectId,
  onSelectProject,
  showCategoryBadge = false,
  groupByCategory = false,
}: Props) {
  if (projects.length === 0) {
    return (
      <p className="py-16 text-center text-[var(--muted)]">
        Nessun progetto ancora.
      </p>
    );
  }

  if (!groupByCategory) {
    return renderGrid(
      sortByOrder(projects),
      selectedProjectId,
      showCategoryBadge,
      onSelectProject
    );
  }

  const categories: ProjectCategory[] = ["aziendale", "personale"];

  return (
    <div className="space-y-10">
      {categories.map((category) => {
        const groupProjects = sortByOrder(
          projects.filter(
            (project): project is PrivateProject =>
              "category" in project && project.category === category
          )
        );

        if (groupProjects.length === 0) return null;

        return (
          <section key={category}>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              {CATEGORY_LABELS[category]}
            </h3>
            {renderGrid(
              groupProjects,
              selectedProjectId,
              showCategoryBadge,
              onSelectProject
            )}
          </section>
        );
      })}
    </div>
  );
}
