import { z } from "zod";

/** หลักฐานอ้างอิงจากตัวแผน — ทุกคะแนนต้องมีสิ่งนี้ (evidence-first) */
export const EvidenceSchema = z.object({
  quote: z.string(),
  page: z.number().int().nullable(),
});

/**
 * ผลวิเคราะห์ 1 องค์ประกอบ (ไม่รวม code) — ใช้เป็น response ของการเรียก AI แบบราย C
 * (per-criterion iteration): แต่ละ C ได้การวิเคราะห์เชิงลึกของตัวเอง
 */
export const CriterionAnalysisSchema = z.object({
  level: z.number().int().min(1).max(4),
  reason: z.string(),
  evidence: z.array(EvidenceSchema),
  confidence: z.enum(["high", "medium", "low"]),
  // ถ้า AI ไม่พบหลักฐานเพียงพอ ต้องระบุ true + level ต่ำ (ห้ามเดาคะแนนสูง)
  no_evidence: z.boolean().default(false),
  // คำแนะนำการปรับปรุงเชิงรูปธรรม (ทำอะไรจึงจะขยับระดับขึ้น)
  suggestions: z.array(z.string()).default([]),
  // ตัวอย่างที่เขียนให้เห็นภาพว่าเวอร์ชันที่ดีขึ้นควรมีหน้าตาแบบไหน (อิงเนื้อหาแผนจริง)
  example: z.string().nullable().default(null),
});
export type CriterionAnalysis = z.infer<typeof CriterionAnalysisSchema>;

/** ผลประเมิน 1 องค์ประกอบ (C1–C5) ตามเกณฑ์ AIPACK — รวม code */
export const CriterionResultSchema = CriterionAnalysisSchema.extend({
  code: z.enum(["C1", "C2", "C3", "C4", "C5"]),
});

export const EvaluationResultSchema = z.object({
  criteria: z.array(CriterionResultSchema).length(5),
  suggested_total: z.number().int().min(0).max(20),
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type CriterionResult = z.infer<typeof CriterionResultSchema>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

/** เช็กลิสต์หลักฐาน 5 รายการ (สกัดจากแผนก่อนส่งเข้า AI) */
export const ChecklistItemSchema = z.object({
  key: z.enum(["ai_tool", "prompt", "socratic", "rubric", "think_trail"]),
  found: z.boolean(),
  page: z.number().int().nullable(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
