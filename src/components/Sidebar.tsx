const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/marcopontello" },
  { label: "LinkedIn", href: "https://linkedin.com/in/marcopontello" },
  { label: "Email", href: "mailto:marco@marcopontello.com" },
] as const;

const INTERESTS = ["SaaS", "Prodotto", "Football", "AI", "B2B"] as const;

export default function Sidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-[var(--border)] bg-[var(--background)] lg:fixed lg:left-0 lg:top-0 lg:z-10 lg:h-screen lg:w-[260px] lg:border-b-0 lg:border-r">
      <div className="flex flex-col gap-6 p-8 lg:p-8 lg:pt-10">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--card)] text-sm font-semibold tracking-wide text-[var(--foreground)] ring-1 ring-[var(--border)]">
            MP
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--foreground)]">
              Marco Pontello
            </h1>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Non-tech founder, zero CS background
            </p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
          Costruisco prodotti digitali partendo da problemi reali. Nessun
          background tecnico, tanta determinazione.
        </p>

        <section>
          <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
            Trovami su
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {SOCIAL_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target={link.label === "Email" ? undefined : "_blank"}
                  rel={link.label === "Email" ? undefined : "noopener noreferrer"}
                  className="text-sm text-[var(--foreground)] transition-colors hover:text-white"
                >
                  {link.label}
                  {link.label !== "Email" && (
                    <span className="ml-1 text-[var(--muted)]">↗</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--muted)]">
            Interessi
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {INTERESTS.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-0.5 text-xs text-[var(--muted-foreground)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
