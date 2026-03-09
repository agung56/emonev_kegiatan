import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function saveToPublicUploads(file: File, folder: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || "";
  const safeExt = ext.slice(0, 10);
  const name = crypto.randomBytes(16).toString("hex") + safeExt;

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(dir, { recursive: true });

  const fullPath = path.join(dir, name);
  await fs.writeFile(fullPath, bytes);

  const storageKey = `/uploads/${folder}/${name}`; // bisa diakses publik
  return { storageKey };
}
