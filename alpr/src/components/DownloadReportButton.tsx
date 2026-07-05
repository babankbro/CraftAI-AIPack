"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/url";

export function DownloadReportButton({
  planId,
  endpoint = "report",
  label = "⬇ ดาวน์โหลดรายงาน PDF",
  loadingLabel = "กำลังเตรียมไฟล์...",
  variant = "primary",
}: {
  planId: string;
  endpoint?: "report" | "download";
  label?: string;
  loadingLabel?: string;
  variant?: "primary" | "outline";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/plans/${planId}/${endpoint}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ดาวน์โหลดไม่สำเร็จ");
      window.open(data.url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  const className =
    variant === "primary"
      ? "rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(69,92,161,.28)] hover:bg-primary-hover disabled:opacity-60"
      : "rounded-xl border border-[color:var(--border)] bg-white px-5 py-2.5 text-sm font-semibold hover:bg-[#fafafa] disabled:opacity-60";

  return (
    <div>
      <button onClick={handleClick} disabled={loading} className={className}>
        {loading ? loadingLabel : label}
      </button>
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
