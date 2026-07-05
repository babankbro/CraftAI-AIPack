import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { LevelChip, BandChip } from "@/components/LevelChip";
import { SignForm } from "@/components/SignForm";
import { PLC_ACTION, type QualityBand } from "@/lib/ai/rubric";

export default async function CamSummaryPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { planId } = await params;

  const plan = await prisma.lessonPlan.findUnique({
    where: { id: planId },
    include: { cat: { select: { name: true } }, finalEvaluation: true },
  });
  if (!plan || !plan.finalEvaluation) notFound();

  const fe = plan.finalEvaluation;
  const criteria = (fe.criteriaFinal as Array<{ code: string; level: number }>) || [];

  return (
    <>
      <AppHeader
        userName={session.user.name ?? session.user.email ?? ""}
        roleLabel="ครูพี่เลี้ยง"
        isAdmin={session.user.role === "admin"}
        isCam={session.user.role === "cam" || session.user.role === "admin"}
      />
      <main className="mx-auto max-w-[820px] px-6 py-8">
        <h2 className="mb-1 text-2xl font-semibold">สรุปผลและลงนาม</h2>
        <p className="mb-6 text-sm text-muted">
          {plan.cat.name} · {plan.subject} v{plan.version} — ทบทวนคะแนน เขียนข้อเสนอแนะเชิงกัลยาณมิตร
          แล้วลงนามปิดผล
        </p>

        <div className="mb-4 rounded-2xl border border-[color:var(--border-soft)] bg-white p-6 shadow-[var(--shadow-md)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-3.5 text-center">
              {criteria.map((c) => (
                <div key={c.code}>
                  <div className="text-xs text-muted">{c.code}</div>
                  <LevelChip level={c.level} />
                </div>
              ))}
            </div>
            <div className="text-right">
              <div className="font-heading text-[30px] text-ink">
                {fe.total}
                <span className="text-lg text-muted">/20</span>
              </div>
              <BandChip band={fe.band} />
            </div>
          </div>

          {fe.band === ("developing" as QualityBand) && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#f3c4ae] bg-[#fceae1] px-4 py-3.5 font-semibold text-[#b23c10]">
              ⚠️ ห้ามนำแผนไปใช้สอนทันที — นัดพบคู่พัฒนา (Mentor-Mentee) เพื่อเติมเครื่องมือและออกแบบ Active
              Learning ใหม่
            </div>
          )}
          <p className="mt-3 text-[13px] text-muted">
            <b>PLC Action:</b> {fe.plcAction ?? PLC_ACTION[fe.band as QualityBand]}
          </p>
        </div>

        <SignForm
          planId={plan.id}
          criteria={criteria}
          initialStrengths={fe.strengths ?? ""}
          initialAreasForGrowth={fe.areasForGrowth ?? ""}
        />
      </main>
    </>
  );
}
