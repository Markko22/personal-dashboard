import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perelli Consulting — Progetti aziendali",
  description: "Portfolio progetti aziendali Perelli Consulting.",
};

export default function AziendaliLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] px-4 py-4 md:px-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
          Perelli Consulting
        </p>
        <h1 className="mt-1 text-lg font-semibold text-[var(--foreground)] md:text-xl">
          Progetti aziendali
        </h1>
      </header>
      <main>{children}</main>
    </div>
  );
}
