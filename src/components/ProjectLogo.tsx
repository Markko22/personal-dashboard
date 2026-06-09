"use client";

import { useState } from "react";
import { projectInitials, projectSlug } from "@/types/project";

type Props = {
  name: string;
  variant?: "card" | "default";
};

export default function ProjectLogo({ name, variant = "default" }: Props) {
  const [failed, setFailed] = useState(false);
  const slug = projectSlug(name);

  const containerClass =
    variant === "card"
      ? "h-[40px] w-[40px] shrink-0 overflow-hidden rounded-lg bg-gray-800 text-[10px]"
      : "h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--background)] text-[10px] ring-1 ring-[var(--border)]";

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center font-semibold text-[var(--muted-foreground)] ${containerClass}`}
      >
        {projectInitials(name)}
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <img
        src={`/projects/${slug}.png`}
        alt=""
        className="h-full w-full object-contain p-1"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
