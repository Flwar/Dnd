"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, BookOpenCheck, CircleHelp, Crosshair, ShieldAlert, Swords } from "lucide-react";
import { ActionDock } from "./ActionDock";
import { CombatLog } from "./CombatLog";
import { CombatOutcome } from "./CombatOutcome";
import { CombatantCard } from "./CombatantCard";
import { TurnOrder } from "./TurnOrder";
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

  if (!player) {
    return (
      <section dir="rtl" role="alert" className="border border-[#d05b54]/55 bg-[#35131a] p-6 text-[#ffd0cb]">
        <h2 className="text-xl font-bold">לא ניתן לפתוח את הקרב</h2>
        <p className="mt-2">הדמות הפעילה אינה נמצאת במצב הקרב. יש לרענן את המפגש או לחזור לנקודת השמירה.</p>
      </section>
    );
  }

  const outcome = state.phase === "victory" ? "victory" : state.phase === "defeat" ? "defeat" : state.phase === "escaped" ? "escaped" : null;

  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? "always" : "user"}>
      <main
        dir="rtl"
        aria-label="זירת הקרב"
        className="relative isolate min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_50%_15%,rgba(42,69,78,.45),transparent_30rem),linear-gradient(180deg,#101418_0%,#07090b_58%,#050607_100%)] text-[#eee5d6]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] [background-size:32px_32px]" />

        <header className="border-b border-[#c6a15b]/25 bg-[linear-gradient(90deg,rgba(17,20,23,.96),rgba(35,26,17,.88),rgba(17,20,23,.96))] px-4 py-4 shadow-[0_12px_32px_rgba(0,0,0,.35)] sm:px-6">
          <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center border border-[#c6a15b]/40 bg-black/30 text-[#f0cf82]"><Swords className="size-6" aria-hidden="true" /></span>
              <div>
                <p className="text-[0.65rem] font-bold tracking-[0.22em] text-[#70c7da]">עימות טקטי</p>
                <h1 className="text-xl font-bold text-[#f0cf82] sm:text-2xl">{state.encounterId === "stone-guardian-boss" ? "המשמר האחרון" : "קרב במעמקי ערפלון"}</h1>
              </div>
            </div>
            <div className="min-w-0 border-s border-[#c6a15b]/25 ps-4 text-sm">
              <span className="block text-xs text-[#8f877a]">התור הנוכחי</span>
              <strong className="text-[#f2e8d7]" aria-live="polite">{activeCombatant?.name ?? "קביעת יוזמה"}</strong>
            </div>
          </div>
        </header>

        <TurnOrder state={state} playerCombatantId={playerCombatantId} />

        {guardianTelegraph ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-[#d05b54]/55 bg-[#4f171d]/90 px-4 py-3 text-center text-sm font-bold text-[#ffd0cb]"
            role="alert"
          >
            <AlertTriangle className="me-2 inline size-4" aria-hidden="true" />
            שומר האבן מכין ריסוק רוני. התגוננו עכשיו או שברו את המשמר כדי לחשוף את הרונה.
          </motion.div>
        ) : null}

        <div className="mx-auto grid max-w-[96rem] gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)] xl:grid-cols-[minmax(15rem,19rem)_minmax(0,1fr)_minmax(19rem,24rem)] xl:items-start">
          <aside className="space-y-4 lg:sticky lg:top-4">
            <section aria-labelledby="combat-objective-title" className="border border-[#c6a15b]/25 bg-[linear-gradient(145deg,rgba(47,37,24,.72),rgba(12,14,16,.94))] p-4 shadow-[0_16px_34px_rgba(0,0,0,.28)]">
              <h2 id="combat-objective-title" className="mb-2 flex items-center gap-2 font-bold text-[#f0cf82]"><BookOpenCheck className="size-4" aria-hidden="true" /> מטרת הקרב</h2>
              <p className="text-sm leading-6 text-[#c9c0b1]">{objective}</p>
            </section>

            {tutorialHints.length > 0 ? (
              <details className="group border border-[#62c6df]/25 bg-[#0d2229]/70 p-4" open>
                <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-[#b7e7ef] outline-none focus-visible:ring-2 focus-visible:ring-[#70c7da]">
                  <CircleHelp className="size-4" aria-hidden="true" /> רמזי הדרכה
                </summary>
                <ol className="mt-3 space-y-2 text-sm leading-6 text-[#a9c4ca]">
                  {tutorialHints.map((hint, index) => (
                    <li key={hint} className="flex gap-2"><bdi dir="ltr" className="text-[#70c7da]">{index + 1}.</bdi><span>{hint}</span></li>
                  ))}
                </ol>
              </details>
            ) : null}

            <div className="hidden xl:block"><CombatLog events={state.log} /></div>
          </aside>

          <section aria-labelledby="battlefield-title" className="min-w-0 space-y-5">
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

            <div className="xl:hidden"><CombatLog events={state.log} /></div>

            <AnimatePresence mode="wait">
              {outcome ? (
                <CombatOutcome key={outcome} result={outcome} onRetry={onRetry} onContinue={onContinue} />
              ) : null}
            </AnimatePresence>
          </section>

          <div className="lg:col-span-2 xl:col-span-1 xl:sticky xl:top-4">
            {state.phase === "initiative" ? (
              <section role="status" className="border border-[#62c6df]/30 bg-[#10252c]/80 p-5 text-center text-[#b7e7ef]">
                <ShieldAlert className="mx-auto mb-2 size-6" aria-hidden="true" /> מטילים יוזמה וקובעים את סדר התורות…
              </section>
            ) : outcome ? null : (
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
            )}
          </div>
        </div>
      </main>
    </MotionConfig>
  );
}
