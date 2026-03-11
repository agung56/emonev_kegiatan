import PageShell from "@/app/components/PageShell";
import NewKegiatanClient from "./NewKegiatanClient";

export default async function NewKegiatanPage() {
  return (
    <PageShell showNav={false}>
      <NewKegiatanClient />
    </PageShell>
  );
}
