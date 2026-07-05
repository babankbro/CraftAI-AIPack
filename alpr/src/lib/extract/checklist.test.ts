import { describe, it, expect } from "vitest";
import { buildChecklist } from "./checklist";

describe("buildChecklist", () => {
  it("returns all 5 signals, marked not-found when text has no matches", () => {
    const result = buildChecklist("แผนการสอนวิชาวิทยาศาสตร์ทั่วไป ไม่มีคำสำคัญใด ๆ");
    expect(result).toHaveLength(5);
    expect(result.map((r) => r.key).sort()).toEqual(
      ["ai_tool", "prompt", "rubric", "socratic", "think_trail"].sort()
    );
    for (const item of result) {
      expect(item.found).toBe(false);
      expect(item.page).toBeNull();
    }
  });

  it("detects each signal via its Thai/English keywords", () => {
    const text = [
      "ครูใช้ ChatGPT ช่วยออกแบบกิจกรรม",
      "แนบ Prompt ที่ใช้กับ AI",
      "ใช้คำถามปลายเปิดแบบโสกราตีส",
      "วัดผลด้วย Analytic Rubric",
      "ให้นักเรียนบันทึกร่องรอยการคิด",
    ].join(" ");

    const result = buildChecklist(text);
    for (const item of result) {
      expect(item.found, `expected ${item.key} to be found`).toBe(true);
    }
  });

  it("is case-insensitive for English keywords", () => {
    const result = buildChecklist("we used PROMPT engineering with Gemini");
    const aiTool = result.find((r) => r.key === "ai_tool");
    const prompt = result.find((r) => r.key === "prompt");
    expect(aiTool?.found).toBe(true);
    expect(prompt?.found).toBe(true);
  });

  it("attributes the found signal to the correct page when page hints are given", () => {
    const pages = [
      { num: 1, text: "บทนำทั่วไป ไม่มีคำสำคัญ" },
      { num: 2, text: "แนบ Prompt ที่ใช้กับ AI ในกิจกรรม" },
    ];
    const fullText = pages.map((p) => p.text).join("\n");
    const result = buildChecklist(fullText, pages);
    const prompt = result.find((r) => r.key === "prompt");
    expect(prompt?.found).toBe(true);
    expect(prompt?.page).toBe(2);
  });
});
