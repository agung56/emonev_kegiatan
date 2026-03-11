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

async function rmIfExists(p) {
  if (await pathExists(p)) {
    await fs.rm(p, { recursive: true, force: true });
    return true;
  }
  return false;
}

async function readPrismaBinaryTargets(schemaPath) {
  try {
    const content = await fs.readFile(schemaPath, "utf8");
    const m = content.match(/binaryTargets\s*=\s*\[([^\]]+)\]/m);
    if (!m) return null;

    const raw = m[1];
    const targets = [];
    const re = /"([^"]+)"/g;
    for (;;) {
      const mm = re.exec(raw);
      if (!mm) break;
      targets.push(mm[1]);
    }
    return targets.length ? targets : null;
  } catch {
    return null;
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

  // Pastikan bcryptjs ada (dipakai untuk login). Kadang tidak ikut tracing standalone.
  const bcryptOut = path.join(distDir, "node_modules", "bcryptjs");
  if (!(await pathExists(bcryptOut))) {
    const bcryptSrc = path.join(projectRoot, "node_modules", "bcryptjs");
    if (await pathExists(bcryptSrc)) {
      await fs.mkdir(path.dirname(bcryptOut), { recursive: true });
      await fs.cp(bcryptSrc, bcryptOut, { recursive: true, dereference: true });
    }
  }

  // Prune: buang modul/dev tools yang tidak dibutuhkan runtime supaya dist lebih ringan.
  // (Next standalone seharusnya sudah minimal, tapi kadang ada yang ikut ter-trace.)
  await rmIfExists(path.join(distDir, "node_modules", "typescript"));
  await rmIfExists(path.join(distDir, "node_modules", "@prisma", "client", "generator-build"));

  // Prune: buang Prisma engine Windows dari dist (target upload = Linux/cPanel).
  await rmIfExists(
    path.join(distDir, "node_modules", ".prisma", "client", "query_engine-windows.dll.node")
  );

  // Prune Prisma engine Linux sesuai target yang diperlukan saja.
  // Prioritas:
  // 1) env DIST_PRISMA_TARGET (kalau Anda tahu persis target server)
  // 2) daftar binaryTargets di prisma/schema.prisma
  const prismaClientDir = path.join(distDir, "node_modules", ".prisma", "client");
  if (await pathExists(prismaClientDir)) {
    const schemaTargets = await readPrismaBinaryTargets(path.join(projectRoot, "prisma", "schema.prisma"));
    const envKeep = process.env.DIST_PRISMA_TARGET?.trim();

    const keepTargets = envKeep
      ? [envKeep]
      : (schemaTargets || []).filter((t) => t !== "native" && t.includes("openssl"));

    if (keepTargets.length) {
      const entries = await fs.readdir(prismaClientDir);
      await Promise.all(
        entries
          .filter((n) => n.startsWith("libquery_engine-") && n.endsWith(".so.node"))
          .filter((n) => !keepTargets.some((t) => n.includes(t)))
          .map((n) => rmIfExists(path.join(prismaClientDir, n)))
      );
    }
  }

  // Include Prisma assets (untuk migrasi/seed via SQL di server)
  const prismaOutDir = path.join(distDir, "prisma");
  const seedSqlSrc = path.join(projectRoot, "prisma", "seed.sql");
  const schemaSrc = path.join(projectRoot, "prisma", "schema.prisma");
  const migrationsSrc = path.join(projectRoot, "prisma", "migrations");
  if (
    (await pathExists(seedSqlSrc)) ||
    (await pathExists(schemaSrc)) ||
    (await pathExists(migrationsSrc))
  ) {
    await fs.mkdir(prismaOutDir, { recursive: true });
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

  // Panduan deploy tanpa menjalankan npm/prisma/seed di server.
  const deployGuide = `# Deploy cPanel (tanpa command berat di server)

Target: shared hosting ketat (CloudLinux). Hindari menjalankan \`npm install\`, \`npm ci\`, \`npx prisma generate\`,
atau \`node prisma/seed.js\` di server karena bisa memicu limit proses/thread dan membuat akun freeze.

## 1) Siapkan database via phpMyAdmin
- Import migration SQL dari folder: \`prisma/migrations/*/migration.sql\` (urut timestamp).
- Seed data via: \`prisma/seed.sql\`.

## 2) Setup Node.js App di cPanel
- Application root: folder \`dist/\`
- Startup file: \`server.js\`
- Environment Variables minimal:
  - \`DATABASE_URL\` (password harus URL-encode kalau ada karakter spesial)
  - \`JWT_SECRET\` (min 32 karakter)
  - \`NODE_ENV=production\`

Lalu klik **Restart**. Selesai.

## 3) Debug cepat
Buka URL:
- \`/api/health\`
- \`/api/health?db=1\` (cek koneksi DB + timeout)

## Opsional: kecilkan ukuran Prisma engine
Secara default, script akan ikut daftar \`binaryTargets\` di \`prisma/schema.prisma\` untuk memangkas engine yang tidak perlu.
Kalau Anda ingin override (misalnya yakin 100% server butuh engine tertentu), set env:
- Windows PowerShell: \`$env:DIST_PRISMA_TARGET='debian-openssl-1.1.x'; npm.cmd run -s package:standalone\`
`;
  await fs.writeFile(path.join(distDir, "DEPLOY_CPANEL.md"), deployGuide, "utf8");

  console.log('Standalone package siap di folder "dist/".');
  console.log('Jalankan: node dist/server.js');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
