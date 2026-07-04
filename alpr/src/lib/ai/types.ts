import type { EvaluationResult } from "./schema";

export interface AiEvaluatorInput {
  planText: string;
  /** ภาพหน้าแผน (base64) — ออปชัน สำหรับโมเดลที่อ่านภาพประกอบข้อความได้ */
  images?: string[];
}

export interface AiEvaluatorOutput {
  provider: "gemini" | "openai";
  model: string;
  result: EvaluationResult;
  promptHash: string;
}

/** สัญญากลาง — ทุก AI provider ต้อง implement ตัวนี้ (pluggable) */
export interface AiEvaluator {
  evaluatePlan(input: AiEvaluatorInput): Promise<AiEvaluatorOutput>;
}
