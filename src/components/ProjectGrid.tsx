"use client";

import { useCallback, useEffect, useState } from "react";
import { createPublicClient } from "@/lib/supabase";
import { toPublicProject, type PublicProject } from "@/types/project";
import ProjectCard from "./ProjectCard";
import ProjectModal from "./ProjectModal";

type Props = {
  initialProjects: PublicProject[];
};

export default function ProjectGrid({ initialProjects }: Props) {
  const [projects, setProjects] = useState(initialProjects);
  const [selected, setSelected] = useState<PublicProject | null>(null);

  const handleRealtimeUpdate = useCallback((payload: { eventType: string; new: PublicProject; old: { id: string } }) => {
    if (payload.eventType === "INSERT") {
      setProjects((prev) =>
        [...prev, payload.new].sort((a, b) => a.order_index - b.order_index)
      );
    } else if (payload.eventType === "UPDATE") {
      setProjects((prev) =>
        prev
          .map((p) => (p.id === payload.new.id ? payload.new : p))
          .sort((a, b) => a.order_index - b.order_index)
      );
      setSelected((current) =>
        current?.id === payload.new.id ? payload.new : current
      );
    } else if (payload.eventType === "DELETE") {
      setProjects((prev) => prev.filter((p) => p.id !== payload.old.id));
      setSelected((current) =>
        current?.id === payload.old.id ? null : current
      );
    }
  }, []);

  useEffect(() => {
    const supabase = createPublicClient();

    const channel = supabase
      .channel("projects-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        (payload) => {
          handleRealtimeUpdate({
            eventType: payload.eventType,
            new: toPublicProject(payload.new as Record<string, unknown>),
            old: payload.old as { id: string },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleRealtimeUpdate]);

  return (
    <>
      <div className="flex flex-wrap gap-4">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => setSelected(project)}
          />
        ))}
      </div>

      {projects.length === 0 && (
        <p className="py-16 text-center text-[var(--muted)]">
          Nessun progetto ancora.
        </p>
      )}

      <ProjectModal project={selected} onClose={() => setSelected(null)} />
    </>
  );
}
