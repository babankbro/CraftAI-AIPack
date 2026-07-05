import type { AiEvaluator } from "./types";
import { GeminiEvaluator } from "./gemini";
import { OpenAiEvaluator } from "./openai";
import { prisma } from "@/lib/db";

export * from "./types";
export * from "./schema";
export * from "./rubric";

/**
 * Factory — เลือก provider/model จากค่าที่ admin ตั้งไว้ใน DB (ตาราง app_settings ผ่านหน้า
 * /admin/settings) ก่อน ถ้ายังไม่เคยตั้ง (ไม่มีแถวใน DB) จะ fallback ไปใช้ env var
 * AI_PROVIDER/GEMINI_MODEL/OPENAI_MODEL ตามเดิม — สลับได้โดยไม่ต้อง restart container
 */
export async function getAiEvaluator(): Promise<AiEvaluator> {
  const settings = await prisma.appSetting.findUnique({ where: { id: 1 } });
  const provider = (settings?.aiProvider || process.env.AI_PROVIDER || "gemini").toLowerCase();
  switch (provider) {
    case "openai":
      return new OpenAiEvaluator(undefined, undefined, settings?.openaiModel ?? undefined);
    case "gemini":
      return new GeminiEvaluator(undefined, settings?.geminiModel ?? undefined);
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  }
}
