export function formatSubbagName(raw?: string | null) {
  const base = String(raw ?? "").trim();
  if (!base) return "-";

  const cleaned = base.replace(/\bsubbag\b/gi, "").replace(/\s+/g, " ").trim();

  if (/\bkul\b/i.test(cleaned)) return "Keuangan, Umum, dan Logistik";
  if (/\brendatin\b/i.test(cleaned)) return "Perencanaan, Data, dan Informasi";
  if (/\btekhum\b/i.test(cleaned)) return "Teknis Penyelenggaraan Pemilu dan Hukum";
  if (/\bsdmparmas\b/i.test(cleaned)) {
    return "Partisipasi Hubungan Masyarakat dan Sumber Daya Manusia";
  }

  return cleaned;
}

