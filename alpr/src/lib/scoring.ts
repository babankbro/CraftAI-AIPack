import { scoreToBand, type QualityBand } from "@/lib/ai/rubric";

export interface CriterionScore {
  code: "C1" | "C2" | "C3" | "C4" | "C5";
  level: number;
  reason?: string; // เหตุผลเพิ่มเติมที่ CAM ให้ไว้ประกอบการตัดสินระดับคะแนน
}

const REQUIRED_CODES = ["C1", "C2", "C3", "C4", "C5"] as const;

/** รวมคะแนน 5 องค์ประกอบ + แปลผลระดับ — ใช้ตอน CAM ยืนยันคะแนนสุดท้าย (SRS §3 / AC-5) */
export function computeTotalAndBand(criteria: CriterionScore[]): {
  total: number;
  band: QualityBand;
} {
  const codes = criteria.map((c) => c.code).sort();
  const expected = [...REQUIRED_CODES].sort();
  if (JSON.stringify(codes) !== JSON.stringify(expected)) {
    throw new Error("ต้องมีคะแนนครบทั้ง 5 องค์ประกอบ (C1–C5)");
  }
  for (const c of criteria) {
    if (c.level < 1 || c.level > 4) {
      throw new Error(`คะแนนองค์ประกอบ ${c.code} ต้องอยู่ระหว่าง 1–4`);
    }
  }
  const total = criteria.reduce((sum, c) => sum + c.level, 0);
  return { total, band: scoreToBand(total) };
}
