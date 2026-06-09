"use client";

import { useState } from "react";

export default function Avatar() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--card)] text-sm font-semibold tracking-wide text-[var(--foreground)] ring-1 ring-[var(--border)]">
        MP
      </div>
    );
  }

  return (
    <img
      src="/avatar.jpg"
      alt="Marco Pontello"
      className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-[var(--border)]"
      onError={() => setFailed(true)}
    />
  );
}
