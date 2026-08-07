"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Backpack,
  BookOpenText,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleUserRound,
  Compass,
  Footprints,
  Map,
  Menu,
  ScrollText,
  Settings,
  Sparkles,
  Swords,
  WandSparkles,
} from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ArtDirectedPicture } from "@/components/ui/ArtDirectedPicture";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { evaluateCondition } from "@/game/dialogue";
import { locationsById } from "@/content/locations";
import { questsById } from "@/content/quests";
import { classesById } from "@/content/classes";
import { getAssetPath } from "@/lib/assets/manifest";
import { audioManager } from "@/lib/audio/audio-manager";
import { getVisibleConsequences } from "@/content/consequences";
import type { GamePanel } from "@/store/game-store";
import type { LocationExit, LocationInteraction, SaveData } from "@/types/game";

const resourceLabels = {
  stamina: "סיבולת",
  mana: "מאנה",
  focus: "מיקוד",
  faith: "אמונה",
  rage: "זעם",
  authority: "סמכות",
};

const saveLabels = {
  idle: "",
  saving: "שומר בענן…",
  saved: "המשחק נשמר",
  offline: "ממתין לחיבור",
  conflict: "נמצאה שמירה חדשה יותר",
  error: "השמירה נכשלה",
};

const mineLocationIds = new Set(["mine-entrance", "main-tunnel", "abandoned-tool-store", "flooded-passage", "pillar-hall", "hidden-chamber", "guardian-sanctum", "shard-sanctum"]);
const corruptionLocationIds = new Set(["pillar-hall", "hidden-chamber", "guardian-sanctum", "shard-sanctum"]);
const warmInteriorIds = new Set(["wet-raven-inn", "smithy", "healer-hut", "headman-house"]);

export function GameScene({
  save,
  saveStatus,
  onInteraction,
  onTravel,
  onOpenPanel,
  onManualSave,
  onReturnToMenu,
  travelLockedMessage,
}: {
  save: SaveData;
  saveStatus: keyof typeof saveLabels;
  onInteraction: (interaction: LocationInteraction) => void;
  onTravel: (exit: LocationExit) => void;
  onOpenPanel: (panel: Exclude<GamePanel, null>) => void;
  onManualSave: () => void;
  onReturnToMenu: () => void;
  travelLockedMessage?: string;
}) {
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const location = locationsById[save.story.currentLocationId] ?? locationsById["village-gate"];
  const mobileDetailsOpen = expandedLocationId === location.id;
  const isMineLocation = mineLocationIds.has(location.id);
  const isCorruptionLocation = corruptionLocationIds.has(location.id);
  const isWarmInterior = warmInteriorIds.has(location.id);
  const characterClass = classesById[save.character.classId];
  const context = { character: save.character, story: save.story, inventory: save.inventory, quests: save.quests };
  const interactions = location.interactions.filter((interaction) =>
    (interaction.conditions ?? []).every((condition) => evaluateCondition(condition, context)) &&
    !(interaction.oneTime && Boolean(save.story.flags[`interaction_${interaction.id}_completed`])),
  );
  const exits = location.exits.filter((exit) => (exit.conditions ?? []).every((condition) => evaluateCondition(condition, context)));
  const activeQuestState = save.quests.find((quest) => quest.status === "active") ?? save.quests[0];
  const activeQuest = activeQuestState ? questsById[activeQuestState.questId] : undefined;
  const visibleObjectives = activeQuest?.objectives.filter((objective) => activeQuestState?.objectives[objective.id] !== "hidden") ?? [];
  const visibleConsequences = getVisibleConsequences(save.story.flags, location.id);
  const hasHiddenMobileActions = !mobileDetailsOpen && interactions.length > 2;

  useEffect(() => {
    const ambience = mineLocationIds.has(location.id) ? "mine" : "village";
    void audioManager.setAmbience(ambience).catch(() => undefined);
    return () => audioManager.stopAmbience(ambience);
  }, [location.id]);

  return (
    <main id="main-content" data-location={location.id} className="relative h-dvh overflow-hidden bg-[#07090b] pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <ArtDirectedPicture key={location.id} desktopSrc={getAssetPath(location.backgroundAssetKey)} mobileSrc={getAssetPath(`${location.backgroundAssetKey}-mobile`)} alt={location.description} priority pictureClassName="scene-parallax absolute inset-0" className="scene-parallax-image" />
      <div className="scene-grade absolute inset-0" aria-hidden="true" />
      <div className="scene-canvas-grain absolute inset-0" aria-hidden="true" />
      <div className="animate-fog pointer-events-none absolute inset-x-[-10%] bottom-[31%] h-36 bg-[radial-gradient(ellipse,rgba(154,168,166,.1),transparent_68%)] blur-2xl" />
      <div className={`scene-particles pointer-events-none absolute inset-0 ${isCorruptionLocation ? "scene-particles--corruption" : isMineLocation ? "scene-particles--dust" : isWarmInterior ? "scene-particles--embers" : "scene-particles--mist"}`} aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            style={{
              insetInlineStart: `${7 + ((index * 19) % 88)}%`,
              insetBlockStart: `${18 + ((index * 23) % 70)}%`,
              animationDelay: `${index * -0.73}s`,
              animationDuration: `${5.5 + (index % 5) * 1.2}s`,
            }}
          />
        ))}
      </div>
      {isCorruptionLocation ? <div className="scene-rune-light pointer-events-none absolute inset-x-[18%] top-[8%] h-[38%]" aria-hidden="true" /> : isWarmInterior ? <div className="scene-torch-light pointer-events-none absolute bottom-[16%] end-[8%] size-72" aria-hidden="true" /> : null}
      <div className={`scene-foreground pointer-events-none absolute inset-0 ${isMineLocation ? "scene-foreground--mine" : "scene-foreground--open"}`} aria-hidden="true" />

      <header className="safe-inline-area relative z-20 border-b border-[#c6a15b]/22 bg-black/72 pb-2 pt-[max(.5rem,env(safe-area-inset-top))] [--safe-inline-padding:.75rem] backdrop-blur-md sm:[--safe-inline-padding:1.25rem]">
        <div className="mx-auto flex max-w-[110rem] items-center gap-3">
          <button className="group flex min-w-0 flex-1 items-center gap-3 text-right" onClick={() => onOpenPanel("character")} aria-label="פתיחת דף הדמות">
            <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-[#c6a15b]/60">
              <CharacterPortrait portraitKey={save.character.portraitKey} alt="" sizes="44px" className="object-cover" />
            </div>
            <div className="min-w-0 sm:w-56">
              <div className="mb-1 flex items-center gap-2"><b className="truncate text-[#f2e7d3]">{save.character.name}</b><span className="text-xs text-[#c6a15b]">דרגה <bdi>{save.character.level}</bdi></span></div>
              <ProgressBar compact value={save.character.currentHealth} maximum={save.character.derivedStats.maximumHealth} label="חיים" />
            </div>
          </button>
          <div className="hidden w-44 sm:block">
            <ProgressBar compact tone="resource" value={save.character.primaryResource} maximum={save.character.derivedStats.maximumPrimaryResource} label={resourceLabels[characterClass.resourceType]} />
          </div>
          <div className="hidden text-center md:block">
            <p className="display-font text-lg text-[#f0cf82]">{location.name}</p>
            <p className="text-[0.68rem] tracking-[0.12em] text-[#9e968a]">ארצות ואלדר · הצללים שמתחת לערפלון</p>
          </div>
          <span className={`hidden min-w-28 text-left text-xs sm:block ${saveStatus === "error" || saveStatus === "conflict" ? "text-[#ef827b]" : "text-[#9e968a]"}`} role="status">{saveLabels[saveStatus]}</span>
          <GameButton variant="ghost" size="icon" onClick={() => onOpenPanel("settings")} aria-label="הגדרות"><Settings className="size-5" aria-hidden="true" /></GameButton>
          <GameButton variant="ghost" size="icon" onClick={onReturnToMenu} aria-label="חזרה לתפריט"><Menu className="size-5" aria-hidden="true" /></GameButton>
        </div>
      </header>

      <div className="safe-inline-area absolute inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] top-[calc(3.85rem+env(safe-area-inset-top))] z-10 mx-auto grid max-w-[110rem] items-end gap-4 pt-[48dvh] [--safe-inline-padding:.75rem] sm:[--safe-inline-padding:1.25rem] lg:bottom-0 lg:grid-cols-[18rem_minmax(0,1fr)_19rem] lg:items-stretch lg:pb-5 lg:pt-5">
        <aside className="stone-panel hidden self-end p-4 lg:block" aria-label="משימות">
          <div className="mb-3 flex items-center gap-2 text-[#f0cf82]"><ScrollText className="size-5" aria-hidden="true" /><h2 className="display-font text-xl">יומן המשימה</h2></div>
          {activeQuest && activeQuestState ? (
            <div>
              <p className="font-bold text-[#e8dfce]">{activeQuest.name}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {visibleObjectives.slice(0, 6).map((objective) => {
                  const status = activeQuestState.objectives[objective.id];
                  return <li key={objective.id} className={`flex gap-2 ${status === "completed" ? "text-[#77b686] line-through" : "text-[#bdb4a7]"}`}><span aria-hidden="true">{status === "completed" ? "✓" : "◇"}</span><span>{objective.text}</span>{objective.optional ? <span className="sr-only">יעד רשות</span> : null}</li>;
                })}
              </ul>
              <GameButton variant="ghost" size="sm" className="mt-3 w-full" onClick={() => onOpenPanel("quests")}>פתיחת היומן</GameButton>
            </div>
          ) : <p className="text-sm text-[#9e968a]">אין משימה פעילה. כדאי לדבר עם אנשי הכפר.</p>}
        </aside>

        <section className={`stone-panel scene-action-sheet relative flex max-h-full min-h-0 self-end flex-col overflow-hidden transition-[max-height] duration-200 lg:self-stretch ${mobileDetailsOpen ? "max-h-[58dvh]" : "max-h-[38dvh]"}`} aria-labelledby="location-title">
          <div className="shrink-0 border-b border-[#c6a15b]/18 bg-black/15 px-3 py-2.5 sm:p-5">
            <div className="mb-1 flex items-center justify-between gap-3 sm:mb-2">
              <div className="flex items-center gap-2 text-[#c6a15b]"><Compass className="size-4" aria-hidden="true" /><span className="text-[0.68rem] font-bold tracking-[0.18em] sm:text-xs">מיקום נוכחי</span></div>
              <button type="button" className="inline-flex min-h-9 items-center gap-1 px-2 text-xs text-[#d9c89f] outline-none hover:text-[#f0cf82] focus-visible:ring-2 focus-visible:ring-[#70c7da] lg:hidden" onClick={() => setExpandedLocationId((current) => current === location.id ? null : location.id)} aria-expanded={mobileDetailsOpen} aria-controls="location-actions">
                {mobileDetailsOpen ? "צמצום" : "כל הפעולות"}
                {mobileDetailsOpen ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronUp className="size-4" aria-hidden="true" />}
              </button>
            </div>
            <motion.h1 key={location.id} id="location-title" className="display-font text-[1.65rem] leading-tight text-[#f2dfb0] sm:text-4xl" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{location.name}</motion.h1>
            <motion.p key={`${location.id}-description`} className={`${mobileDetailsOpen ? "line-clamp-none" : "line-clamp-2"} mt-1 max-w-4xl text-xs leading-5 text-[#c9c0b2] sm:mt-3 sm:text-base sm:leading-7 lg:line-clamp-none`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{location.description}</motion.p>
          </div>

          {visibleConsequences.length > 0 ? (
            <div className="shrink-0 border-b border-[#c6a15b]/14 bg-black/20 px-3 py-2 sm:px-4" aria-label="השפעות הבחירות שלך">
              {visibleConsequences.slice(0, mobileDetailsOpen ? 2 : 1).map((consequence) => (
                <div key={consequence.key} className={`scene-consequence scene-consequence--${consequence.tone}`}>
                  <WandSparkles className="size-3.5 shrink-0" aria-hidden="true" />
                  <p className="min-w-0 text-[0.7rem] leading-4 sm:text-xs"><strong>{consequence.title}:</strong> <span className={`block ${mobileDetailsOpen ? "" : "line-clamp-1"}`}>{consequence.detail}</span></p>
                </div>
              ))}
            </div>
          ) : null}

          <div id="location-actions" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-1.5 p-2 sm:grid-cols-2 sm:gap-2 sm:p-4" aria-label="פעולות במקום">
            {interactions.map((interaction, index) => (
              <button key={interaction.id} data-testid={`interaction-${interaction.id}`} className={`group min-h-12 border border-white/10 bg-white/[.025] px-3 py-2 text-right transition hover:border-[#c6a15b]/55 hover:bg-[#c6a15b]/8 sm:min-h-16 sm:p-3 ${!mobileDetailsOpen && index >= 2 ? "hidden sm:block" : ""}`} onClick={() => onInteraction(interaction)}>
                <span className="flex items-center gap-2 font-bold text-[#e5dac7] group-hover:text-[#f0cf82]">{interaction.encounterId ? <Swords className="size-4 text-[#d05b54]" aria-hidden="true" /> : interaction.skillCheck ? <Sparkles className="size-4 text-[#62c6df]" aria-hidden="true" /> : <BookOpenText className="size-4 text-[#c6a15b]" aria-hidden="true" />}{interaction.label}</span>
                <span className={`${mobileDetailsOpen ? "block" : "hidden"} mt-1 text-xs leading-5 text-[#9f978b] sm:block`}>{interaction.description}</span>
              </button>
            ))}
            {hasHiddenMobileActions ? <button type="button" className="min-h-10 border border-dashed border-[#c6a15b]/35 px-3 text-xs font-bold text-[#d9bf7c] hover:bg-[#c6a15b]/8 sm:hidden" onClick={() => setExpandedLocationId(location.id)}>עוד {interactions.length - 2} פעולות</button> : null}
            {interactions.length === 0 ? <p className="p-3 text-sm text-[#9e968a]">מיצית את החקירה במקום הזה. אפשר להמשיך בדרך.</p> : null}
          </div>
          <nav className="sticky bottom-0 flex flex-wrap gap-1.5 border-t border-[#c6a15b]/18 bg-[#090b0e]/96 p-2 backdrop-blur sm:gap-2 sm:p-3" aria-label="דרכי יציאה">
            {travelLockedMessage ? <p className="w-full text-xs text-[#d9bf7c]" role="status">{travelLockedMessage}</p> : null}
            {exits.map((exit) => <GameButton key={exit.destinationId} variant="secondary" size="sm" disabled={Boolean(travelLockedMessage)} onClick={() => onTravel(exit)} data-testid={`travel-${exit.destinationId}`}><Footprints className="size-4" aria-hidden="true" />{exit.label}<ChevronLeft className="size-4" aria-hidden="true" /></GameButton>)}
          </nav>
          </div>
        </section>

        <aside className="stone-panel hidden self-end p-4 lg:block" aria-label="מידע על הדמות">
          <h2 className="display-font text-xl text-[#f0cf82]">{save.character.name}</h2>
          <p className="mt-1 text-sm text-[#a89f91]">{characterClass.name} · דרגה <bdi>{save.character.level}</bdi></p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <button className="glass-inset min-h-16 p-3 hover:border-[#c6a15b]/50" onClick={() => onOpenPanel("inventory")}><Backpack className="mx-auto mb-1 size-5 text-[#c6a15b]" aria-hidden="true" />תיק · <bdi>{save.inventory.reduce((sum, item) => sum + item.quantity, 0)}</bdi></button>
            <button className="glass-inset min-h-16 p-3 hover:border-[#c6a15b]/50" onClick={() => onOpenPanel("map")}><Map className="mx-auto mb-1 size-5 text-[#62c6df]" aria-hidden="true" />מפה · <bdi>{save.discoveredLocationIds.length}</bdi></button>
            <button className="glass-inset min-h-16 p-3 hover:border-[#c6a15b]/50" onClick={() => onOpenPanel("journal")}><BookOpenText className="mx-auto mb-1 size-5 text-[#c6a15b]" aria-hidden="true" />רשומות</button>
            <button className="glass-inset min-h-16 p-3 hover:border-[#c6a15b]/50" onClick={onManualSave}><Sparkles className="mx-auto mb-1 size-5 text-[#77b686]" aria-hidden="true" />שמירה</button>
          </div>
          <div className="mt-4 border-t border-white/10 pt-3 text-xs text-[#9e968a]">
            <p>זהב: <bdi className="text-[#f0cf82]">{save.character.gold}</bdi></p>
            <p>מוניטין: <bdi>{save.character.reputation}</bdi></p>
            <p>ניסיון: <bdi>{save.character.experience}</bdi></p>
          </div>
        </aside>
      </div>

      <nav data-testid="mobile-hud" className="safe-inline-area fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#c6a15b]/25 bg-[#090b0e]/97 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="פעולות מהירות">
        <MobileNav icon={Backpack} label="תיק" onClick={() => onOpenPanel("inventory")} />
        <MobileNav icon={ScrollText} label="משימות" onClick={() => onOpenPanel("quests")} />
        <MobileNav icon={CircleUserRound} label="דמות" onClick={() => onOpenPanel("character")} />
        <MobileNav icon={Map} label="מפה" onClick={() => onOpenPanel("map")} />
      </nav>
    </main>
  );
}

function MobileNav({ icon: Icon, label, onClick }: { icon: typeof Backpack; label: string; onClick: () => void }) {
  return <button className="flex min-h-14 touch-manipulation flex-col items-center justify-center gap-0.5 text-[0.68rem] text-[#c7beaf] hover:bg-white/5 hover:text-[#f0cf82] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#70c7da]" onClick={onClick}><Icon className="size-[1.15rem]" aria-hidden="true" /><span>{label}</span></button>;
}
