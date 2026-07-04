import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPresignedUrl, BUCKETS } from "@/lib/storage";

// GET /api/plans/[id]/download — presigned URL ของไฟล์แผนต้นฉบับ (สำหรับ CAM ดูคู่กับหน้าตรวจ)
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: planId } = await ctx.params;

  const plan = await prisma.lessonPlan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isOwner = plan.catId === session.user.id;
  const isCam = session.user.role === "cam" || session.user.role === "admin";
  if (!isOwner && !isCam) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = await getPresignedUrl(BUCKETS.plans, plan.fileKey, 300);
  return NextResponse.json({ url });
}
