import type { AiEvaluator } from "./types";
import { GeminiEvaluator } from "./gemini";
import { OpenAiEvaluator } from "./openai";

export * from "./types";
export * from "./schema";
export * from "./rubric";

/** Factory — เลือก provider ผ่าน env AI_PROVIDER=gemini|openai (สลับได้โดยไม่แตะ business logic) */
export function getAiEvaluator(): AiEvaluator {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  switch (provider) {
    case "openai":
      return new OpenAiEvaluator();
    case "gemini":
      return new GeminiEvaluator();
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  }
}
