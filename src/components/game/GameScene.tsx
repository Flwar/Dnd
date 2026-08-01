"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Backpack,
  BookOpenText,
  ChevronLeft,
  CircleUserRound,
  Compass,
  Footprints,
  Map,
  Menu,
  ScrollText,
  Settings,
  Sparkles,
  Swords,
} from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { evaluateCondition } from "@/game/dialogue";
import { locationsById } from "@/content/locations";
import { questsById } from "@/content/quests";
import { classesById } from "@/content/classes";
import { getAssetPath } from "@/lib/assets/manifest";
import { audioManager } from "@/lib/audio/audio-manager";
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

export function GameScene({
  save,
  saveStatus,
  onInteraction,
  onTravel,
  onOpenPanel,
  onManualSave,
  onReturnToMenu,
}: {
  save: SaveData;
  saveStatus: keyof typeof saveLabels;
  onInteraction: (interaction: LocationInteraction) => void;
  onTravel: (exit: LocationExit) => void;
  onOpenPanel: (panel: Exclude<GamePanel, null>) => void;
  onManualSave: () => void;
  onReturnToMenu: () => void;
}) {
  const location = locationsById[save.story.currentLocationId] ?? locationsById["village-gate"];
  const isMineLocation = mineLocationIds.has(location.id);
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

  useEffect(() => {
    const ambience = mineLocationIds.has(location.id) ? "mine" : "village";
    void audioManager.setAmbience(ambience).catch(() => undefined);
    return () => audioManager.stopAmbience(ambience);
  }, [location.id]);

  return (
    <main id="main-content" className="relative min-h-dvh overflow-x-hidden bg-[#07090b] pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:h-dvh lg:overflow-hidden lg:pb-0">
      <picture key={location.id} className="scene-parallax absolute inset-0">
        <source media="(max-width: 760px)" srcSet={getAssetPath(`${location.backgroundAssetKey}-mobile`)} />
        <img src={getAssetPath(location.backgroundAssetKey)} alt={location.description} className="scene-parallax-image size-full object-cover" />
      </picture>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,8,.2),rgba(4,6,8,.48)_48%,rgba(4,6,8,.96)_100%),radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,.62)_100%)]" />
      <div className="animate-fog pointer-events-none absolute inset-x-[-10%] bottom-[28%] h-44 bg-[radial-gradient(ellipse,rgba(154,188,197,.14),transparent_68%)] blur-2xl" />
      <div className={`scene-particles pointer-events-none absolute inset-0 ${isMineLocation ? "scene-particles--mine" : "scene-particles--village"}`} aria-hidden="true">
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
      {isMineLocation ? <div className="scene-rune-light pointer-events-none absolute inset-x-[18%] top-[8%] h-[38%]" aria-hidden="true" /> : <div className="scene-torch-light pointer-events-none absolute bottom-[16%] end-[8%] size-72" aria-hidden="true" />}

      <header className="safe-inline-area relative z-20 border-b border-[#c6a15b]/22 bg-black/72 py-2 [--safe-inline-padding:.75rem] backdrop-blur-md sm:[--safe-inline-padding:1.25rem]">
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

      <div className="safe-inline-area relative z-10 mx-auto grid min-h-[calc(100dvh-4.1rem)] max-w-[110rem] items-end gap-4 pb-5 pt-[35dvh] [--safe-inline-padding:.75rem] sm:[--safe-inline-padding:1.25rem] lg:grid-cols-[18rem_minmax(0,1fr)_19rem] lg:items-stretch lg:pb-5 lg:pt-5">
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

        <section className="stone-panel relative self-end overflow-hidden" aria-labelledby="location-title">
          <div className="border-b border-[#c6a15b]/18 bg-black/15 p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2 text-[#c6a15b]"><Compass className="size-4" aria-hidden="true" /><span className="text-xs font-bold tracking-[0.18em]">מיקום נוכחי</span></div>
            <motion.h1 key={location.id} id="location-title" className="display-font text-3xl text-[#f2dfb0] sm:text-4xl" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{location.name}</motion.h1>
            <motion.p key={`${location.id}-description`} className="mt-3 max-w-4xl text-sm leading-7 text-[#c9c0b2] sm:text-base" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{location.description}</motion.p>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4" aria-label="פעולות במקום">
            {interactions.map((interaction) => (
              <button key={interaction.id} data-testid={`interaction-${interaction.id}`} className="group min-h-16 border border-white/10 bg-white/[.025] p-3 text-right transition hover:border-[#c6a15b]/55 hover:bg-[#c6a15b]/8" onClick={() => onInteraction(interaction)}>
                <span className="flex items-center gap-2 font-bold text-[#e5dac7] group-hover:text-[#f0cf82]">{interaction.encounterId ? <Swords className="size-4 text-[#d05b54]" aria-hidden="true" /> : interaction.skillCheck ? <Sparkles className="size-4 text-[#62c6df]" aria-hidden="true" /> : <BookOpenText className="size-4 text-[#c6a15b]" aria-hidden="true" />}{interaction.label}</span>
                <span className="mt-1 block text-xs leading-5 text-[#9f978b]">{interaction.description}</span>
              </button>
            ))}
            {interactions.length === 0 ? <p className="p-3 text-sm text-[#9e968a]">מיצית את החקירה במקום הזה. אפשר להמשיך בדרך.</p> : null}
          </div>
          <nav className="flex flex-wrap gap-2 border-t border-[#c6a15b]/18 bg-black/25 p-3" aria-label="דרכי יציאה">
            {exits.map((exit) => <GameButton key={exit.destinationId} variant="secondary" size="sm" onClick={() => onTravel(exit)} data-testid={`travel-${exit.destinationId}`}><Footprints className="size-4" aria-hidden="true" />{exit.label}<ChevronLeft className="size-4" aria-hidden="true" /></GameButton>)}
          </nav>
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
