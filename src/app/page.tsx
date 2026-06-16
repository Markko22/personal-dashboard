import DashboardShell from "@/components/DashboardShell";
import { fetchPublicProjects } from "@/lib/supabase";
import type { PublicProject } from "@/types/project";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Home() {
  let projects: PublicProject[] = [];
  try {
    projects = await fetchPublicProjects();
  } catch (error) {
    console.error("Failed to fetch projects:", error);
  }

  return (
    <DashboardShell
      initialProjects={projects}
      headerTitle="PROGETTI"
      headerSubtitle="Stato dei miei prodotti digitali"
    />
  );
}
