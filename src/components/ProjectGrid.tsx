"use client";

import { useCallback, useEffect, useState } from "react";
import { createPublicClient } from "@/lib/supabase";
import {
  toPrivateProject,
  toPublicProject,
  type PrivateProject,
  type PublicProject,
} from "@/types/project";
import ProjectCard from "./ProjectCard";
import ProjectModal from "./ProjectModal";

type ProjectItem = PublicProject | PrivateProject;

type Props = {
  initialProjects: ProjectItem[];
  privateView?: boolean;
};

export default function ProjectGrid({
  initialProjects,
  privateView = false,
}: Props) {
  const [projects, setProjects] = useState(initialProjects);
  const [selected, setSelected] = useState<ProjectItem | null>(null);

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
          setSelected((current) =>
            current?.id === row.id ? null : current
          );
          return;
        }
        setProjects((prev) =>
          prev
            .map((p) => (p.id === row.id ? row : p))
            .sort((a, b) => a.order_index - b.order_index)
        );
        setSelected((current) => (current?.id === row.id ? row : current));
      } else if (payload.eventType === "DELETE") {
        setProjects((prev) => prev.filter((p) => p.id !== payload.old.id));
        setSelected((current) =>
          current?.id === payload.old.id ? null : current
        );
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

  return (
    <>
      <div className="flex flex-wrap gap-4">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            showPrivateBadge={privateView}
            onClick={() => setSelected(project)}
          />
        ))}
      </div>

      {projects.length === 0 && (
        <p className="py-16 text-center text-[var(--muted)]">
          Nessun progetto ancora.
        </p>
      )}

      <ProjectModal
        project={selected}
        privateView={privateView}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
