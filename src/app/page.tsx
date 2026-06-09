import ProjectGrid from "@/components/ProjectGrid";
import Sidebar from "@/components/Sidebar";
import { fetchPublicProjects } from "@/lib/supabase";
import type { PublicProject } from "@/types/project";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  let projects: PublicProject[] = [];
  try {
    projects = await fetchPublicProjects();
  } catch (error) {
    console.error("Failed to fetch projects:", error);
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar />

      <main className="lg:ml-[260px]">
        <div className="px-6 py-10 lg:px-12 lg:py-14">
          <header className="mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              PROGETTI
              <span className="font-normal text-[var(--muted-foreground)]">
                {" "}
                / Stato dei miei prodotti digitali
              </span>
            </h2>
          </header>

          <ProjectGrid initialProjects={projects} />
        </div>
      </main>
    </div>
  );
}
