// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CombatUI, type CombatUIProps } from "../../src/components/combat";
import { abilitiesById, itemsById, statusesById } from "../../src/content";
import type { CharacterId, CombatState, Combatant } from "../../src/types/game";

beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }
});

const attributes = {
  strength: 15,
  dexterity: 12,
  constitution: 14,
  intelligence: 10,
  wisdom: 10,
  charisma: 8,
} as const;

const player: Combatant = {
  id: "player-one",
  kind: "player",
  name: "נעמה",
  characterId: "character-one" as CharacterId,
  level: 1,
  attributes,
  maximumHealth: 30,
  currentHealth: 24,
  armor: 13,
  accuracy: 5,
  initiativeBonus: 1,
  resourceType: "stamina",
  maximumResource: 8,
  currentResource: 6,
  abilityIds: ["fighter-sword-strike", "fighter-shield-stance", "fighter-decisive-blow"],
  cooldowns: {},
  statuses: [],
  defeated: false,
};

const rat: Combatant = {
  id: "enemy-rat",
  kind: "enemy",
  name: "עכברוש מערות מושחת",
  enemyId: "corrupted-cave-rat",
  level: 1,
  attributes: { ...attributes, strength: 8, dexterity: 14 },
  maximumHealth: 18,
  currentHealth: 14,
  armor: 11,
  accuracy: 3,
  initiativeBonus: 2,
  maximumResource: 0,
  currentResource: 0,
  abilityIds: ["enemy-corrupted-bite"],
  cooldowns: {},
  statuses: [],
  defeated: false,
};

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    encounterId: "tutorial-rat",
    round: 1,
    turnOrder: [player.id, rat.id],
    activeTurnIndex: 0,
    combatants: { [player.id]: player, [rat.id]: rat },
    phase: "active",
    log: [
      { sequence: 1, kind: "turn-started", combatantId: player.id, text: "התור של נעמה." },
    ],
    seed: 42,
    nextEventSequence: 2,
    processedCommandIds: [],
    ...overrides,
  };
}

function makeProps(overrides: Partial<CombatUIProps> = {}): CombatUIProps {
  return {
    state: makeState(),
    playerCombatantId: player.id,
    abilities: abilitiesById,
    items: [{ entryId: "potion-entry", item: itemsById["minor-healing-potion"], quantity: 2 }],
    statusDefinitions: statusesById,
    enemyIntents: { [rat.id]: { label: "מתכונן לזנק ולנשוך", severity: "danger" } },
    selectedTargetId: rat.id,
    objective: "הבס את היצור המושחת ולמד להשתמש ביכולות.",
    tutorialHints: ["בחר יכולת התקפית.", "אפשר להתגונן לפני זינוק."],
    busy: false,
    reducedMotion: true,
    onAbility: vi.fn(),
    onTarget: vi.fn(),
    onDefend: vi.fn(),
    onConsumable: vi.fn(),
    onEscape: vi.fn(),
    onRetry: vi.fn(),
    onContinue: vi.fn(),
    ...overrides,
  };
}

describe("ממשק הקרב", () => {
  it("משתלט מיד על כל חלון המשחק, נועל גלילת רקע ומשאיר את הפעולות באזור תחתון קבוע", () => {
    const previousOverflow = document.body.style.overflow;
    const { unmount } = render(createElement(CombatUI, makeProps()));

    const combatScreen = screen.getByTestId("combat-screen");
    expect(combatScreen).toHaveClass("fixed", "inset-0", "h-dvh", "overflow-hidden");
    expect(combatScreen).toHaveAttribute("data-locks-exploration", "true");
    expect(combatScreen).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    const actionRegion = screen.getByTestId("combat-action-region");
    expect(actionRegion).toHaveClass("shrink-0", "overflow-hidden");
    expect(screen.getByTestId("combat-battlefield-scroll-region")).toHaveClass("overflow-hidden");
    expect(screen.getByTestId("combat-battlefield-scroll-region")).not.toHaveClass("overflow-y-auto");

    unmount();
    expect(document.body.style.overflow).toBe(previousOverflow);
  });

  it("מציג סדר תורות, מדדים, מטרה, כוונת אויב, רמזים ושלוש יכולות", () => {
    render(createElement(CombatUI, makeProps()));

    expect(screen.getByRole("main", { name: "זירת הקרב" })).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "סדר התורות" })).toBeInTheDocument();
    expect(screen.getByText("הבס את היצור המושחת ולמד להשתמש ביכולות.")).toBeInTheDocument();
    expect(screen.getByText("מתכונן לזנק ולנשוך")).toBeInTheDocument();
    expect(screen.getByText("בחר יכולת התקפית.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /מכת חרב/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /עמידת מגן/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /מכה מכרעת/ })).toBeEnabled();
    expect(screen.getAllByRole("progressbar").length).toBeGreaterThanOrEqual(4);
  });

  it("מציג לכל יכולת איור מקורי מקומי במקום סמל כללי", () => {
    render(createElement(CombatUI, makeProps()));

    const swordArtwork = screen.getByRole("button", { name: /מכת חרב/ }).querySelector("img");
    const shieldArtwork = screen.getByRole("button", { name: /עמידת מגן/ }).querySelector("img");
    expect(swordArtwork?.getAttribute("src")).toContain("ability-sword-strike");
    expect(shieldArtwork?.getAttribute("src")).toContain("ability-shield-stance");
  });

  it("מציג משוב חזותי מיידי לנזק שמגיע ממנוע הקרב", async () => {
    const state = makeState({
      log: [
        { sequence: 1, kind: "turn-started", combatantId: player.id, text: "התור של נעמה." },
        { sequence: 2, kind: "damage", sourceId: player.id, targetId: rat.id, amount: 7, critical: false, text: "פגיעה." },
      ],
      nextEventSequence: 3,
    });
    render(createElement(CombatUI, makeProps({ state })));

    expect(await screen.findByTestId("combat-event-fx")).toHaveTextContent("-7");
  });

  it("מנקה אפקט קרב ישן כאשר יומן המפגש מתאפס", async () => {
    const damageState = makeState({
      log: [
        { sequence: 1, kind: "turn-started", combatantId: player.id, text: "התור של נעמה." },
        { sequence: 2, kind: "damage", sourceId: player.id, targetId: rat.id, amount: 7, critical: false, text: "פגיעה." },
      ],
      nextEventSequence: 3,
    });
    const { rerender } = render(createElement(CombatUI, makeProps({ state: damageState })));

    expect(await screen.findByTestId("combat-event-fx")).toBeInTheDocument();
    rerender(createElement(CombatUI, makeProps({ state: makeState() })));

    await waitFor(() => expect(screen.queryByTestId("combat-event-fx")).not.toBeInTheDocument());
  });

  it("מדווח על בחירת מטרה", async () => {
    const user = userEvent.setup();
    const onTarget = vi.fn();
    render(createElement(CombatUI, makeProps({ selectedTargetId: null, onTarget })));

    await user.click(screen.getByRole("button", { name: /עכברוש מערות מושחת/ }));
    expect(onTarget).toHaveBeenCalledWith(rat.id);
  });

  it("שולח יכולת עם המטרה שנבחרה", async () => {
    const user = userEvent.setup();
    const onAbility = vi.fn();
    render(createElement(CombatUI, makeProps({ onAbility })));

    await user.click(screen.getByRole("button", { name: /מכת חרב/ }));
    expect(onAbility).toHaveBeenCalledWith("fighter-sword-strike", [rat.id]);
  });

  it("מפעיל התגוננות, שיקוי ונסיגה באמצעות callbacks נפרדים", async () => {
    const user = userEvent.setup();
    const onDefend = vi.fn();
    const onConsumable = vi.fn();
    const onEscape = vi.fn();
    render(createElement(CombatUI, makeProps({ onDefend, onConsumable, onEscape })));

    await user.click(screen.getByRole("button", { name: "התגוננות" }));
    await user.click(screen.getByRole("button", { name: /שיקוי חיים קטן/ }));
    await user.click(screen.getByRole("button", { name: "נסיגה" }));

    expect(onDefend).toHaveBeenCalledOnce();
    expect(onConsumable).toHaveBeenCalledWith("potion-entry", player.id);
    expect(onEscape).toHaveBeenCalledOnce();
  });

  it("נועל פעולות כאשר התור שייך לאויב", () => {
    const state = makeState({ activeTurnIndex: 1 });
    render(createElement(CombatUI, makeProps({ state })));

    expect(screen.getByRole("button", { name: /מכת חרב/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "התגוננות" })).toBeDisabled();
    expect(screen.getByText("ממתינים לתור שלך")).toBeInTheDocument();
  });

  it("מסביר טלגרף, משמר ורונה חשופה בקרב הבוס", () => {
    const guardian: Combatant = {
      ...rat,
      id: "guardian",
      name: "שומר האבן העתיק",
      enemyId: "ancient-stone-guardian",
      maximumHealth: 82,
      currentHealth: 60,
      armor: 18,
      statuses: [
        { statusId: "telegraphed", remainingTurns: 1, stacks: 1, sourceCombatantId: "guardian" },
        { statusId: "guarded", remainingTurns: 2, stacks: 1, sourceCombatantId: "guardian" },
        { statusId: "exposed-rune", remainingTurns: 2, stacks: 1, sourceCombatantId: player.id },
      ],
    };
    const state = makeState({
      encounterId: "stone-guardian-boss",
      turnOrder: [player.id, guardian.id],
      combatants: { [player.id]: player, [guardian.id]: guardian },
    });
    render(createElement(CombatUI, makeProps({ state, selectedTargetId: guardian.id, enemyIntents: { [guardian.id]: { label: "מכין ריסוק רוני", severity: "critical" } } })));

    expect(screen.getAllByText(/מכת חורבן מתקרבת/).length).toBeGreaterThan(0);
    expect(screen.getByText(/משמר האבן פעיל/)).toBeInTheDocument();
    expect(screen.getByText(/הרונה חשופה/)).toBeInTheDocument();
  });

  it("מציג מסך ניצחון וממשיך לקבלת תגמולים", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(createElement(CombatUI, makeProps({ state: makeState({ phase: "victory" }), onContinue })));

    expect(screen.getByRole("heading", { name: "ניצחון" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /קבלת התגמולים והמשך/ }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("מציג תבוסה ומאפשר ניסיון נוסף מן המחסום", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(createElement(CombatUI, makeProps({ state: makeState({ phase: "defeat" }), onRetry })));

    expect(screen.getByRole("heading", { name: "החבורה הובסה" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /ניסיון נוסף מן המחסום/ }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
