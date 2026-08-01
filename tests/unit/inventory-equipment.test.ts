import { describe, expect, it } from "vitest";
import { itemsById } from "../../src/content";
import {
  addItem,
  dropItem,
  equipItem,
  equipmentStatBonuses,
  useItem,
} from "../../src/game/inventory";
import type { InventoryEntry } from "../../src/types/game";
import { now } from "./fixtures";

const entry = (id: string, itemId: string, quantity = 1): InventoryEntry => ({
  id,
  itemId,
  quantity,
  durability: null,
  customData: {},
  acquiredAt: now,
});

describe("מלאי ושימוש בחפצים", () => {
  it("מערים פריטים עד מגבלת הערימה ויוצר ערימה נוספת", () => {
    const potion = itemsById["minor-healing-potion"];
    let counter = 0;
    const result = addItem([entry("p1", potion.id, 4)], potion, 3, now, () => `new-${++counter}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((candidate) => candidate.quantity)).toEqual([5, 2]);
  });

  it("מרפא עד התקרה וצורך יחידה אחת", () => {
    const potion = itemsById["minor-healing-potion"];
    const result = useItem(
      {
        inventory: [entry("p1", potion.id, 2)],
        currentHealth: 25,
        maximumHealth: 30,
        currentResource: 4,
        maximumResource: 8,
      },
      "p1",
      potion,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentHealth).toBe(30);
    expect(result.value.healthRestored).toBe(5);
    expect(result.value.inventory[0].quantity).toBe(1);
  });

  it("מונע השלכת חפץ משימה", () => {
    const shard = itemsById["first-crown-shard"];
    const result = dropItem([entry("shard", shard.id)], "shard", shard, 1, true);
    expect(result).toMatchObject({ ok: false, code: "QUEST_ITEM" });
  });

  it("דורש אישור לפני השלכת פריט נדיר", () => {
    const hammer = itemsById["rune-breaker-hammer"];
    const result = dropItem([entry("hammer", hammer.id)], "hammer", hammer, 1, false);
    expect(result).toMatchObject({ ok: false, code: "CONFIRMATION_REQUIRED" });
  });
});

describe("ציוד והגבלות", () => {
  it("דוחה ציוד שמוגבל למקצוע אחר", () => {
    const inventory = [entry("staff", "ashwood-staff")];
    const result = equipItem(
      { classId: "fighter", raceId: "human", level: 1, inventory, equipment: {}, itemsById },
      "staff",
    );
    expect(result).toMatchObject({ ok: false, code: "CLASS_RESTRICTED" });
  });

  it("מונע יד משנית כאשר נשק דו־ידני מצויד", () => {
    const shield = {
      ...itemsById["chain-shirt"],
      id: "wooden-shield",
      name: "מגן עץ",
      category: "armor" as const,
      equipmentSlot: "offhand" as const,
      allowedClasses: ["barbarian" as const],
    };
    const localItems = { ...itemsById, [shield.id]: shield };
    const inventory = [entry("axe", "two-handed-axe"), entry("shield", shield.id)];
    const result = equipItem(
      {
        classId: "barbarian",
        raceId: "orc",
        level: 1,
        inventory,
        equipment: { weapon: "axe" },
        itemsById: localItems,
      },
      "shield",
    );
    expect(result).toMatchObject({ ok: false, code: "TWO_HANDED_CONFLICT" });
  });

  it("מחיל תוספי שריון ונתונים מיד עם ציוד", () => {
    const inventory = [entry("armor", "chain-shirt"), entry("sword", "iron-longsword")];
    const bonuses = equipmentStatBonuses(
      { armor: "armor", weapon: "sword" },
      inventory,
      itemsById,
    );
    expect(bonuses.armor).toBe(3);
    expect(bonuses.accuracy).toBe(1);
  });
});
