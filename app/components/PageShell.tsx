import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageShellClient from "./PageShellClient";

export default async function PageShell({
  children,
  showNav = true,
  requireAuth = true,
}: {
  children: React.ReactNode;
  showNav?: boolean;
  requireAuth?: boolean;
}) {
  const session = await getSession();
  if (requireAuth && !session) {
    redirect("/login");
  }
  return (
    <PageShellClient session={session} showNav={showNav}>
      {children}
    </PageShellClient>
  );
}
