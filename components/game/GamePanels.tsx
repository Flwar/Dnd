"use client";

import { ui } from "@/lib/i18n";
import type { EquipmentSlot, EquippedItems, GamePanel } from "@/types/game";
import { PanelWindow } from "./PanelWindow";
import { InventoryPanel } from "./panels/InventoryPanel";
import {
  JournalPanel,
  MapPanel,
  QuestsPanel,
} from "./panels/QuestJournalPanels";
import {
  CharacterPanel,
  ProfessionPanel,
  SkillsPanel,
  SpellsPanel,
} from "./panels/CharacterPanels";
import {
  CraftingPanel,
  DialoguePanel,
  PartyPanel,
  TradePanel,
} from "./panels/WorldPanels";

export function GamePanels({
  panel,
  onClose,
  equipped,
  onEquip,
  onUnequip,
}: {
  panel: GamePanel | null;
  onClose: () => void;
  equipped: EquippedItems;
  onEquip: (slot: EquipmentSlot, itemId: string) => void;
  onUnequip: (slot: EquipmentSlot) => void;
}) {
  const title = panel ? ui.panels[panel].title : ui.panels.inventory.title;
  const size =
    panel === "inventory" || panel === "map"
      ? "large"
      : panel === "dialogue"
        ? "medium"
        : "large";

  return (
    <PanelWindow open={panel !== null} title={title} onClose={onClose} size={size}>
      {panel === "inventory" ? (
        <InventoryPanel equipped={equipped} onEquip={onEquip} onUnequip={onUnequip} />
      ) : null}
      {panel === "character" ? <CharacterPanel /> : null}
      {panel === "skills" ? <SkillsPanel /> : null}
      {panel === "spells" ? <SpellsPanel /> : null}
      {panel === "profession" ? <ProfessionPanel /> : null}
      {panel === "party" ? <PartyPanel /> : null}
      {panel === "quests" ? <QuestsPanel /> : null}
      {panel === "journal" ? <JournalPanel /> : null}
      {panel === "trade" ? <TradePanel /> : null}
      {panel === "crafting" ? <CraftingPanel /> : null}
      {panel === "dialogue" ? <DialoguePanel /> : null}
      {panel === "map" ? <MapPanel /> : null}
    </PanelWindow>
  );
}
