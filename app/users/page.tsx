import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import UsersClient from "./UsersClient";
import Link from "next/link";

export default async function UsersPage({ searchParams }: { searchParams: { page?: string } }) {
  const sess = await getSession();
  if (sess?.role !== "SUPER_ADMIN") {
    return (
      <PageShell>
        <div className="bg-card rounded-xl shadow p-6 border border-border text-muted-foreground font-medium italic">
          Halaman ini khusus Super Admin.
        </div>
      </PageShell>
    );
  }

  const take = 20;
  const page = Math.max(1, Number(searchParams.page || 1) || 1);
  const totalRows = await prisma.user.count();
  const totalPages = Math.max(1, Math.ceil(totalRows / take));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * take;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      subbagId: true,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
  const subbags = await prisma.subbag.findMany({ orderBy: { nama: "asc" } });

  return (
    <PageShell>
      <h1 className="text-xl font-semibold">Manajemen User</h1>

      <UsersClient subbags={subbags} initialUsers={users as any} page={safePage} take={take} currentUserId={sess.id} />

      <div className="flex items-center justify-between gap-3 mt-4">
        <div className="text-sm text-muted-foreground">
          Menampilkan{" "}
          <span className="font-semibold text-foreground">{totalRows === 0 ? 0 : skip + 1}</span>
          {" - "}
          <span className="font-semibold text-foreground">{Math.min(skip + users.length, totalRows)}</span>
          {" "}dari{" "}
          <span className="font-semibold text-foreground">{totalRows}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            prefetch={false}
            href={{ pathname: "/users", query: { page: String(Math.max(1, safePage - 1)) } }}
            aria-disabled={safePage <= 1}
            className={`px-3 py-2 rounded-xl border border-border font-bold transition-all text-sm ${
              safePage <= 1
                ? "opacity-50 pointer-events-none text-muted-foreground"
                : "hover:bg-muted/30 text-foreground"
            }`}
          >
            Sebelumnya
          </Link>

          <div className="px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm font-bold text-foreground">
            {safePage} / {totalPages}
          </div>

          <Link
            prefetch={false}
            href={{ pathname: "/users", query: { page: String(Math.min(totalPages, safePage + 1)) } }}
            aria-disabled={safePage >= totalPages}
            className={`px-3 py-2 rounded-xl border border-border font-bold transition-all text-sm ${
              safePage >= totalPages
                ? "opacity-50 pointer-events-none text-muted-foreground"
                : "hover:bg-muted/30 text-foreground"
            }`}
          >
            Berikutnya
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
