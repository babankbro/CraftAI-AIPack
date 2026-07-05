import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppHeader } from "@/components/AppHeader";
import { UploadForm } from "@/components/UploadForm";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  uploaded: "อัปโหลดแล้ว",
  processing: "กำลังสกัดข้อความ…",
  ai_pending: "✨ AI กำลังวิเคราะห์",
  waiting_cam: "รอ CAM ตรวจ",
  in_review: "CAM กำลังตรวจ",
  done: "ประเมินเสร็จ",
  failed: "เกิดข้อผิดพลาด",
};

export default async function CatUploadPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const recentPlans = await prisma.lessonPlan.findMany({
    where: { catId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      aiEvaluations: { orderBy: { createdAt: "desc" }, take: 1, select: { suggestedTotal: true } },
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
        <h2 className="mb-5 text-2xl font-semibold">อัปโหลดแผนการสอน</h2>
        <UploadForm />

        {recentPlans.length > 0 && (
          <>
            <h3 className="my-6 text-sm font-semibold text-muted">── รายการอัปโหลดล่าสุด ──</h3>
            <div className="flex flex-col gap-3">
              {recentPlans.map((p) => {
                const aiTotal = p.aiEvaluations[0]?.suggestedTotal;
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-soft)] bg-white p-4 shadow-[var(--shadow-md)]"
                  >
                    <div>
                      <h3 className="text-[15px] font-semibold">
                        {p.subject}{" "}
                        <span className="ml-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                          v{p.version}
                        </span>
                      </h3>
                      <p className="text-xs text-muted">
                        {p.createdAt.toLocaleDateString("th-TH")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {aiTotal != null && p.status !== "done" && (
                        <span className="rounded-full border border-dashed border-[#cfd3dc] bg-[#f1f2f5] px-2.5 py-1 text-xs font-semibold text-muted">
                          ✨ AI เสนอ ~{aiTotal}/20
                        </span>
                      )}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          p.status === "failed"
                            ? "bg-[#fce9e1] text-danger"
                            : p.status === "done"
                              ? "bg-[#e6f4ec] text-success"
                              : "bg-[#fbf0dc] text-amber"
                        }`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                      <Link
                        href={`/plans/${p.id}/view`}
                        target="_blank"
                        className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[#fafafa]"
                      >
                        📄 ไฟล์ต้นฉบับ
                      </Link>
                      <Link
                        href="/cat/results"
                        className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[#fafafa]"
                      >
                        ดูผล →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}
