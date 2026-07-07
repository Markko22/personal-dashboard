import DashboardShell from "@/components/DashboardShell";
import { fetchAllProjects } from "@/lib/supabase";
import type { PrivateProject } from "@/types/project";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function TuttiPage() {
  let projects: PrivateProject[] = [];
  try {
    projects = await fetchAllProjects();
  } catch (error) {
    console.error("Failed to fetch all projects:", error);
  }

  return (
    <DashboardShell
      initialProjects={projects}
      viewMode="private"
      headerTitle="TUTTI"
      headerSubtitle="Panoramica completa per categoria"
      showCategoryBadge
      groupByCategory
    />
  );
}
