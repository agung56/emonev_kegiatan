import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const nextStaticDir = path.join(projectRoot, ".next", "static");
const distDir = path.join(projectRoot, "dist");

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await pathExists(standaloneDir))) {
    throw new Error(
      'Folder ".next/standalone" tidak ditemukan. Jalankan "npm run build" dulu.'
    );
  }

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  // Copy standalone bundle (server.js + minimal node_modules + .next/server + public)
  await fs.cp(standaloneDir, distDir, { recursive: true, dereference: true });

  // Copy static assets needed by Next server
  if (await pathExists(nextStaticDir)) {
    const distStaticDir = path.join(distDir, ".next", "static");
    await fs.mkdir(distStaticDir, { recursive: true });
    await fs.cp(nextStaticDir, distStaticDir, { recursive: true });
  }

  // Seed script membutuhkan bcryptjs, tapi kadang tidak ikut ke tracing standalone.
  const bcryptSrc = path.join(projectRoot, "node_modules", "bcryptjs");
  if (await pathExists(bcryptSrc)) {
    const bcryptOut = path.join(distDir, "node_modules", "bcryptjs");
    await fs.mkdir(path.dirname(bcryptOut), { recursive: true });
    await fs.cp(bcryptSrc, bcryptOut, { recursive: true, dereference: true });
  }

  // Prisma CLI (prisma generate) membutuhkan generator build dari @prisma/client.
  // Standalone tracing kadang tidak menyertakannya, sehingga generate di server gagal.
  const prismaClientGeneratorSrc = path.join(
    projectRoot,
    "node_modules",
    "@prisma",
    "client",
    "generator-build"
  );
  if (await pathExists(prismaClientGeneratorSrc)) {
    const prismaClientGeneratorOut = path.join(
      distDir,
      "node_modules",
      "@prisma",
      "client",
      "generator-build"
    );
    await fs.mkdir(path.dirname(prismaClientGeneratorOut), { recursive: true });
    await fs.cp(prismaClientGeneratorSrc, prismaClientGeneratorOut, {
      recursive: true,
      dereference: true,
    });
  }

  // Include seed script (optional convenience on server)
  const prismaOutDir = path.join(distDir, "prisma");
  const seedSrc = path.join(projectRoot, "prisma", "seed.js");
  const seedSqlSrc = path.join(projectRoot, "prisma", "seed.sql");
  const schemaSrc = path.join(projectRoot, "prisma", "schema.prisma");
  const migrationsSrc = path.join(projectRoot, "prisma", "migrations");
  if (
    (await pathExists(seedSrc)) ||
    (await pathExists(seedSqlSrc)) ||
    (await pathExists(schemaSrc)) ||
    (await pathExists(migrationsSrc))
  ) {
    await fs.mkdir(prismaOutDir, { recursive: true });
  }
  if (await pathExists(seedSrc)) {
    await fs.copyFile(seedSrc, path.join(prismaOutDir, "seed.js"));
  }
  if (await pathExists(seedSqlSrc)) {
    await fs.copyFile(seedSqlSrc, path.join(prismaOutDir, "seed.sql"));
  }
  if (await pathExists(schemaSrc)) {
    await fs.copyFile(schemaSrc, path.join(prismaOutDir, "schema.prisma"));
  }
  if (await pathExists(migrationsSrc)) {
    await fs.cp(migrationsSrc, path.join(prismaOutDir, "migrations"), {
      recursive: true,
      dereference: true,
    });
  }

  // Avoid accidentally uploading local secrets
  await fs.rm(path.join(distDir, ".env"), { force: true });

  // cPanel sering menawarkan/menjalankan "npm install" berdasarkan package.json.
  // Di shared hosting yang ketat (process/thread limit), ini bisa membuat akun freeze.
  // Untuk standalone, node_modules sudah ikut ter-copy, jadi package.json cukup minimal.
  const minimalPkg = {
    name: "emonev-kegiatan-standalone",
    version: "1.0.0",
    private: true,
    engines: { node: "20.x" },
    scripts: { start: "node server.js" },
  };
  await fs.writeFile(
    path.join(distDir, "package.json"),
    JSON.stringify(minimalPkg, null, 2) + "\n",
    "utf8"
  );

  console.log('Standalone package siap di folder "dist/".');
  console.log('Jalankan: node dist/server.js');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
