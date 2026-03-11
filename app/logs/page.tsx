import PageShell from "@/app/components/PageShell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import LogsCleanupClient from "./LogsCleanupClient";

export default async function LogsPage({ searchParams }: { searchParams: { page?: string } }) {
  const sess = await getSession();
  
  if (sess?.role !== "SUPER_ADMIN") {
    return (
      <PageShell>
        <div className="bg-card rounded-xl shadow p-6 border border-border italic text-muted-foreground font-medium">
          Halaman ini khusus Super Admin.
        </div>
      </PageShell>
    );
  }

  const take = 50;
  const page = Math.max(1, Number(searchParams.page || 1) || 1);
  const totalRows = await (prisma as any).activityLog.count();
  const totalPages = Math.max(1, Math.ceil(totalRows / take));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * take;

  const logs = await (prisma as any).activityLog.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Activity Logs</h1>
          <p className="text-muted-foreground mt-1">Catatan aktivitas sistem untuk keperluan audit.</p>
        </div>
      </div>

      <div className="mb-6">
        <LogsCleanupClient />
      </div>

      <div className="relative">
        <div className="absolute -top-6 right-0 text-[10px] text-muted-foreground/50 md:hidden animate-pulse">
          &larr; Geser ke samping &rarr;
        </div>

        <div className="overflow-x-auto bg-card rounded-2xl shadow-sm border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Waktu</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">User</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Aksi</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Deskripsi</th>
                <th className="text-left p-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-muted-foreground whitespace-nowrap text-sm">
                    {format(new Date(log.createdAt), "dd MMM yyyy, HH:mm", { locale: id })}
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-foreground text-sm">{log.user?.name || "System"}</div>
                    <div className="text-[11px] text-muted-foreground/70">{log.user?.email || "-"}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      log.action === "LOGIN" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                      log.action === "LOGOUT" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                      "bg-muted text-muted-foreground border-border"
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-foreground/80 max-w-md leading-relaxed">
                    {log.description}
                  </td>
                  <td className="p-4 text-muted-foreground font-mono text-[11px]">
                    {log.ipAddress || "-"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground italic text-sm">
                    Belum ada data log aktivitas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 mt-4">
          <div className="text-sm text-muted-foreground">
            Menampilkan{" "}
            <span className="font-semibold text-foreground">{totalRows === 0 ? 0 : skip + 1}</span>
            {" - "}
            <span className="font-semibold text-foreground">{Math.min(skip + logs.length, totalRows)}</span>
            {" "}dari{" "}
            <span className="font-semibold text-foreground">{totalRows}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              prefetch={false}
              href={{ pathname: "/logs", query: { page: String(Math.max(1, safePage - 1)) } }}
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
              href={{ pathname: "/logs", query: { page: String(Math.min(totalPages, safePage + 1)) } }}
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
      </div>
    </PageShell>
  );
}
