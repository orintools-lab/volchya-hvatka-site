import { describe, expect, it } from "vitest";
import {
  assertValidLengthRules,
  findLengthRecommendation,
  validateLengthRules,
} from "../src/server/services/length-service";

const rules = [
  { minHeightCm: 140, maxHeightCm: 159, lengthCm: 75, label: "A" },
  { minHeightCm: 160, maxHeightCm: 180, lengthCm: 85, label: "B" },
];

describe("length rules", () => {
  it("подбирает длину только из настроенных правил", () => {
    expect(findLengthRecommendation(rules, 170)?.lengthCm).toBe(85);
    expect(findLengthRecommendation(rules, 190)).toBeUndefined();
  });

  it("выявляет разрывы диапазонов", () => {
    const result = validateLengthRules([
      rules[0],
      { ...rules[1], minHeightCm: 165 },
    ]);
    expect(result.gaps).toEqual([{ from: 160, to: 164 }]);
  });

  it("запрещает пересекающиеся диапазоны", () => {
    expect(() => assertValidLengthRules([
      rules[0],
      { ...rules[1], minHeightCm: 159 },
    ])).toThrow(/пересекаться/);
  });
});
