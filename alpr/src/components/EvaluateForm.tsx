"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/url";
import type { RubricCriterionDef } from "@/lib/ai/rubric";

interface AiCriterion {
  code: string;
  level: number;
  reason: string;
  evidence: Array<{ quote: string; page: number | null }>;
  confidence: string;
  no_evidence: boolean;
  suggestions?: string[];
  example?: string | null;
}

export function EvaluateForm({
  planId,
  rubric,
  aiCriteria,
  existingFinal,
}: {
  planId: string;
  rubric: RubricCriterionDef[];
  aiCriteria: AiCriterion[];
  existingFinal: Array<{ code: string; level: number; reason?: string }> | null;
}) {
  const router = useRouter();
  const [levels, setLevels] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const c of rubric) {
      const existing = existingFinal?.find((f) => f.code === c.code)?.level;
      const aiLevel = aiCriteria.find((a) => a.code === c.code)?.level;
      init[c.code] = existing ?? aiLevel ?? 2;
    }
    return init;
  });
  const [reasons, setReasons] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of rubric) {
      init[c.code] = existingFinal?.find((f) => f.code === c.code)?.reason ?? "";
    }
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => Object.values(levels).reduce((s, v) => s + v, 0),
    [levels]
  );

  async function goToSummary() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/plans/${planId}/final`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteria: Object.entries(levels).map(([code, level]) => ({
            code,
            level,
            reason: reasons[code]?.trim() || undefined,
          })),
          sign: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      router.push(`/cam/summary/${planId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {rubric.map((c, i) => {
        const ai = aiCriteria.find((a) => a.code === c.code);
        return (
          <details
            key={c.code}
            open={i === 0}
            className="mb-3 overflow-hidden rounded-2xl border border-[color:var(--border-soft)] bg-white"
          >
            <summary className="flex cursor-pointer items-center justify-between border-b border-[color:var(--border-soft)] px-4 py-3.5 [&::-webkit-details-marker]:hidden">
              <span>
                <b>{c.code}</b> {c.title}
              </span>
              <span className="rounded-full border border-dashed border-[#cfd3dc] bg-[#f1f2f5] px-2.5 py-1 text-xs font-semibold text-muted">
                {ai?.no_evidence ? "✨ ไม่พบหลักฐาน" : ai ? `✨ AI เสนอ: ระดับ ${ai.level}` : "รอผล AI"}
              </span>
            </summary>
            <div className="bg-[#fcfcfd] p-4">
              {ai && (
                <div
                  className={`mb-3.5 rounded-xl border border-dashed p-3 text-sm ${
                    ai.no_evidence
                      ? "border-[#f3c4ae] bg-[#fceae1]"
                      : "border-[#cfd3dc] bg-[#f1f2f5]"
                  }`}
                >
                  <b>{ai.no_evidence ? "⚠️ AI: ไม่พบหลักฐาน" : `✨ AI เสนอ ระดับ ${ai.level}`}</b>
                  {" · ความเชื่อมั่น: "}
                  <b>{ai.confidence}</b>
                  <p className="mt-1">{ai.reason}</p>

                  {ai.evidence.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-xs font-semibold text-muted">
                        📌 ประโยคหลักฐาน (จุดที่ทำให้ได้ระดับนี้)
                      </p>
                      <ul className="mt-1 flex flex-col gap-1">
                        {ai.evidence.map((e, idx) => (
                          <li
                            key={idx}
                            className="border-l-2 border-[#cfd3dc] pl-2 text-xs text-[#4b5162]"
                          >
                            “{e.quote}”{e.page ? ` (หน้า ${e.page})` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ai.suggestions && ai.suggestions.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-xs font-semibold text-primary">💡 คำแนะนำเพื่อปรับปรุง</p>
                      <ul className="mt-1 list-disc pl-5 text-xs text-[#4b5162]">
                        {ai.suggestions.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ai.example && (
                    <div className="mt-2.5">
                      <p className="text-xs font-semibold text-success">📝 ตัวอย่างที่ดีขึ้น</p>
                      <p className="mt-1 whitespace-pre-wrap rounded-lg bg-white/70 p-2 text-xs text-[#4b5162]">
                        {ai.example}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <p className="mb-2 text-sm font-semibold">CAM ตัดสิน</p>
              <div className="flex gap-2">
                {[4, 3, 2, 1].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevels((s) => ({ ...s, [c.code]: lvl }))}
                    className={`flex-1 rounded-xl border py-2 text-sm font-semibold ${
                      levels[c.code] === lvl
                        ? "border-primary bg-primary text-white"
                        : "border-[color:var(--border)] bg-white text-[color:var(--text)]"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                {c.descriptors.find((d) => d.level === levels[c.code])?.text}
              </p>

              <label className="mt-3 block text-xs font-semibold text-muted">
                เหตุผลเพิ่มเติมของ CAM (ถ้ามี)
              </label>
              <textarea
                rows={2}
                value={reasons[c.code] ?? ""}
                onChange={(e) =>
                  setReasons((s) => ({ ...s, [c.code]: e.target.value }))
                }
                placeholder="อธิบายเหตุผลหรือหลักฐานเพิ่มเติมที่ใช้ประกอบการตัดสินระดับนี้…"
                className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--input-bg)] px-3 py-2 text-xs"
              />
            </div>
          </details>
        );
      })}

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-[color:var(--border-soft)] bg-white p-5 shadow-[var(--shadow-md)]">
        <div>
          <span className="text-[13px] text-muted">รวมชั่วคราว</span>
          <div className="font-heading text-2xl text-ink">
            {total}
            <span className="text-[15px] text-muted">/20</span>
          </div>
        </div>
        <button
          onClick={goToSummary}
          disabled={submitting}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(69,92,161,.28)] hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? "กำลังบันทึก..." : "ไปหน้าสรุป →"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-danger">{error}</p>}
      <p className="mt-2 text-center text-xs text-muted">
        การแก้คะแนนจาก AI จะถูกบันทึก audit
      </p>
    </div>
  );
}
