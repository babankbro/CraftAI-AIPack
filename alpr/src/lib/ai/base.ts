import type { AiEvaluator, AiEvaluatorInput, AiEvaluatorOutput } from "./types";
import { AIPACK_RUBRIC } from "./rubric";
import { CriterionAnalysisSchema, type CriterionResult } from "./schema";
import { buildCriterionPrompt, buildAllCriterionPromptsHash } from "./prompt";

/**
 * ฐานร่วมของทุก provider — ทำ "per-criterion iteration" แบบ sequential:
 * เรียก AI แยกทีละองค์ประกอบ (C1→C5) เพื่อให้แต่ละ C ได้การวิเคราะห์เชิงลึกของตัวเอง
 * (หลักฐานประโยคที่ให้คะแนน + คำแนะนำ + ตัวอย่าง) แล้วประกอบเป็นผลรวม /20
 *
 * provider แต่ละเจ้าเพียง implement runJson() (ยิง prompt → คืน JSON string) เท่านั้น
 */
/**
 * บาง provider (เช่น Gemini JSON mode) อาจห่อผล 1 องค์ประกอบเป็น array [{...}] หรือ
 * เป็น {criteria:[{...}]} แทน object เดี่ยว — คลี่ออกให้เหลือ object เดียวก่อน validate
 */
function unwrapJson(value: unknown): unknown {
  if (Array.isArray(value)) return value[0];
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.criteria)) return obj.criteria[0];
  }
  return value;
}

/** ตัด markdown code fence (```json ... ```) และตัดข้อความนอกวงเล็บ { } ออก */
function cleanJsonText(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  return s;
}

export abstract class BaseAiEvaluator implements AiEvaluator {
  protected abstract provider: "gemini" | "openai";
  protected abstract model: string;

  /** ยิง prompt ไปยังโมเดล แล้วคืนข้อความ JSON ดิบ (โหมด JSON object) */
  protected abstract runJson(prompt: string): Promise<string>;

  /**
   * ยิง prompt แล้ว parse + validate — retry ได้ถ้า LLM คืน JSON เพี้ยน (เช่น quote
   * ไม่ escape ใน example) เพราะผลลัพธ์เป็น stochastic การเรียกใหม่มักได้ JSON ที่ถูกต้อง
   */
  private async evaluateCriterionWithRetry(prompt: string, attempts = 3) {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const raw = await this.runJson(prompt);
        return CriterionAnalysisSchema.parse(unwrapJson(JSON.parse(cleanJsonText(raw))));
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr;
  }

  async evaluatePlan(input: AiEvaluatorInput): Promise<AiEvaluatorOutput> {
    const criteria: CriterionResult[] = [];

    // sequential: ทีละ C (เลี่ยงชน rate-limit; ผลแต่ละ C เป็นอิสระต่อกัน)
    for (const def of AIPACK_RUBRIC) {
      const prompt = buildCriterionPrompt(input.planText, def);
      const analysis = await this.evaluateCriterionWithRetry(prompt);
      criteria.push({ code: def.code, ...analysis });
    }

    const suggestedTotal = criteria.reduce((sum, c) => sum + c.level, 0);

    return {
      provider: this.provider,
      model: this.model,
      result: { criteria, suggested_total: suggestedTotal },
      promptHash: buildAllCriterionPromptsHash(input.planText),
    };
  }
}
