const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Subbag
  const subbags = await Promise.all([
  prisma.subbag.upsert({ where: { nama: "subbag KUL" }, update: {}, create: { nama: "subbag KUL" } }),
  prisma.subbag.upsert({ where: { nama: "subbag tekhum" }, update: {}, create: { nama: "subbag tekhum" } }),
  prisma.subbag.upsert({ where: { nama: "subbag rendatin" }, update: {}, create: { nama: "subbag rendatin" } }),
  prisma.subbag.upsert({ where: { nama: "subbag sdmparmas" }, update: {}, create: { nama: "subbag sdmparmas" } }),
]);

  // Budget accounts
  const akun = await Promise.all([
    prisma.budgetAccount.upsert({
      where: { kodeAkun_namaAkun: { kodeAkun: "5.2.01", namaAkun: "Belanja Barang" } },
      update: {},
      create: { kodeAkun: "5.2.01", namaAkun: "Belanja Barang" },
    }),
    prisma.budgetAccount.upsert({
      where: { kodeAkun_namaAkun: { kodeAkun: "5.2.02", namaAkun: "Belanja Jasa" } },
      update: {},
      create: { kodeAkun: "5.2.02", namaAkun: "Belanja Jasa" },
    }),
  ]);

  const adminPass = await bcrypt.hash("admin123", 10);
  const userPass = await bcrypt.hash("user123", 10);

  await prisma.user.upsert({
    where: { email: "admin@local" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@local",
      passwordHash: adminPass,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  const users = [
    { name: "User Subbag A", email: "a@local", subbagId: subbags[0].id },
    { name: "User Subbag B", email: "b@local", subbagId: subbags[1].id },
    { name: "User Subbag C", email: "c@local", subbagId: subbags[2].id },
    { name: "User Subbag D", email: "d@local", subbagId: subbags[3].id },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: userPass, role: "USER", isActive: true },
    });
  }

  // Default budgets per subbag per akun for current year
  const year = new Date().getFullYear();
  for (const sb of subbags) {
    for (const a of akun) {
      await prisma.budgetAllocation.upsert({
        where: { id: `${sb.id}-${a.id}-${year}` }, // dummy; sqlite doesn't allow composite upsert easily without unique
        update: {},
        create: {
          id: `${sb.id}-${a.id}-${year}`,
          tahun: year,
          subbagId: sb.id,
          budgetAccountId: a.id,
          pagu: 100000000,
          updatedBy: "seed",
        },
      }).catch(async () => {
        // fallback if id already exists
      });
    }
  }

  console.log("Seed selesai.");
  console.log("Login:");
  console.log("- Super Admin: admin@local / admin123");
  console.log("- User Subbag: a@local|b@local|c@local|d@local / user123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
