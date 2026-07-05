import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiEvaluator, AiEvaluatorInput, AiEvaluatorOutput } from "./types";
import { EvaluationResultSchema } from "./schema";
import { buildEvaluationPrompt, hashPrompt } from "./prompt";

export class GeminiEvaluator implements AiEvaluator {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey = process.env.GEMINI_API_KEY!, model = process.env.GEMINI_MODEL || "gemini-2.5-pro") {
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async evaluatePlan(input: AiEvaluatorInput): Promise<AiEvaluatorOutput> {
    const prompt = buildEvaluationPrompt(input.planText);
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: { responseMimeType: "application/json" },
    });

    const res = await model.generateContent(prompt);
    const text = res.response.text();
    const parsed = EvaluationResultSchema.parse(JSON.parse(text));

    return {
      provider: "gemini",
      model: this.model,
      result: parsed,
      promptHash: hashPrompt(prompt),
    };
  }
}
