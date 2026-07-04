"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/url";

export function UploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("ม.2");
  const [fileName, setFileName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const file = fileRef.current?.files?.[0];
    if (!file || !subject) {
      setError("กรุณาเลือกไฟล์และกรอกรายวิชา/เรื่องที่สอน");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("subject", subject);
    form.append("grade", grade);

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/plans"), { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ส่งเข้าประเมินไม่สำเร็จ");
      router.push("/cat/results");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-6 shadow-[var(--shadow-md)]">
      <h3 className="mb-4 text-base font-semibold">ข้อมูลแผน (ส่วนที่ 1)</h3>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">รายวิชา/เรื่องที่สอน</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="เช่น การอ่านเชิงวิเคราะห์"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3.5 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold">ระดับชั้น</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3.5 py-3 text-sm"
          >
            <option>ม.1</option>
            <option>ม.2</option>
            <option>ม.3</option>
          </select>
        </div>
      </div>

      <label
        htmlFor="plan-file"
        className="mb-5 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-[color:var(--border)] bg-[#fbfaf6] px-5 py-9 text-center hover:border-primary hover:bg-[#f7f8fc]"
      >
        <div className="mb-2 text-3xl">📄</div>
        <p>
          ลากไฟล์มาวาง หรือ <span className="font-semibold text-primary">เลือกไฟล์</span>
        </p>
        <p className="mt-1 text-xs text-muted">PDF / DOCX · ไม่เกิน 20 MB (รองรับ PDF สแกน — มี OCR)</p>
        {fileName && <p className="mt-2 text-sm font-medium text-ink">{fileName}</p>}
        <input
          id="plan-file"
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>

      {error && <p className="mb-4 text-sm font-medium text-danger">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(69,92,161,.28)] hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? "กำลังส่ง..." : "ส่งเข้าประเมิน"}
        </button>
      </div>
    </form>
  );
}
