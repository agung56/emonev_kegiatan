type ZodFlattenLike = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

function mapKnownErrorMessage(msg: string): string {
  const trimmed = String(msg || "").trim();
  if (!trimmed) return trimmed;

  if (/^subbagid wajib$/i.test(trimmed)) {
    return "Hanya operator subbag yang dapat mengisi kegiatan";
  }

  return trimmed;
}

export function formatApiError(err: unknown): string {
  if (!err) return "Terjadi kesalahan. Silakan coba lagi.";
  if (typeof err === "string") return mapKnownErrorMessage(err);
  if (Array.isArray(err)) return err.map((x) => String(x)).filter(Boolean).join(", ");

  if (typeof err === "object") {
    const anyErr = err as any;
    if (typeof anyErr.message === "string" && anyErr.message.trim()) {
      return mapKnownErrorMessage(anyErr.message);
    }

    const flat = err as ZodFlattenLike;
    const form = Array.isArray(flat.formErrors) ? flat.formErrors.filter(Boolean) : [];
    if (form.length) return mapKnownErrorMessage(form[0]);

    const fields = flat.fieldErrors && typeof flat.fieldErrors === "object" ? flat.fieldErrors : undefined;
    if (fields) {
      for (const key of Object.keys(fields)) {
        const msgs = fields[key];
        if (Array.isArray(msgs) && msgs.length && String(msgs[0]).trim()) {
          return mapKnownErrorMessage(String(msgs[0]));
        }
      }
    }
  }

  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function normalizeErrorMessage(input: unknown): string {
  const raw =
    typeof input === "string"
      ? input
      : (input as any)?.message
        ? String((input as any).message)
        : "";

  const trimmed = String(raw || "").trim();
  if (!trimmed) return "Terjadi kesalahan. Silakan coba lagi.";

  // If server returns JSON as text (e.g. "\"subbagId wajib\"" or {"error":...})
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string") return mapKnownErrorMessage(parsed);
    if (parsed && typeof parsed === "object") {
      const anyParsed = parsed as any;
      if (anyParsed.error !== undefined) return formatApiError(anyParsed.error);
      return formatApiError(parsed);
    }
  } catch {
    // ignore
  }

  return mapKnownErrorMessage(trimmed);
}
