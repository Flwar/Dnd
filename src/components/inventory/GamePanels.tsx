"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Backpack,
  BookOpenText,
  Check,
  CircleDot,
  Coins,
  Crown,
  FlaskConical,
  Gem,
  Hammer,
  MapPin,
  ScrollText,
  Shield,
  ShieldCheck,
  Shirt,
  Sparkles,
  Swords,
  Trash2,
  UserRound,
  WandSparkles,
  Weight,
  type LucideIcon,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GameButton } from "@/components/ui/GameButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { ArtDirectedPicture } from "@/components/ui/ArtDirectedPicture";
import { itemsById } from "@/content/items";
import { questsById } from "@/content/quests";
import { locationsById } from "@/content/locations";
import { npcs } from "@/content/npcs";
import { racesById } from "@/content/races";
import { classesById } from "@/content/classes";
import { backgroundsById } from "@/content/backgrounds";
import { getAllVisibleConsequences, type ConsequenceTone } from "@/content/consequences";
import { getAssetPath } from "@/lib/assets/manifest";
import type { GamePanel } from "@/store/game-store";
import type { EquipmentSlot, ItemCategory, ItemRarity, SaveData } from "@/types/game";

const panelTitles: Record<Exclude<GamePanel, null>, string> = {
  inventory: "התיק והציוד",
  character: "דף הדמות",
  quests: "יומן המשימות",
  map: "מפת ערפלון",
  journal: "רשומות ומערכות יחסים",
  settings: "הגדרות",
  merchant: "הציוד של מירה",
};

const categoryLabels: Record<ItemCategory | "all", string> = {
  all: "הכול",
  weapon: "נשק",
  armor: "שריון",
  potion: "שיקויים",
  tool: "כלים",
  quest: "חפצי משימה",
  material: "חומרים",
  treasure: "אוצרות",
};

const categoryIcons: Record<ItemCategory | "all", LucideIcon> = {
  all: Backpack,
  weapon: Swords,
  armor: Shirt,
  potion: FlaskConical,
  tool: Hammer,
  quest: ScrollText,
  material: CircleDot,
  treasure: Gem,
};

const rarityLabels: Record<ItemRarity, string> = {
  common: "רגיל",
  uncommon: "לא שכיח",
  rare: "נדיר",
  epic: "אפי",
  legendary: "אגדי",
  mythic: "מיתי",
};

const rarityTones: Record<ItemRarity, string> = {
  common: "border-white/15 bg-white/[.025] text-[#d0c8ba]",
  uncommon: "border-[#77b686]/45 bg-[#77b686]/[.06] text-[#9bd6a8]",
  rare: "border-[#62c6df]/50 bg-[#62c6df]/[.06] text-[#83d9eb]",
  epic: "border-[#ad7ae6]/50 bg-[#ad7ae6]/[.07] text-[#caa0f4]",
  legendary: "border-[#e2aa4d]/60 bg-[#e2aa4d]/[.07] text-[#f0cf82]",
  mythic: "border-[#d05b54]/65 bg-[#d05b54]/[.08] text-[#ff9b91]",
};

const rarityRank: Record<ItemRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
};

const slotLabels: Record<EquipmentSlot, string> = {
  weapon: "נשק",
  offhand: "יד משנית",
  armor: "שריון",
  helmet: "קסדה",
  gloves: "כפפות",
  boots: "מגפיים",
  ring: "טבעת",
  amulet: "קמע",
};

const attributeLabels = {
  strength: "כוח",
  dexterity: "זריזות",
  constitution: "חוסן",
  intelligence: "תבונה",
  wisdom: "חכמה",
  charisma: "כריזמה",
};

const derivedStatLabels: Record<string, string> = {
  maximumHealth: "חיים מרביים",
  armor: "שריון",
  accuracy: "דיוק",
  initiative: "יוזמה",
  maximumPrimaryResource: "משאב מרבי",
  carryCapacity: "כושר נשיאה",
};

const resourceLabels = {
  stamina: "סיבולת",
  mana: "מאנה",
  focus: "מיקוד",
  faith: "אמונה",
  rage: "זעם",
  authority: "סמכות",
};

const consequenceTones: Record<ConsequenceTone, string> = {
  benefit: "border-[#77b686]/40 bg-[linear-gradient(135deg,rgba(20,52,33,.78),rgba(9,18,14,.82))] text-[#a9d7b4]",
  danger: "border-[#d05b54]/45 bg-[linear-gradient(135deg,rgba(59,22,28,.78),rgba(24,10,13,.84))] text-[#f0a29c]",
  knowledge: "border-[#62c6df]/38 bg-[linear-gradient(135deg,rgba(14,47,57,.78),rgba(7,20,25,.84))] text-[#addce6]",
  world: "border-[#c6a15b]/38 bg-[linear-gradient(135deg,rgba(55,42,22,.78),rgba(23,18,11,.84))] text-[#e0c98f]",
};

export function GamePanels({
  panel,
  save,
  onClose,
  onEquip,
  onUnequip,
  onUse,
  onDrop,
  onBuy,
}: {
  panel: GamePanel;
  save: SaveData;
  onClose: () => void;
  onEquip: (entryId: string) => void;
  onUnequip: (slot: EquipmentSlot) => void;
  onUse: (entryId: string) => void;
  onDrop: (entryId: string, confirmed: boolean) => void;
  onBuy: (itemId: string) => void;
}) {
  if (!panel) return null;

  return (
    <Modal open title={panelTitles[panel]} onClose={onClose} className="sm:max-w-6xl">
      {panel === "inventory" ? <InventoryPanel save={save} onEquip={onEquip} onUnequip={onUnequip} onUse={onUse} onDrop={onDrop} /> : null}
      {panel === "character" ? <CharacterPanel save={save} /> : null}
      {panel === "quests" ? <QuestPanel save={save} /> : null}
      {panel === "map" ? <MapPanel save={save} /> : null}
      {panel === "journal" ? <JournalPanel save={save} /> : null}
      {panel === "settings" ? <SettingsPanel /> : null}
      {panel === "merchant" ? <MerchantPanel save={save} onBuy={onBuy} /> : null}
    </Modal>
  );
}

function InventoryPanel({
  save,
  onEquip,
  onUnequip,
  onUse,
  onDrop,
}: {
  save: SaveData;
  onEquip: (entryId: string) => void;
  onUnequip: (slot: EquipmentSlot) => void;
  onUse: (entryId: string) => void;
  onDrop: (entryId: string, confirmed: boolean) => void;
}) {
  const [category, setCategory] = useState<ItemCategory | "all">("all");
  const [selectedId, setSelectedId] = useState(save.inventory[0]?.id ?? null);
  const [confirmDrop, setConfirmDrop] = useState(false);
  const equippedEntryIds = useMemo(() => new Set(Object.values(save.equipment)), [save.equipment]);
  const filtered = useMemo(
    () => save.inventory
      .filter((entry) => category === "all" || itemsById[entry.itemId]?.category === category)
      .sort((a, b) => {
        const itemA = itemsById[a.itemId];
        const itemB = itemsById[b.itemId];
        return (rarityRank[itemB?.rarity ?? "common"] - rarityRank[itemA?.rarity ?? "common"])
          || (itemA?.name ?? "").localeCompare(itemB?.name ?? "", "he");
      }),
    [save.inventory, category],
  );
  const selected = filtered.find((entry) => entry.id === selectedId) ?? filtered[0];
  const item = selected ? itemsById[selected.itemId] : undefined;
  const equippedSlot = selected
    ? (Object.entries(save.equipment).find(([, entryId]) => entryId === selected.id)?.[0] as EquipmentSlot | undefined)
    : undefined;
  const carriedWeight = save.inventory.reduce((total, entry) => total + ((itemsById[entry.itemId]?.weight ?? 0) * entry.quantity), 0);
  const itemCount = save.inventory.reduce((total, entry) => total + entry.quantity, 0);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <section className="relative overflow-hidden border border-[#c6a15b]/25 bg-[radial-gradient(circle_at_10%_0%,rgba(198,161,91,.16),transparent_32%),linear-gradient(110deg,rgba(22,25,28,.98),rgba(7,9,12,.96))] px-3 py-3 shadow-[inset_0_1px_rgba(255,255,255,.05),0_12px_30px_rgba(0,0,0,.28)] sm:px-5" aria-label="מצב התיק">
        <div className="pointer-events-none absolute inset-y-0 end-0 w-32 bg-[linear-gradient(90deg,transparent,rgba(98,198,223,.05))]" aria-hidden="true" />
        <div className="relative grid grid-cols-3 divide-x divide-x-reverse divide-white/10 text-center">
          <InventorySummary icon={Backpack} label="פריטים" value={`${itemCount}`} />
          <InventorySummary icon={ShieldCheck} label="מצוידים" value={`${equippedEntryIds.size}`} />
          <InventorySummary icon={Weight} label="משקל" value={`${formatWeight(carriedWeight)} / ${save.character.derivedStats.carryCapacity}`} />
        </div>
      </section>

      <nav className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:gap-2" aria-label="סינון התיק">
        {(Object.keys(categoryLabels) as Array<ItemCategory | "all">).map((key) => {
          const Icon = categoryIcons[key];
          const count = key === "all"
            ? save.inventory.length
            : save.inventory.filter((entry) => itemsById[entry.itemId]?.category === key).length;
          return (
            <GameButton
              key={key}
              size="sm"
              variant={category === key ? "primary" : "secondary"}
              className="min-w-0 px-1.5 text-[11px] leading-tight sm:px-3 sm:text-sm"
              onClick={() => {
                setCategory(key);
                setConfirmDrop(false);
              }}
              aria-pressed={category === key}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{categoryLabels[key]}</span>
              <bdi className="hidden text-[10px] tabular-nums opacity-65 sm:inline">{count}</bdi>
            </GameButton>
          );
        })}
      </nav>

      <section aria-labelledby="equipped-items-title">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 id="equipped-items-title" className="display-font flex items-center gap-2 text-lg text-[#e8d3a0] sm:text-xl">
            <Shield className="size-4 text-[#c6a15b]" aria-hidden="true" />
            ציוד פעיל
          </h3>
          <span className="text-xs text-[#8f887c]"><bdi>{equippedEntryIds.size}</bdi> מתוך <bdi>8</bdi> משבצות</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 sm:gap-2">
          {(Object.keys(slotLabels) as EquipmentSlot[]).map((slot) => {
            const entry = save.inventory.find((candidate) => candidate.id === save.equipment[slot]);
            const definition = entry ? itemsById[entry.itemId] : undefined;
            const content = (
              <>
                <span className={`relative mx-auto grid size-10 place-items-center border sm:size-12 ${definition ? rarityTones[definition.rarity] : "border-white/10 bg-black/20 text-[#625e57]"}`}>
                  {definition ? (
                    <Image src={getAssetPath(definition.iconAssetKey)} alt="" fill sizes="48px" className="object-contain p-1" />
                  ) : (
                    <Shield className="size-4 opacity-45" aria-hidden="true" />
                  )}
                </span>
                <span className="mt-1 block truncate text-[10px] text-[#aaa294] sm:text-xs">{slotLabels[slot]}</span>
              </>
            );

            return entry && definition ? (
              <button
                key={slot}
                type="button"
                className="min-w-0 border border-transparent px-1 py-1.5 text-center transition-colors hover:border-[#c6a15b]/35 hover:bg-[#c6a15b]/[.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0cf82]"
                onClick={() => {
                  setCategory("all");
                  setSelectedId(entry.id);
                  setConfirmDrop(false);
                }}
                aria-label={`${slotLabels[slot]}: ${definition.name}`}
              >
                {content}
              </button>
            ) : (
              <div key={slot} className="min-w-0 px-1 py-1.5 text-center" aria-label={`${slotLabels[slot]}: פנוי`}>
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <section className="min-w-0" aria-labelledby="inventory-grid-title">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[.18em] text-[#7ed8ec]/75">תכולת התרמיל</p>
              <h3 id="inventory-grid-title" className="display-font text-xl text-[#f0cf82]">{categoryLabels[category]}</h3>
            </div>
            <span className="text-xs text-[#8f887c]"><bdi>{filtered.length}</bdi> סוגי פריטים</span>
          </div>
          <div className="grid min-h-48 grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 xl:grid-cols-5" aria-label="פריטים בתיק">
            {filtered.map((entry) => {
              const definition = itemsById[entry.itemId];
              if (!definition) return null;
              const isSelected = selected?.id === entry.id;
              const isEquipped = equippedEntryIds.has(entry.id);
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`group relative min-w-0 overflow-hidden border p-1.5 text-center shadow-[inset_0_0_20px_rgba(0,0,0,.34)] transition-[border-color,background-color,box-shadow,transform] duration-200 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none sm:p-2 ${rarityTones[definition.rarity]} ${isSelected ? "ring-1 ring-[#f0cf82] ring-offset-2 ring-offset-[#0b0d10] shadow-[inset_0_0_20px_rgba(0,0,0,.25),0_0_20px_rgba(198,161,91,.16)]" : "hover:border-[#d6b875]/55"}`}
                  onClick={() => {
                    setSelectedId(entry.id);
                    setConfirmDrop(false);
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${definition.name}, ${rarityLabels[definition.rarity]}${isEquipped ? ", מצויד" : ""}`}
                >
                  <span className="relative mx-auto block aspect-square w-full max-w-[4.5rem]">
                    <Image src={getAssetPath(definition.iconAssetKey)} alt="" fill sizes="(max-width: 640px) 72px, 80px" className="object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,.6)] transition-transform duration-200 motion-safe:group-hover:scale-105 motion-reduce:transition-none" />
                  </span>
                  <span className="mt-1 block min-h-8 break-words text-[11px] font-bold leading-4 text-[#e9dfce] sm:text-xs">{definition.name}</span>
                  <span className="mt-0.5 block truncate text-[9px] text-current opacity-75 sm:text-[10px]">{rarityLabels[definition.rarity]}</span>
                  {entry.quantity > 1 ? <bdi className="absolute end-1 top-1 grid min-w-5 place-items-center border border-white/15 bg-black/85 px-1 text-[10px] font-bold text-white">{entry.quantity}</bdi> : null}
                  {isEquipped ? <span className="absolute start-1 top-1 grid size-5 place-items-center border border-[#77b686]/40 bg-[#10251a]/95 text-[#9bd6a8]" title="מצויד"><ShieldCheck className="size-3" aria-label="מצויד" /></span> : null}
                </button>
              );
            })}
            {!filtered.length ? (
              <div className="col-span-full grid min-h-48 place-items-center border border-dashed border-white/10 bg-black/15 p-6 text-center">
                <div>
                  <Backpack className="mx-auto size-8 text-[#6f6a61]" aria-hidden="true" />
                  <p className="mt-2 text-sm text-[#9e968a]">אין פריטים בקטגוריה הזאת.</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="relative min-h-64 overflow-hidden border border-[#c6a15b]/25 bg-[linear-gradient(160deg,rgba(29,31,34,.98),rgba(7,9,12,.98))] p-3 shadow-[inset_0_1px_rgba(255,255,255,.05),0_14px_34px_rgba(0,0,0,.34)] sm:p-4 lg:sticky lg:top-[5.75rem]" aria-live="polite">
          <span className="pointer-events-none absolute -end-16 -top-20 size-44 rounded-full bg-[#62c6df]/[.055] blur-3xl" aria-hidden="true" />
          {item && selected ? (
            <div className="relative">
              <div className="flex min-w-0 items-start gap-3">
                <div className={`relative size-20 shrink-0 border sm:size-24 ${rarityTones[item.rarity]}`}>
                  <Image src={getAssetPath(item.iconAssetKey)} alt={`סמל ${item.name}`} fill sizes="96px" className="object-contain p-1 drop-shadow-[0_10px_12px_rgba(0,0,0,.58)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-[.18em] text-[#8f887c]">{categoryLabels[item.category]}</p>
                  <h3 className="display-font break-words text-xl leading-tight text-[#f2dfb0] sm:text-2xl">{item.name}</h3>
                  <span className={`mt-2 inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold ${rarityTones[item.rarity]}`}>
                    <Sparkles className="size-3" aria-hidden="true" />
                    {rarityLabels[item.rarity]}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[#c8c0b3]">{item.description}</p>
              <dl className="mt-4 grid grid-cols-2 gap-1.5 text-xs">
                <Stat label="כמות" value={`${selected.quantity}`} compact />
                <Stat label="משקל" value={`${formatWeight(item.weight)}`} compact />
                <Stat label="ערך" value={`${item.value} זהב`} compact />
                <Stat label="עמידות" value={selected.durability === null ? "לא נשחק" : `${selected.durability}%`} compact />
              </dl>
              {item.statModifiers?.length ? (
                <div className="mt-3 border-y border-[#77b686]/20 bg-[#77b686]/[.045] py-2.5 text-sm text-[#a9d7b4]">
                  <p className="mb-1 text-[10px] font-bold tracking-[.14em] text-[#6eaa7b]">השפעות בעת ציוד</p>
                  {item.statModifiers.map((modifier) => (
                    <p key={modifier.stat} className="flex justify-between gap-3 py-0.5">
                      <span>{attributeLabels[modifier.stat as keyof typeof attributeLabels] ?? derivedStatLabels[modifier.stat] ?? modifier.stat}</span>
                      <bdi className="font-bold tabular-nums">{modifier.amount >= 0 ? "+" : ""}{modifier.amount}</bdi>
                    </p>
                  ))}
                </div>
              ) : null}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {equippedSlot ? <GameButton className="col-span-2 sm:col-span-1" variant="secondary" onClick={() => onUnequip(equippedSlot)}>הסרת הציוד</GameButton> : item.equipmentSlot ? <GameButton className="col-span-2 sm:col-span-1" onClick={() => onEquip(selected.id)}>ציוד הפריט</GameButton> : null}
                {item.usable ? <GameButton className="col-span-2 sm:col-span-1" variant="secondary" onClick={() => onUse(selected.id)}>שימוש בפריט</GameButton> : null}
                {!item.questItem ? (
                  !confirmDrop ? (
                    <GameButton className="col-span-2" variant="ghost" onClick={() => setConfirmDrop(true)}>
                      <Trash2 className="size-4" aria-hidden="true" />
                      השלכה
                    </GameButton>
                  ) : (
                    <div className="col-span-2 border border-[#d05b54]/45 bg-[#4a171d]/35 p-3 text-sm" role="alert">
                      <p>להשליך את הפריט? לא ניתן לבטל פעולה זו.</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <GameButton size="sm" variant="danger" onClick={() => { onDrop(selected.id, true); setConfirmDrop(false); }}>אישור השלכה</GameButton>
                        <GameButton size="sm" variant="ghost" onClick={() => setConfirmDrop(false)}>ביטול</GameButton>
                      </div>
                    </div>
                  )
                ) : (
                  <p className="col-span-2 mt-1 border-s-2 border-[#c6a15b]/55 bg-[#c6a15b]/[.06] px-3 py-2 text-xs leading-5 text-[#d8c290]">חפץ משימה מוגן ואינו ניתן להשלכה.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid min-h-56 place-items-center text-center text-[#9e968a]">
              <div><Backpack className="mx-auto size-9 opacity-55" aria-hidden="true" /><p className="mt-2">בחר פריט כדי לבדוק אותו.</p></div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function CharacterPanel({ save }: { save: SaveData }) {
  const race = racesById[save.character.raceId];
  const characterClass = classesById[save.character.classId];
  const background = backgroundsById[save.character.backgroundId];
  const resourceLabel = resourceLabels[characterClass.resourceType];

  return (
    <div className="min-w-0 space-y-5">
      <section className="relative overflow-hidden border border-[#c6a15b]/30 bg-[radial-gradient(circle_at_20%_0%,rgba(98,198,223,.11),transparent_38%),linear-gradient(125deg,rgba(31,32,34,.98),rgba(7,9,12,.98))] shadow-[inset_0_1px_rgba(255,255,255,.06),0_20px_45px_rgba(0,0,0,.34)]">
        <div className="grid md:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[17rem] overflow-hidden border-b border-[#c6a15b]/30 bg-black/35 md:border-b-0 md:border-l">
            <CharacterPortrait portraitKey={save.character.portraitKey} alt={`דיוקן של ${save.character.name}`} sizes="(max-width: 768px) 272px, 240px" className="object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(3,4,6,.92),transparent_45%),radial-gradient(circle_at_center,transparent_48%,rgba(0,0,0,.45))]" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
              <span className="border border-[#c6a15b]/45 bg-black/75 px-2 py-1 text-xs font-bold text-[#e7cf96]">דרגה <bdi>{save.character.level}</bdi></span>
              {save.character.classId === "king" ? <Crown className="size-6 text-[#f0cf82] drop-shadow-[0_0_10px_rgba(240,207,130,.55)]" aria-label="מעמד מלכותי" /> : null}
            </div>
          </div>
          <div className="min-w-0 p-4 sm:p-6">
            <p className="text-[10px] font-bold tracking-[.22em] text-[#7ed8ec]/75">רשומת הגיבור</p>
            <h3 className="display-font mt-1 break-words text-3xl leading-none text-[#f0cf82] sm:text-4xl">{save.character.name}</h3>
            <p className="mt-2 break-words text-sm text-[#b6ad9f]">{race.name} · {characterClass.name} · {background.name}</p>
            {save.character.description ? <p className="mt-4 max-w-2xl text-sm leading-6 text-[#c9c0b2]">{save.character.description}</p> : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ProgressBar value={save.character.currentHealth} maximum={save.character.derivedStats.maximumHealth} label="חיים" tone="health" />
              <ProgressBar value={save.character.primaryResource} maximum={save.character.derivedStats.maximumPrimaryResource} label={resourceLabel} tone="resource" />
            </div>
            <dl className="mt-5 grid grid-cols-3 divide-x divide-x-reverse divide-white/10 border-y border-white/10 py-3 text-center">
              <HeroStat label="ניסיון" value={`${save.character.experience}`} />
              <HeroStat label="מוניטין" value={`${save.character.reputation}`} />
              <HeroStat label="זהב" value={`${save.character.gold}`} />
            </dl>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="attributes-title">
          <SectionHeading id="attributes-title" icon={UserRound} eyebrow="הבסיס לכל בדיקה">תכונות</SectionHeading>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {Object.entries(save.character.attributes).map(([key, value]) => {
              const modifier = Math.floor((value - 10) / 2);
              return (
                <div key={key} className="relative overflow-hidden border border-white/10 bg-[linear-gradient(160deg,rgba(32,35,38,.92),rgba(9,11,14,.96))] px-1.5 py-3 text-center shadow-[inset_0_1px_rgba(255,255,255,.04)] sm:p-4">
                  <span className="text-[10px] text-[#aaa294] sm:text-xs">{attributeLabels[key as keyof typeof attributeLabels]}</span>
                  <bdi className="display-font mt-1 block text-2xl font-bold text-[#f2dfb0] sm:text-3xl">{value}</bdi>
                  <span className="mt-1 inline-block border border-[#62c6df]/20 bg-[#62c6df]/[.05] px-1.5 text-[10px] text-[#9bd8e5]"><bdi>{modifier >= 0 ? "+" : ""}{modifier}</bdi></span>
                </div>
              );
            })}
          </div>

          <h4 className="display-font mt-5 text-lg text-[#e8d3a0]">נתונים נגזרים</h4>
          <dl className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <Stat label="חיים מרביים" value={`${save.character.derivedStats.maximumHealth}`} />
            <Stat label="שריון" value={`${save.character.derivedStats.armor}`} />
            <Stat label="דיוק" value={`${save.character.derivedStats.accuracy >= 0 ? "+" : ""}${save.character.derivedStats.accuracy}`} />
            <Stat label="יוזמה" value={`${save.character.derivedStats.initiative >= 0 ? "+" : ""}${save.character.derivedStats.initiative}`} />
            <Stat label={resourceLabel} value={`${save.character.derivedStats.maximumPrimaryResource}`} />
            <Stat label="כושר נשיאה" value={`${save.character.derivedStats.carryCapacity}`} />
          </dl>
        </section>

        <section aria-labelledby="character-equipment-title">
          <SectionHeading id="character-equipment-title" icon={Shield} eyebrow="מגנים, נשק וקמעות">ציוד</SectionHeading>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(slotLabels) as EquipmentSlot[]).map((slot) => {
              const entry = save.inventory.find((candidate) => candidate.id === save.equipment[slot]);
              const item = entry ? itemsById[entry.itemId] : undefined;
              return (
                <div key={slot} className={`relative min-w-0 overflow-hidden border p-2.5 ${item ? rarityTones[item.rarity] : "border-white/10 bg-black/20 text-[#777168]"}`}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="relative grid size-11 shrink-0 place-items-center border border-white/10 bg-black/25">
                      {item ? <Image src={getAssetPath(item.iconAssetKey)} alt="" fill sizes="44px" className="object-contain p-1" /> : <Shield className="size-4 opacity-35" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] text-[#938c81]">{slotLabels[slot]}</span>
                      <b className="mt-0.5 block truncate text-xs text-[#e8dfce]" title={item?.name}>{item?.name ?? "פנוי"}</b>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function QuestPanel({ save }: { save: SaveData }) {
  const visibleQuests = save.quests.flatMap((state) => {
    const quest = questsById[state.questId];
    return quest && state.status !== "hidden" ? [{ state, quest }] : [];
  });
  const activeCount = visibleQuests.filter(({ state }) => state.status === "active").length;
  const completedCount = visibleQuests.filter(({ state }) => state.status === "completed").length;

  return (
    <div className="min-w-0 space-y-4">
      <section className="grid grid-cols-2 divide-x divide-x-reverse divide-[#c6a15b]/15 border border-[#c6a15b]/25 bg-[linear-gradient(110deg,rgba(28,28,27,.96),rgba(8,10,12,.96))] py-3 text-center">
        <InventorySummary icon={ScrollText} label="משימות פעילות" value={`${activeCount}`} />
        <InventorySummary icon={Check} label="משימות שהושלמו" value={`${completedCount}`} />
      </section>
      {visibleQuests.map(({ state, quest }) => {
        const visibleObjectives = quest.objectives.filter((objective) => state.objectives[objective.id] !== "hidden");
        const required = visibleObjectives.filter((objective) => !objective.optional);
        const completed = required.filter((objective) => state.objectives[objective.id] === "completed").length;
        const isCompleted = state.status === "completed";
        return (
          <article key={state.questId} className="relative overflow-hidden border border-[#7a6040]/35 bg-[linear-gradient(105deg,rgba(222,200,153,.96),rgba(176,148,99,.97))] p-4 text-[#261e14] shadow-[inset_0_0_45px_rgba(83,53,24,.2),0_14px_32px_rgba(0,0,0,.28)] sm:p-6">
            <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(0deg,transparent_0_3px,rgba(67,42,20,.05)_3px_4px)]" aria-hidden="true" />
            <div className="relative">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#5b4227]/25 pb-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[10px] font-black tracking-[.17em] text-[#5a3e22]">
                    {quest.type === "main" ? <Crown className="size-3.5" aria-hidden="true" /> : <ScrollText className="size-3.5" aria-hidden="true" />}
                    {quest.type === "main" ? "משימה ראשית" : "משימת רשות"}
                  </p>
                  <h3 className="display-font mt-1 break-words text-2xl leading-tight sm:text-3xl">{quest.name}</h3>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 border px-2.5 py-1 text-xs font-bold ${isCompleted ? "border-[#355c38]/45 bg-[#355c38]/10 text-[#28492b]" : "border-[#6e4a21]/40 bg-[#6e4a21]/10"}`}>
                  {isCompleted ? <Check className="size-3.5" aria-hidden="true" /> : <CircleDot className="size-3.5" aria-hidden="true" />}
                  {isCompleted ? "הושלמה" : "פעילה"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 sm:text-base">{quest.description}</p>
              <ProgressBar className="mt-4 [&_span]:text-[#4c3822] [&_bdi]:text-[#2d2115]" tone="experience" value={completed} maximum={Math.max(1, required.length)} label="התקדמות" />
              <ul className="mt-4 grid gap-2 md:grid-cols-2" aria-label={`יעדי המשימה ${quest.name}`}>
                {visibleObjectives.map((objective) => {
                  const status = state.objectives[objective.id];
                  const objectiveComplete = status === "completed";
                  const objectiveFailed = status === "failed";
                  return (
                    <li key={objective.id} className={`flex min-w-0 items-start gap-2 border-s-2 bg-[#3b2a18]/[.055] px-3 py-2 text-sm leading-5 ${objectiveComplete ? "border-[#3e6d43]/65" : objectiveFailed ? "border-[#8b3535]/70" : "border-[#70502c]/40"}`}>
                      <span className={`mt-0.5 grid size-4 shrink-0 place-items-center border text-[10px] ${objectiveComplete ? "border-[#3e6d43]/55 bg-[#3e6d43]/15" : objectiveFailed ? "border-[#8b3535]/60" : "border-[#70502c]/45"}`} aria-hidden="true">{objectiveComplete ? "✓" : objectiveFailed ? "×" : "◇"}</span>
                      <span className="min-w-0">
                        <span className={objectiveComplete ? "line-through opacity-65" : ""}>{objective.text}</span>
                        <span className="ms-1 whitespace-nowrap text-[10px] font-bold opacity-65">{objective.optional ? "רשות" : objectiveComplete ? "הושלם" : objectiveFailed ? "נכשל" : "פעיל"}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#5b4227]/25 pt-3 text-xs font-semibold text-[#52391f]" aria-label="פרסי המשימה">
                <span>פרס: <bdi>{quest.rewards.experience}</bdi> ניסיון</span>
                <span><bdi>{quest.rewards.gold}</bdi> זהב</span>
                {quest.rewards.reputation ? <span><bdi>{quest.rewards.reputation > 0 ? "+" : ""}{quest.rewards.reputation}</bdi> מוניטין</span> : null}
              </div>
            </div>
          </article>
        );
      })}
      {!visibleQuests.length ? (
        <EmptyState icon={ScrollText} title="אין משימות פתוחות" description="רמזים ושיחות חדשות יופיעו כאן כאשר המסע יתקדם." />
      ) : null}
    </div>
  );
}

function MapPanel({ save }: { save: SaveData }) {
  const visitedIds = new Set(save.story.visitedLocationIds);

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#c6a15b]/20 pb-3">
        <div>
          <p className="text-[10px] font-bold tracking-[.2em] text-[#7ed8ec]/70">ארצות שנחשפו מן הערפל</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#aaa294]">המפה מתעדכנת עם כל שביל, שמועה ומעבר שנמצאו במסע.</p>
        </div>
        <span className="border border-[#c6a15b]/25 bg-black/20 px-3 py-1.5 text-xs text-[#d9c18b]"><bdi>{save.discoveredLocationIds.length}</bdi> מקומות התגלו</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {save.discoveredLocationIds.map((locationId) => {
          const location = locationsById[locationId];
          if (!location) return null;
          const current = location.id === save.story.currentLocationId;
          const visited = visitedIds.has(location.id);
          return (
            <article key={location.id} className={`group relative aspect-[16/10] min-h-44 overflow-hidden border bg-black shadow-[0_12px_28px_rgba(0,0,0,.32)] ${current ? "border-[#f0cf82]/80 ring-1 ring-[#f0cf82]/25 sm:col-span-2 lg:col-span-2" : "border-white/15"}`}>
              <ArtDirectedPicture
                desktopSrc={getAssetPath(location.backgroundAssetKey)}
                mobileSrc={getAssetPath(`${location.backgroundAssetKey}-mobile`)}
                alt={`נוף של ${location.name}`}
                pictureClassName="absolute inset-0"
                className="scale-[1.01] object-cover opacity-80 transition-[transform,opacity] duration-500 motion-safe:group-hover:scale-[1.035] motion-safe:group-hover:opacity-95 motion-reduce:transition-none"
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(2,4,6,.98)_0%,rgba(2,4,6,.7)_34%,transparent_76%),linear-gradient(90deg,rgba(0,0,0,.34),transparent_55%)]" aria-hidden="true" />
              {current ? <div className="absolute start-3 top-3 inline-flex items-center gap-1.5 border border-[#77b686]/45 bg-[#10251a]/90 px-2 py-1 text-[10px] font-bold text-[#9bd6a8]"><MapPin className="size-3" aria-hidden="true" />המיקום הנוכחי</div> : null}
              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <p className="text-[9px] font-bold tracking-[.16em] text-[#7ed8ec]/75">{visited ? "נתיב מוכר" : "סימון חדש במפה"}</p>
                <h3 className="display-font mt-0.5 break-words text-xl leading-tight text-[#f2dfb0] sm:text-2xl">{location.name}</h3>
                <p className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-[#c6bdae]">{location.description}</p>
              </div>
            </article>
          );
        })}
      </div>
      {!save.discoveredLocationIds.length ? <EmptyState icon={MapPin} title="המפה עדיין מכוסה בערפל" description="המקום הראשון יופיע כאן לאחר שתצא לדרך." /> : null}
    </div>
  );
}

function JournalPanel({ save }: { save: SaveData }) {
  const discoveredNpcIds = new Set(save.story.visitedLocationIds.flatMap((id) => locationsById[id]?.npcIds ?? []));
  const discoveredNpcs = npcs.filter((npc) => discoveredNpcIds.has(npc.id));
  const consequences = getAllVisibleConsequences(save.story.flags);

  return (
    <div className="min-w-0 space-y-7">
      {consequences.length > 0 ? (
        <section aria-labelledby="journey-consequences-title">
          <SectionHeading id="journey-consequences-title" icon={WandSparkles} eyebrow="בחירות שמשאירות חותם">השלכות המסע</SectionHeading>
          <div className="grid gap-2 md:grid-cols-2">
            {consequences.map((consequence, index) => (
              <article key={consequence.key} className={`relative overflow-hidden border border-s-2 p-3.5 shadow-[inset_0_1px_rgba(255,255,255,.035)] sm:p-4 ${consequenceTones[consequence.tone]}`}>
                <span className="absolute end-2 top-1 font-serif text-4xl leading-none opacity-[.07]" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h4 className="relative font-bold">{consequence.title}</h4>
                <p className="relative mt-1 text-sm leading-6 text-[#d4ccbd]">{consequence.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="known-people-title">
        <SectionHeading id="known-people-title" icon={UserRound} eyebrow={`${discoveredNpcs.length} דמויות נרשמו`}>אנשים שפגשת</SectionHeading>
        <div className="grid gap-3 md:grid-cols-2">
          {discoveredNpcs.map((npc) => {
            const relationship = save.story.relationships[npc.id] ?? npc.initialRelationship;
            return (
              <article key={npc.id} className="relative min-w-0 overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(26,29,32,.96),rgba(8,10,13,.98))] p-3 shadow-[inset_0_1px_rgba(255,255,255,.04),0_12px_26px_rgba(0,0,0,.24)] sm:p-4">
                <div className="grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] gap-3 sm:grid-cols-[6rem_minmax(0,1fr)]">
                  <div className="relative aspect-[4/5] w-full overflow-hidden border border-[#c6a15b]/30 bg-black/30">
                    <CharacterPortrait portraitKey={npc.portraitKey} alt={`דיוקן של ${npc.name}`} sizes="96px" className="object-cover" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="display-font break-words text-xl leading-tight text-[#f0cf82] sm:text-2xl">{npc.name}</h4>
                    <p className="mt-0.5 text-[10px] font-bold tracking-[.12em] text-[#7ed8ec]/70">{npc.title}</p>
                    <p className="mt-2 text-xs leading-5 text-[#c9c0b2] sm:text-sm sm:leading-6">{npc.journalEntry}</p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-1.5 border-t border-white/8 pt-3">
                  <RelationshipStat label="אמון" value={relationship.trust} tone="trust" />
                  <RelationshipStat label="כבוד" value={relationship.respect} tone="respect" />
                  <RelationshipStat label="פחד" value={relationship.fear} tone="fear" />
                </dl>
              </article>
            );
          })}
        </div>
        {!discoveredNpcs.length ? <EmptyState icon={UserRound} title="עדיין לא נרשמו היכרויות" description="דמויות שפגשת ושינויי היחסים איתן יופיעו כאן." /> : null}
      </section>

      {save.journal.length > 0 ? (
        <section aria-labelledby="journal-notes-title">
          <SectionHeading id="journal-notes-title" icon={BookOpenText} eyebrow="עדויות, סודות ורסיסי עבר">רשומות שנאספו</SectionHeading>
          <div className="grid gap-3 md:grid-cols-2">
            {save.journal.map((entry, index) => (
              <article key={entry.id} className="relative overflow-hidden border border-[#715637]/35 bg-[linear-gradient(110deg,rgba(220,198,151,.96),rgba(174,146,96,.97))] p-4 text-[#281f15] shadow-[inset_0_0_35px_rgba(76,47,20,.16),0_12px_28px_rgba(0,0,0,.24)] sm:p-5">
                <span className="absolute end-3 top-2 font-serif text-5xl leading-none opacity-[.07]" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h4 className="display-font relative pe-8 text-xl leading-tight sm:text-2xl">{entry.title}</h4>
                <div className="relative my-2 h-px bg-[linear-gradient(90deg,rgba(74,49,26,.5),transparent)]" aria-hidden="true" />
                <p className="relative text-sm leading-6">{entry.body}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const merchantItemIds = ["minor-healing-potion", "village-torch", "soldier-rope", "chain-shirt"];

function MerchantPanel({ save, onBuy }: { save: SaveData; onBuy: (itemId: string) => void }) {
  return (
    <div className="min-w-0 space-y-4">
      <section className="relative min-h-40 overflow-hidden border border-[#c6a15b]/30 shadow-[0_16px_36px_rgba(0,0,0,.34)]">
        <ArtDirectedPicture desktopSrc={getAssetPath("background-smithy")} mobileSrc={getAssetPath("background-smithy-mobile")} alt="הנפחייה של מירה בערפלון" pictureClassName="absolute inset-0" className="object-cover opacity-75" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,7,9,.98)_0%,rgba(5,7,9,.72)_58%,rgba(5,7,9,.2)),linear-gradient(to_top,rgba(5,7,9,.82),transparent_70%)]" aria-hidden="true" />
        <div className="relative flex min-h-40 items-end gap-3 p-4 sm:p-5">
          <div className="relative size-16 shrink-0 overflow-hidden border border-[#c6a15b]/40 bg-black/40 sm:size-20">
            <CharacterPortrait portraitKey="portrait-npc-mira" alt="דיוקן של מירה הנפחית" sizes="80px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[.18em] text-[#ef9d62]">נפחיית ערפלון</p>
            <h3 className="display-font text-2xl text-[#f2dfb0] sm:text-3xl">הציוד של מירה</h3>
            <p className="mt-1 max-w-xl text-xs leading-5 text-[#c5bcad] sm:text-sm">ציוד שנבדק, הושחז ותוקן. מירה לא מוכרת דבר שלא הייתה סומכת עליו במכרה.</p>
          </div>
        </div>
        <p className="absolute end-3 top-3 flex items-center gap-2 border border-[#c6a15b]/35 bg-black/80 px-3 py-1.5 text-sm font-bold text-[#f0cf82] shadow-lg">
          <Coins className="size-4" aria-hidden="true" />
          <bdi className="tabular-nums">{save.character.gold}</bdi>
          <span className="text-xs font-normal text-[#c7b994]">זהב</span>
        </p>
      </section>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {merchantItemIds.map((itemId) => {
          const item = itemsById[itemId];
          const canAfford = save.character.gold >= item.value;
          return (
            <article key={item.id} className={`group relative min-w-0 overflow-hidden border p-3 shadow-[inset_0_1px_rgba(255,255,255,.04),0_10px_24px_rgba(0,0,0,.24)] transition-colors motion-reduce:transition-none sm:p-4 ${rarityTones[item.rarity]} ${canAfford ? "hover:border-[#c6a15b]/55" : "opacity-70"}`}>
              <div className="flex min-w-0 gap-3">
                <div className="relative size-[4.5rem] shrink-0 border border-white/10 bg-black/30 sm:size-20">
                  <Image src={getAssetPath(item.iconAssetKey)} alt={`סמל ${item.name}`} fill sizes="80px" className="object-contain p-1 drop-shadow-[0_8px_10px_rgba(0,0,0,.55)] transition-transform duration-200 motion-safe:group-hover:scale-105 motion-reduce:transition-none" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words font-bold leading-5 text-[#f2dfb0]">{item.name}</h3>
                    <span className={`shrink-0 border px-1.5 py-0.5 text-[9px] ${rarityTones[item.rarity]}`}>{rarityLabels[item.rarity]}</span>
                  </div>
                  <p className="mt-1 flex-1 text-xs leading-5 text-[#aaa294]">{item.description}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/8 pt-3">
                <p className="text-xs text-[#968e82]">{canAfford ? "זמין לרכישה" : `חסרים ${item.value - save.character.gold} זהב`}</p>
                <GameButton size="sm" className="min-w-28" disabled={!canAfford} onClick={() => onBuy(item.id)}>
                  רכישה · <bdi>{item.value}</bdi>
                </GameButton>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function InventorySummary({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="min-w-0 px-2">
      <Icon className="mx-auto size-4 text-[#c6a15b]" aria-hidden="true" />
      <bdi className="mt-1 block truncate text-sm font-bold tabular-nums text-[#eee3ce] sm:text-base">{value}</bdi>
      <span className="mt-0.5 block truncate text-[9px] text-[#928b80] sm:text-[10px]">{label}</span>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-2">
      <dt className="text-[10px] text-[#8f887c]">{label}</dt>
      <dd><bdi className="mt-1 block truncate text-base font-bold tabular-nums text-[#e9dfce]">{value}</bdi></dd>
    </div>
  );
}

function RelationshipStat({ label, value, tone }: { label: string; value: number; tone: "trust" | "respect" | "fear" }) {
  const tones = {
    trust: "text-[#9bd6a8]",
    respect: "text-[#e0c98f]",
    fear: "text-[#f0a29c]",
  };
  return (
    <div className="min-w-0 border border-white/[.07] bg-black/20 px-1.5 py-2 text-center">
      <dt className="text-[9px] text-[#8f887c]">{label}</dt>
      <dd><bdi className={`mt-0.5 block text-sm font-bold tabular-nums ${tones[tone]}`}>{value > 0 ? "+" : ""}{value}</bdi></dd>
    </div>
  );
}

function SectionHeading({ id, icon: Icon, eyebrow, children }: { id: string; icon: LucideIcon; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex min-w-0 items-end justify-between gap-3 border-b border-[#c6a15b]/15 pb-2">
      <h3 id={id} className="display-font flex min-w-0 items-center gap-2 text-xl text-[#f0cf82] sm:text-2xl">
        <Icon className="size-5 shrink-0 text-[#c6a15b]" aria-hidden="true" />
        <span className="min-w-0 break-words">{children}</span>
      </h3>
      <p className="hidden text-[9px] font-bold tracking-[.14em] text-[#777168] sm:block">{eyebrow}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="grid min-h-48 place-items-center border border-dashed border-[#c6a15b]/20 bg-black/15 p-6 text-center">
      <div>
        <Icon className="mx-auto size-9 text-[#6f685d]" aria-hidden="true" />
        <h3 className="display-font mt-3 text-xl text-[#d6c394]">{title}</h3>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#8f887c]">{description}</p>
      </div>
    </div>
  );
}

function Stat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`min-w-0 border border-white/10 bg-black/20 ${compact ? "px-2.5 py-2" : "p-3"}`}>
      <dt className="truncate text-[10px] text-[#9e968a] sm:text-xs">{label}</dt>
      <dd><bdi className="mt-1 block truncate font-bold tabular-nums text-[#ece2d1]">{value}</bdi></dd>
    </div>
  );
}

function formatWeight(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
