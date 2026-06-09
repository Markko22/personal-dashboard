"use client";

import { useState } from "react";
import { projectInitials, projectSlug } from "@/types/project";

type Props = {
  name: string;
  size?: "sm" | "md" | "lg";
  rounded?: "full" | "lg";
};

export default function ProjectLogo({
  name,
  size = "sm",
  rounded = "full",
}: Props) {
  const [failed, setFailed] = useState(false);
  const slug = projectSlug(name);
  const sizeClass =
    size === "lg"
      ? "h-10 w-10 text-xs"
      : size === "md"
        ? "h-9 w-9 text-[11px]"
        : "h-8 w-8 text-[10px]";
  const roundedClass = rounded === "lg" ? "rounded-lg" : "rounded-full";

  if (failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center bg-[var(--background)] font-semibold text-[var(--muted-foreground)] ring-1 ring-[var(--border)] ${sizeClass} ${roundedClass}`}
      >
        {projectInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={`/projects/${slug}.png`}
      alt={name}
      className={`shrink-0 object-cover ring-1 ring-[var(--border)] ${sizeClass} ${roundedClass}`}
      onError={() => setFailed(true)}
    />
  );
}
