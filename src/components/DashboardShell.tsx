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
import ProjectDetailContent from "./ProjectDetailContent";
import ProjectGrid from "./ProjectGrid";
import Sidebar from "./Sidebar";

type ProjectItem = PublicProject | PrivateProject;

type Props = {
  initialProjects: ProjectItem[];
  privateView?: boolean;
  headerTitle: string;
  headerSubtitle: string;
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export default function DashboardShell({
  initialProjects,
  privateView = false,
  headerTitle,
  headerSubtitle,
}: Props) {
  const isMobile = useIsMobile();
  const [projects, setProjects] = useState(initialProjects);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(
    initialProjects[0] ?? null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const handleSelectProject = useCallback(
    (project: ProjectItem) => {
      setSelectedProject(project);
      if (window.matchMedia("(max-width: 767px)").matches) {
        setDetailOpen(true);
      }
    },
    []
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

  useEffect(() => {
    if (!detailOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [detailOpen]);

  useEffect(() => {
    if (!isMobile || !detailOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detailOpen, isMobile]);

  return (
    <div className="flex h-screen flex-row overflow-hidden bg-[var(--background)]">
      <div className="hidden w-[200px] shrink-0 overflow-y-auto border-r border-[var(--border)] md:block">
        <Sidebar />
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
        <header className="mb-6 md:mb-8">
          <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)] sm:text-xl md:text-2xl">
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
          onSelectProject={handleSelectProject}
        />
      </div>

      <div className="hidden h-full w-[320px] shrink-0 flex-col overflow-hidden border-l border-[var(--border)] md:flex">
        <ProjectDetail
          projects={projects}
          selectedProject={selectedProject}
          privateView={privateView}
          onSelectProject={handleSelectProject}
        />
      </div>

      {detailOpen && selectedProject && (
        <>
          <button
            type="button"
            aria-label="Chiudi dettaglio progetto"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setDetailOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Dettaglio ${selectedProject.name}`}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-xl border-t border-[var(--border)] bg-[#0d1520] shadow-2xl md:hidden"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
                Dettaglio progetto
              </h3>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--card)] hover:text-[var(--foreground)]"
                aria-label="Chiudi"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <ProjectDetailContent
                project={selectedProject}
                privateView={privateView}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
