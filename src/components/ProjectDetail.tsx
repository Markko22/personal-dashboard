"use client";

import {
  STATUS_COLORS,
  type PrivateProject,
  type ProjectStatus,
  type PublicProject,
} from "@/types/project";
import ProjectDetailContent from "./ProjectDetailContent";

type ProjectItem = PublicProject | PrivateProject;

const STATUS_NAV_ORDER: ProjectStatus[] = [
  "live",
  "building",
  "beta",
  "idea",
  "paused",
  "archived",
];

function sortProjectsForNav(projects: ProjectItem[]): ProjectItem[] {
  return [...projects].sort((a, b) => {
    const statusDiff =
      STATUS_NAV_ORDER.indexOf(a.status) - STATUS_NAV_ORDER.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    return a.order_index - b.order_index;
  });
}

type Props = {
  projects: ProjectItem[];
  selectedProject: ProjectItem | null;
  onSelectProject: (project: ProjectItem) => void;
  privateView?: boolean;
};

export default function ProjectDetail({
  projects,
  selectedProject,
  onSelectProject,
  privateView = false,
}: Props) {
  const sorted = sortProjectsForNav(projects);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="h-[40%] min-h-0 shrink-0 overflow-y-auto border-b border-[var(--border)] p-4">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
          PROGETTI
        </h3>
        <ul className="mt-3 space-y-0.5">
          {sorted.map((project) => {
            const isSelected = selectedProject?.id === project.id;
            const dotColor = STATUS_COLORS[project.status].text.replace(
              "text-",
              "bg-"
            );

            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => onSelectProject(project)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? "bg-[var(--card-hover)] text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`}
                  />
                  <span className="truncate font-medium">{project.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {selectedProject ? (
          <ProjectDetailContent
            project={selectedProject}
            privateView={privateView}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">Seleziona un progetto</p>
        )}
      </div>
    </div>
  );
}
