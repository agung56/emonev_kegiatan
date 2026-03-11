import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import EditKegiatanClient from "./EditKegiatanClient";

export default async function EditKegiatanPage({ params }: { params: { id: string } }) {
  const sess = await getSession();
  if (!sess) notFound();
  if (!params?.id) notFound();

  return (
    <PageShell showNav={false}>
      <EditKegiatanClient activityId={params.id} />
    </PageShell>
  );
}
