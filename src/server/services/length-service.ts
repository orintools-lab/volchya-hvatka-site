export type LengthRuleInput = {
  id?: string;
  minHeightCm: number;
  maxHeightCm: number | null;
  lengthCm: number;
  label: string;
  isActive?: boolean;
};

export function findLengthRecommendation(
  rules: LengthRuleInput[],
  heightCm: number,
) {
  return rules
    .filter((rule) => rule.isActive !== false)
    .find((rule) =>
      heightCm >= rule.minHeightCm &&
      (rule.maxHeightCm === null || heightCm <= rule.maxHeightCm)
    );
}

export function validateLengthRules(rules: LengthRuleInput[]) {
  const active = rules
    .filter((rule) => rule.isActive !== false)
    .sort((left, right) => left.minHeightCm - right.minHeightCm);
  const overlaps: Array<[LengthRuleInput, LengthRuleInput]> = [];
  const gaps: Array<{ from: number; to: number }> = [];

  for (let index = 1; index < active.length; index += 1) {
    const previous = active[index - 1];
    const current = active[index];
    if (previous.maxHeightCm === null || current.minHeightCm <= previous.maxHeightCm) {
      overlaps.push([previous, current]);
    } else if (current.minHeightCm > previous.maxHeightCm + 1) {
      gaps.push({ from: previous.maxHeightCm + 1, to: current.minHeightCm - 1 });
    }
  }
  return { overlaps, gaps };
}

export function assertValidLengthRules(rules: LengthRuleInput[]) {
  for (const rule of rules) {
    if (
      !Number.isInteger(rule.minHeightCm) ||
      (rule.maxHeightCm !== null && !Number.isInteger(rule.maxHeightCm)) ||
      !Number.isInteger(rule.lengthCm) ||
      (rule.maxHeightCm !== null && rule.minHeightCm > rule.maxHeightCm) ||
      rule.lengthCm <= 0
    ) {
      throw new Error("Проверьте значения правила подбора длины.");
    }
  }
  const validation = validateLengthRules(rules);
  const openEnded = rules.filter((rule) => rule.isActive !== false && rule.maxHeightCm === null);
  if (openEnded.length > 1) {
    throw new Error("Только последний диапазон может не иметь верхней границы.");
  }
  if (validation.overlaps.length > 0) {
    throw new Error("Диапазоны роста не должны пересекаться.");
  }
  return validation;
}
