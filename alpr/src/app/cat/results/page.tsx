import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { LevelChip, BandChip } from "@/components/LevelChip";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { AIPACK_RUBRIC } from "@/lib/ai/rubric";
import Link from "next/link";

const CRITERION_TITLE: Record<string, string> = Object.fromEntries(
  AIPACK_RUBRIC.map((c) => [c.code, c.title])
);

type AiCriterion = {
  code: string;
  level: number;
  reason: string;
  confidence: string;
  no_evidence: boolean;
  evidence?: Array<{ quote: string; page: number | null }>;
  suggestions?: string[];
  example?: string | null;
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "สูง",
  medium: "กลาง",
  low: "ต่ำ",
};

export default async function CatResultsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const plans = await prisma.lessonPlan.findMany({
    where: { catId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      finalEvaluation: true,
      aiEvaluations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
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
            const ai = p.aiEvaluations[0];
            const aiCriteria = (ai?.criteria as AiCriterion[]) || [];
            const aiAvg = aiCriteria.length
              ? aiCriteria.reduce((s, c) => s + c.level, 0) / aiCriteria.length
              : 0;
            const aiConfidence = aiAvg >= 3 ? "สูง" : aiAvg >= 2 ? "กลาง" : "ต่ำ";

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
                  ) : ai ? (
                    <div className="text-right">
                      <div className="rounded-full border border-dashed border-[#cfd3dc] bg-[#f1f2f5] px-3 py-1 text-xs font-semibold text-muted">
                        ✨ AI เสนอ ~{ai.suggestedTotal ?? "-"}/20
                      </div>
                      <p className="mt-1 text-[11px] text-muted">รอครูพี่เลี้ยงยืนยัน</p>
                    </div>
                  ) : (
                    <span className="rounded-full bg-[#f1f2f5] px-3 py-1 text-xs font-semibold text-muted">
                      ⏳ รอ AI วิเคราะห์
                    </span>
                  )}
                </div>

                {/* ผลประเมินสมบูรณ์ — ยืนยันโดย CAM แล้ว */}
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
                  </>
                )}

                {/* ผลประเมินเบื้องต้นจาก AI — ยังไม่ผ่านการยืนยันจาก CAM */}
                {!fe?.signedAt && ai && (
                  <div className="my-4 rounded-2xl border border-dashed border-[#cfd3dc] bg-[#fafbfc] p-4">
                    <p className="mb-3 text-xs font-semibold text-muted">
                      ✨ ผลประเมินเบื้องต้นจาก AI (ร่าง — ยังไม่ผ่านการยืนยันจากครูพี่เลี้ยง)
                      · ความเชื่อมั่นเฉลี่ย {aiConfidence}
                    </p>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {aiCriteria.map((c) => (
                        <div key={c.code}>
                          <div className="text-xs text-muted">{c.code}</div>
                          <LevelChip level={c.level} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-3">
                      {aiCriteria.map((c) => (
                        <div
                          key={c.code}
                          className="rounded-xl border border-[color:var(--border-soft)] bg-white p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-semibold text-ink">
                              {c.code} {CRITERION_TITLE[c.code] ?? ""}
                            </span>
                            <span className="text-xs text-muted">
                              ระดับ {c.level}/4 ·{" "}
                              {c.no_evidence
                                ? "ไม่พบหลักฐาน"
                                : `ความเชื่อมั่น ${CONFIDENCE_LABEL[c.confidence] ?? c.confidence}`}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted">{c.reason}</p>

                          {c.evidence && c.evidence.length > 0 && (
                            <div className="mt-2">
                              <p className="text-[11px] font-semibold text-muted">
                                📌 ประโยคหลักฐาน (จุดที่ทำให้ได้ระดับนี้)
                              </p>
                              <ul className="mt-1 flex flex-col gap-1">
                                {c.evidence.map((e, idx) => (
                                  <li
                                    key={idx}
                                    className="border-l-2 border-[#cfd3dc] pl-2 text-[11px] text-[#4b5162]"
                                  >
                                    “{e.quote}”{e.page ? ` (หน้า ${e.page})` : ""}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {c.suggestions && c.suggestions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-[11px] font-semibold text-primary">
                                💡 คำแนะนำเพื่อปรับปรุง
                              </p>
                              <ul className="mt-1 list-disc pl-4 text-[11px] text-[#4b5162]">
                                {c.suggestions.map((s, idx) => (
                                  <li key={idx}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {c.example && (
                            <div className="mt-2">
                              <p className="text-[11px] font-semibold text-success">
                                📝 ตัวอย่างที่ดีขึ้น
                              </p>
                              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-[#f6f7fa] p-2 text-[11px] text-[#4b5162]">
                                {c.example}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-muted">
                      คะแนนนี้เป็นข้อเสนอจาก AI เท่านั้น อาจเปลี่ยนแปลงเมื่อครูพี่เลี้ยงตรวจสอบและยืนยัน
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/plans/${p.id}/view`}
                    target="_blank"
                    className="rounded-xl border border-[color:var(--border)] bg-white px-5 py-2.5 text-sm font-semibold hover:bg-[#fafafa]"
                  >
                    📄 ดูไฟล์ต้นฉบับ
                  </Link>
                  {fe?.signedAt && <DownloadReportButton planId={p.id} />}
                  <Link
                    href="/cat/upload"
                    className="rounded-xl border border-[color:var(--border)] bg-white px-5 py-2.5 text-sm font-semibold hover:bg-[#fafafa]"
                  >
                    อัปโหลดฉบับปรับปรุง
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
