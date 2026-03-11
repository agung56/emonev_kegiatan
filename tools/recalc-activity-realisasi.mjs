import { PrismaClient } from "@prisma/client";

function parseArgs(argv) {
  const args = { tahun: undefined, subbagId: undefined, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--tahun") args.tahun = Number(argv[++i]);
    else if (a === "--subbagId") args.subbagId = String(argv[++i] || "");
  }
  return args;
}

const { tahun, subbagId, dryRun } = parseArgs(process.argv);
const prisma = new PrismaClient({ log: [] });

async function main() {
  const where = {};
  if (Number.isFinite(tahun)) where.tahun = tahun;
  if (subbagId) where.subbagId = subbagId;

  const activities = await prisma.activity.findMany({
    where,
    select: { id: true, realisasiAnggaran: true },
  });

  const ids = activities.map((a) => a.id);
  if (ids.length === 0) {
    console.log("No activities matched.");
    return;
  }

  const [legacy, plan] = await prisma.$transaction([
    prisma.activityBudgetUsage.groupBy({
      by: ["activityId"],
      where: { activityId: { in: ids } },
      _sum: { amountUsed: true },
    }),
    prisma.activityBudgetPlanUsage.groupBy({
      by: ["activityId"],
      where: { activityId: { in: ids } },
      _sum: { amountUsed: true },
    }),
  ]);

  const legacyMap = new Map(legacy.map((x) => [x.activityId, Number(x._sum.amountUsed || 0)]));
  const planMap = new Map(plan.map((x) => [x.activityId, Number(x._sum.amountUsed || 0)]));

  let scanned = 0;
  let willUpdate = 0;
  let updated = 0;

  const updates = [];
  for (const act of activities) {
    scanned++;
    // Precedence: if BudgetPlan usages exist, use those.
    // Else if legacy usages exist, use those.
    // Else keep manual value.
    const hasPlan = planMap.has(act.id);
    const hasLegacy = legacyMap.has(act.id);
    if (!hasPlan && !hasLegacy) continue;

    const next = hasPlan ? planMap.get(act.id) || 0 : legacyMap.get(act.id) || 0;
    const current = Number(act.realisasiAnggaran || 0);
    if (next === current) continue;

    willUpdate++;
    if (!dryRun) updates.push({ id: act.id, next });
  }

  console.log(
    JSON.stringify(
      { scanned, matchedUsage: legacyMap.size + planMap.size, willUpdate, dryRun, filter: { tahun, subbagId } },
      null,
      2
    )
  );

  if (dryRun || updates.length === 0) return;

  const batchSize = 100;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await prisma.$transaction(
      batch.map((u) =>
        prisma.activity.update({
          where: { id: u.id },
          data: { realisasiAnggaran: u.next },
        })
      )
    );
    updated += batch.length;
    console.log(`Updated ${updated}/${updates.length}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
