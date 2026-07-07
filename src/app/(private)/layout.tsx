import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!(await isAuthenticated())) {
    redirect("/");
  }

  return children;
}
