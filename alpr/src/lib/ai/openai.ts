import OpenAI from "openai";
import type { AiEvaluator, AiEvaluatorInput, AiEvaluatorOutput } from "./types";
import { EvaluationResultSchema } from "./schema";
import { buildEvaluationPrompt, hashPrompt } from "./prompt";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export class OpenAiEvaluator implements AiEvaluator {
  private client: OpenAI;

  constructor(
    apiKey = process.env.OPENAI_API_KEY!,
    baseURL = process.env.OPENAI_BASE_URL || undefined
  ) {
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async evaluatePlan(input: AiEvaluatorInput): Promise<AiEvaluatorOutput> {
    const prompt = buildEvaluationPrompt(input.planText);

    const res = await this.client.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const text = res.choices[0]?.message?.content ?? "{}";
    const parsed = EvaluationResultSchema.parse(JSON.parse(text));

    return {
      provider: "openai",
      model: MODEL,
      result: parsed,
      promptHash: hashPrompt(prompt),
    };
  }
}
