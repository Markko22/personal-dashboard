import { notFound } from "next/navigation";
import ProjectGrid from "@/components/ProjectGrid";
import Sidebar from "@/components/Sidebar";
import { fetchAllProjects } from "@/lib/supabase";
import type { PrivateProject } from "@/types/project";

export const dynamic = "force-dynamic";

type Props = {
  params: { token: string };
};

export default async function PrivateDashboardPage({ params }: Props) {
  const expectedToken = process.env.PRIVATE_PAGE_TOKEN;

  if (!expectedToken || params.token !== expectedToken) {
    notFound();
  }

  let projects: PrivateProject[] = [];
  try {
    projects = await fetchAllProjects();
  } catch (error) {
    console.error("Failed to fetch private projects:", error);
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar />

      <main className="lg:ml-[260px]">
        <div className="px-6 py-10 lg:px-12 lg:py-14">
          <header className="mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              VISTA PRIVATA
              <span className="font-normal text-[var(--muted-foreground)]">
                {" "}
                / Tutti i progetti inclusi quelli privati
              </span>
            </h2>
          </header>

          <ProjectGrid initialProjects={projects} privateView />
        </div>
      </main>
    </div>
  );
}
