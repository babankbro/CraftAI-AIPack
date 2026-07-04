import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import Link from "next/link";

type ChecklistItem = { key: string; found: boolean };
type AiCriterion = { level: number };

export default async function CamQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const mentorLinks = await prisma.mentorLink.findMany({
    where: { camId: session.user.id },
    select: { catId: true },
  });
  const catIds = mentorLinks.map((m) => m.catId);
  const scope = catIds.length > 0 ? { catId: { in: catIds } } : {};

  const pending = await prisma.lessonPlan.findMany({
    where: { ...scope, status: { in: ["waiting_cam", "in_review"] } },
    orderBy: { createdAt: "desc" },
    include: {
      cat: { select: { name: true } },
      aiEvaluations: { orderBy: { createdAt: "desc" }, take: 1 },
      extraction: { select: { checklist: true } },
    },
  });

  const done = await prisma.lessonPlan.findMany({
    where: { ...scope, status: "done" },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: { cat: { select: { name: true } }, finalEvaluation: true },
  });

  return (
    <>
      <AppHeader userName={session.user.name ?? session.user.email ?? ""} roleLabel="ครูพี่เลี้ยง" />
      <main className="mx-auto max-w-[900px] px-6 py-8">
        <h2 className="mb-5 text-2xl font-semibold">คิวรอตรวจ ({pending.length})</h2>

        {pending.length === 0 && (
          <p className="text-sm text-muted">ยังไม่มีแผนที่รอตรวจในขณะนี้</p>
        )}

        <div className="flex flex-col gap-3">
          {pending.map((p) => {
            const ai = p.aiEvaluations[0];
            const criteria = (ai?.criteria as AiCriterion[]) || [];
            const avgLevel = criteria.length
              ? criteria.reduce((s, c) => s + c.level, 0) / criteria.length
              : 0;
            const confidence = avgLevel >= 3 ? "สูง" : avgLevel >= 2 ? "กลาง" : "ต่ำ";
            const checklist = (p.extraction?.checklist as ChecklistItem[]) || [];
            const foundCount = checklist.filter((c) => c.found).length;
            const dots = checklist.map((c) => (c.found ? "●" : "○")).join("");

            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border-soft)] bg-white p-4 shadow-[var(--shadow-md)]"
              >
                <div>
                  <h3 className="text-[15px] font-semibold">
                    {p.cat.name} · {p.subject} · v{p.version}
                  </h3>
                  {ai ? (
                    <div className="my-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full border border-dashed border-[#cfd3dc] bg-[#f1f2f5] px-2.5 py-1 text-xs font-semibold text-muted">
                        ✨ AI เสนอ
                      </span>
                      <span className="font-heading font-semibold text-ink">
                        ~{ai.suggestedTotal ?? "-"}/20
                      </span>
                      <span className="text-xs text-muted">ความเชื่อมั่นเฉลี่ย {confidence}</span>
                    </div>
                  ) : (
                    <p className="my-1 text-xs text-muted">⏳ AI กำลังวิเคราะห์…</p>
                  )}
                  <div className="text-xs text-muted">
                    เช็กลิสต์หลักฐาน: <span className="tracking-widest text-primary">{dots}</span> (
                    {foundCount}/{checklist.length || 5})
                  </div>
                </div>
                <Link
                  href={`/cam/evaluate/${p.id}`}
                  className="whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(69,92,161,.28)] hover:bg-primary-hover"
                >
                  ตรวจ →
                </Link>
              </div>
            );
          })}
        </div>

        {done.length > 0 && (
          <>
            <h3 className="my-6 text-sm font-semibold text-muted">── ตรวจแล้ว ──</h3>
            <div className="flex flex-col gap-2">
              {done.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-2xl border border-[color:var(--border-soft)] bg-white p-4 opacity-80"
                >
                  <h3 className="text-[15px] font-semibold">
                    {p.cat.name} · {p.subject}
                  </h3>
                  <span className="font-heading font-semibold text-success">
                    {p.finalEvaluation?.total}/20 ✓
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
