import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPresignedUrl, BUCKETS } from "@/lib/storage";

// GET /api/plans/[id]/report — presigned URL ดาวน์โหลดรายงาน PDF (เฉพาะเจ้าของแผนหรือ CAM)
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: planId } = await ctx.params;

  const plan = await prisma.lessonPlan.findUnique({
    where: { id: planId },
    include: { finalEvaluation: true },
  });
  if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });

  const isOwner = plan.catId === session.user.id;
  const isCam = session.user.role === "cam" || session.user.role === "admin";
  if (!isOwner && !isCam) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // AC-8 — ผลถือว่าสมบูรณ์เมื่อลงนามแล้วเท่านั้น ก่อนหน้านั้นไม่มีรายงานให้ดาวน์โหลด
  if (!plan.finalEvaluation?.reportKey || !plan.finalEvaluation.signedAt) {
    return NextResponse.json({ error: "ยังไม่มีรายงาน (ผลยังไม่ปิด)" }, { status: 404 });
  }

  const url = await getPresignedUrl(BUCKETS.reports, plan.finalEvaluation.reportKey, 300);
  return NextResponse.json({ url });
}
