import { describe, it, expect } from "vitest";
import { scoreToBand, AIPACK_RUBRIC, PLC_ACTION } from "./rubric";

describe("scoreToBand", () => {
  it.each([
    [20, "innovative_master"],
    [17, "innovative_master"],
    [16, "fluent"],
    [13, "fluent"],
    [12, "developing"],
    [9, "developing"],
    [8, "emerging"],
    [5, "emerging"],
    [0, "emerging"],
  ] as const)("scoreToBand(%i) === %s", (score, band) => {
    expect(scoreToBand(score)).toBe(band);
  });
});

describe("AIPACK_RUBRIC", () => {
  it("defines exactly C1-C5 with 4 descriptor levels each", () => {
    expect(AIPACK_RUBRIC.map((c) => c.code)).toEqual(["C1", "C2", "C3", "C4", "C5"]);
    for (const criterion of AIPACK_RUBRIC) {
      const levels = criterion.descriptors.map((d) => d.level).sort();
      expect(levels).toEqual([1, 2, 3, 4]);
    }
  });
});

describe("PLC_ACTION", () => {
  it("has an action defined for every band", () => {
    for (const band of ["innovative_master", "fluent", "developing", "emerging"] as const) {
      expect(PLC_ACTION[band]).toBeTruthy();
    }
  });

  it("warns against immediate use for the developing band (SRS AC-6)", () => {
    expect(PLC_ACTION.developing).toMatch(/ห้ามนำแผนไปใช้สอนทันที/);
  });
});
