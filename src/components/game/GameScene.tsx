"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Backpack,
  BookOpenText,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleUserRound,
  Cloud,
  CloudOff,
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

const sceneParticles = Array.from({ length: 10 }, (_, index) => ({
  id: `scene-particle-${index}`,
  insetInlineStart: `${7 + ((index * 19) % 88)}%`,
  insetBlockStart: `${18 + ((index * 23) % 70)}%`,
  animationDelay: `${index * -0.73}s`,
  animationDuration: `${5.5 + (index % 5) * 1.2}s`,
}));

const activeSaveStatuses = new Set<keyof typeof saveLabels>(["saving", "offline", "conflict", "error"]);

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
  const prefersReducedMotion = useReducedMotion();
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
  const inventoryItemCount = save.inventory.reduce((sum, item) => sum + item.quantity, 0);
  const hasActiveSaveStatus = activeSaveStatuses.has(saveStatus);
  const locationMotion = prefersReducedMotion
    ? { initial: false as const, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 9 }, animate: { opacity: 1, y: 0 } };

  useEffect(() => {
    const ambience = mineLocationIds.has(location.id) ? "mine" : "village";
    void audioManager.setAmbience(ambience).catch(() => undefined);
    return () => audioManager.stopAmbience(ambience);
  }, [location.id]);

  return (
    <main id="main-content" data-location={location.id} className="relative h-dvh overflow-hidden bg-[#07090b]">
      <ArtDirectedPicture key={location.id} desktopSrc={getAssetPath(location.backgroundAssetKey)} mobileSrc={getAssetPath(`${location.backgroundAssetKey}-mobile`)} alt={location.description} priority pictureClassName="scene-parallax absolute inset-0" className="scene-parallax-image" />
      <div className="scene-grade absolute inset-0" aria-hidden="true" />
      <div className="scene-canvas-grain absolute inset-0" aria-hidden="true" />
      <div className="animate-fog pointer-events-none absolute inset-x-[-10%] bottom-[24%] h-36 bg-[radial-gradient(ellipse,rgba(154,168,166,.1),transparent_68%)] blur-2xl" />
      <div className={`scene-particles pointer-events-none absolute inset-0 ${isCorruptionLocation ? "scene-particles--corruption" : isMineLocation ? "scene-particles--dust" : isWarmInterior ? "scene-particles--embers" : "scene-particles--mist"}`} aria-hidden="true">
        {sceneParticles.map((particle) => (
          <span
            key={particle.id}
            style={{
              insetInlineStart: particle.insetInlineStart,
              insetBlockStart: particle.insetBlockStart,
              animationDelay: particle.animationDelay,
              animationDuration: particle.animationDuration,
            }}
          />
        ))}
      </div>
      {isCorruptionLocation ? <div className="scene-rune-light pointer-events-none absolute inset-x-[18%] top-[8%] h-[38%]" aria-hidden="true" /> : isWarmInterior ? <div className="scene-torch-light pointer-events-none absolute bottom-[16%] end-[8%] size-72" aria-hidden="true" /> : null}
      <div className={`scene-foreground pointer-events-none absolute inset-0 ${isMineLocation ? "scene-foreground--mine" : "scene-foreground--open"}`} aria-hidden="true" />

      <header className="safe-inline-area absolute inset-x-0 top-0 z-30 pt-[max(.4rem,env(safe-area-inset-top))] [--safe-inline-padding:.5rem] sm:[--safe-inline-padding:1rem] lg:border-b lg:border-[#c6a15b]/18 lg:bg-black/65 lg:pb-2 lg:backdrop-blur-md">
        <div className="mx-auto flex max-w-[110rem] items-center gap-2 rounded-sm border border-[#c6a15b]/22 bg-[#080a0d]/88 px-2 py-1.5 shadow-[0_12px_35px_rgba(0,0,0,.38)] backdrop-blur-md sm:gap-3 sm:px-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
          <button className="group flex min-w-0 flex-1 items-center gap-3 text-right" onClick={() => onOpenPanel("character")} aria-label="פתיחת דף הדמות">
            <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-[#c6a15b]/60 shadow-[0_0_18px_rgba(198,161,91,.16)] sm:size-11">
              <CharacterPortrait portraitKey={save.character.portraitKey} alt="" sizes="44px" className="object-cover" priority />
            </div>
            <div className="min-w-0 w-32 sm:w-56">
              <div className="mb-1 flex items-center gap-2"><b className="truncate text-sm text-[#f2e7d3] sm:text-base">{save.character.name}</b><span className="shrink-0 text-[0.62rem] text-[#c6a15b] sm:text-xs">דרגה <bdi>{save.character.level}</bdi></span></div>
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
          <span className={`${hasActiveSaveStatus ? "flex" : "hidden sm:flex"} min-w-0 items-center gap-1.5 text-[0.65rem] sm:min-w-28 sm:text-xs ${saveStatus === "error" || saveStatus === "conflict" ? "text-[#ef827b]" : "text-[#a9c9c1]"}`} role="status">
            {saveStatus === "offline" || saveStatus === "error" ? <CloudOff className="size-3.5 shrink-0" aria-hidden="true" /> : <Cloud className="size-3.5 shrink-0" aria-hidden="true" />}
            <span className="hidden sm:inline">{saveLabels[saveStatus]}</span>
            <span className="sr-only sm:hidden">{saveLabels[saveStatus]}</span>
          </span>
          <GameButton variant="ghost" size="icon" className="hidden h-10 w-10 sm:inline-flex" onClick={() => onOpenPanel("settings")} aria-label="הגדרות"><Settings className="size-5" aria-hidden="true" /></GameButton>
          <GameButton variant="ghost" size="icon" className="h-10 w-10" onClick={onReturnToMenu} aria-label="חזרה לתפריט"><Menu className="size-5" aria-hidden="true" /></GameButton>
        </div>
      </header>

      <div className="safe-inline-area absolute inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] top-[calc(3.8rem+env(safe-area-inset-top))] z-10 mx-auto grid max-w-[110rem] items-end gap-4 [--safe-inline-padding:.5rem] sm:[--safe-inline-padding:1rem] lg:bottom-0 lg:top-[4.25rem] lg:grid-cols-[18rem_minmax(0,1fr)_19rem] lg:items-stretch lg:pb-5 lg:pt-5">
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

        <section className={`stone-panel scene-action-sheet relative flex min-h-0 self-end flex-col overflow-hidden rounded-t-xl border-[#c6a15b]/32 bg-[linear-gradient(155deg,rgba(27,29,32,.94),rgba(7,9,12,.97))] backdrop-blur-md transition-[max-height] duration-200 lg:max-h-full lg:self-stretch lg:rounded-md ${mobileDetailsOpen ? "max-h-[68dvh]" : "max-h-[36dvh]"}`} aria-labelledby="location-title" aria-describedby="location-description">
          <div className="mx-auto mt-1.5 h-1 w-10 shrink-0 rounded-full bg-[#c6a15b]/35 lg:hidden" aria-hidden="true" />
          <div className="shrink-0 border-b border-[#c6a15b]/18 bg-black/15 px-3 pb-2.5 pt-1.5 sm:p-5">
            <div className="mb-1 flex items-center justify-between gap-3 sm:mb-2">
              <div className="flex items-center gap-2 text-[#c6a15b]"><Compass className="size-4" aria-hidden="true" /><span className="text-[0.64rem] font-bold tracking-[0.16em] sm:text-xs">מיקום נוכחי</span></div>
              <button type="button" className="inline-flex min-h-9 items-center gap-1 px-2 text-xs text-[#d9c89f] outline-none hover:text-[#f0cf82] focus-visible:ring-2 focus-visible:ring-[#70c7da] lg:hidden" onClick={() => setExpandedLocationId((current) => current === location.id ? null : location.id)} aria-expanded={mobileDetailsOpen} aria-controls="location-actions">
                {mobileDetailsOpen ? "צמצום" : "כל הפעולות"}
                {mobileDetailsOpen ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronUp className="size-4" aria-hidden="true" />}
              </button>
            </div>
            <motion.h1 key={location.id} id="location-title" className="display-font text-[1.55rem] leading-tight text-[#f2dfb0] drop-shadow-[0_2px_8px_rgba(0,0,0,.8)] sm:text-4xl" {...locationMotion} transition={{ duration: 0.24 }}>{location.name}</motion.h1>
            <motion.p key={`${location.id}-description`} id="location-description" className={`${mobileDetailsOpen ? "line-clamp-none" : "line-clamp-1"} mt-1 max-w-4xl text-xs leading-5 text-[#c9c0b2] sm:mt-3 sm:text-base sm:leading-7 lg:line-clamp-none`} initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }}>{location.description}</motion.p>
          </div>

          {visibleConsequences.length > 0 ? (
            <div className="shrink-0 border-b border-[#c6a15b]/14 bg-[linear-gradient(90deg,rgba(198,161,91,.07),transparent)] px-3 py-2 sm:px-4" aria-label="השפעות הבחירות שלך">
              {visibleConsequences.slice(0, mobileDetailsOpen ? 2 : 1).map((consequence) => (
                <div key={consequence.key} className={`scene-consequence scene-consequence--${consequence.tone}`}>
                  <WandSparkles className="size-3.5 shrink-0" aria-hidden="true" />
                  <p className="min-w-0 text-[0.68rem] leading-4 sm:text-xs"><strong className="tracking-wide">העולם השתנה · {consequence.title}</strong><span className={`block text-[#c5bdaf] ${mobileDetailsOpen ? "" : "line-clamp-1"}`}>{consequence.detail}</span></p>
                </div>
              ))}
            </div>
          ) : null}

          <div id="location-actions" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="grid gap-1.5 p-2 sm:grid-cols-2 sm:gap-2 sm:p-4" aria-label="פעולות במקום">
            {interactions.map((interaction, index) => (
              <button key={interaction.id} data-testid={`interaction-${interaction.id}`} className={`group min-h-12 border border-white/10 bg-[linear-gradient(115deg,rgba(255,255,255,.035),rgba(255,255,255,.012))] px-3 py-2 text-right shadow-[inset_0_1px_rgba(255,255,255,.025)] transition hover:border-[#c6a15b]/55 hover:bg-[#c6a15b]/8 focus-visible:z-10 sm:min-h-16 sm:p-3 ${!mobileDetailsOpen && index >= 2 ? "hidden sm:block" : ""}`} onClick={() => onInteraction(interaction)}>
                <span className="flex items-center gap-2 font-bold text-[#e5dac7] group-hover:text-[#f0cf82]">{interaction.encounterId ? <Swords className="size-4 text-[#e66f67]" aria-hidden="true" /> : interaction.skillCheck ? <Sparkles className="size-4 text-[#75dbf2]" aria-hidden="true" /> : <BookOpenText className="size-4 text-[#d4b36d]" aria-hidden="true" />}{interaction.label}</span>
                <span className={`${mobileDetailsOpen ? "block" : "hidden"} mt-1 text-xs leading-5 text-[#9f978b] sm:block`}>{interaction.description}</span>
              </button>
            ))}
            {hasHiddenMobileActions ? <button type="button" className="min-h-10 border border-dashed border-[#c6a15b]/35 px-3 text-xs font-bold text-[#d9bf7c] hover:bg-[#c6a15b]/8 sm:hidden" onClick={() => setExpandedLocationId(location.id)}>עוד {interactions.length - 2} פעולות</button> : null}
            {interactions.length === 0 ? <p className="p-3 text-sm text-[#9e968a]">מיצית את החקירה במקום הזה. אפשר להמשיך בדרך.</p> : null}
          </div>
          </div>
          <nav className="flex shrink-0 flex-wrap gap-1.5 border-t border-[#c6a15b]/18 bg-[#080a0d]/98 p-2 shadow-[0_-10px_25px_rgba(0,0,0,.35)] backdrop-blur sm:gap-2 sm:p-3" aria-label="דרכי יציאה">
            {travelLockedMessage ? <p className="w-full text-xs text-[#d9bf7c]" role="status">{travelLockedMessage}</p> : null}
            {exits.map((exit) => <GameButton key={exit.destinationId} variant="secondary" size="sm" disabled={Boolean(travelLockedMessage)} onClick={() => onTravel(exit)} data-testid={`travel-${exit.destinationId}`}><Footprints className="size-4" aria-hidden="true" />{exit.label}<ChevronLeft className="size-4" aria-hidden="true" /></GameButton>)}
          </nav>
        </section>

        <aside className="stone-panel hidden self-end p-4 lg:block" aria-label="מידע על הדמות">
          <h2 className="display-font text-xl text-[#f0cf82]">{save.character.name}</h2>
          <p className="mt-1 text-sm text-[#a89f91]">{characterClass.name} · דרגה <bdi>{save.character.level}</bdi></p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <button className="glass-inset min-h-16 p-3 hover:border-[#c6a15b]/50" onClick={() => onOpenPanel("inventory")}><Backpack className="mx-auto mb-1 size-5 text-[#c6a15b]" aria-hidden="true" />תיק · <bdi>{inventoryItemCount}</bdi></button>
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

      <nav data-testid="mobile-hud" className="safe-inline-area pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[max(.3rem,env(safe-area-inset-bottom))] [--safe-inline-padding:.5rem] lg:hidden" aria-label="פעולות מהירות">
        <div className="pointer-events-auto mx-auto grid max-w-md grid-cols-4 overflow-hidden rounded-t-lg border border-b-0 border-[#c6a15b]/30 bg-[#080a0d]/94 shadow-[0_-10px_35px_rgba(0,0,0,.48)] backdrop-blur-md">
          <MobileNav icon={Backpack} label="תיק" onClick={() => onOpenPanel("inventory")} />
          <MobileNav icon={ScrollText} label="משימות" onClick={() => onOpenPanel("quests")} />
          <MobileNav icon={CircleUserRound} label="דמות" onClick={() => onOpenPanel("character")} />
          <MobileNav icon={Map} label="מפה" onClick={() => onOpenPanel("map")} />
        </div>
      </nav>
    </main>
  );
}

function MobileNav({ icon: Icon, label, onClick }: { icon: typeof Backpack; label: string; onClick: () => void }) {
  return <button className="flex min-h-12 touch-manipulation flex-col items-center justify-center gap-0.5 border-e border-white/[.055] text-[0.6rem] text-[#c7beaf] transition-colors last:border-e-0 hover:bg-white/5 hover:text-[#f0cf82] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#70c7da]" onClick={onClick}><Icon className="size-[1.05rem]" aria-hidden="true" /><span>{label}</span></button>;
}
