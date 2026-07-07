import DashboardShell from "@/components/DashboardShell";
import { fetchAziendaliProjects } from "@/lib/supabase";
import type { AziendaleProject } from "@/types/project";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function AziendaliPage() {
  let projects: AziendaleProject[] = [];
  try {
    projects = await fetchAziendaliProjects();
  } catch (error) {
    console.error("Failed to fetch aziendali projects:", error);
  }

  return (
    <DashboardShell
      initialProjects={projects}
      viewMode="aziendale"
      showSidebar={false}
      showHeader={false}
    />
  );
}
