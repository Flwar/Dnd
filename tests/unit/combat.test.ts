import { describe, expect, it } from "vitest";
import { abilitiesById, enemiesById, statusesById } from "../../src/content";
import {
  bossScaling,
  calculateArmorMitigation,
  chooseEnemyAction,
  createCombatState,
  healCombatant,
  processTurnStartStatuses,
  scaleEnemy,
  submitCombatAction,
  tickCooldowns,
} from "../../src/game/combat";
import { makeCombatant } from "./fixtures";

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
    expect(party.damageMultiplier).toBeGreaterThan(solo.damageMultiplier);
    expect(party.guardPoints).toBeGreaterThan(solo.guardPoints);
  });

  it("מגדיל את חיי שומר האבן לחבורה בלי לשנות את הגדרת המקור", () => {
    const guardian = enemiesById["ancient-stone-guardian"];
    const scaled = scaleEnemy(guardian, 3, 2);
    expect(scaled.maximumHealth).toBeGreaterThan(guardian.maximumHealth);
    expect(guardian.maximumHealth).toBe(82);
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
