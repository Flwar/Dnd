"use client";

import { useMemo, useState } from "react";
import { Coins, MapPin, Shield, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GameButton } from "@/components/ui/GameButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { itemsById } from "@/content/items";
import { questsById } from "@/content/quests";
import { locationsById } from "@/content/locations";
import { npcs } from "@/content/npcs";
import { racesById } from "@/content/races";
import { classesById } from "@/content/classes";
import { backgroundsById } from "@/content/backgrounds";
import { getAssetPath } from "@/lib/assets/manifest";
import type { GamePanel } from "@/store/game-store";
import type { EquipmentSlot, ItemCategory, SaveData } from "@/types/game";

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

const rarityLabels = { common: "רגיל", uncommon: "לא שכיח", rare: "נדיר", epic: "אפי", legendary: "אגדי", mythic: "מיתי" };
const rarityTones = { common: "border-white/15 text-[#d0c8ba]", uncommon: "border-[#77b686]/50 text-[#8fd09d]", rare: "border-[#62c6df]/55 text-[#7ed8ec]", epic: "border-[#ad7ae6]/55 text-[#c294f3]", legendary: "border-[#e2aa4d]/65 text-[#f0cf82]", mythic: "border-[#d05b54]/70 text-[#ff8e82]" };
const slotLabels: Record<EquipmentSlot, string> = { weapon: "נשק", offhand: "יד משנית", armor: "שריון", helmet: "קסדה", gloves: "כפפות", boots: "מגפיים", ring: "טבעת", amulet: "קמע" };
const attributeLabels = { strength: "כוח", dexterity: "זריזות", constitution: "חוסן", intelligence: "תבונה", wisdom: "חכמה", charisma: "כריזמה" };

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

function InventoryPanel({ save, onEquip, onUnequip, onUse, onDrop }: { save: SaveData; onEquip: (entryId: string) => void; onUnequip: (slot: EquipmentSlot) => void; onUse: (entryId: string) => void; onDrop: (entryId: string, confirmed: boolean) => void }) {
  const [category, setCategory] = useState<ItemCategory | "all">("all");
  const [selectedId, setSelectedId] = useState(save.inventory[0]?.id ?? null);
  const [confirmDrop, setConfirmDrop] = useState(false);
  const filtered = useMemo(() => save.inventory.filter((entry) => category === "all" || itemsById[entry.itemId]?.category === category).sort((a, b) => (itemsById[b.itemId]?.rarity ?? "").localeCompare(itemsById[a.itemId]?.rarity ?? "") || (itemsById[a.itemId]?.name ?? "").localeCompare(itemsById[b.itemId]?.name ?? "", "he")), [save.inventory, category]);
  const selected = save.inventory.find((entry) => entry.id === selectedId) ?? filtered[0];
  const item = selected ? itemsById[selected.itemId] : undefined;
  const equippedSlot = selected ? (Object.entries(save.equipment).find(([, entryId]) => entryId === selected.id)?.[0] as EquipmentSlot | undefined) : undefined;
  return (
    <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)_19rem]">
      <aside className="grid auto-rows-min grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1" aria-label="סינון התיק">
        {(Object.keys(categoryLabels) as Array<ItemCategory | "all">).map((key) => <GameButton key={key} size="sm" variant={category === key ? "primary" : "secondary"} onClick={() => setCategory(key)}>{categoryLabels[key]}</GameButton>)}
      </aside>
      <div className="grid min-h-48 grid-cols-2 gap-2 sm:grid-cols-4" aria-label="פריטים בתיק">
        {filtered.map((entry) => {
          const definition = itemsById[entry.itemId];
          if (!definition) return null;
          return <button key={entry.id} className={`relative min-h-32 border bg-black/25 p-2 text-center transition hover:bg-white/5 ${selected?.id === entry.id ? "border-[#f0cf82]" : rarityTones[definition.rarity].split(" ")[0]}`} onClick={() => { setSelectedId(entry.id); setConfirmDrop(false); }} aria-pressed={selected?.id === entry.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated local item icon */}
            <img src={getAssetPath(definition.iconAssetKey)} alt="" className="mx-auto size-16 object-contain" loading="lazy" />
            <span className="mt-1 block text-xs font-bold">{definition.name}</span>
            {entry.quantity > 1 ? <bdi className="absolute end-1.5 top-1.5 rounded-full bg-black/80 px-2 text-xs">{entry.quantity}</bdi> : null}
            {Object.values(save.equipment).includes(entry.id) ? <span className="absolute start-1.5 top-1.5 text-[#77b686]" title="מצויד"><Shield className="size-4" aria-label="מצויד" /></span> : null}
          </button>;
        })}
        {!filtered.length ? <p className="col-span-full grid min-h-44 place-items-center text-[#9e968a]">אין פריטים בקטגוריה הזאת.</p> : null}
      </div>
      <aside className="glass-inset min-h-64 p-4">
        {item && selected ? <>
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated local item icon */}
            <img src={getAssetPath(item.iconAssetKey)} alt={`סמל ${item.name}`} className="size-20 border border-white/10 object-contain" />
            <div><h3 className="display-font text-xl text-[#f2dfb0]">{item.name}</h3><span className={`mt-1 inline-block border px-2 py-0.5 text-xs ${rarityTones[item.rarity]}`}>{rarityLabels[item.rarity]}</span></div>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#bdb4a7]">{item.description}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <Stat label="קטגוריה" value={categoryLabels[item.category]} /><Stat label="משקל" value={`${item.weight}`} /><Stat label="ערך" value={`${item.value} זהב`} /><Stat label="עמידות" value={selected.durability === null ? "—" : `${selected.durability}%`} />
          </dl>
          {item.statModifiers?.length ? <div className="mt-3 border-y border-white/10 py-2 text-sm text-[#77b686]">{item.statModifiers.map((modifier) => <p key={modifier.stat}>{attributeLabels[modifier.stat as keyof typeof attributeLabels] ?? modifier.stat}: <bdi>+{modifier.amount}</bdi></p>)}</div> : null}
          <div className="mt-4 grid gap-2">
            {equippedSlot ? <GameButton variant="secondary" onClick={() => onUnequip(equippedSlot)}>הסרת הציוד</GameButton> : item.equipmentSlot ? <GameButton onClick={() => onEquip(selected.id)}>ציוד הפריט</GameButton> : null}
            {item.usable ? <GameButton variant="secondary" onClick={() => onUse(selected.id)}>שימוש בפריט</GameButton> : null}
            {!item.questItem ? !confirmDrop ? <GameButton variant="ghost" onClick={() => setConfirmDrop(true)}><Trash2 className="size-4" aria-hidden="true" />השלכה</GameButton> : <div className="border border-[#d05b54]/45 bg-[#4a171d]/35 p-3 text-sm"><p>להשליך את הפריט? לא ניתן לבטל פעולה זו.</p><div className="mt-2 flex gap-2"><GameButton size="sm" variant="danger" onClick={() => { onDrop(selected.id, true); setConfirmDrop(false); }}>אישור השלכה</GameButton><GameButton size="sm" variant="ghost" onClick={() => setConfirmDrop(false)}>ביטול</GameButton></div></div> : <p className="mt-3 text-xs text-[#c6a15b]">חפץ משימה אינו ניתן להשלכה.</p>}
          </div>
        </> : <p className="text-[#9e968a]">בחר פריט כדי לבדוק אותו.</p>}
      </aside>
    </div>
  );
}

function CharacterPanel({ save }: { save: SaveData }) {
  const race = racesById[save.character.raceId];
  const characterClass = classesById[save.character.classId];
  const background = backgroundsById[save.character.backgroundId];
  return <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
    <div>
      <div className="overflow-hidden border border-[#c6a15b]/45 bg-black/35">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated local portrait */}
        <img src={getAssetPath(save.character.portraitKey)} alt={`דיוקן של ${save.character.name}`} className="aspect-[4/5] w-full object-cover" />
      </div>
      <h3 className="display-font mt-3 text-3xl text-[#f0cf82]">{save.character.name}</h3>
      <p className="text-[#a89f91]">{race.name} · {characterClass.name} · {background.name}</p>
      {save.character.description ? <p className="mt-3 text-sm leading-6 text-[#bdb4a7]">{save.character.description}</p> : null}
    </div>
    <div>
      <div className="grid gap-3 sm:grid-cols-3">{Object.entries(save.character.attributes).map(([key, value]) => <div key={key} className="glass-inset p-4 text-center"><span className="text-sm text-[#a89f91]">{attributeLabels[key as keyof typeof attributeLabels]}</span><bdi className="mt-1 block text-3xl font-bold text-[#f2dfb0]">{value}</bdi></div>)}</div>
      <h4 className="display-font mt-6 text-xl text-[#f0cf82]">נתונים נגזרים</h4>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"><Stat label="חיים מרביים" value={`${save.character.derivedStats.maximumHealth}`} /><Stat label="שריון" value={`${save.character.derivedStats.armor}`} /><Stat label="דיוק" value={`${save.character.derivedStats.accuracy >= 0 ? "+" : ""}${save.character.derivedStats.accuracy}`} /><Stat label="יוזמה" value={`${save.character.derivedStats.initiative >= 0 ? "+" : ""}${save.character.derivedStats.initiative}`} /><Stat label="משאב" value={`${save.character.derivedStats.maximumPrimaryResource}`} /><Stat label="כושר נשיאה" value={`${save.character.derivedStats.carryCapacity}`} /></div>
      <h4 className="display-font mt-6 text-xl text-[#f0cf82]">ציוד</h4>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.keys(slotLabels) as EquipmentSlot[]).map((slot) => { const entry = save.inventory.find((candidate) => candidate.id === save.equipment[slot]); const item = entry ? itemsById[entry.itemId] : undefined; return <div key={slot} className="border border-white/10 bg-black/20 p-3"><span className="block text-xs text-[#9e968a]">{slotLabels[slot]}</span><b className="mt-1 block text-sm">{item?.name ?? "פנוי"}</b></div>; })}</div>
    </div>
  </div>;
}

function QuestPanel({ save }: { save: SaveData }) {
  return <div className="grid gap-4">{save.quests.map((state) => { const quest = questsById[state.questId]; if (!quest || state.status === "hidden") return null; const required = quest.objectives.filter((objective) => !objective.optional && state.objectives[objective.id] !== "hidden"); const completed = required.filter((objective) => state.objectives[objective.id] === "completed").length; return <article key={state.questId} className="parchment-panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-[.15em]">{quest.type === "main" ? "משימה ראשית" : "משימת רשות"}</p><h3 className="display-font text-2xl">{quest.name}</h3></div><span className="border border-[#50391f]/35 px-2 py-1 text-xs">{state.status === "completed" ? "הושלמה" : "פעילה"}</span></div><p className="mt-3 text-sm leading-6">{quest.description}</p><ProgressBar className="mt-4" tone="experience" value={completed} maximum={Math.max(1, required.length)} label="התקדמות" /><ul className="mt-4 space-y-2">{quest.objectives.filter((objective) => state.objectives[objective.id] !== "hidden").map((objective) => { const status = state.objectives[objective.id]; return <li key={objective.id} className={`flex gap-2 text-sm ${status === "completed" ? "opacity-60 line-through" : ""}`}><span>{status === "completed" ? "✓" : "◇"}</span><span>{objective.text}{objective.optional ? " (רשות)" : ""}</span></li>; })}</ul></article>; })}</div>;
}

function MapPanel({ save }: { save: SaveData }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{save.discoveredLocationIds.map((locationId) => { const location = locationsById[locationId]; if (!location) return null; const current = location.id === save.story.currentLocationId; return <article key={location.id} className={`relative min-h-40 overflow-hidden border ${current ? "border-[#f0cf82]" : "border-white/15"}`}>
    <picture>
      <source media="(max-width:760px)" srcSet={getAssetPath(`${location.backgroundAssetKey}-mobile`)} />
      <img src={getAssetPath(location.backgroundAssetKey)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-55" />
    </picture><div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-3"><h3 className="display-font text-xl text-[#f2dfb0]">{location.name}</h3>{current ? <p className="flex items-center gap-1 text-xs text-[#77b686]"><MapPin className="size-3" aria-hidden="true" />המיקום הנוכחי</p> : <p className="text-xs text-[#bdb4a7]">מקום שהתגלה</p>}</div></article>; })}</div>;
}

function JournalPanel({ save }: { save: SaveData }) {
  const discoveredNpcIds = new Set(save.story.visitedLocationIds.flatMap((id) => locationsById[id]?.npcIds ?? []));
  return <div className="grid gap-4 md:grid-cols-2">{npcs.filter((npc) => discoveredNpcIds.has(npc.id)).map((npc) => { const relationship = save.story.relationships[npc.id] ?? npc.initialRelationship; return <article key={npc.id} className="glass-inset grid grid-cols-[5rem_1fr] gap-3 p-3">
    {/* eslint-disable-next-line @next/next/no-img-element -- generated local portrait */}
    <img src={getAssetPath(npc.portraitKey)} alt={`דיוקן של ${npc.name}`} loading="lazy" className="aspect-square w-20 object-cover" /><div><h3 className="display-font text-xl text-[#f0cf82]">{npc.name}</h3><p className="text-xs text-[#9e968a]">{npc.title}</p><p className="mt-2 text-sm leading-6 text-[#c9c0b2]">{npc.journalEntry}</p><div className="mt-3 flex gap-3 text-xs"><span>אמון <bdi>{relationship.trust}</bdi></span><span>כבוד <bdi>{relationship.respect}</bdi></span><span>פחד <bdi>{relationship.fear}</bdi></span></div></div></article>; })}{save.journal.map((entry) => <article key={entry.id} className="parchment-panel p-4"><h3 className="display-font text-xl">{entry.title}</h3><p className="mt-2 text-sm leading-6">{entry.body}</p></article>)}</div>;
}

const merchantItemIds = ["minor-healing-potion", "village-torch", "soldier-rope", "chain-shirt"];
function MerchantPanel({ save, onBuy }: { save: SaveData; onBuy: (itemId: string) => void }) {
  return <div><div className="mb-4 flex items-center justify-between border border-[#c6a15b]/25 bg-black/20 p-3"><p>מירה הניחה לפניך ציוד שנבדק ותוקן.</p><p className="flex items-center gap-2 text-[#f0cf82]"><Coins className="size-5" aria-hidden="true" /> <bdi>{save.character.gold}</bdi> זהב</p></div><div className="grid gap-3 sm:grid-cols-2">{merchantItemIds.map((itemId) => { const item = itemsById[itemId]; return <article key={item.id} className="glass-inset flex gap-3 p-3">
    {/* eslint-disable-next-line @next/next/no-img-element -- generated local icon */}
    <img src={getAssetPath(item.iconAssetKey)} alt="" className="size-20 object-contain" /><div className="flex min-w-0 flex-1 flex-col"><h3 className="font-bold text-[#f2dfb0]">{item.name}</h3><p className="mt-1 flex-1 text-xs leading-5 text-[#a89f91]">{item.description}</p><GameButton size="sm" className="mt-3" disabled={save.character.gold < item.value} onClick={() => onBuy(item.id)}>רכישה · <bdi>{item.value}</bdi> זהב</GameButton></div></article>; })}</div></div>;
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="border border-white/10 bg-black/20 p-3"><dt className="text-xs text-[#9e968a]">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>; }
