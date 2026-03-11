import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import NewKegiatanClient from "./NewKegiatanClient";

export default async function NewKegiatanPage() {
  const sess = await getSession();
  if (!sess) notFound();

  return (
    <PageShell showNav={false}>
      <NewKegiatanClient />
    </PageShell>
  );
}
