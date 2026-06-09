"use client";

import { useState } from "react";
import { projectInitials, projectSlug } from "@/types/project";

type Props = {
  name: string;
  size?: "sm" | "md";
};

export default function ProjectLogo({ name, size = "sm" }: Props) {
  const [failed, setFailed] = useState(false);
  const slug = projectSlug(name);
  const sizeClass = size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";

  if (failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--background)] font-semibold text-[var(--muted-foreground)] ring-1 ring-[var(--border)] ${sizeClass}`}
      >
        {projectInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={`/projects/${slug}.png`}
      alt={name}
      className={`shrink-0 rounded-full object-cover ring-1 ring-[var(--border)] ${sizeClass}`}
      onError={() => setFailed(true)}
    />
  );
}
