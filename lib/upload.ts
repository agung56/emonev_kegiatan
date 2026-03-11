import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

function sanitizeFileBaseName(input: string) {
  const base = path.basename(String(input || ""));
  const ext = path.extname(base) || "";
  const raw = ext ? base.slice(0, -ext.length) : base;

  const normalized = raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

  let safe = normalized
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  if (!safe) safe = "file";
  safe = safe.slice(0, 80);

  const safeExt = ext.slice(0, 10);
  return { safeBase: safe, safeExt };
}

export async function saveToPublicUploads(file: File, folder: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const { safeBase, safeExt } = sanitizeFileBaseName(file.name);

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(dir, { recursive: true });

  // URL dibuat rapi pakai nama file asli (sanitized).
  // Jika nama sudah ada di folder, tambahkan suffix "-2", "-3", dst.
  let suffix = 0;
  let name = `${safeBase}${safeExt}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    name = suffix === 0 ? `${safeBase}${safeExt}` : `${safeBase}-${suffix + 1}${safeExt}`;
    const fullPath = path.join(dir, name);
    try {
      await fs.writeFile(fullPath, bytes, { flag: "wx" });
      break;
    } catch (e: any) {
      if (e?.code === "EEXIST") {
        suffix += 1;
        continue;
      }
      throw e;
    }
  }

  const storageKey = `/uploads/${folder}/${name}`; // simpan path; akses langsung /uploads diblok via proxy (gunakan route ber-auth)
  return { storageKey };
}
