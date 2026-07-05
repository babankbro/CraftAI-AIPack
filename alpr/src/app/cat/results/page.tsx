import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { LevelChip, BandChip } from "@/components/LevelChip";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import Link from "next/link";

export default async function CatResultsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const plans = await prisma.lessonPlan.findMany({
    where: { catId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { finalEvaluation: true },
  });

  return (
    <>
      <AppHeader
        userName={session.user.name ?? session.user.email ?? ""}
        roleLabel="ครูผู้สอน"
        isAdmin={session.user.role === "admin"}
        isCam={session.user.role === "admin"}
      />
      <main className="mx-auto max-w-[820px] px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">ผลประเมินของฉัน</h2>
          <Link href="/cat/upload" className="text-sm font-semibold text-primary hover:underline">
            ← กลับไปอัปโหลด
          </Link>
        </div>

        {plans.length === 0 && (
          <p className="text-sm text-muted">ยังไม่มีแผนที่ส่งเข้าประเมิน</p>
        )}

        <div className="flex flex-col gap-4">
          {plans.map((p) => {
            const fe = p.finalEvaluation;
            const criteria = (fe?.criteriaFinal as Array<{ code: string; level: number }>) || [];
            return (
              <div key={p.id} className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-6 shadow-[var(--shadow-md)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{p.subject}</h3>
                    <p className="text-xs text-muted">
                      {p.grade ?? "-"} · เวอร์ชัน v{p.version} · {p.createdAt.toLocaleDateString("th-TH")}
                    </p>
                  </div>
                  {fe?.signedAt ? (
                    <div className="text-right">
                      <div className="font-heading text-2xl text-ink">
                        {fe.total}
                        <span className="text-base text-muted">/20</span>
                      </div>
                      <BandChip band={fe.band} />
                    </div>
                  ) : (
                    <span className="rounded-full bg-[#f1f2f5] px-3 py-1 text-xs font-semibold text-muted">
                      ⏳ รอครูพี่เลี้ยงตรวจ
                    </span>
                  )}
                </div>

                {fe?.signedAt && (
                  <>
                    {fe.band === "developing" && (
                      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#f3c4ae] bg-[#fceae1] px-4 py-3.5 font-semibold text-[#b23c10]">
                        ⚠️ ห้ามนำแผนไปใช้สอนทันที — โปรดนัดพบครูพี่เลี้ยง (Mentor-Mentee) เพื่อเติมเครื่องมือก่อน
                      </div>
                    )}

                    <div className="my-4 grid grid-cols-5 gap-2 text-center">
                      {criteria.map((c) => (
                        <div key={c.code}>
                          <div className="text-xs text-muted">{c.code}</div>
                          <LevelChip level={c.level} />
                        </div>
                      ))}
                    </div>

                    <div className="mb-3.5 rounded-2xl bg-[#f6f7fa] p-4">
                      <p className="mb-1.5 font-semibold text-success">✅ จุดเด่น</p>
                      <p className="mb-3 text-sm text-muted">{fe.strengths || "-"}</p>
                      <p className="mb-1.5 font-semibold text-primary">🌱 จุดเติมเต็ม</p>
                      <p className="text-sm text-muted">{fe.areasForGrowth || "-"}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <DownloadReportButton planId={p.id} />
                      <Link
                        href="/cat/upload"
                        className="rounded-xl border border-[color:var(--border)] bg-white px-5 py-2.5 text-sm font-semibold hover:bg-[#fafafa]"
                      >
                        อัปโหลดฉบับปรับปรุง
                      </Link>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
