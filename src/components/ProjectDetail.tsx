"use client";

import {
  STATUS_COLORS,
  STATUS_LABELS,
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

function groupProjectsByStatus(projects: ProjectItem[]) {
  return STATUS_NAV_ORDER.map((status) => ({
    status,
    projects: projects
      .filter((p) => p.status === status)
      .sort((a, b) => a.order_index - b.order_index),
  })).filter((group) => group.projects.length > 0);
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
  const groups = groupProjectsByStatus(projects);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-[#0d1520] p-3">
      <div className="max-h-[40%] min-h-0 shrink-0 overflow-y-auto rounded-xl border border-[#1a2436] bg-[#0a1018]/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <h3 className="border-b border-[var(--border)] pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          I MIEI PROGETTI
        </h3>
        <div className="mt-3">
          {groups.map((group, groupIndex) => {
            const colors = STATUS_COLORS[group.status];
            const dotColor = colors.text.replace("text-", "bg-");

            return (
              <div key={group.status}>
                {groupIndex > 0 && (
                  <div
                    className="my-2 border-t border-[var(--border)]"
                    aria-hidden
                  />
                )}
                <div className="flex items-center gap-2 px-2 py-1">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`}
                  />
                  <span
                    className={`text-[10px] font-medium uppercase tracking-[0.12em] ${colors.text}`}
                  >
                    {STATUS_LABELS[group.status].toUpperCase()}
                  </span>
                </div>
                <ul className="mt-0.5 space-y-0.5">
                  {group.projects.map((project) => {
                    const isSelected = selectedProject?.id === project.id;

                    return (
                      <li key={project.id}>
                        <button
                          type="button"
                          onClick={() => onSelectProject(project)}
                          className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                            isSelected
                              ? "border-l-2 border-[var(--accent)] bg-[var(--accent)]/10 pl-[calc(0.5rem-2px)] font-medium text-[var(--foreground)]"
                              : "text-[var(--muted-foreground)] hover:bg-[#141c2a] hover:text-[var(--foreground)]"
                          }`}
                        >
                          {project.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 max-h-[60%] flex-1 overflow-y-auto rounded-2xl border border-[var(--border-hover)] bg-[#1a2740] p-5 shadow-[0_-4px_16px_rgba(0,0,0,0.25)]">
        <h3 className="border-b border-[var(--accent)]/30 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          DETTAGLIO
        </h3>
        <div className="mt-3">
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
    </div>
  );
}
