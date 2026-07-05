import { describe, it, expect } from "vitest";
import { computeTotalAndBand } from "./scoring";

const full = (levels: Record<"C1" | "C2" | "C3" | "C4" | "C5", number>) =>
  (Object.entries(levels) as [keyof typeof levels, number][]).map(([code, level]) => ({
    code,
    level,
  }));

describe("computeTotalAndBand", () => {
  it("sums 5 criteria into a total out of 20", () => {
    const { total } = computeTotalAndBand(
      full({ C1: 4, C2: 4, C3: 4, C4: 4, C5: 4 })
    );
    expect(total).toBe(20);
  });

  it.each([
    [{ C1: 4, C2: 4, C3: 4, C4: 4, C5: 4 }, "innovative_master"],
    [{ C1: 4, C2: 3, C3: 3, C4: 3, C5: 3 }, "fluent"], // 16
    [{ C1: 3, C2: 2, C3: 2, C4: 2, C5: 2 }, "developing"], // 11
    [{ C1: 1, C2: 1, C3: 1, C4: 1, C5: 1 }, "emerging"], // 5
  ] as const)("maps %j to band %s", (levels, band) => {
    expect(computeTotalAndBand(full(levels)).band).toBe(band);
  });

  it("throws if a criterion is missing", () => {
    expect(() =>
      computeTotalAndBand([
        { code: "C1", level: 4 },
        { code: "C2", level: 4 },
      ])
    ).toThrow(/ครบทั้ง 5 องค์ประกอบ/);
  });

  it("throws if a criterion is duplicated instead of covering all 5 codes", () => {
    expect(() =>
      computeTotalAndBand([
        { code: "C1", level: 4 },
        { code: "C1", level: 4 },
        { code: "C3", level: 4 },
        { code: "C4", level: 4 },
        { code: "C5", level: 4 },
      ])
    ).toThrow(/ครบทั้ง 5 องค์ประกอบ/);
  });

  it("throws if a level is out of 1-4 range", () => {
    expect(() =>
      computeTotalAndBand(full({ C1: 0, C2: 4, C3: 4, C4: 4, C5: 4 }))
    ).toThrow(/ต้องอยู่ระหว่าง 1–4/);

    expect(() =>
      computeTotalAndBand(full({ C1: 5, C2: 4, C3: 4, C4: 4, C5: 4 }))
    ).toThrow(/ต้องอยู่ระหว่าง 1–4/);
  });
});
