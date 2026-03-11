export async function logActivity({
  userId,
  action,
  description,
  metadata = null,
  ipAddress = null,
}: {
  userId: string;
  action: string;
  description: string;
  metadata?: any;
  ipAddress?: string | null;
}) {
  // Matikan logging aktivitas di shared hosting jika ingin mengurangi write/query ke DB.
  // Set env `ENABLE_ACTIVITY_LOGS=1` untuk mengaktifkan kembali.
  if (process.env.ENABLE_ACTIVITY_LOGS !== "1") return;

  try {
    const { prisma } = await import("./prisma");

    const timeoutMs = Number(process.env.ACTIVITY_LOG_TIMEOUT_MS || 800);
    await Promise.race([
      (prisma as any).activityLog.create({
        data: {
          userId,
          action,
          description,
          metadata,
          ipAddress,
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`activityLog timeout (${timeoutMs}ms)`)), timeoutMs)
      ),
    ]);
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
