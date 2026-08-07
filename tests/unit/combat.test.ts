import { describe, expect, it } from "vitest";
import { abilitiesById, enemiesById, statusesById } from "../../src/content";
import {
  BALANCE,
  bossScaling,
  calculateArmorMitigation,
  chooseEnemyAction,
  createCombatantFromEnemy,
  createCombatState,
  healCombatant,
  processTurnStartStatuses,
  scaleEnemy,
  submitCombatAction,
  tickCooldowns,
} from "../../src/game/combat";
import type { CombatAction, Combatant, CombatState } from "../../src/types/game";
import { makeCombatant } from "./fixtures";

const combatRules = { abilities: abilitiesById, statuses: statusesById };

function damageFromFirstMatchingHit(actor: Combatant, target: Combatant, abilityId: string): number {
  for (let seed = 1; seed < 5_000; seed += 1) {
    const state = createCombatState("damage-check", [actor, target], seed);
    if (state.turnOrder[state.activeTurnIndex] !== actor.id) continue;
    const result = submitCombatAction(
      state,
      actor.id,
      { kind: "ability", abilityId, targetIds: [target.id] },
      `damage-${seed}`,
      combatRules,
    );
    if (!result.ok) continue;
    const damage = result.state.log.find(
      (event) => event.kind === "damage" && event.sourceId === actor.id && event.targetId === target.id,
    );
    if (damage?.kind === "damage") return damage.amount;
  }
  throw new Error(`No deterministic hit found for ${abilityId}`);
}

function simulateSoloGuardian(seed: number, runeInvestigated = false): CombatState["phase"] {
  const player = makeCombatant({
    id: "solo-fighter",
    attributes: { strength: 16, dexterity: 12, constitution: 16, intelligence: 8, wisdom: 10, charisma: 10 },
    maximumHealth: 33,
    currentHealth: 33,
    armor: 14,
    accuracy: 6,
    maximumResource: 11,
    currentResource: 11,
  });
  const guardian = createCombatantFromEnemy(
    scaleEnemy(enemiesById["ancient-stone-guardian"], 1, 1),
    "solo-guardian",
    runeInvestigated
      ? [{ statusId: "exposed-rune", remainingTurns: 3, stacks: 1, sourceCombatantId: player.id }]
      : [],
  );
  let state = createCombatState("stone-guardian-boss", [player, guardian], seed);
  let potionAvailable = true;

  for (let step = 0; state.phase === "active" && step < 120; step += 1) {
    const actorId = state.turnOrder[state.activeTurnIndex];
    const actor = state.combatants[actorId];
    let action: CombatAction | null;
    if (actor.kind === "enemy") {
      action = chooseEnemyAction(state, actor.id, combatRules);
    } else {
      const currentGuardian = state.combatants[guardian.id];
      const telegraphed = currentGuardian.statuses.some((status) => status.statusId === "telegraphed");
      if (potionAvailable && actor.currentHealth <= 12) {
        state = {
          ...state,
          combatants: {
            ...state.combatants,
            [actor.id]: { ...actor, currentHealth: Math.min(actor.maximumHealth, actor.currentHealth + 12) },
          },
        };
        potionAvailable = false;
      }
      const decisiveReady = actor.currentResource >= abilitiesById["fighter-decisive-blow"].cost
        && (actor.cooldowns["fighter-decisive-blow"] ?? 0) === 0;
      action = !potionAvailable && state.combatants[actor.id].currentHealth !== actor.currentHealth
        ? { kind: "defend" }
        : telegraphed
        ? { kind: "defend" }
        : decisiveReady
          ? { kind: "ability", abilityId: "fighter-decisive-blow", targetIds: [guardian.id] }
          : { kind: "ability", abilityId: "fighter-sword-strike", targetIds: [guardian.id] };
    }
    if (!action) break;
    const result = submitCombatAction(state, actor.id, action, `simulation-${seed}-${step}`, combatRules);
    if (!result.ok) throw new Error(`Simulation command rejected: ${result.message}`);
    state = result.state;
  }
  return state.phase;
}

describe("חישובי קרב", () => {
  it("שריון מפחית נזק אך אינו מאפס פגיעה חיובית", () => {
    expect(calculateArmorMitigation(20, 0)).toBe(20);
    expect(calculateArmorMitigation(20, 15)).toBeLessThan(20);
    expect(calculateArmorMitigation(1, 99)).toBe(1);
  });

  it("ריפוי נעצר במקסימום החיים", () => {
    const wounded = makeCombatant({ currentHealth: 27, maximumHealth: 30 });
    const result = healCombatant(wounded, 12);
    expect(result.combatant.currentHealth).toBe(30);
    expect(result.healed).toBe(3);
  });

  it("זמני המתנה פוחתים ונמחקים כשהם מסתיימים", () => {
    expect(tickCooldowns({ first: 3, second: 1 })).toEqual({ first: 2 });
  });

  it("מצב מתמשך גורם נזק, מפחית משך ומכבד ערימות", () => {
    const burning = makeCombatant({
      currentHealth: 20,
      statuses: [{ statusId: "burning", remainingTurns: 2, stacks: 2, sourceCombatantId: "mage" }],
    });
    const result = processTurnStartStatuses(burning, statusesById);
    expect(result.damage).toBe(4);
    expect(result.combatant.currentHealth).toBe(16);
    expect(result.combatant.statuses[0].remainingTurns).toBe(1);
  });

  it("קנה המידה של הבוס גדל באופן מונוטוני עם גודל החבורה", () => {
    const solo = bossScaling(1, 1);
    const party = bossScaling(4, 1);
    expect(party.healthMultiplier).toBeGreaterThan(solo.healthMultiplier);
    expect(party.guardPoints).toBeGreaterThan(solo.guardPoints);
  });

  it("מגדיל את חיי שומר האבן לחבורה בלי לשנות את הגדרת המקור", () => {
    const guardian = enemiesById["ancient-stone-guardian"];
    const scaled = scaleEnemy(guardian, 3, 2);
    expect(scaled.maximumHealth).toBeGreaterThan(guardian.maximumHealth);
    expect(guardian.maximumHealth).toBe(BALANCE.bossBaseHealth);
    expect(guardian.maximumHealth).toBe(62);
    expect(guardian.armor).toBe(BALANCE.bossBaseArmor);
  });

  it("שומר על קנה מידה סביר גם לחבורה מלאה", () => {
    const guardian = enemiesById["ancient-stone-guardian"];
    const fullParty = scaleEnemy(guardian, 4, 1);
    expect(fullParty.maximumHealth).toBe(155);
    expect(fullParty.maximumHealth / 4).toBeLessThan(guardian.maximumHealth);
    expect(fullParty.armor).toBeLessThanOrEqual(guardian.armor + 1);
    expect(fullParty.boss?.guardPoints).toBe(4);
  });

  it("מגננה ומשמר מפחיתים נזק נכנס בלי להחליש את נזק התוקף", () => {
    const attacker = makeCombatant({ id: "attacker", accuracy: 30 });
    const target = makeCombatant({
      id: "target",
      kind: "enemy",
      currentHealth: 100,
      maximumHealth: 100,
      armor: 10,
      abilityIds: ["enemy-corrupted-bite"],
    });
    const plainDamage = damageFromFirstMatchingHit(attacker, target, "fighter-sword-strike");
    const guardedTargetDamage = damageFromFirstMatchingHit(
      attacker,
      { ...target, statuses: [{ statusId: "guarded", remainingTurns: 2, stacks: 1, sourceCombatantId: target.id }] },
      "fighter-sword-strike",
    );
    const guardedAttackerDamage = damageFromFirstMatchingHit(
      { ...attacker, statuses: [{ statusId: "guarded", remainingTurns: 2, stacks: 1, sourceCombatantId: attacker.id }] },
      target,
      "fighter-sword-strike",
    );

    expect(guardedTargetDamage).toBeLessThan(plainDamage);
    expect(guardedAttackerDamage).toBe(plainDamage);
  });

  it("שבירת משמר חושפת את הרונה לשלושה תורות", () => {
    const attacker = makeCombatant({ id: "guard-breaker", accuracy: 30 });
    const guardian = makeCombatant({
      id: "guarded-guardian",
      kind: "enemy",
      currentHealth: 100,
      maximumHealth: 100,
      armor: 10,
      abilityIds: ["boss-stone-slam"],
      statuses: [{ statusId: "guarded", remainingTurns: 2, stacks: 1, sourceCombatantId: "self" }],
    });
    let exposedTurns = 0;
    for (let seed = 1; seed < 5_000 && exposedTurns === 0; seed += 1) {
      const state = createCombatState("guard-break", [attacker, guardian], seed);
      if (state.turnOrder[state.activeTurnIndex] !== attacker.id) continue;
      const result = submitCombatAction(
        state,
        attacker.id,
        { kind: "ability", abilityId: "fighter-decisive-blow", targetIds: [guardian.id] },
        `guard-break-${seed}`,
        combatRules,
      );
      if (!result.ok) continue;
      exposedTurns = result.state.combatants[guardian.id].statuses
        .find((status) => status.statusId === "exposed-rune")?.remainingTurns ?? 0;
    }
    expect(exposedTurns).toBe(3);
  });

  it("התכוננות מפחיתה לפחות בחצי את ריסוק הרונה", () => {
    const guardian = { ...createCombatantFromEnemy(enemiesById["ancient-stone-guardian"], "guardian"), accuracy: 30 };
    const target = makeCombatant({ id: "target", currentHealth: 100, maximumHealth: 100, armor: 12 });
    const unprotectedDamage = damageFromFirstMatchingHit(guardian, target, "boss-rune-crush");
    const defendedDamage = damageFromFirstMatchingHit(
      guardian,
      { ...target, statuses: [{ statusId: "defending", remainingTurns: 1, stacks: 1, sourceCombatantId: target.id }] },
      "boss-rune-crush",
    );

    expect(defendedDamage).toBeLessThanOrEqual(Math.ceil(unprotectedDamage / 2));
  });

  it("ריסוק הרונה נשאר בטווח הנזק המתוכנן ואינו מוחק דמות שהתגוננה", () => {
    const guardianDefinition = enemiesById["ancient-stone-guardian"];
    const runeCrush = abilitiesById["boss-rune-crush"];
    const formula = runeCrush.formula;
    expect(formula).toBeDefined();
    if (!formula) return;
    const strengthModifier = Math.floor((guardianDefinition.attributes.strength - 10) / 2);
    const averageRawDamage = formula.diceCount * ((formula.diceSides + 1) / 2) + formula.flatBonus + strengthModifier;
    expect(averageRawDamage).toBe(BALANCE.bossRuneCrushAverageRawDamage);
    expect(averageRawDamage).toBeGreaterThanOrEqual(14);
    expect(averageRawDamage).toBeLessThanOrEqual(17);

    const guardian = { ...createCombatantFromEnemy(guardianDefinition, "guardian"), accuracy: 30 };
    for (let seed = 1; seed <= 1_000; seed += 1) {
      const target = makeCombatant({
        id: `fragile-target-${seed}`,
        currentHealth: 21,
        maximumHealth: 21,
        armor: 13,
        statuses: [{ statusId: "defending", remainingTurns: 1, stacks: 1, sourceCombatantId: "self" }],
      });
      const state = createCombatState("rune-crush-survival", [guardian, target], seed);
      if (state.turnOrder[state.activeTurnIndex] !== guardian.id) continue;
      const result = submitCombatAction(
        state,
        guardian.id,
        { kind: "ability", abilityId: "boss-rune-crush", targetIds: [target.id] },
        `survival-${seed}`,
        combatRules,
      );
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.state.combatants[target.id].currentHealth).toBeGreaterThan(0);
    }
  });

  it("לוחם יחיד מנצח ברוב זרעי הסימולציה כשהוא מגיב לאזהרת הבוס", () => {
    const sampleSize = 300;
    const victories = Array.from({ length: sampleSize }, (_, index) => simulateSoloGuardian(index + 1))
      .filter((phase) => phase === "victory").length;
    expect(victories / sampleSize).toBeGreaterThanOrEqual(0.6);
  });

  it("חקירת הרונה משפרת באופן מדיד את סיכויי הניצחון", () => {
    const sampleSize = 300;
    const baselineVictories = Array.from({ length: sampleSize }, (_, index) => simulateSoloGuardian(index + 1))
      .filter((phase) => phase === "victory").length;
    const investigatedVictories = Array.from({ length: sampleSize }, (_, index) => simulateSoloGuardian(index + 1, true))
      .filter((phase) => phase === "victory").length;
    expect(investigatedVictories).toBeGreaterThan(baselineVictories);
    expect(investigatedVictories / sampleSize).toBeGreaterThanOrEqual(0.7);
  });
});

describe("מנוע תורות", () => {
  it("יוצר סדר יוזמה דטרמיניסטי", () => {
    const player = makeCombatant();
    const enemy = makeCombatant({ id: "enemy-one", kind: "enemy", name: "שרץ", abilityIds: ["enemy-corrupted-bite"] });
    expect(createCombatState("encounter", [player, enemy], 1234).turnOrder).toEqual(
      createCombatState("encounter", [player, enemy], 1234).turnOrder,
    );
  });

  it("מבצע פעולה בתור ודוחה שידור כפול של אותו מזהה", () => {
    const player = makeCombatant({ accuracy: 20 });
    const enemy = makeCombatant({
      id: "enemy-one",
      kind: "enemy",
      name: "שרץ",
      armor: 8,
      currentHealth: 20,
      maximumHealth: 20,
      abilityIds: ["enemy-corrupted-bite"],
    });
    const rules = { abilities: abilitiesById, statuses: statusesById };
    let accepted: ReturnType<typeof submitCombatAction> | undefined;

    for (let seed = 1; seed < 2_000; seed += 1) {
      const state = createCombatState("tutorial", [player, enemy], seed);
      if (state.turnOrder[state.activeTurnIndex] !== player.id) continue;
      const result = submitCombatAction(
        state,
        player.id,
        { kind: "ability", abilityId: "fighter-sword-strike", targetIds: [enemy.id] },
        "command-one",
        rules,
      );
      if (result.ok && result.state.combatants[enemy.id].currentHealth < enemy.currentHealth) {
        accepted = result;
        break;
      }
    }
    expect(accepted?.ok).toBe(true);
    if (!accepted?.ok) return;
    const duplicate = submitCombatAction(
      accepted.state,
      player.id,
      { kind: "ability", abilityId: "fighter-sword-strike", targetIds: [enemy.id] },
      "command-one",
      rules,
    );
    expect(duplicate).toMatchObject({ ok: false, code: "DUPLICATE" });
  });

  it("שומר אפקט עצמי של יכולת לאחר חיוב המשאב", () => {
    const player = makeCombatant({ initiativeBonus: 20 });
    const enemy = makeCombatant({ id: "enemy-one", kind: "enemy", name: "שרץ", initiativeBonus: -10 });
    const state = createCombatState("tutorial", [player, enemy], 77);
    const result = submitCombatAction(
      state,
      player.id,
      { kind: "ability", abilityId: "fighter-shield-stance", targetIds: [player.id] },
      "shield-command",
      { abilities: abilitiesById, statuses: statusesById },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.combatants[player.id].statuses.some((status) => status.statusId === "guarded")).toBe(true);
    expect(result.state.combatants[player.id].currentResource).toBe(player.currentResource - 2);
  });

  it("התגוננות משיבה נקודת משאב ומכינה את הדמות לפגיעה הבאה", () => {
    const player = makeCombatant({ currentResource: 3, maximumResource: 8, initiativeBonus: 20 });
    const enemy = makeCombatant({ id: "enemy-one", kind: "enemy", initiativeBonus: -10 });
    const state = createCombatState("defend", [player, enemy], 77);
    const result = submitCombatAction(state, player.id, { kind: "defend" }, "defend-command", combatRules);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.combatants[player.id].currentResource).toBe(3 + BALANCE.defendResourceRecovery);
    expect(result.state.combatants[player.id].statuses.some((status) => status.statusId === "defending")).toBe(true);
  });

  it("מכת פתע זמינה לנוכל יחיד גם ללא סייר שמסמן את המטרה", () => {
    const rogue = makeCombatant({
      id: "solo-rogue",
      abilityIds: ["rogue-quick-stab", "rogue-sneak-attack", "rogue-vanish"],
      currentResource: 9,
      maximumResource: 9,
      initiativeBonus: 20,
    });
    const enemy = makeCombatant({ id: "enemy-one", kind: "enemy", currentHealth: 60, maximumHealth: 60, initiativeBonus: -10 });
    const state = createCombatState("solo-rogue", [rogue, enemy], 91);
    const result = submitCombatAction(
      state,
      rogue.id,
      { kind: "ability", abilityId: "rogue-sneak-attack", targetIds: [enemy.id] },
      "solo-sneak-attack",
      combatRules,
    );
    expect(result.ok).toBe(true);
  });

  it("צו מלכותי מחליש את כל האויבים בפעולה אחת", () => {
    const king = makeCombatant({
      id: "king-one",
      name: "המלך",
      resourceType: "authority",
      maximumResource: 10,
      currentResource: 10,
      initiativeBonus: 30,
      abilityIds: ["king-crown-shard-strike", "king-royal-decree", "king-sovereign-aegis"],
    });
    const firstEnemy = makeCombatant({ id: "enemy-one", kind: "enemy", name: "שרץ ראשון", initiativeBonus: -20 });
    const secondEnemy = makeCombatant({ id: "enemy-two", kind: "enemy", name: "שרץ שני", initiativeBonus: -20 });
    const state = createCombatState("royal-test", [king, firstEnemy, secondEnemy], 91);
    const result = submitCombatAction(
      state,
      king.id,
      { kind: "ability", abilityId: "king-royal-decree", targetIds: [firstEnemy.id, secondEnemy.id] },
      "royal-command",
      { abilities: abilitiesById, statuses: statusesById },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.combatants[firstEnemy.id].statuses.some((status) => status.statusId === "frightened")).toBe(true);
    expect(result.state.combatants[secondEnemy.id].statuses.some((status) => status.statusId === "frightened")).toBe(true);
    expect(result.state.combatants[king.id].currentResource).toBe(7);
  });

  it("הבוס מסמן מכה כבדה לפני שחרורה", () => {
    const player = makeCombatant();
    const boss = makeCombatant({
      id: "guardian",
      kind: "enemy",
      name: "שומר האבן העתיק",
      abilityIds: ["boss-defensive-stance", "boss-stone-slam", "boss-telegraph-crush", "boss-rune-crush"],
      maximumResource: 0,
      currentResource: 0,
    });
    const state = { ...createCombatState("boss", [player, boss], 99), round: 3 };
    expect(chooseEnemyAction(state, boss.id, { abilities: abilitiesById, statuses: statusesById })).toMatchObject({
      kind: "ability",
      abilityId: "boss-telegraph-crush",
    });
  });
});
