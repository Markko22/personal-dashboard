import ProjectGrid from "@/components/ProjectGrid";
import { fetchPublicProjects } from "@/lib/supabase";
import type { PublicProject } from "@/types/project";

export const dynamic = "force-dynamic";

export default async function Home() {
  let projects: PublicProject[] = [];
  try {
    projects = await fetchPublicProjects();
  } catch (error) {
    console.error("Failed to fetch projects:", error);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <header className="mb-12">
          <h1 className="text-2xl font-medium text-zinc-100 tracking-tight">
            Progetti
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Stato dei miei prodotti digitali
          </p>
        </header>

        <ProjectGrid initialProjects={projects} />
      </div>
    </main>
  );
}
