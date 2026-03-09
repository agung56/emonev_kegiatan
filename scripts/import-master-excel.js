/**
 * Import MASTER indikator dari Excel sesuai pedoman user:
 * - Sheet: "Master"
 * - Kolom C: Sasaran Program (Outcome) -> StrategicGoal.nama
 * - Kolom D: Indikator Kinerja -> PerformanceIndicator.nama
 * - Kolom AD: Formula Perhitungan -> PerformanceIndicator.formulaPerhitungan
 * - Kolom AE: Sumber Data -> PerformanceIndicator.sumberData
 *
 * Cara pakai:
 *   node scripts/import-master-excel.js --file "/path/to/Master.xlsx" --tahun 2026 --kepemilikan LEMBAGA
 */

const path = require("path");
const fs = require("fs");
const xlsx = require("xlsx");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function arg(name, def) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return def;
  return process.argv[idx + 1] ?? def;
}

function norm(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

async function main() {
  const file = arg("file");
  const tahun = Number(arg("tahun", new Date().getFullYear()));
  const kepemilikan = String(arg("kepemilikan", "LEMBAGA")).toUpperCase();

  if (!file) {
    console.error("Missing --file");
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error("File not found:", file);
    process.exit(1);
  }
  if (!["LEMBAGA", "SEKRETARIAT"].includes(kepemilikan)) {
    console.error("kepemilikan harus LEMBAGA atau SEKRETARIAT");
    process.exit(1);
  }

  const wb = xlsx.readFile(file);
  const ws = wb.Sheets["Master"];
  if (!ws) {
    console.error('Sheet "Master" tidak ditemukan.');
    process.exit(1);
  }

  // Baca data mulai baris 5-6 ke bawah; kita ambil berdasarkan kolom excel (C, D, AD, AE)
  // Kolom: C=3, D=4, AD=30, AE=31
  const range = xlsx.utils.decode_range(ws["!ref"]);

  let createdGoals = 0;
  let createdIndicators = 0;
  let updatedIndicators = 0;

  // cache goal by name
  const goalCache = new Map();

  for (let r = range.s.r; r <= range.e.r; r++) {
    const C = ws[xlsx.utils.encode_cell({ r, c: 2 })]?.v;
    const D = ws[xlsx.utils.encode_cell({ r, c: 3 })]?.v;
    const AD = ws[xlsx.utils.encode_cell({ r, c: 29 })]?.v;
    const AE = ws[xlsx.utils.encode_cell({ r, c: 30 })]?.v;

    const goalName = norm(C);
    const indName = norm(D);
    const formula = norm(AD);
    const sumber = norm(AE);

    if (!goalName || !indName) continue;

    // Upsert StrategicGoal per (tahun, kepemilikan, nama)
    const goalKey = `${tahun}|${kepemilikan}|${goalName}`;
    let goal = goalCache.get(goalKey);
    if (!goal) {
      goal = await prisma.strategicGoal.findFirst({ where: { tahun, kepemilikan, nama: goalName } });
      if (!goal) {
        goal = await prisma.strategicGoal.create({ data: { tahun, kepemilikan, nama: goalName } });
        createdGoals++;
      }
      goalCache.set(goalKey, goal);
    }

    // Upsert PerformanceIndicator per (tahun, kepemilikan, nama, strategicGoalId)
    const existing = await prisma.performanceIndicator.findFirst({
      where: { tahun, kepemilikan, nama: indName, strategicGoalId: goal.id },
    });

    if (!existing) {
      await prisma.performanceIndicator.create({
        data: {
          tahun,
          kepemilikan,
          nama: indName,
          strategicGoalId: goal.id,
          formulaPerhitungan: formula || null,
          sumberData: sumber || null,
        },
      });
      createdIndicators++;
    } else {
      // update formula/sumber kalau berubah
      const needUpdate = (formula && existing.formulaPerhitungan !== formula) || (sumber && existing.sumberData !== sumber);
      if (needUpdate) {
        await prisma.performanceIndicator.update({
          where: { id: existing.id },
          data: {
            formulaPerhitungan: formula || existing.formulaPerhitungan,
            sumberData: sumber || existing.sumberData,
          },
        });
        updatedIndicators++;
      }
    }
  }

  console.log("Import selesai:");
  console.log("- StrategicGoal dibuat:", createdGoals);
  console.log("- Indicator dibuat:", createdIndicators);
  console.log("- Indicator diupdate:", updatedIndicators);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
