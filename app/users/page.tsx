import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const sess = await getSession();
  if (sess?.role !== "SUPER_ADMIN") {
    return (
      <PageShell>
        <div className="bg-white rounded-xl shadow p-4">Halaman ini khusus Super Admin.</div>
      </PageShell>
    );
  }

  const users = await prisma.user.findMany({ include: { subbag: true }, orderBy: { createdAt: "desc" } });
  const subbags = await prisma.subbag.findMany({ orderBy: { nama: "asc" } });

  return (
    <PageShell>
      <h1 className="text-xl font-semibold">Manajemen User</h1>
      <p className="text-sm text-gray-600">Tambah/edit/hapus user lewat halaman ini.</p>

      <UsersClient subbags={subbags} initialUsers={users as any} />
    </PageShell>
  );
}
