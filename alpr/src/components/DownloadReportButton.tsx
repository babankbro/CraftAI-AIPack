"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/url";

export function DownloadReportButton({ planId }: { planId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/plans/${planId}/report`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ดาวน์โหลดไม่สำเร็จ");
      window.open(data.url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(69,92,161,.28)] hover:bg-primary-hover disabled:opacity-60"
      >
        {loading ? "กำลังเตรียมไฟล์..." : "⬇ ดาวน์โหลดรายงาน PDF"}
      </button>
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
