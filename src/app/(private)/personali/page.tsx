import DashboardShell from "@/components/DashboardShell";
import { fetchPersonaliProjects } from "@/lib/supabase";
import type { PrivateProject } from "@/types/project";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function PersonaliPage() {
  let projects: PrivateProject[] = [];
  try {
    projects = await fetchPersonaliProjects();
  } catch (error) {
    console.error("Failed to fetch personal projects:", error);
  }

  return (
    <DashboardShell
      initialProjects={projects}
      viewMode="private"
      headerTitle="PERSONALI"
      headerSubtitle="Progetti personali con dettaglio completo"
    />
  );
}
