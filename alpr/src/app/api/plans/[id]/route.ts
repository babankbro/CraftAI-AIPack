import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/plans/[id] — รายละเอียดแผน 1 ฉบับ (ใช้ทั้งหน้า CAT ผลของฉัน และ CAM ตรวจ)
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const plan = await prisma.lessonPlan.findUnique({
    where: { id },
    include: {
      cat: { select: { id: true, name: true, email: true } },
      extraction: true,
      aiEvaluations: { orderBy: { createdAt: "desc" } },
      finalEvaluation: { include: { cam: { select: { name: true } } } },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const isOwner = plan.catId === session.user.id;
  const isCam = session.user.role === "cam" || session.user.role === "admin";
  if (!isOwner && !isCam) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    plan: { ...plan, fileSizeBytes: plan.fileSizeBytes?.toString() ?? null },
  });
}
