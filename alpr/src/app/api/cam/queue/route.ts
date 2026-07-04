import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { PlanStatus } from "@prisma/client";

// GET /api/cam/queue — คิวแผนของ CAT ที่ CAM คนนี้ดูแล (ผ่าน mentor_links)
export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "cam" && session.user.role !== "admin")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const mentorLinks = await prisma.mentorLink.findMany({
    where: { camId: session.user.id },
    select: { catId: true },
  });
  const catIds = mentorLinks.map((m) => m.catId);

  // MVP: ถ้า CAM ยังไม่มีคู่ mentor ที่ผูกไว้เลย ให้เห็นทุกแผนที่รอตรวจ (กันคิวว่างเปล่าตอน data ยังไม่ครบ)
  const pendingStatuses: PlanStatus[] = ["waiting_cam", "in_review"];
  const where =
    catIds.length > 0
      ? { catId: { in: catIds }, status: { in: pendingStatuses } }
      : { status: { in: pendingStatuses } };

  const pending = await prisma.lessonPlan.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      cat: { select: { name: true } },
      aiEvaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      extraction: { select: { checklist: true } },
    },
  });

  const done = await prisma.lessonPlan.findMany({
    where: {
      ...(catIds.length > 0 ? { catId: { in: catIds } } : {}),
      status: "done",
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      cat: { select: { name: true } },
      finalEvaluation: true,
    },
  });

  const serialize = (p: { fileSizeBytes?: bigint | null }) => ({
    ...p,
    fileSizeBytes: p.fileSizeBytes?.toString() ?? null,
  });

  return NextResponse.json({
    pending: pending.map(serialize),
    done: done.map(serialize),
  });
}
