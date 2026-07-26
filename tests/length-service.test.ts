import { describe, expect, it } from "vitest";
import {
  assertValidLengthRules,
  findLengthRecommendation,
  validateLengthRules,
} from "../src/server/services/length-service";

const rules = [
  { minHeightCm: 100, maxHeightCm: 109, lengthCm: 55, label: "100–109" },
  { minHeightCm: 110, maxHeightCm: 119, lengthCm: 65, label: "110–119" },
  { minHeightCm: 120, maxHeightCm: 139, lengthCm: 76, label: "120–139" },
  { minHeightCm: 140, maxHeightCm: 154, lengthCm: 82, label: "140–154" },
  { minHeightCm: 155, maxHeightCm: 169, lengthCm: 86, label: "155–169" },
  { minHeightCm: 170, maxHeightCm: null, lengthCm: 90, label: "170+" },
];

describe("length rules", () => {
  it.each([
    [99, undefined],
    [100, 55],
    [109, 55],
    [110, 65],
    [119, 65],
    [120, 76],
    [139, 76],
    [140, 82],
    [154, 82],
    [155, 86],
    [169, 86],
    [170, 90],
    [200, 90],
  ])("для роста %i возвращает %s", (height, expected) => {
    expect(findLengthRecommendation(rules, height)?.lengthCm).toBe(expected);
  });

  it("не содержит пересечений и разрывов начиная со 100 см", () => {
    const result = assertValidLengthRules(rules);
    expect(result.overlaps).toEqual([]);
    expect(result.gaps).toEqual([]);
    expect(rules[0].minHeightCm).toBe(100);
    expect(rules.at(-1)?.maxHeightCm).toBeNull();
  });

  it("выявляет разрыв диапазонов", () => {
    const result = validateLengthRules([
      rules[0],
      { ...rules[1], minHeightCm: 115 },
    ]);
    expect(result.gaps).toEqual([{ from: 110, to: 114 }]);
  });

  it("запрещает пересекающиеся диапазоны", () => {
    expect(() => assertValidLengthRules([
      rules[0],
      { ...rules[1], minHeightCm: 109 },
    ])).toThrow(/пересекаться/);
  });
});
