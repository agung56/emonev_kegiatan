import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import EditKegiatanClient from "./EditKegiatanClient";

export default async function EditKegiatanPage({
  params,
}: {
  params: { id?: string } | Promise<{ id?: string }>;
}) {
  const sess = await getSession();
  if (!sess) notFound();

  const { id } = await Promise.resolve(params);
  if (!id) notFound();

  return (
    <PageShell showNav={false}>
      <EditKegiatanClient activityId={id} />
    </PageShell>
  );
}
