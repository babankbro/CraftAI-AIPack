import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { EvaluateForm } from "@/components/EvaluateForm";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { AIPACK_RUBRIC } from "@/lib/ai/rubric";

type ChecklistItem = { key: string; found: boolean };

export default async function CamEvaluatePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { planId } = await params;

  const plan = await prisma.lessonPlan.findUnique({
    where: { id: planId },
    include: {
      cat: { select: { name: true } },
      extraction: true,
      aiEvaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      finalEvaluation: true,
    },
  });
  if (!plan) notFound();

  const ai = plan.aiEvaluations[0];
  const aiCriteria = (ai?.criteria as Array<{
    code: string;
    level: number;
    reason: string;
    evidence: Array<{ quote: string; page: number | null }>;
    confidence: string;
    no_evidence: boolean;
  }>) || [];
  const existingFinal = (plan.finalEvaluation?.criteriaFinal as Array<{
    code: string;
    level: number;
    reason?: string;
  }>) || null;
  const checklist = (plan.extraction?.checklist as ChecklistItem[]) || [];
  const foundCount = checklist.filter((c) => c.found).length;

  return (
    <>
      <AppHeader
        userName={session.user.name ?? session.user.email ?? ""}
        roleLabel="ครูพี่เลี้ยง"
        isAdmin={session.user.role === "admin"}
        isCam={session.user.role === "cam" || session.user.role === "admin"}
      />
      <main className="mx-auto max-w-[1280px] px-6 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-primary-soft px-3.5 py-1.5 text-xs font-semibold text-primary">
            หน้าตรวจประเมิน · Evidence-first
          </span>
          <div className="rounded-full border border-dashed border-[#cfd3dc] bg-[#f1f2f5] px-3 py-1.5 text-xs font-semibold text-muted">
            เช็กลิสต์หลักฐาน {foundCount}/{checklist.length || 5}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          {/* ซ้าย: ข้อความที่สกัดจากแผน */}
          <div className="sticky top-[70px] flex h-[calc(100vh-110px)] flex-col rounded-2xl border border-[color:var(--border)] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--border-soft)] px-3.5 py-3 text-sm text-muted">
              <span>
                แผนการสอน: {plan.cat.name} · {plan.subject} (v{plan.version})
              </span>
              <div className="flex items-center gap-2">
                {plan.extraction?.ocrUsed && (
                  <span className="text-xs text-amber">ใช้ OCR ในการสกัด</span>
                )}
                <DownloadReportButton
                  planId={plan.id}
                  endpoint="download"
                  variant="outline"
                  label="📄 ดูไฟล์ต้นฉบับ"
                  loadingLabel="กำลังเตรียมไฟล์..."
                />
              </div>
            </div>
            <div className="m-3.5 flex-1 overflow-auto whitespace-pre-wrap rounded-xl border border-[color:var(--border-soft)] p-4 text-[13px] leading-relaxed text-[#4b5162]">
              {plan.extraction?.text || "กำลังสกัดข้อความ... โปรดรอสักครู่แล้วรีเฟรชหน้านี้"}
            </div>
          </div>

          {/* ขวา: ฟอร์มให้คะแนน */}
          <EvaluateForm
            planId={plan.id}
            rubric={AIPACK_RUBRIC}
            aiCriteria={aiCriteria}
            existingFinal={existingFinal}
          />
        </div>
      </main>
    </>
  );
}
