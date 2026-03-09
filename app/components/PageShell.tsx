import { getSession } from "@/lib/auth";
import PageShellClient from "./PageShellClient";

export default async function PageShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return <PageShellClient session={session}>{children}</PageShellClient>;
}