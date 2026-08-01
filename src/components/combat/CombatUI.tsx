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
import type { CombatUIProps } from "./types";

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
        className="fixed inset-0 z-[120] isolate flex h-dvh w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_15%,rgba(42,69,78,.45),transparent_30rem),linear-gradient(180deg,#101418_0%,#07090b_58%,#050607_100%)] text-[#eee5d6] outline-none"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] [background-size:32px_32px]" />

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
            className="mx-auto h-full min-w-0 max-w-6xl space-y-4 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4"
          >
            <section aria-labelledby="combat-objective-title" className="border border-[#c6a15b]/25 bg-[linear-gradient(145deg,rgba(47,37,24,.72),rgba(12,14,16,.94))] px-3 py-2 sm:p-4">
              <h2 id="combat-objective-title" className="flex items-center gap-2 text-sm font-bold text-[#f0cf82] sm:text-base"><BookOpenCheck className="size-4" aria-hidden="true" /> מטרת הקרב</h2>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#c9c0b1]">{objective}</p>
            </section>

            {tutorialHints.length > 0 ? (
              <details className="border border-[#62c6df]/25 bg-[#0d2229]/70 px-3 py-2">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-[#b7e7ef] outline-none focus-visible:ring-2 focus-visible:ring-[#70c7da]">
                  <CircleHelp className="size-4" aria-hidden="true" /> רמזי הדרכה
                </summary>
                <ol className="mt-2 space-y-1 text-xs leading-5 text-[#a9c4ca]">
                  {tutorialHints.map((hint, index) => (
                    <li key={hint} className="flex gap-2"><bdi dir="ltr" className="text-[#70c7da]">{index + 1}.</bdi><span>{hint}</span></li>
                  ))}
                </ol>
              </details>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 id="battlefield-title" className="flex items-center gap-2 font-bold text-[#d9bf7c]"><Crosshair className="size-4" aria-hidden="true" /> זירת הקרב</h2>
              <p className="text-xs text-[#8f877a]">בחרו דמות או אויב כדי לקבוע מטרה</p>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold tracking-[0.18em] text-[#77b686]">החבורה</h3>
              <div className="grid gap-3 md:grid-cols-2">
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
            </div>

            <div>
              <h3 className="mb-2 text-xs font-bold tracking-[0.18em] text-[#d66a71]">האויבים</h3>
              <AnimatePresence initial={false}>
                <div className="grid gap-3 md:grid-cols-2">
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
            </div>

            <details>
              <summary className="cursor-pointer border border-white/10 bg-black/30 px-3 py-2 text-sm font-bold text-[#d9bf7c] outline-none focus-visible:ring-2 focus-visible:ring-[#70c7da]">פתיחת יומן הקרב</summary>
              <CombatLog events={state.log} />
            </details>
          </section>
        </div>

        {state.phase === "initiative" ? (
          <section role="status" className="safe-inline-area shrink-0 border-t border-[#62c6df]/30 bg-[#10252c]/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-center text-sm text-[#b7e7ef]">
            <ShieldAlert className="me-2 inline size-5" aria-hidden="true" /> מטילים יוזמה וקובעים את סדר התורות…
          </section>
        ) : outcome ? null : (
          <div
            data-testid="combat-action-region"
            className="safe-inline-area max-h-[45dvh] shrink-0 overflow-y-auto overscroll-contain border-t border-[#c6a15b]/30 bg-[#07090b]/98 pb-[env(safe-area-inset-bottom)]"
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
