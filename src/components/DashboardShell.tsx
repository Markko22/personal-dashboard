"use client";

import { useCallback, useEffect, useState } from "react";
import { createPublicClient } from "@/lib/supabase";
import {
  toPrivateProject,
  toPublicProject,
  type PrivateProject,
  type PublicProject,
} from "@/types/project";
import ProjectDetail from "./ProjectDetail";
import ProjectGrid from "./ProjectGrid";
import Sidebar from "./Sidebar";

type ProjectItem = PublicProject | PrivateProject;

type Props = {
  initialProjects: ProjectItem[];
  privateView?: boolean;
  headerTitle: string;
  headerSubtitle: string;
};

export default function DashboardShell({
  initialProjects,
  privateView = false,
  headerTitle,
  headerSubtitle,
}: Props) {
  const [projects, setProjects] = useState(initialProjects);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(
    initialProjects[0] ?? null
  );

  const handleRealtimeUpdate = useCallback(
    (payload: {
      eventType: string;
      new: Record<string, unknown>;
      old: { id: string };
    }) => {
      const mapRow = privateView ? toPrivateProject : toPublicProject;

      if (payload.eventType === "INSERT") {
        const row = mapRow(payload.new);
        if (!privateView && "is_private" in row && row.is_private) return;
        setProjects((prev) =>
          [...prev, row].sort((a, b) => a.order_index - b.order_index)
        );
      } else if (payload.eventType === "UPDATE") {
        const row = mapRow(payload.new);
        if (!privateView && "is_private" in row && row.is_private) {
          setProjects((prev) => prev.filter((p) => p.id !== row.id));
          setSelectedProject((current) =>
            current?.id === row.id ? null : current
          );
          return;
        }
        setProjects((prev) =>
          prev
            .map((p) => (p.id === row.id ? row : p))
            .sort((a, b) => a.order_index - b.order_index)
        );
        setSelectedProject((current) =>
          current?.id === row.id ? row : current
        );
      } else if (payload.eventType === "DELETE") {
        setProjects((prev) => {
          const next = prev.filter((p) => p.id !== payload.old.id);
          setSelectedProject((current) => {
            if (current?.id !== payload.old.id) return current;
            return next[0] ?? null;
          });
          return next;
        });
      }
    },
    [privateView]
  );

  useEffect(() => {
    if (privateView) return;

    const supabase = createPublicClient();

    const channel = supabase
      .channel("projects-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        (payload) => {
          handleRealtimeUpdate({
            eventType: payload.eventType,
            new: payload.new as Record<string, unknown>,
            old: payload.old as { id: string },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleRealtimeUpdate, privateView]);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProject(null);
      return;
    }
    if (
      !selectedProject ||
      !projects.some((p) => p.id === selectedProject.id)
    ) {
      setSelectedProject(projects[0]);
    }
  }, [projects, selectedProject]);

  return (
    <div className="flex h-screen flex-row overflow-hidden bg-[var(--background)]">
      <div className="w-[220px] shrink-0 overflow-y-auto border-r border-[var(--border)]">
        <Sidebar />
      </div>

      <div className="w-[420px] shrink-0 overflow-y-auto px-6 py-8">
        <header className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {headerTitle}
            <span className="font-normal text-[var(--muted-foreground)]">
              {" "}
              / {headerSubtitle}
            </span>
          </h2>
        </header>

        <ProjectGrid
          projects={projects}
          selectedProjectId={selectedProject?.id ?? null}
          showPrivateBadge={privateView}
          onSelectProject={setSelectedProject}
        />
      </div>

      <div className="min-w-0 flex-1 overflow-hidden border-l border-[var(--border)]">
        <ProjectDetail
          projects={projects}
          selectedProject={selectedProject}
          privateView={privateView}
          onSelectProject={setSelectedProject}
        />
      </div>
    </div>
  );
}
