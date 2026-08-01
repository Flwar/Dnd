import type {
  Ability,
  ActiveStatus,
  CombatAction,
  CombatEvent,
  CombatState,
  Combatant,
  Enemy,
  StatusDefinition,
} from "../../types/game";
import { attributeModifier, nextRandom, rollDie, rollFormula } from "../dice";

export interface CombatRules {
  abilities: Readonly<Record<string, Ability>>;
  statuses: Readonly<Record<string, StatusDefinition>>;
}

type EventWithoutSequence = CombatEvent extends infer Event
  ? Event extends { sequence: number }
    ? Omit<Event, "sequence">
    : never
  : never;

export type CombatCommandResult =
  | { ok: true; state: CombatState }
  | { ok: false; code: "COMBAT_ENDED" | "OUT_OF_TURN" | "DUPLICATE" | "INVALID_ACTION" | "INVALID_TARGET"; message: string };

function cloneCombatant(combatant: Combatant): Combatant {
  return {
    ...combatant,
    attributes: { ...combatant.attributes },
    cooldowns: { ...combatant.cooldowns },
    statuses: combatant.statuses.map((status) => ({ ...status })),
    abilityIds: [...combatant.abilityIds],
  };
}

function appendEvent(state: CombatState, event: EventWithoutSequence): CombatState {
  const nextEvent = { ...event, sequence: state.nextEventSequence } as CombatEvent;
  return { ...state, log: [...state.log, nextEvent], nextEventSequence: state.nextEventSequence + 1 };
}

export function calculateArmorMitigation(rawDamage: number, armor: number, armorPiercing = 0): number {
  const effectiveArmor = Math.max(0, armor - armorPiercing);
  const reduction = effectiveArmor / (effectiveArmor + 20);
  return Math.max(rawDamage > 0 ? 1 : 0, Math.floor(rawDamage * (1 - reduction)));
}

export function healCombatant(combatant: Combatant, amount: number): { combatant: Combatant; healed: number } {
  const currentHealth = Math.min(combatant.maximumHealth, combatant.currentHealth + Math.max(0, amount));
  return { combatant: { ...combatant, currentHealth }, healed: currentHealth - combatant.currentHealth };
}

export function tickCooldowns(cooldowns: Readonly<Record<string, number>>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(cooldowns)
      .map(([abilityId, remaining]) => [abilityId, Math.max(0, remaining - 1)] as const)
      .filter(([, remaining]) => remaining > 0),
  );
}

export function applyStatus(
  target: Combatant,
  application: { statusId: string; duration: number; stacks?: number; sourceCombatantId: string },
  definitions: Readonly<Record<string, StatusDefinition>>,
): Combatant {
  const definition = definitions[application.statusId];
  if (!definition) return target;
  const existing = target.statuses.find((status) => status.statusId === application.statusId);
  const statuses = existing
    ? target.statuses.map((status) =>
        status.statusId === application.statusId
          ? {
              ...status,
              remainingTurns: Math.max(status.remainingTurns, application.duration),
              stacks: Math.min(definition.maxStacks, status.stacks + (application.stacks ?? 1)),
              sourceCombatantId: application.sourceCombatantId,
            }
          : status,
      )
    : [
        ...target.statuses,
        {
          statusId: application.statusId,
          remainingTurns: application.duration,
          stacks: Math.min(definition.maxStacks, application.stacks ?? 1),
          sourceCombatantId: application.sourceCombatantId,
        },
      ];
  return { ...target, statuses };
}

export function processTurnStartStatuses(
  combatant: Combatant,
  definitions: Readonly<Record<string, StatusDefinition>>,
): { combatant: Combatant; damage: number; healing: number; skipTurn: boolean } {
  let currentHealth = combatant.currentHealth;
  let damage = 0;
  let healing = 0;
  let skipTurn = false;
  const statuses: ActiveStatus[] = [];
  for (const active of combatant.statuses) {
    const definition = definitions[active.statusId];
    if (definition) {
      const statusDamage = Math.max(0, (definition.damagePerTurn ?? 0) * active.stacks);
      const requestedHealing = Math.max(0, (definition.healingPerTurn ?? 0) * active.stacks);
      const nextHealth = Math.min(combatant.maximumHealth, Math.max(0, currentHealth - statusDamage + requestedHealing));
      damage += Math.min(currentHealth, statusDamage);
      healing += Math.max(0, nextHealth - Math.max(0, currentHealth - statusDamage));
      currentHealth = nextHealth;
      skipTurn ||= Boolean(definition.skipTurn);
    }
    if (active.remainingTurns > 1) statuses.push({ ...active, remainingTurns: active.remainingTurns - 1 });
  }
  return {
    combatant: { ...combatant, currentHealth, defeated: currentHealth <= 0, statuses, cooldowns: tickCooldowns(combatant.cooldowns) },
    damage,
    healing,
    skipTurn,
  };
}

function statusArmorModifier(combatant: Combatant, definitions: Readonly<Record<string, StatusDefinition>>): number {
  return combatant.statuses.reduce(
    (total, active) => total + (definitions[active.statusId]?.armorModifier ?? 0) * active.stacks,
    0,
  );
}

function statusAccuracyModifier(combatant: Combatant, definitions: Readonly<Record<string, StatusDefinition>>): number {
  return combatant.statuses.reduce(
    (total, active) => total + (definitions[active.statusId]?.accuracyModifier ?? 0) * active.stacks,
    0,
  );
}

function statusDamageMultiplier(combatant: Combatant, definitions: Readonly<Record<string, StatusDefinition>>): number {
  return combatant.statuses.reduce(
    (total, active) => total * Math.pow(definitions[active.statusId]?.damageMultiplier ?? 1, active.stacks),
    1,
  );
}

function abilityAvailable(actor: Combatant, ability: Ability): boolean {
  if (actor.currentResource < ability.cost || (actor.cooldowns[ability.id] ?? 0) > 0) return false;
  switch (ability.availability.kind) {
    case "always": return true;
    case "health-below": return actor.currentHealth / actor.maximumHealth < ability.availability.percentage;
    case "target-status": return true;
    case "self-status-absent": {
      const statusId = ability.availability.statusId;
      return !actor.statuses.some((status) => status.statusId === statusId);
    }
  }
}

export function createCombatantFromEnemy(
  enemy: Enemy,
  id = `enemy-${enemy.id}`,
  initialStatuses: ActiveStatus[] = [],
): Combatant {
  return {
    id,
    kind: "enemy",
    name: enemy.name,
    enemyId: enemy.id,
    level: enemy.level,
    attributes: { ...enemy.attributes },
    maximumHealth: enemy.maximumHealth,
    currentHealth: enemy.maximumHealth,
    armor: enemy.armor,
    accuracy: enemy.accuracy,
    initiativeBonus: enemy.initiativeBonus,
    maximumResource: 0,
    currentResource: 0,
    abilityIds: [...enemy.abilityIds],
    cooldowns: {},
    statuses: initialStatuses.map((status) => ({ ...status })),
    defeated: false,
  };
}

export interface BossScaling {
  healthMultiplier: number;
  damageMultiplier: number;
  armorBonus: number;
  guardPoints: number;
}

export function bossScaling(partySize: number, averageLevel: number): BossScaling {
  const members = Math.max(1, Math.min(4, Math.trunc(partySize)));
  const level = Math.max(1, averageLevel);
  return {
    healthMultiplier: 1 + (members - 1) * 0.62 + (level - 1) * 0.18,
    damageMultiplier: 1 + (members - 1) * 0.16 + (level - 1) * 0.08,
    armorBonus: Math.floor((members - 1) / 2) + Math.floor((level - 1) / 2),
    guardPoints: 2 + members,
  };
}

export function scaleEnemy(enemy: Enemy, partySize: number, averageLevel: number): Enemy {
  const members = Math.max(1, Math.min(4, Math.trunc(partySize)));
  const levelDifference = Math.max(0, averageLevel - enemy.level);
  const boss = Boolean(enemy.boss);
  const scaling = boss
    ? bossScaling(members, averageLevel)
    : {
        healthMultiplier: 1 + (members - 1) * 0.45 + levelDifference * 0.12,
        damageMultiplier: 1,
        armorBonus: Math.floor(levelDifference / 2),
        guardPoints: 0,
      };
  return {
    ...enemy,
    maximumHealth: Math.max(1, Math.round(enemy.maximumHealth * scaling.healthMultiplier)),
    armor: enemy.armor + scaling.armorBonus,
    accuracy: enemy.accuracy + Math.floor(levelDifference / 2),
    boss: enemy.boss ? { ...enemy.boss, guardPoints: scaling.guardPoints } : undefined,
  };
}

export function createCombatState(encounterId: string, combatants: readonly Combatant[], seed: number): CombatState {
  const initiative: Array<{ id: string; total: number; tie: number }> = [];
  let nextSeed = seed;
  for (const combatant of combatants) {
    const roll = rollDie(nextSeed, 20);
    nextSeed = roll.seed;
    initiative.push({ id: combatant.id, total: roll.roll + combatant.initiativeBonus, tie: combatant.initiativeBonus });
  }
  initiative.sort((left, right) => right.total - left.total || right.tie - left.tie || left.id.localeCompare(right.id));
  const state: CombatState = {
    encounterId,
    round: 1,
    turnOrder: initiative.map((entry) => entry.id),
    activeTurnIndex: 0,
    combatants: Object.fromEntries(combatants.map((combatant) => [combatant.id, cloneCombatant(combatant)])),
    phase: "active",
    log: [],
    seed: nextSeed,
    nextEventSequence: 1,
    processedCommandIds: [],
  };
  return appendEvent(state, {
    kind: "turn-started",
    combatantId: state.turnOrder[0],
    text: `התור של ${state.combatants[state.turnOrder[0]].name}.`,
  });
}

function resolveDamageAgainstTarget(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  ability: Ability,
  rules: CombatRules,
): { state: CombatState; target: Combatant } {
  if (!ability.formula) return { state, target };
  const attackRoll = rollDie(state.seed, 20);
  let nextState = { ...state, seed: attackRoll.seed };
  const critical = attackRoll.roll === 20;
  const targetArmor = target.armor + statusArmorModifier(target, rules.statuses);
  const accuracy = actor.accuracy + statusAccuracyModifier(actor, rules.statuses);
  if (attackRoll.roll === 1 || (!critical && attackRoll.roll + accuracy < targetArmor)) {
    nextState = appendEvent(nextState, {
      kind: "miss",
      sourceId: actor.id,
      targetId: target.id,
      text: `${actor.name} מחטיא את ${target.name}.`,
    });
    return { state: nextState, target };
  }

  const diceCount = ability.formula.diceCount * (critical ? 2 : 1);
  const rolled = rollFormula(nextState.seed, diceCount, ability.formula.diceSides, ability.formula.flatBonus);
  nextState = { ...nextState, seed: rolled.seed };
  const attributeBonus = ability.formula.attribute ? Math.max(0, attributeModifier(actor.attributes[ability.formula.attribute])) : 0;
  const rawDamage = Math.max(0, Math.floor((rolled.total + attributeBonus) * statusDamageMultiplier(actor, rules.statuses)));
  const amount = calculateArmorMitigation(rawDamage, Math.max(0, targetArmor - 10));
  const currentHealth = Math.max(0, target.currentHealth - amount);
  let nextTarget = { ...target, currentHealth, defeated: currentHealth === 0 };
  nextState = appendEvent(nextState, {
    kind: "damage",
    sourceId: actor.id,
    targetId: target.id,
    amount,
    critical,
    text: critical
      ? `${actor.name} פוגע פגיעה מכרעת ב${target.name} וגורם ${amount} נזק.`
      : `${actor.name} פוגע ב${target.name} וגורם ${amount} נזק.`,
  });
  const guarded = nextTarget.statuses.some((status) => status.statusId === "guarded");
  if (guarded && rawDamage >= 8 && !nextTarget.defeated) {
    nextTarget = applyStatus(
      { ...nextTarget, statuses: nextTarget.statuses.filter((status) => status.statusId !== "guarded") },
      { statusId: "exposed-rune", duration: 2, sourceCombatantId: actor.id },
      rules.statuses,
    );
    nextState = appendEvent(nextState, {
      kind: "status-applied",
      sourceId: actor.id,
      targetId: target.id,
      statusId: "exposed-rune",
      text: `המשמר של ${target.name} נשבר ונקודת התורפה נחשפה.`,
    });
  }
  if (nextTarget.defeated) {
    nextState = appendEvent(nextState, { kind: "defeated", combatantId: target.id, text: `${target.name} הובס.` });
  }
  return { state: nextState, target: nextTarget };
}

function resolveHealing(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  ability: Ability,
): { state: CombatState; target: Combatant } {
  if (!ability.healingFormula) return { state, target };
  const rolled = rollFormula(
    state.seed,
    ability.healingFormula.diceCount,
    ability.healingFormula.diceSides,
    ability.healingFormula.flatBonus,
  );
  const bonus = ability.healingFormula.attribute
    ? Math.max(0, attributeModifier(actor.attributes[ability.healingFormula.attribute]))
    : 0;
  const healed = healCombatant(target, rolled.total + bonus);
  let nextState = { ...state, seed: rolled.seed };
  nextState = appendEvent(nextState, {
    kind: "healing",
    sourceId: actor.id,
    targetId: target.id,
    amount: healed.healed,
    text: `${actor.name} משיב ל${target.name} ${healed.healed} נקודות חיים.`,
  });
  return { state: nextState, target: healed.combatant };
}

function applyAbilityStatuses(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  ability: Ability,
  rules: CombatRules,
): { state: CombatState; target: Combatant } {
  let nextState = state;
  let nextTarget = target;
  for (const application of ability.statusEffects) {
    const random = nextRandom(nextState.seed);
    nextState = { ...nextState, seed: random.seed };
    if (random.value > application.chance) continue;
    nextTarget = applyStatus(
      nextTarget,
      { ...application, sourceCombatantId: actor.id },
      rules.statuses,
    );
    const statusName = rules.statuses[application.statusId]?.name ?? application.statusId;
    nextState = appendEvent(nextState, {
      kind: "status-applied",
      sourceId: actor.id,
      targetId: target.id,
      statusId: application.statusId,
      text: `${statusName} משפיע כעת על ${target.name}.`,
    });
  }
  return { state: nextState, target: nextTarget };
}

function resolveAbility(
  state: CombatState,
  actorId: string,
  ability: Ability,
  targetIds: readonly string[],
  rules: CombatRules,
): CombatCommandResult {
  const actor = cloneCombatant(state.combatants[actorId]);
  if (!abilityAvailable(actor, ability)) {
    return { ok: false, code: "INVALID_ACTION", message: "היכולת עדיין אינה זמינה או שאין די משאב להפעלתה." };
  }
  const expectedTargetKind = ability.target === "enemy" || ability.target === "all-enemies" ? (actor.kind === "player" ? "enemy" : "player") : actor.kind;
  const candidates = ability.target === "self" ? [actorId] : targetIds;
  const validTargets = candidates
    .map((targetId) => state.combatants[targetId])
    .filter((target): target is Combatant => Boolean(target) && !target.defeated && target.kind === expectedTargetKind);
  if (validTargets.length === 0 || (ability.target !== "all-enemies" && validTargets.length !== 1)) {
    return { ok: false, code: "INVALID_TARGET", message: "המטרה שנבחרה אינה חוקית." };
  }
  if (ability.availability.kind === "target-status") {
    const statusId = ability.availability.statusId;
    if (!validTargets.some((target) => target.statuses.some((status) => status.statusId === statusId))) {
      return { ok: false, code: "INVALID_ACTION", message: "המטרה אינה עומדת בתנאי היכולת." };
    }
  }

  let nextState: CombatState = {
    ...state,
    combatants: { ...state.combatants },
  };
  for (const originalTarget of validTargets) {
    let target = cloneCombatant(nextState.combatants[originalTarget.id]);
    const damage = resolveDamageAgainstTarget(nextState, actor, target, ability, rules);
    nextState = damage.state;
    target = damage.target;
    const healing = resolveHealing(nextState, actor, target, ability);
    nextState = healing.state;
    target = healing.target;
    const statuses = applyAbilityStatuses(nextState, actor, target, ability, rules);
    nextState = statuses.state;
    nextState.combatants = { ...nextState.combatants, [target.id]: statuses.target };
  }
  const updatedActor = nextState.combatants[actor.id] ?? actor;
  nextState.combatants = {
    ...nextState.combatants,
    [actor.id]: {
      ...updatedActor,
      currentResource: actor.currentResource - ability.cost,
      cooldowns:
        ability.cooldown > 0
          ? { ...updatedActor.cooldowns, [ability.id]: ability.cooldown + 1 }
          : updatedActor.cooldowns,
    },
  };
  return { ok: true, state: nextState };
}

function finishOrAdvanceTurn(state: CombatState, rules: CombatRules): CombatState {
  const livingPlayers = Object.values(state.combatants).filter((combatant) => combatant.kind === "player" && !combatant.defeated);
  const livingEnemies = Object.values(state.combatants).filter((combatant) => combatant.kind === "enemy" && !combatant.defeated);
  if (livingEnemies.length === 0) {
    return appendEvent({ ...state, phase: "victory" }, { kind: "combat-ended", result: "victory", text: "הקרב הסתיים בניצחון." });
  }
  if (livingPlayers.length === 0) {
    return appendEvent({ ...state, phase: "defeat" }, { kind: "combat-ended", result: "defeat", text: "החבורה הובסה." });
  }

  let workingState = state;
  let index = state.activeTurnIndex;
  let round = state.round;
  for (let attempts = 0; attempts < state.turnOrder.length; attempts += 1) {
    index = (index + 1) % state.turnOrder.length;
    if (index === 0) round += 1;
    const candidate = workingState.combatants[state.turnOrder[index]];
    if (candidate && !candidate.defeated) {
      const processed = processTurnStartStatuses(candidate, rules.statuses);
      workingState = {
        ...workingState,
        activeTurnIndex: index,
        round,
        combatants: { ...workingState.combatants, [candidate.id]: processed.combatant },
      };
      if (processed.combatant.defeated) {
        workingState = appendEvent(workingState, {
          kind: "defeated",
          combatantId: candidate.id,
          text: `${candidate.name} הובס מנזק מתמשך.`,
        });
        continue;
      }
      workingState = appendEvent(workingState, {
        kind: "turn-started",
        combatantId: candidate.id,
        text: `התור של ${candidate.name}.`,
      });
      if (processed.skipTurn) return finishOrAdvanceTurn(workingState, rules);
      return workingState;
    }
  }
  return workingState;
}

export function submitCombatAction(
  state: CombatState,
  actorId: string,
  action: CombatAction,
  commandId: string,
  rules: CombatRules,
): CombatCommandResult {
  if (state.phase !== "active") return { ok: false, code: "COMBAT_ENDED", message: "הקרב כבר הסתיים." };
  if (state.processedCommandIds.includes(commandId)) {
    return { ok: false, code: "DUPLICATE", message: "הפעולה כבר התקבלה." };
  }
  if (state.turnOrder[state.activeTurnIndex] !== actorId) {
    return { ok: false, code: "OUT_OF_TURN", message: "אפשר לפעול רק בתורך." };
  }
  const actor = state.combatants[actorId];
  if (!actor || actor.defeated) return { ok: false, code: "INVALID_ACTION", message: "הדמות אינה יכולה לפעול." };

  let result: CombatCommandResult;
  if (action.kind === "ability") {
    const ability = rules.abilities[action.abilityId];
    if (!ability || !actor.abilityIds.includes(ability.id)) {
      return { ok: false, code: "INVALID_ACTION", message: "היכולת אינה מוכרת לדמות." };
    }
    result = resolveAbility(state, actorId, ability, action.targetIds, rules);
  } else if (action.kind === "defend") {
    const defended = applyStatus(actor, { statusId: "defending", duration: 1, sourceCombatantId: actorId }, rules.statuses);
    result = { ok: true, state: { ...state, combatants: { ...state.combatants, [actorId]: defended } } };
  } else if (action.kind === "escape") {
    const roll = rollDie(state.seed, 20);
    const success = roll.roll + actor.initiativeBonus >= 13;
    result = success
      ? {
          ok: true,
          state: appendEvent({ ...state, seed: roll.seed, phase: "escaped" }, { kind: "combat-ended", result: "escaped", text: "החבורה נסוגה מן הקרב." }),
        }
      : { ok: true, state: { ...state, seed: roll.seed } };
  } else {
    return { ok: false, code: "INVALID_ACTION", message: "שימוש בחפץ דורש הקשר מלאי מאומת מן השרת." };
  }

  if (!result.ok) return result;
  let nextState = {
    ...result.state,
    processedCommandIds: [...result.state.processedCommandIds, commandId],
  };
  if (nextState.phase === "active") nextState = finishOrAdvanceTurn(nextState, rules);
  return { ok: true, state: nextState };
}

export function chooseEnemyAction(
  state: CombatState,
  enemyId: string,
  rules: CombatRules,
): CombatAction | null {
  const enemy = state.combatants[enemyId];
  if (!enemy || enemy.kind !== "enemy" || enemy.defeated) return null;
  const targets = Object.values(state.combatants).filter((combatant) => combatant.kind === "player" && !combatant.defeated);
  if (targets.length === 0) return null;
  const target = [...targets].sort((left, right) => left.currentHealth / left.maximumHealth - right.currentHealth / right.maximumHealth || left.id.localeCompare(right.id))[0];
  const hasTelegraph = enemy.statuses.some((status) => status.statusId === "telegraphed");
  const runeCrush = rules.abilities["boss-rune-crush"];
  if (hasTelegraph && enemy.abilityIds.includes("boss-rune-crush") && runeCrush && abilityAvailable(enemy, runeCrush)) {
    return { kind: "ability", abilityId: runeCrush.id, targetIds: [target.id] };
  }
  const telegraph = rules.abilities["boss-telegraph-crush"];
  if (
    enemy.abilityIds.includes("boss-telegraph-crush") &&
    telegraph &&
    abilityAvailable(enemy, telegraph) &&
    (state.round % 3 === 0 || enemy.currentHealth / enemy.maximumHealth <= 0.7)
  ) {
    return { kind: "ability", abilityId: telegraph.id, targetIds: [enemy.id] };
  }
  const defensiveStance = rules.abilities["boss-defensive-stance"];
  if (
    enemy.abilityIds.includes("boss-defensive-stance") &&
    defensiveStance &&
    abilityAvailable(enemy, defensiveStance) &&
    enemy.currentHealth / enemy.maximumHealth <= 0.85
  ) {
    return { kind: "ability", abilityId: defensiveStance.id, targetIds: [enemy.id] };
  }
  const ability = enemy.abilityIds
    .map((abilityId) => rules.abilities[abilityId])
    .find(
      (candidate) =>
        candidate &&
        candidate.id !== "boss-rune-crush" &&
        candidate.id !== "boss-telegraph-crush" &&
        candidate.id !== "boss-defensive-stance" &&
        abilityAvailable(enemy, candidate),
    );
  return ability ? { kind: "ability", abilityId: ability.id, targetIds: [target.id] } : { kind: "defend" };
}

export const BALANCE = {
  tutorialEnemyHealth: 18,
  regularEnemyHealth: 26,
  bossBaseHealth: 82,
  escapeDifficulty: 13,
  criticalMultiplier: 2,
} as const;
