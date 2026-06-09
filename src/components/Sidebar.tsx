import { Github, Linkedin, Mail } from "lucide-react";
import Avatar from "./Avatar";

const SOCIAL_LINKS = [
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@markkko2289",
    icon: "tiktok" as const,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/markkko22/",
    icon: "instagram" as const,
  },
  {
    label: "GitHub",
    href: "https://github.com/Markko22/",
    icon: "github" as const,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/marco-pontello-40383047",
    icon: "linkedin" as const,
  },
  {
    label: "Email",
    href: "mailto:marco.pontello@gmail.com",
    icon: "email" as const,
  },
] as const;

const INTERESTS = ["SaaS", "Prodotto", "Football", "AI", "B2B"] as const;

function SocialIcon({ type }: { type: (typeof SOCIAL_LINKS)[number]["icon"] }) {
  const className = "h-4 w-4 shrink-0 text-[var(--muted)]";

  switch (type) {
    case "github":
      return <Github className={className} aria-hidden />;
    case "linkedin":
      return <Linkedin className={className} aria-hidden />;
    case "email":
      return <Mail className={className} aria-hidden />;
    case "tiktok":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
        </svg>
      );
    case "instagram":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
  }
}

export default function Sidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-[var(--border)] bg-[var(--background)] lg:fixed lg:left-0 lg:top-0 lg:z-10 lg:h-screen lg:w-[260px] lg:border-b-0 lg:border-r">
      <div className="flex flex-col gap-6 p-8 lg:p-8 lg:pt-10">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3">
          <Avatar />
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
                  target={link.icon === "email" ? undefined : "_blank"}
                  rel={
                    link.icon === "email" ? undefined : "noopener noreferrer"
                  }
                  className="flex items-center gap-2.5 text-sm text-[var(--foreground)] transition-colors hover:text-white"
                >
                  <SocialIcon type={link.icon} />
                  <span>{link.label}</span>
                  {link.icon !== "email" && (
                    <span className="text-[var(--muted)]">↗</span>
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
