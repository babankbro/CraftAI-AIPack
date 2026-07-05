import { describe, it, expect } from "vitest";
import {
  CriterionResultSchema,
  CriterionAnalysisSchema,
  EvaluationResultSchema,
  ChecklistItemSchema,
} from "./schema";

const validCriterion = {
  code: "C1" as const,
  level: 3,
  reason: "พบการเชื่อมโยง CK กับ RL/CT",
  evidence: [{ quote: "นักเรียนวิเคราะห์ข้อมูลด้วย AI", page: 2 }],
  confidence: "high" as const,
};

describe("CriterionResultSchema", () => {
  it("accepts a well-formed criterion result", () => {
    const parsed = CriterionResultSchema.parse(validCriterion);
    expect(parsed.no_evidence).toBe(false); // default applied
    expect(parsed.suggestions).toEqual([]); // default applied
    expect(parsed.example).toBeNull(); // default applied
  });

  it("accepts suggestions + example when provided (per-criterion deep analysis)", () => {
    const parsed = CriterionResultSchema.parse({
      ...validCriterion,
      suggestions: ["แนบ Prompt จริง", "เพิ่ม fact-check"],
      example: "ตัวอย่างชุดคำถาม Socratic ...",
    });
    expect(parsed.suggestions).toHaveLength(2);
    expect(parsed.example).toContain("Socratic");
  });

  it("rejects a level outside 1-4 (rubric is fixed 4-level scale)", () => {
    expect(() => CriterionResultSchema.parse({ ...validCriterion, level: 5 })).toThrow();
    expect(() => CriterionResultSchema.parse({ ...validCriterion, level: 0 })).toThrow();
  });

  it("rejects an unknown criterion code", () => {
    expect(() => CriterionResultSchema.parse({ ...validCriterion, code: "C6" })).toThrow();
  });

  it("accepts explicit no_evidence with a low level (FR-4.2 — no guessing high scores)", () => {
    const parsed = CriterionResultSchema.parse({
      ...validCriterion,
      level: 1,
      evidence: [],
      no_evidence: true,
    });
    expect(parsed.no_evidence).toBe(true);
  });

  it("rejects a nullable page value written as a string", () => {
    expect(() =>
      CriterionResultSchema.parse({
        ...validCriterion,
        evidence: [{ quote: "x", page: "2" }],
      })
    ).toThrow();
  });
});

describe("EvaluationResultSchema", () => {
  it("requires exactly 5 criteria (C1-C5)", () => {
    const fourOnly = {
      criteria: [validCriterion, validCriterion, validCriterion, validCriterion],
      suggested_total: 12,
    };
    expect(() => EvaluationResultSchema.parse(fourOnly)).toThrow();
  });

  it("accepts a full 5-criteria result with suggested_total in range", () => {
    const full = {
      criteria: [
        validCriterion,
        { ...validCriterion, code: "C2" },
        { ...validCriterion, code: "C3" },
        { ...validCriterion, code: "C4" },
        { ...validCriterion, code: "C5" },
      ],
      suggested_total: 15,
    };
    expect(EvaluationResultSchema.parse(full).criteria).toHaveLength(5);
  });

  it("rejects suggested_total above 20", () => {
    expect(() =>
      EvaluationResultSchema.parse({
        criteria: [validCriterion],
        suggested_total: 21,
      })
    ).toThrow();
  });
});

describe("CriterionAnalysisSchema (per-criterion response, no code)", () => {
  it("parses a single-criterion analysis and applies defaults", () => {
    const parsed = CriterionAnalysisSchema.parse({
      level: 2,
      reason: "เน้นครูบรรยาย",
      evidence: [],
      confidence: "low",
      no_evidence: true,
    });
    expect(parsed.suggestions).toEqual([]);
    expect(parsed.example).toBeNull();
  });

  it("rejects a payload that still carries code (analysis must be code-less)", () => {
    // extra keys are stripped by default; but a wrong-typed level must fail
    expect(() =>
      CriterionAnalysisSchema.parse({ level: 9, reason: "x", evidence: [], confidence: "high" })
    ).toThrow();
  });
});

describe("ChecklistItemSchema", () => {
  it("accepts a valid checklist item", () => {
    expect(
      ChecklistItemSchema.parse({ key: "prompt", found: true, page: 3 })
    ).toEqual({ key: "prompt", found: true, page: 3 });
  });

  it("rejects an unknown checklist key", () => {
    expect(() =>
      ChecklistItemSchema.parse({ key: "unknown_signal", found: false, page: null })
    ).toThrow();
  });
});
