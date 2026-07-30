import type { ui } from "@/lib/i18n";

export type GamePanel = keyof typeof ui.panels;
export type Rarity = keyof typeof ui.rarities;
export type EquipmentSlot = keyof typeof ui.inventory.slots;

export type InventoryItem = (typeof ui.inventory.items)[number];

export type EquippedItems = Partial<Record<EquipmentSlot, string>>;

export type MenuDialog = "settings" | "achievements" | "online" | "exit";

export type SettingsState = {
  music: number;
  effects: number;
  largeText: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
};

export type GameSnapshot = {
  enemyHealth: number;
  playerHealth: number;
  mana: number;
  stamina: number;
  equipped: EquippedItems;
};
