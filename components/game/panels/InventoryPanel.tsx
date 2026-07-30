"use client";

import { Backpack, Check, Scale, Shield, Weight } from "lucide-react";
import { useMemo, useState, type DragEvent } from "react";
import { ui } from "@/lib/i18n";
import type {
  EquipmentSlot,
  EquippedItems,
  InventoryItem,
  Rarity,
} from "@/types/game";

const equipmentSlots = Object.keys(ui.inventory.slots) as EquipmentSlot[];

export function InventoryPanel({
  equipped,
  onEquip,
  onUnequip,
}: {
  equipped: EquippedItems;
  onEquip: (slot: EquipmentSlot, itemId: string) => void;
  onUnequip: (slot: EquipmentSlot) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const equippedIds = useMemo(() => new Set(Object.values(equipped)), [equipped]);
  const backpackItems = ui.inventory.items.filter((item) => !equippedIds.has(item.id));

  const getItem = (id: string) =>
    ui.inventory.items.find((candidate) => candidate.id === id);

  const equip = (slot: EquipmentSlot, itemId: string) => {
    const item = getItem(itemId);
    if (!item || item.slot !== slot) {
      setNotice(ui.inventory.invalidSlot);
      return;
    }
    onEquip(slot, itemId);
    setSelectedId(null);
    setNotice(ui.inventory.equippedNotice);
  };

  const readDraggedId = (event: DragEvent) =>
    event.dataTransfer.getData("text/plain");

  return (
    <div className="inventory-layout">
      <section className="equipment-column" aria-label={ui.inventory.equipment}>
        <div className="panel-section-heading">
          <Shield aria-hidden="true" />
          <div>
            <h3>{ui.inventory.equipment}</h3>
            <p>{ui.character.summary.defense}</p>
          </div>
        </div>
        <div className="equipment-silhouette" aria-hidden="true">
          <span className="silhouette-head" />
          <span className="silhouette-body" />
          <span className="silhouette-glow" />
        </div>
        <div className="equipment-slots">
          {equipmentSlots.map((slot) => {
            const itemId = equipped[slot];
            const item = itemId ? getItem(itemId) : undefined;
            return (
              <button
                type="button"
                key={slot}
                className={
                  item
                    ? `equipment-slot rarity-${item.rarity}`
                    : "equipment-slot is-empty"
                }
                onClick={() => {
                  if (selectedId) equip(slot, selectedId);
                  else if (item) onUnequip(slot);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  equip(slot, readDraggedId(event));
                }}
                draggable={Boolean(item)}
                onDragStart={(event) => {
                  if (item) event.dataTransfer.setData("text/plain", item.id);
                }}
                aria-label={`${ui.accessibility.equipmentSlot} · ${ui.inventory.slots[slot]} · ${item?.name ?? ui.inventory.empty}`}
              >
                <span className="slot-label">{ui.inventory.slots[slot]}</span>
                {item ? (
                  <>
                    <span className="item-symbol" aria-hidden="true">
                      {item.symbol}
                    </span>
                    <strong>{item.name}</strong>
                    <small>{ui.rarities[item.rarity].label}</small>
                  </>
                ) : (
                  <span className="empty-slot-copy">{ui.inventory.empty}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="backpack-column"
        aria-label={ui.inventory.backpack}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const id = readDraggedId(event);
          const pair = Object.entries(equipped).find(([, itemId]) => itemId === id);
          if (pair) onUnequip(pair[0] as EquipmentSlot);
        }}
      >
        <div className="panel-section-heading inventory-heading">
          <Backpack aria-hidden="true" />
          <div>
            <h3>{ui.inventory.backpack}</h3>
            <p>{ui.inventory.subtitle}</p>
          </div>
          <div className="inventory-metrics">
            <span>
              <Weight aria-hidden="true" />
              {ui.inventory.capacity}
            </span>
            <span>
              <Scale aria-hidden="true" />
              {ui.inventory.weight}
            </span>
          </div>
        </div>

        <div className="rarity-legend">
          {(Object.keys(ui.rarities) as Rarity[]).map((rarity) => (
            <span className={`rarity-${rarity}`} key={rarity}>
              <i>{ui.rarities[rarity].sigil}</i>
              {ui.rarities[rarity].label}
            </span>
          ))}
        </div>

        <div className="inventory-grid">
          {backpackItems.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              onSelect={() => {
                setSelectedId(item.id);
                setNotice(ui.inventory.selectedHint);
              }}
            />
          ))}
          {Array.from({ length: Math.max(0, 10 - backpackItems.length) }).map(
            (_, index) => (
              <div className="inventory-empty-cell" key={index} aria-hidden="true" />
            ),
          )}
        </div>
        <p className="inventory-notice" aria-live="polite">
          {notice ? <Check aria-hidden="true" /> : null}
          {notice}
        </p>
      </section>
    </div>
  );
}

function InventoryCard({
  item,
  selected,
  onSelect,
}: {
  item: InventoryItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)}
      onClick={onSelect}
      className={`inventory-card rarity-${item.rarity}${selected ? " is-selected" : ""}`}
      aria-label={`${ui.accessibility.dragItem} · ${item.name} · ${ui.rarities[item.rarity].label}`}
    >
      <span className="rarity-corner">{ui.rarities[item.rarity].sigil}</span>
      <span className="inventory-item-symbol" aria-hidden="true">
        {item.symbol}
      </span>
      <span className="inventory-item-copy">
        <strong>{item.name}</strong>
        <small>{ui.rarities[item.rarity].label}</small>
        <p>{item.description}</p>
        <b>{item.stat}</b>
      </span>
      {selected ? (
        <span className="selected-mark">
          <Check aria-hidden="true" />
          {ui.common.selected}
        </span>
      ) : null}
    </button>
  );
}
