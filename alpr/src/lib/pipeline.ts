import { prisma } from "@/lib/db";
import { s3, BUCKETS } from "@/lib/storage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { extractPlanFile } from "@/lib/extract";
import { getAiEvaluator, RUBRIC_VERSION_CODE } from "@/lib/ai";

async function getObjectBuffer(bucket: string, key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * ท่อประมวลผลหลัก (M3+M4): อัปโหลดเสร็จ → สกัดข้อความ/OCR → ตรวจ checklist → เรียก AI ประเมิน
 * เรียกแบบ fire-and-forget จาก POST /api/plans หลังสร้างแถว lesson_plans สำเร็จ
 * ทุกจุดที่ error ต้องอัปเดต status='failed' + error_message (ห้ามค้างเงียบ ๆ)
 */
export async function processPlan(planId: string): Promise<void> {
  const plan = await prisma.lessonPlan.findUniqueOrThrow({ where: { id: planId } });

  try {
    // ── สกัดข้อความ ──
    await prisma.lessonPlan.update({
      where: { id: planId },
      data: { status: "processing" },
    });

    const buffer = await getObjectBuffer(BUCKETS.plans, plan.fileKey);
    const extracted = await extractPlanFile(buffer, plan.fileType);

    await prisma.extraction.upsert({
      where: { planId },
      create: {
        planId,
        text: extracted.text,
        ocrUsed: extracted.ocrUsed,
        pageCount: extracted.pageCount,
        checklist: extracted.checklist,
      },
      update: {
        text: extracted.text,
        ocrUsed: extracted.ocrUsed,
        pageCount: extracted.pageCount,
        checklist: extracted.checklist,
      },
    });

    // ── เรียก AI ประเมิน (pluggable: Gemini/OpenAI ตาม AI_PROVIDER) ──
    await prisma.lessonPlan.update({
      where: { id: planId },
      data: { status: "ai_pending" },
    });

    const rubricVersion = await prisma.rubricVersion.findUniqueOrThrow({
      where: { code: RUBRIC_VERSION_CODE },
    });

    const evaluator = await getAiEvaluator();
    const aiResult = await evaluator.evaluatePlan({ planText: extracted.text });

    await prisma.aiEvaluation.create({
      data: {
        planId,
        provider: aiResult.provider,
        model: aiResult.model,
        rubricVersionId: rubricVersion.id,
        criteria: aiResult.result.criteria,
        suggestedTotal: aiResult.result.suggested_total,
        promptHash: aiResult.promptHash,
      },
    });

    await prisma.lessonPlan.update({
      where: { id: planId },
      data: { status: "waiting_cam" },
    });
  } catch (err) {
    await prisma.lessonPlan.update({
      where: { id: planId },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    // เก็บ log ฝั่งเซิร์ฟเวอร์ไว้ debug — ไม่ throw ต่อเพราะเรียกแบบ fire-and-forget
    console.error(`[pipeline] plan ${planId} failed:`, err);
  }
}
