import OpenAI from "openai";
import { BaseAiEvaluator } from "./base";

export class OpenAiEvaluator extends BaseAiEvaluator {
  protected provider = "openai" as const;
  protected model: string;
  private client: OpenAI;

  constructor(
    apiKey = process.env.OPENAI_API_KEY!,
    baseURL = process.env.OPENAI_BASE_URL || undefined,
    model = process.env.OPENAI_MODEL || "gpt-4o"
  ) {
    super();
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model;
  }

  protected async runJson(prompt: string): Promise<string> {
    // ใช้ Responses API (ไม่ใช่ Chat Completions) — โมเดลกลุ่ม reasoning/pro บางตัว
    // (เช่น gpt-5.5-pro) รองรับเฉพาะ endpoint นี้ ส่วนโมเดลแชตทั่วไปก็ใช้ได้เหมือนกัน
    const res = await this.client.responses.create({
      model: this.model,
      input: prompt,
      text: { format: { type: "json_object" } },
    });
    return res.output_text;
  }
}
