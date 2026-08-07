"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, BookOpenCheck, CircleHelp, Crosshair, ShieldAlert, Swords } from "lucide-react";
import { ActionDock } from "./ActionDock";
import { CombatLog } from "./CombatLog";
import { CombatOutcome } from "./CombatOutcome";
import { CombatantCard } from "./CombatantCard";
import { TurnOrder } from "./TurnOrder";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { getAssetPath } from "@/lib/assets/manifest";
import { ArtDirectedPicture } from "@/components/ui/ArtDirectedPicture";
import type { CombatUIProps } from "./types";

const encounterBackdrops: Readonly<Record<string, string>> = {
  "tutorial-rat": "background-mine-entrance",
  "road-ambush": "background-mine-road",
  "flooded-passage-pack": "background-flooded-passage",
  "stone-guardian-boss": "background-guardian-sanctum",
};

export function CombatUI({
  state,
  playerCombatantId,
  abilities,
  items,
  statusDefinitions,
  enemyIntents = {},
  selectedTargetId,
  objective,
  tutorialHints = [],
  busy = false,
  reducedMotion = false,
  onAbility,
  onTarget,
  onDefend,
  onConsumable,
  onEscape,
  onRetry,
  onContinue,
}: CombatUIProps) {
  const screenRef = useRef<HTMLElement>(null);
  const systemReducedMotion = useReducedMotion();
  const shouldReduceMotion = reducedMotion || Boolean(systemReducedMotion);
  const player = state.combatants[playerCombatantId];
  const activeCombatantId = state.turnOrder[state.activeTurnIndex];
  const activeCombatant = state.combatants[activeCombatantId];
  const selectedTarget = selectedTargetId ? state.combatants[selectedTargetId] ?? null : null;
  const allies = Object.values(state.combatants).filter((combatant) => combatant.kind === "player");
  const enemies = Object.values(state.combatants).filter((combatant) => combatant.kind === "enemy");
  const livingEnemies = enemies.filter((combatant) => !combatant.defeated);
  const canAct = state.phase === "active" && activeCombatantId === playerCombatantId && !player?.defeated;
  const guardian = enemies.find((combatant) => combatant.enemyId === "ancient-stone-guardian");
  const guardianTelegraph = guardian?.statuses.some((status) => status.statusId === "telegraphed");
  const backdropKey = encounterBackdrops[state.encounterId] ?? "background-main-tunnel";

  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollY = window.scrollY;
    const previousBodyStyles = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    const previousOverscrollBehavior = root.style.overscrollBehavior;
    const releaseScrollLock = acquireBodyScrollLock();

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    root.style.overscrollBehavior = "none";
    screenRef.current?.focus({ preventScroll: true });

    return () => {
      releaseScrollLock();
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.width = previousBodyStyles.width;
      root.style.overscrollBehavior = previousOverscrollBehavior;
      if (scrollY > 0) window.scrollTo({ top: scrollY, behavior: "instant" });
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  if (!player) {
    return (
      <main
        ref={screenRef}
        tabIndex={-1}
        dir="rtl"
        aria-label="שגיאה בפתיחת הקרב"
        className="fixed inset-0 z-[120] grid h-dvh w-screen place-items-center overflow-hidden bg-[#07090b] p-4 text-[#ffd0cb] outline-none"
      >
        <section role="alert" className="max-w-xl border border-[#d05b54]/55 bg-[#35131a] p-6">
          <h1 className="text-xl font-bold">לא ניתן לפתוח את הקרב</h1>
          <p className="mt-2">הדמות הפעילה אינה נמצאת במצב הקרב. יש לרענן את המפגש או לחזור לנקודת השמירה.</p>
        </section>
      </main>
    );
  }

  const outcome = state.phase === "victory" ? "victory" : state.phase === "defeat" ? "defeat" : state.phase === "escaped" ? "escaped" : null;

  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? "always" : "user"}>
      <main
        ref={screenRef}
        tabIndex={-1}
        dir="rtl"
        aria-label="זירת הקרב"
        data-testid="combat-screen"
        data-locks-exploration="true"
        className="fixed inset-0 z-[120] isolate flex h-dvh w-screen flex-col overflow-hidden bg-[#050607] text-[#eee5d6] outline-none"
      >
        <ArtDirectedPicture desktopSrc={getAssetPath(backdropKey)} mobileSrc={getAssetPath(`${backdropKey}-mobile`)} alt="" priority pictureClassName="pointer-events-none absolute inset-0 -z-20" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,4,5,.42),rgba(3,5,6,.72)_45%,rgba(2,3,4,.94)),radial-gradient(ellipse_at_50%_42%,transparent_15%,rgba(0,0,0,.62)_95%)]" />

        <header className="safe-inline-area shrink-0 border-b border-[#c6a15b]/25 bg-[linear-gradient(90deg,rgba(17,20,23,.96),rgba(35,26,17,.88),rgba(17,20,23,.96))] px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-[0_12px_32px_rgba(0,0,0,.35)] sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <span className="grid size-9 shrink-0 place-items-center border border-[#c6a15b]/40 bg-black/30 text-[#f0cf82] sm:size-11"><Swords className="size-5 sm:size-6" aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="hidden text-[0.65rem] font-bold tracking-[0.22em] text-[#70c7da] sm:block">עימות טקטי</p>
                <h1 id="combat-screen-title" className="truncate text-lg font-bold text-[#f0cf82] sm:text-2xl">{state.encounterId === "stone-guardian-boss" ? "המשמר האחרון" : "קרב במעמקי ערפלון"}</h1>
              </div>
            </div>
            <div className="min-w-0 shrink-0 border-s border-[#c6a15b]/25 ps-3 text-xs sm:ps-4 sm:text-sm">
              <span className="block text-xs text-[#8f877a]">התור הנוכחי</span>
              <strong className="block max-w-28 truncate text-[#f2e8d7] sm:max-w-56" aria-live="polite">{activeCombatant?.name ?? "קביעת יוזמה"}</strong>
            </div>
          </div>
        </header>

        <TurnOrder state={state} playerCombatantId={playerCombatantId} />

        {guardianTelegraph ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 border-b border-[#d05b54]/55 bg-[#4f171d]/90 px-3 py-2 text-center text-xs font-bold text-[#ffd0cb] sm:px-4 sm:py-3 sm:text-sm"
            role="alert"
          >
            <AlertTriangle className="me-2 inline size-4" aria-hidden="true" />
            שומר האבן מכין ריסוק רוני. התגוננו עכשיו או שברו את המשמר כדי לחשוף את הרונה.
          </motion.div>
        ) : null}

        <div className="mx-auto min-h-0 w-full max-w-[96rem] flex-1 overflow-hidden">
          <section
            aria-labelledby="battlefield-title"
            data-testid="combat-battlefield-scroll-region"
            className="mx-auto grid h-full min-w-0 max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] gap-2 overflow-hidden px-2 py-2 sm:gap-3 sm:px-5 sm:py-4"
          >
            <section aria-labelledby="combat-objective-title" className="flex items-center gap-2 border border-[#c6a15b]/28 bg-[#100e0b]/84 px-2.5 py-1.5 backdrop-blur sm:px-4 sm:py-3">
              <BookOpenCheck className="size-4 shrink-0 text-[#f0cf82]" aria-hidden="true" />
              <h2 id="combat-objective-title" className="sr-only">מטרת הקרב</h2>
              <p className="line-clamp-1 min-w-0 text-xs font-semibold text-[#ddd2bf] sm:line-clamp-2 sm:text-sm">{objective}</p>
            </section>

            <div className="grid min-h-0 grid-cols-2 gap-2 sm:gap-4">
              <section className="flex min-h-0 flex-col" aria-labelledby="allies-title">
              <div className="mb-1 flex items-center justify-between gap-1 px-1 sm:mb-2">
                <h2 id="allies-title" className="text-[0.68rem] font-bold tracking-[0.16em] text-[#9fc5a8] sm:text-xs">החבורה</h2>
                <span className="text-[0.62rem] text-[#a69d90]">{allies.filter((ally) => !ally.defeated).length} עומדים</span>
              </div>
              <div className={`grid min-h-0 flex-1 content-center gap-1.5 sm:gap-3 ${allies.length > 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                {allies.map((combatant) => (
                  <CombatantCard
                    key={combatant.id}
                    combatant={combatant}
                    statusDefinitions={statusDefinitions}
                    selected={selectedTargetId === combatant.id}
                    targetable={!combatant.defeated && state.phase === "active"}
                    active={activeCombatantId === combatant.id}
                    onTarget={onTarget}
                  />
                ))}
              </div>
              </section>

              <section className="flex min-h-0 flex-col" aria-labelledby="battlefield-title">
              <div className="mb-1 flex items-center justify-between gap-1 px-1 sm:mb-2">
                <h2 id="battlefield-title" className="flex items-center gap-1 text-[0.68rem] font-bold tracking-[0.16em] text-[#df8588] sm:text-xs"><Crosshair className="size-3.5" aria-hidden="true" />האויבים</h2>
                <span className="text-[0.62rem] text-[#a69d90]">בחרו מטרה</span>
              </div>
              <AnimatePresence initial={false}>
                <div className={`grid min-h-0 flex-1 content-center gap-1.5 sm:gap-3 ${enemies.length > 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {enemies.map((combatant) => (
                    <CombatantCard
                      key={combatant.id}
                      combatant={combatant}
                      statusDefinitions={statusDefinitions}
                      intent={enemyIntents[combatant.id]}
                      selected={selectedTargetId === combatant.id}
                      targetable={!combatant.defeated && state.phase === "active"}
                      active={activeCombatantId === combatant.id}
                      onTarget={onTarget}
                    />
                  ))}
                </div>
              </AnimatePresence>
              </section>
            </div>

            <div className="hidden grid-cols-2 gap-3 sm:grid">
              {tutorialHints.length > 0 ? (
                <details className="border border-[#62c6df]/25 bg-[#0d2229]/80 px-3 py-2 backdrop-blur">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-[#b7e7ef] outline-none focus-visible:ring-2 focus-visible:ring-[#70c7da]"><CircleHelp className="size-4" aria-hidden="true" /> רמזי הדרכה</summary>
                  <ol className="mt-2 space-y-1 text-xs leading-5 text-[#a9c4ca]">{tutorialHints.map((hint, index) => <li key={hint} className="flex gap-2"><bdi dir="ltr" className="text-[#70c7da]">{index + 1}.</bdi><span>{hint}</span></li>)}</ol>
                </details>
              ) : <span />}
              <details>
                <summary className="cursor-pointer border border-white/10 bg-black/55 px-3 py-2 text-sm font-bold text-[#d9bf7c] outline-none focus-visible:ring-2 focus-visible:ring-[#70c7da]">פתיחת יומן הקרב</summary>
                <CombatLog events={state.log} />
              </details>
            </div>
          </section>
        </div>

        {state.phase === "initiative" ? (
          <section role="status" className="safe-inline-area shrink-0 border-t border-[#62c6df]/30 bg-[#10252c]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-center text-sm text-[#b7e7ef]">
            <ShieldAlert className="me-2 inline size-5" aria-hidden="true" /> מטילים יוזמה וקובעים את סדר התורות…
          </section>
        ) : outcome ? null : (
          <div
            data-testid="combat-action-region"
            className="safe-inline-area shrink-0 overflow-hidden border-t border-[#c6a15b]/30 bg-[#07090b]/98 pb-[env(safe-area-inset-bottom)]"
          >
            <ActionDock
              player={player}
              selectedTarget={selectedTarget}
              livingEnemies={livingEnemies}
              abilities={abilities}
              items={items}
              canAct={canAct}
              busy={busy}
              onAbility={onAbility}
              onDefend={onDefend}
              onConsumable={onConsumable}
              onEscape={onEscape}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {outcome ? (
            <motion.div
              key={outcome}
              className="mobile-safe-modal absolute inset-0 z-30 grid overflow-y-auto bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="m-auto w-full max-w-2xl">
                <CombatOutcome result={outcome} onRetry={onRetry} onContinue={onContinue} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
