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

  // Include seed script (optional convenience on server)
  const seedSrc = path.join(projectRoot, "prisma", "seed.js");
  if (await pathExists(seedSrc)) {
    const prismaOutDir = path.join(distDir, "prisma");
    await fs.mkdir(prismaOutDir, { recursive: true });
    await fs.copyFile(seedSrc, path.join(prismaOutDir, "seed.js"));
  }

  // Avoid accidentally uploading local secrets
  await fs.rm(path.join(distDir, ".env"), { force: true });

  console.log('Standalone package siap di folder "dist/".');
  console.log('Jalankan: node dist/server.js');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
