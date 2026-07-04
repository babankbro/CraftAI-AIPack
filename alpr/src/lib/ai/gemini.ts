import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiEvaluator, AiEvaluatorInput, AiEvaluatorOutput } from "./types";
import { EvaluationResultSchema } from "./schema";
import { buildEvaluationPrompt, hashPrompt } from "./prompt";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export class GeminiEvaluator implements AiEvaluator {
  private client: GoogleGenerativeAI;

  constructor(apiKey = process.env.GEMINI_API_KEY!) {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async evaluatePlan(input: AiEvaluatorInput): Promise<AiEvaluatorOutput> {
    const prompt = buildEvaluationPrompt(input.planText);
    const model = this.client.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });

    const res = await model.generateContent(prompt);
    const text = res.response.text();
    const parsed = EvaluationResultSchema.parse(JSON.parse(text));

    return {
      provider: "gemini",
      model: MODEL,
      result: parsed,
      promptHash: hashPrompt(prompt),
    };
  }
}
