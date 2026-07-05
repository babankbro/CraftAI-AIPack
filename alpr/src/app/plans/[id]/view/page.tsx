import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPresignedUrl, getObjectBuffer, BUCKETS } from "@/lib/storage";
import { docxToHtml } from "@/lib/extract/docx";
import Link from "next/link";

/**
 * พรีวิวไฟล์แผนต้นฉบับในเว็บโดยตรง:
 * - PDF: ฝัง <iframe> ด้วย presigned URL (เบราว์เซอร์เรนเดอร์ PDF ได้เอง)
 * - DOCX: แปลงเป็น HTML ด้วย mammoth ฝั่งเซิร์ฟเวอร์ แล้วแสดงผล (เบราว์เซอร์เปิด .docx เองไม่ได้)
 * สิทธิ์: เจ้าของแผน (CAT) หรือ CAM/admin เท่านั้น
 */
export default async function PlanViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id: planId } = await params;

  const plan = await prisma.lessonPlan.findUnique({ where: { id: planId } });
  if (!plan) notFound();

  const isOwner = plan.catId === session.user.id;
  const isCam = session.user.role === "cam" || session.user.role === "admin";
  if (!isOwner && !isCam) redirect("/login");

  const heading = (
    <div className="flex items-center justify-between border-b border-[color:var(--border)] bg-white/85 px-6 py-3 backdrop-blur">
      <div className="text-sm font-semibold text-ink">
        📄 {plan.subject} · v{plan.version}{" "}
        <span className="ml-1 text-xs font-normal uppercase text-muted">{plan.fileType}</span>
      </div>
      <Link
        href={isCam ? `/cam/evaluate/${plan.id}` : "/cat/results"}
        className="rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold hover:bg-[#fafafa]"
      >
        ← กลับ
      </Link>
    </div>
  );

  if (plan.fileType === "pdf") {
    const url = await getPresignedUrl(BUCKETS.plans, plan.fileKey, 600);
    return (
      <main className="flex h-screen flex-col">
        {heading}
        <iframe src={url} title="ไฟล์แผนต้นฉบับ" className="w-full flex-1 border-0" />
      </main>
    );
  }

  // DOCX → HTML
  let html = "";
  let error: string | null = null;
  try {
    const buffer = await getObjectBuffer(BUCKETS.plans, plan.fileKey);
    html = await docxToHtml(buffer);
  } catch {
    error = "ไม่สามารถแปลงไฟล์ DOCX เพื่อแสดงผลได้ โปรดดาวน์โหลดไฟล์ต้นฉบับแทน";
  }

  return (
    <main className="flex min-h-screen flex-col">
      {heading}
      <div className="mx-auto w-full max-w-[820px] px-6 py-8">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : (
          <article
            className="docx-preview rounded-2xl border border-[color:var(--border-soft)] bg-white p-8 shadow-[var(--shadow-md)] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </main>
  );
}
