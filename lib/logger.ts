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
  try {
    const { prisma } = await import("./prisma");
    await (prisma as any).activityLog.create({
      data: {
        userId,
        action,
        description,
        metadata,
        ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
