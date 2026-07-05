import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseAiEvaluator } from "./base";

export class GeminiEvaluator extends BaseAiEvaluator {
  protected provider = "gemini" as const;
  protected model: string;
  private client: GoogleGenerativeAI;

  constructor(apiKey = process.env.GEMINI_API_KEY!, model = process.env.GEMINI_MODEL || "gemini-2.5-pro") {
    super();
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  protected async runJson(prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: { responseMimeType: "application/json" },
    });
    const res = await model.generateContent(prompt);
    return res.response.text();
  }
}
