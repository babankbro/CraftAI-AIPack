import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { putObject, BUCKETS } from "@/lib/storage";
import { processPlan } from "@/lib/pipeline";

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB (SRS FR-2.1)

const MIME_TO_TYPE: Record<string, "pdf" | "docx"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

// GET /api/plans — รายการแผนของ CAT ปัจจุบัน (หน้า "ผลของฉัน")
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "cat") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const plans = await prisma.lessonPlan.findMany({
    where: { catId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      finalEvaluation: true,
      aiEvaluations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // BigInt ไม่ serialize ผ่าน JSON.stringify โดยตรง ต้องแปลงเป็น string ก่อน
  const serialized = plans.map((p) => ({
    ...p,
    fileSizeBytes: p.fileSizeBytes?.toString() ?? null,
  }));

  return NextResponse.json({ plans: serialized });
}

// POST /api/plans — CAT อัปโหลดแผน (SRS FR-2)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "cat") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const subject = form.get("subject") as string | null;
  const topic = (form.get("topic") as string | null) || null;
  const grade = (form.get("grade") as string | null) || null;
  const previousVersionId = (form.get("previousVersionId") as string | null) || null;

  if (!file || !subject) {
    return NextResponse.json({ error: "ต้องระบุไฟล์และรายวิชา/เรื่องที่สอน" }, { status: 400 });
  }

  const fileType = MIME_TO_TYPE[file.type];
  if (!fileType) {
    return NextResponse.json(
      { error: "รองรับเฉพาะไฟล์ PDF หรือ DOCX เท่านั้น" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 20 MB" }, { status: 400 });
  }

  let version = 1;
  if (previousVersionId) {
    const prev = await prisma.lessonPlan.findUnique({ where: { id: previousVersionId } });
    if (prev && prev.catId === session.user.id) version = prev.version + 1;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileKey = await putObject(
    BUCKETS.plans,
    buffer,
    file.type,
    `plans/${session.user.id}`
  );

  const plan = await prisma.lessonPlan.create({
    data: {
      catId: session.user.id,
      subject,
      topic,
      grade,
      version,
      previousVersionId,
      fileKey,
      fileType,
      fileSizeBytes: BigInt(file.size),
      status: "uploaded",
    },
  });

  // ประมวลผลต่อแบบ fire-and-forget (สกัดข้อความ → AI ประเมิน) — ไม่บล็อกการตอบกลับ CAT
  void processPlan(plan.id);

  return NextResponse.json({ plan: { ...plan, fileSizeBytes: plan.fileSizeBytes?.toString() } }, { status: 201 });
}
