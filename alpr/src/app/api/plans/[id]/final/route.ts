import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { computeTotalAndBand, type CriterionScore } from "@/lib/scoring";
import { RUBRIC_VERSION_CODE, PLC_ACTION } from "@/lib/ai/rubric";
import { generateReportPdf } from "@/lib/report";
import { putObject, BUCKETS } from "@/lib/storage";

interface FinalPayload {
  criteria: CriterionScore[];
  strengths?: string;
  areasForGrowth?: string;
  position?: string;
  sign?: boolean; // true = ลงนามปิดผล (AC-8), false = บันทึกร่าง
}

// POST /api/plans/[id]/final — CAM ยืนยัน/แก้คะแนน + (ออปชัน) ลงนามปิดผล
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "cam" && session.user.role !== "admin")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: planId } = await ctx.params;
  const body = (await request.json()) as FinalPayload;

  let total: number, band: ReturnType<typeof computeTotalAndBand>["band"];
  try {
    ({ total, band } = computeTotalAndBand(body.criteria));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ข้อมูลคะแนนไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const plan = await prisma.lessonPlan.findUnique({ where: { id: planId } });
  if (!plan) return NextResponse.json({ error: "not found" }, { status: 404 });

  const latestAi = await prisma.aiEvaluation.findFirst({
    where: { planId },
    orderBy: { createdAt: "desc" },
  });
  const rubricVersion = await prisma.rubricVersion.findUniqueOrThrow({
    where: { code: RUBRIC_VERSION_CODE },
  });

  // FR-5.3 — บันทึก audit ทุกครั้งที่ CAM ยืนยัน/แก้ (ai_level → cam_level)
  const aiCriteria = (latestAi?.criteria as Array<{ code: string; level: number }>) || [];
  await prisma.auditLog.createMany({
    data: body.criteria.map((c) => ({
      planId,
      criterion: c.code,
      aiLevel: aiCriteria.find((a) => a.code === c.code)?.level ?? null,
      camLevel: c.level,
      changedBy: session.user.id,
    })),
  });

  const plcAction = PLC_ACTION[band];

  let reportKey: string | null = null;
  let signedAt: Date | null = null;

  if (body.sign) {
    const cam = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
    const cat = await prisma.user.findUniqueOrThrow({ where: { id: plan.catId } });
    signedAt = new Date();

    const pdfBuffer = await generateReportPdf({
      subject: plan.subject,
      topic: plan.topic,
      grade: plan.grade,
      catName: cat.name,
      camName: cam.name,
      position: body.position ?? null,
      signedAt,
      criteria: body.criteria,
      total,
      band,
      plcAction,
      strengths: body.strengths ?? null,
      areasForGrowth: body.areasForGrowth ?? null,
    });

    reportKey = await putObject(
      BUCKETS.reports,
      pdfBuffer,
      "application/pdf",
      `reports/${planId}`
    );
  }

  const finalEvaluation = await prisma.finalEvaluation.upsert({
    where: { planId },
    create: {
      planId,
      camId: session.user.id,
      basedOnAiId: latestAi?.id,
      rubricVersionId: rubricVersion.id,
      criteriaFinal: body.criteria as unknown as Prisma.InputJsonValue,
      total,
      band,
      plcAction,
      strengths: body.strengths ?? null,
      areasForGrowth: body.areasForGrowth ?? null,
      position: body.position ?? null,
      reportKey,
      signature: body.sign ? session.user.name : null,
      signedAt,
    },
    update: {
      criteriaFinal: body.criteria as unknown as Prisma.InputJsonValue,
      total,
      band,
      plcAction,
      strengths: body.strengths ?? null,
      areasForGrowth: body.areasForGrowth ?? null,
      position: body.position ?? null,
      ...(body.sign
        ? { reportKey, signature: session.user.name, signedAt }
        : {}),
    },
  });

  if (body.sign) {
    await prisma.lessonPlan.update({ where: { id: planId }, data: { status: "done" } });
  } else {
    await prisma.lessonPlan.update({ where: { id: planId }, data: { status: "in_review" } });
  }

  return NextResponse.json({ finalEvaluation });
}
