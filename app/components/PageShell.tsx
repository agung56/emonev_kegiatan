import { getSession } from "@/lib/auth";
import PageShellClient from "./PageShellClient";

export default async function PageShell({
  children,
  showNav = true,
}: {
  children: React.ReactNode;
  showNav?: boolean;
}) {
  const session = await getSession();
  return (
    <PageShellClient session={session} showNav={showNav}>
      {children}
    </PageShellClient>
  );
}
