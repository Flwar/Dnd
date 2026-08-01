import type { AttributeKey, Attributes, DiceMode, DiceResult, SkillCheckDefinition } from "../../types/game";

const UINT32_MAX_PLUS_ONE = 0x1_0000_0000;

export interface RandomStep {
  value: number;
  seed: number;
}

export function normalizeSeed(seed: number): number {
  const normalized = Math.trunc(seed) >>> 0;
  return normalized === 0 ? 0x6d2b79f5 : normalized;
}

/** Deterministic xorshift32. The returned seed must be persisted for the next roll. */
export function nextRandom(seed: number): RandomStep {
  let next = normalizeSeed(seed);
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  next >>>= 0;
  return { value: next / UINT32_MAX_PLUS_ONE, seed: next };
}

export function rollDie(seed: number, sides: number): { roll: number; seed: number } {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new RangeError("לקובייה חייבים להיות לפחות שני צדדים.");
  }
  const step = nextRandom(seed);
  return { roll: Math.floor(step.value * sides) + 1, seed: step.seed };
}

export function attributeModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function skillModifier(
  attributes: Attributes,
  attribute: AttributeKey,
  proficiency: boolean,
  proficiencyBonus: number,
  situationalBonus = 0,
): number {
  return attributeModifier(attributes[attribute]) + (proficiency ? proficiencyBonus : 0) + situationalBonus;
}

export function resolveD20(
  seed: number,
  modifier: number,
  difficulty: number,
  mode: DiceMode = "normal",
): DiceResult {
  const first = rollDie(seed, 20);
  const rolls = [first.roll];
  let finalSeed = first.seed;

  if (mode !== "normal") {
    const second = rollDie(first.seed, 20);
    rolls.push(second.roll);
    finalSeed = second.seed;
  }

  const selectedRoll =
    mode === "advantage"
      ? Math.max(...rolls)
      : mode === "disadvantage"
        ? Math.min(...rolls)
        : rolls[0];
  const finalResult = selectedRoll + modifier;
  const outcome =
    selectedRoll === 20
      ? "critical-success"
      : selectedRoll === 1
        ? "critical-failure"
        : finalResult >= difficulty
          ? "success"
          : "failure";

  return {
    rolls,
    selectedRoll,
    modifier,
    finalResult,
    difficulty,
    mode,
    outcome,
    seed: finalSeed,
  };
}

export function resolveSkillCheck(
  seed: number,
  definition: SkillCheckDefinition,
  attributes: Attributes,
  proficiencyBonus: number,
): DiceResult {
  const modifier = skillModifier(
    attributes,
    definition.attribute,
    definition.proficiency,
    proficiencyBonus,
    definition.situationalBonus,
  );
  return resolveD20(seed, modifier, definition.difficulty, definition.mode);
}

export function rollFormula(
  seed: number,
  diceCount: number,
  diceSides: number,
  flatBonus = 0,
): { total: number; rolls: number[]; seed: number } {
  if (!Number.isInteger(diceCount) || diceCount < 0 || diceCount > 100) {
    throw new RangeError("מספר הקוביות אינו תקין.");
  }
  const rolls: number[] = [];
  let currentSeed = seed;
  for (let index = 0; index < diceCount; index += 1) {
    const result = rollDie(currentSeed, diceSides);
    rolls.push(result.roll);
    currentSeed = result.seed;
  }
  return { total: rolls.reduce((sum, roll) => sum + roll, flatBonus), rolls, seed: currentSeed };
}
