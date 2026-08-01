import type {
  ClassId,
  Equipment,
  EquipmentSlot,
  InventoryEntry,
  Item,
  PlayerCharacter,
  RaceId,
} from "../../types/game";

export type InventoryErrorCode =
  | "ITEM_NOT_FOUND"
  | "ENTRY_NOT_FOUND"
  | "INVALID_QUANTITY"
  | "STACK_LIMIT"
  | "QUEST_ITEM"
  | "CONFIRMATION_REQUIRED"
  | "NOT_USABLE"
  | "CLASS_RESTRICTED"
  | "RACE_RESTRICTED"
  | "LEVEL_RESTRICTED"
  | "INVALID_SLOT"
  | "TWO_HANDED_CONFLICT"
  | "UNIQUE_CONFLICT";

export type InventoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: InventoryErrorCode; message: string };

export function addItem(
  inventory: readonly InventoryEntry[],
  item: Item,
  quantity: number,
  acquiredAt: string,
  idFactory: () => string,
): InventoryResult<InventoryEntry[]> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, code: "INVALID_QUANTITY", message: "כמות הפריט אינה תקינה." };
  }
  if (item.unique && inventory.some((entry) => entry.itemId === item.id)) {
    return { ok: false, code: "UNIQUE_CONFLICT", message: "כבר יש ברשותך עותק של הפריט הייחודי הזה." };
  }

  const next = inventory.map((entry) => ({ ...entry, customData: { ...entry.customData } }));
  let remaining = quantity;
  for (const entry of next) {
    if (entry.itemId !== item.id || entry.quantity >= item.stackLimit || item.unique) continue;
    const added = Math.min(remaining, item.stackLimit - entry.quantity);
    entry.quantity += added;
    remaining -= added;
    if (remaining === 0) return { ok: true, value: next };
  }

  while (remaining > 0) {
    const stackQuantity = Math.min(remaining, item.stackLimit);
    next.push({
      id: idFactory(),
      itemId: item.id,
      quantity: stackQuantity,
      durability: item.category === "weapon" || item.category === "armor" ? 100 : null,
      customData: {},
      acquiredAt,
    });
    remaining -= stackQuantity;
  }
  return { ok: true, value: next };
}

export function removeItem(
  inventory: readonly InventoryEntry[],
  entryId: string,
  quantity: number,
): InventoryResult<InventoryEntry[]> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, code: "INVALID_QUANTITY", message: "כמות הפריט אינה תקינה." };
  }
  const entry = inventory.find((candidate) => candidate.id === entryId);
  if (!entry) return { ok: false, code: "ENTRY_NOT_FOUND", message: "הפריט אינו נמצא בתיק." };
  if (entry.quantity < quantity) {
    return { ok: false, code: "INVALID_QUANTITY", message: "אין בתיק כמות מספקת מן הפריט." };
  }
  return {
    ok: true,
    value: inventory
      .map((candidate) => (candidate.id === entryId ? { ...candidate, quantity: candidate.quantity - quantity } : { ...candidate }))
      .filter((candidate) => candidate.quantity > 0),
  };
}

export function dropItem(
  inventory: readonly InventoryEntry[],
  entryId: string,
  item: Item,
  quantity: number,
  confirmedRareDrop: boolean,
): InventoryResult<InventoryEntry[]> {
  if (item.questItem) {
    return { ok: false, code: "QUEST_ITEM", message: "אי אפשר להשליך חפץ משימה." };
  }
  if (["rare", "epic", "legendary", "mythic"].includes(item.rarity) && !confirmedRareDrop) {
    return { ok: false, code: "CONFIRMATION_REQUIRED", message: "השלכת פריט נדיר דורשת אישור." };
  }
  return removeItem(inventory, entryId, quantity);
}

export interface ItemUseState {
  inventory: InventoryEntry[];
  currentHealth: number;
  maximumHealth: number;
  currentResource: number;
  maximumResource: number;
}

export function useItem(
  state: ItemUseState,
  entryId: string,
  item: Item,
): InventoryResult<ItemUseState & { healthRestored: number; resourceRestored: number }> {
  const entry = state.inventory.find((candidate) => candidate.id === entryId && candidate.itemId === item.id);
  if (!entry) return { ok: false, code: "ENTRY_NOT_FOUND", message: "הפריט אינו נמצא בתיק." };
  if (!item.usable) return { ok: false, code: "NOT_USABLE", message: "אי אפשר להשתמש בפריט הזה כעת." };

  const nextHealth = Math.min(state.maximumHealth, state.currentHealth + (item.healAmount ?? 0));
  const nextResource = Math.min(state.maximumResource, state.currentResource + (item.resourceAmount ?? 0));
  const removed = item.consumable ? removeItem(state.inventory, entryId, 1) : { ok: true as const, value: [...state.inventory] };
  if (!removed.ok) return removed;
  return {
    ok: true,
    value: {
      ...state,
      inventory: removed.value,
      currentHealth: nextHealth,
      currentResource: nextResource,
      healthRestored: nextHealth - state.currentHealth,
      resourceRestored: nextResource - state.currentResource,
    },
  };
}

export interface EquipmentContext {
  classId: ClassId;
  raceId: RaceId;
  level: number;
  inventory: readonly InventoryEntry[];
  equipment: Equipment;
  itemsById: Readonly<Record<string, Item>>;
}

function validateRestrictions(item: Item, context: EquipmentContext): InventoryResult<true> {
  if (item.allowedClasses && !item.allowedClasses.includes(context.classId)) {
    return { ok: false, code: "CLASS_RESTRICTED", message: "המקצוע שלך אינו יכול לצייד את הפריט הזה." };
  }
  if (item.allowedRaces && !item.allowedRaces.includes(context.raceId)) {
    return { ok: false, code: "RACE_RESTRICTED", message: "הגזע שלך אינו יכול לצייד את הפריט הזה." };
  }
  if ((item.minimumLevel ?? 1) > context.level) {
    return { ok: false, code: "LEVEL_RESTRICTED", message: `הפריט דורש דרגה ${item.minimumLevel}.` };
  }
  return { ok: true, value: true };
}

export function equipItem(
  context: EquipmentContext,
  entryId: string,
  requestedSlot?: EquipmentSlot,
): InventoryResult<Equipment> {
  const entry = context.inventory.find((candidate) => candidate.id === entryId);
  if (!entry) return { ok: false, code: "ENTRY_NOT_FOUND", message: "הפריט אינו נמצא בתיק." };
  const item = context.itemsById[entry.itemId];
  if (!item) return { ok: false, code: "ITEM_NOT_FOUND", message: "פרטי הפריט אינם זמינים." };
  const slot = requestedSlot ?? item.equipmentSlot;
  if (!slot || slot !== item.equipmentSlot) {
    return { ok: false, code: "INVALID_SLOT", message: "הפריט אינו מתאים למשבצת שנבחרה." };
  }
  const restrictions = validateRestrictions(item, context);
  if (!restrictions.ok) return restrictions;

  if (Object.values(context.equipment).includes(entryId)) {
    return { ok: false, code: "UNIQUE_CONFLICT", message: "הפריט כבר מצויד." };
  }
  if (slot === "weapon" && item.twoHanded && context.equipment.offhand) {
    return { ok: false, code: "TWO_HANDED_CONFLICT", message: "נשק דו־ידני דורש יד משנית פנויה." };
  }
  if (slot === "offhand" && context.equipment.weapon) {
    const weaponEntry = context.inventory.find((candidate) => candidate.id === context.equipment.weapon);
    const weapon = weaponEntry ? context.itemsById[weaponEntry.itemId] : undefined;
    if (weapon?.twoHanded) {
      return { ok: false, code: "TWO_HANDED_CONFLICT", message: "אי אפשר לצייד יד משנית לצד נשק דו־ידני." };
    }
  }
  return { ok: true, value: { ...context.equipment, [slot]: entryId } };
}

export function unequipItem(equipment: Equipment, slot: EquipmentSlot): Equipment {
  const next = { ...equipment };
  delete next[slot];
  return next;
}

export function equipmentStatBonuses(
  equipment: Equipment,
  inventory: readonly InventoryEntry[],
  itemsById: Readonly<Record<string, Item>>,
): Record<string, number> {
  const bonuses: Record<string, number> = {};
  for (const entryId of Object.values(equipment)) {
    const entry = inventory.find((candidate) => candidate.id === entryId);
    const item = entry ? itemsById[entry.itemId] : undefined;
    if (!item) continue;
    if (item.armorValue) bonuses.armor = (bonuses.armor ?? 0) + item.armorValue;
    for (const modifier of item.statModifiers ?? []) {
      bonuses[modifier.stat] = (bonuses[modifier.stat] ?? 0) + modifier.amount;
    }
  }
  return bonuses;
}

export function applyEquipmentToCharacter(character: PlayerCharacter, bonuses: Record<string, number>): PlayerCharacter {
  return {
    ...character,
    derivedStats: {
      maximumHealth: character.derivedStats.maximumHealth + (bonuses.maximumHealth ?? 0),
      armor: character.derivedStats.armor + (bonuses.armor ?? 0),
      accuracy: character.derivedStats.accuracy + (bonuses.accuracy ?? 0),
      initiative: character.derivedStats.initiative + (bonuses.initiative ?? 0),
      maximumPrimaryResource:
        character.derivedStats.maximumPrimaryResource + (bonuses.maximumPrimaryResource ?? 0),
      carryCapacity: character.derivedStats.carryCapacity + (bonuses.carryCapacity ?? 0),
    },
  };
}
