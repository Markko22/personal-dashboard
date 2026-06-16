"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { projectInitials, projectSlug } from "@/types/project";

type Props = {
  name: string;
  variant?: "card" | "default";
};

/** Native <img> only — no next/image. HEAD pre-check before render. */
export default function ProjectLogo({ name, variant = "default" }: Props) {
  const slug = projectSlug(name);
  const src = `/projects/${slug}.png?v=1`;
  const [imgError, setImgError] = useState(false);
  const [srcReady, setSrcReady] = useState(false);
  const errorHandledRef = useRef(false);

  const containerClass =
    variant === "card"
      ? "h-[40px] w-[40px] shrink-0 overflow-hidden rounded-lg bg-gray-800 text-[10px]"
      : "h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--background)] text-[10px] ring-1 ring-[var(--border)]";

  const initials = projectInitials(name);

  const triggerFallback = useCallback(() => {
    if (errorHandledRef.current) return;
    errorHandledRef.current = true;
    setImgError(true);
    setSrcReady(false);
  }, []);

  useEffect(() => {
    errorHandledRef.current = false;
    setImgError(false);
    setSrcReady(false);

    let cancelled = false;

    fetch(src, { method: "HEAD" })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          triggerFallback();
        } else {
          setSrcReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) triggerFallback();
      });

    return () => {
      cancelled = true;
    };
  }, [src, triggerFallback]);

  const handleError = () => {
    triggerFallback();
  };

  if (imgError) {
    return (
      <div
        className={`flex items-center justify-center font-semibold text-[var(--muted-foreground)] ${containerClass}`}
      >
        {initials}
      </div>
    );
  }

  if (!srcReady) {
    return <div className={containerClass} aria-hidden />;
  }

  return (
    <div className={containerClass}>
      <img
        src={src}
        alt=""
        className="h-full w-full object-contain p-1"
        onError={handleError}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth === 0) {
            triggerFallback();
          }
        }}
      />
    </div>
  );
}
