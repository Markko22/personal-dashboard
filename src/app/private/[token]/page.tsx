import { notFound } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { fetchAllProjects } from "@/lib/supabase";
import type { PrivateProject } from "@/types/project";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

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
    <DashboardShell
      initialProjects={projects}
      privateView
      headerTitle="VISTA PRIVATA"
      headerSubtitle="Tutti i progetti inclusi quelli privati"
    />
  );
}
