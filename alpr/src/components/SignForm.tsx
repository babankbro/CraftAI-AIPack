"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/url";

export function SignForm({
  planId,
  criteria,
  initialStrengths,
  initialAreasForGrowth,
}: {
  planId: string;
  criteria: Array<{ code: string; level: number }>;
  initialStrengths: string;
  initialAreasForGrowth: string;
}) {
  const router = useRouter();
  const [strengths, setStrengths] = useState(initialStrengths);
  const [areasForGrowth, setAreasForGrowth] = useState(initialAreasForGrowth);
  const [position, setPosition] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSign() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/plans/${planId}/final`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteria,
          strengths,
          areasForGrowth,
          position,
          sign: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ลงนามไม่สำเร็จ");
      router.push("/cam/queue");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-4 rounded-2xl border border-[color:var(--border-soft)] bg-white p-6 shadow-[var(--shadow-md)]">
        <div>
          <label className="mb-1.5 block text-sm font-semibold">
            4.1 จุดเด่นที่พบร่องรอยชัดเจน (Strengths)
          </label>
          <textarea
            rows={3}
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="เขียนชื่นชมโดยอ้างหลักฐานจากแผน…"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3.5 py-3 text-sm"
          />
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-semibold">
            4.2 จุดตกลงร่วมเพื่อเติมเต็ม (Areas for Growth)
          </label>
          <textarea
            rows={3}
            value={areasForGrowth}
            onChange={(e) => setAreasForGrowth(e.target.value)}
            placeholder="ระบุเงื่อนไขให้ครูนำไปแก้ไขได้ทันที…"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3.5 py-3 text-sm"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[color:var(--border-soft)] bg-white p-6 shadow-[var(--shadow-md)]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-semibold">ตำแหน่ง</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="เช่น ครูชำนาญการ"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3.5 py-3 text-sm"
            />
          </div>
          <div className="w-[130px]">
            <label className="mb-1.5 block text-sm font-semibold">วันที่</label>
            <input
              readOnly
              value={new Date().toLocaleDateString("th-TH")}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3.5 py-3 text-sm text-muted"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <a
            href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/cam/evaluate/${planId}`}
            className="rounded-xl border border-[color:var(--border)] bg-white px-5 py-2.5 text-sm font-semibold hover:bg-[#fafafa]"
          >
            ← กลับไปแก้
          </a>
          <button
            onClick={handleSign}
            disabled={submitting}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(69,92,161,.28)] hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting ? "กำลังลงนาม..." : "✍ ลงนามและปิดผล"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
        <p className="mt-3 text-center text-xs text-muted">
          ผลจะสมบูรณ์เมื่อลงนามแล้วเท่านั้น · หลังปิดผล ครูผู้สอนจะเห็นทันทีและดาวน์โหลด PDF ได้
        </p>
      </div>
    </>
  );
}
