"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePartyGame } from "@/hooks/use-party-game";
import { DiceOverlay } from "@/components/game/DiceOverlay";
import { GameNotifications } from "@/components/game/GameNotifications";
import { GameScene } from "@/components/game/GameScene";
import { GameModeShell } from "@/components/game/GameModeShell";
import { OpeningCinematic } from "@/components/game/OpeningCinematic";
import { DialoguePanel } from "@/components/dialogue/DialoguePanel";
import { GameStoreProvider, useGameStore } from "@/store/game-store";
import { saveGameAction, completeChapterAction } from "@/lib/actions/game";
import { applyEffectsToSave, createPlayerCombatant, travelToLocation } from "@/lib/game/session-state";
import { validateAndMigrateSave } from "@/game/persistence";
import { resolveSkillCheck, nextRandom } from "@/game/dice";
import { addItem, dropItem, equipItem, equipmentStatBonuses, unequipItem, useItem as consumeInventoryItem } from "@/game/inventory";
import { deriveStats } from "@/game/character";
import { createCombatState, createCombatantFromEnemy, scaleEnemy, chooseEnemyAction, submitCombatAction } from "@/game/combat";
import { abilitiesById } from "@/content/abilities";
import { statusesById } from "@/content/statuses";
import { encountersById, enemiesById } from "@/content/enemies";
import { dialoguesById } from "@/content/dialogues";
import { openingScenesById } from "@/content/chapters/opening";
import { locationsById } from "@/content/locations";
import { itemsById } from "@/content/items";
import { classesById } from "@/content/classes";
import { npcsById } from "@/content/npcs";
import { consequenceEffects, type VisibleConsequence } from "@/content/consequences";
import { audioManager } from "@/lib/audio/audio-manager";
import type {
  CombatAction,
  CombatState,
  DialogueChoice,
  DiceResult,
  Equipment,
  EquipmentSlot,
  LocationExit,
  LocationInteraction,
  Notification,
  Notification as GameNotification,
  SaveData,
  SkillCheckDefinition,
  StoryEffect,
} from "@/types/game";

const combatRules = { abilities: abilitiesById, statuses: statusesById };
const CombatScene = dynamic(() => import("@/components/combat").then((module) => module.CombatScene), { ssr: false });
const ChapterSummary = dynamic(() => import("@/components/game/ChapterSummary").then((module) => module.ChapterSummary), { ssr: false });
const GamePanels = dynamic(() => import("@/components/inventory/GamePanels").then((module) => module.GamePanels), { ssr: false });
const skillLabels: Record<SkillCheckDefinition["skill"], string> = {
  athletics: "אתלטיקה",
  acrobatics: "אקרובטיקה",
  stealth: "התגנבות",
  investigation: "חקירה",
  arcana: "מאגיה",
  nature: "טבע",
  medicine: "רפואה",
  perception: "תפיסה",
  survival: "הישרדות",
  insight: "תובנה",
  persuasion: "שכנוע",
  deception: "הטעיה",
  intimidation: "איום",
};

const sceneByLocation: Record<string, string> = {
  "village-gate": "scene-arrival",
  "headman-house": "scene-village-leader",
  "arfelon-square": "scene-preparation",
  "wet-raven-inn": "scene-preparation",
  smithy: "scene-preparation",
  "healer-hut": "scene-preparation",
  "mine-road": "scene-road-to-mine",
  "old-watchtower": "scene-road-to-mine",
  "standing-stones": "scene-road-to-mine",
  "mine-entrance": "scene-mine-entrance",
  "main-tunnel": "scene-main-tunnel",
  "abandoned-tool-store": "scene-trapped-miner",
  "flooded-passage": "scene-main-tunnel",
  "pillar-hall": "scene-cult-evidence",
  "hidden-chamber": "scene-hidden-area",
  "guardian-sanctum": "scene-stone-guardian",
};

const encounterVictoryFlags: Record<string, string> = {
  "tutorial-rat": "tutorial_enemy_defeated",
  "road-ambush": "road_ambush_defeated",
  "flooded-passage-pack": "flood_pack_defeated",
  "stone-guardian-boss": "guardian_defeated",
};

const encounterInteractionIds: Record<string, string> = {
  "tutorial-rat": "tutorial-combat",
  "road-ambush": "track-hooded-figures",
  "flooded-passage-pack": "cross-flood-safely",
  "stone-guardian-boss": "fight-stone-guardian",
};

const partyRewardsByKey: Record<string, { experience: number; gold: number; itemId?: string; quantity?: number }> = {
  "opening.tutorial_combat": { experience: 75, gold: 12, itemId: "minor-healing-potion", quantity: 1 },
  "opening.stone_guardian_victory": { experience: 250, gold: 100, itemId: "guardian-core", quantity: 1 },
};

function makeId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random()}`;
}

function withStoryFlag(save: SaveData, key: string, value: boolean | string | number): SaveData {
  return { ...save, story: { ...save.story, flags: { ...save.story.flags, [key]: value } } };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function partyDiceResult(value: unknown): DiceResult | null {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.rolls) || !record.rolls.every((roll) => Number.isInteger(roll))) return null;
  const outcome = record.outcome;
  const mode = record.mode;
  if (
    (outcome !== "critical-success" && outcome !== "success" && outcome !== "failure" && outcome !== "critical-failure") ||
    (mode !== "normal" && mode !== "advantage" && mode !== "disadvantage") ||
    !Number.isInteger(record.selected_roll) ||
    !Number.isInteger(record.modifier) ||
    !Number.isInteger(record.final_result) ||
    !Number.isInteger(record.difficulty) ||
    !Number.isInteger(record.seed)
  ) return null;
  return {
    rolls: record.rolls as number[],
    selectedRoll: record.selected_roll as number,
    modifier: record.modifier as number,
    finalResult: record.final_result as number,
    difficulty: record.difficulty as number,
    mode,
    outcome,
    seed: record.seed as number,
  };
}

function progressEffectsForLocation(locationId: string): StoryEffect[] {
  if (locationId === "mine-road") return [{ kind: "quest-objective", questId: "shadows-beneath-village", objectiveId: "prepare-for-mine", status: "completed" }];
  if (locationId === "mine-entrance") return [{ kind: "quest-objective", questId: "shadows-beneath-village", objectiveId: "reach-mine", status: "completed" }];
  if (locationId === "main-tunnel") return [{ kind: "quest-objective", questId: "shadows-beneath-village", objectiveId: "investigate-main-tunnel", status: "completed" }];
  return [];
}

function consequenceNotificationType(tone: VisibleConsequence["tone"]): Notification["type"] {
  if (tone === "danger") return "error";
  if (tone === "benefit") return "reputation";
  return "discovery";
}

function primaryEffectFeedback(effects: readonly StoryEffect[]): { title: string; message: string; type: Notification["type"] } | null {
  const consequence = consequenceEffects(effects)[0];
  if (consequence) return { title: consequence.title, message: consequence.detail, type: consequenceNotificationType(consequence.tone) };
  for (const effect of effects) {
    if (effect.kind === "grant-item") {
      const item = itemsById[effect.itemId];
      if (item) return { title: "נמצא פריט", message: `${item.name} נוסף לתיק.`, type: "item" };
    }
    if (effect.kind === "relationship") {
      const npc = npcsById[effect.npcId];
      const field = effect.field === "trust" ? "האמון" : effect.field === "respect" ? "הכבוד" : "הפחד";
      return { title: `${npc?.name ?? "בן השיח"} הגיב`, message: `${field} ${effect.amount >= 0 ? "עלה" : "ירד"} ב־${Math.abs(effect.amount)}.`, type: "reputation" };
    }
    if (effect.kind === "heal") return { title: "הגוף התאושש", message: `הושבו עד ${effect.amount} נקודות חיים.`, type: "reputation" };
    if (effect.kind === "gold") return { title: "הזהב השתנה", message: `${Math.abs(effect.amount)} מטבעות ${effect.amount >= 0 ? "נוספו" : "שולמו"}.`, type: effect.amount >= 0 ? "item" : "reputation" };
    if (effect.kind === "experience") return { title: "ניסיון", message: `צברת ${effect.amount} נקודות ניסיון.`, type: "experience" };
    if (effect.kind === "quest-objective") return { title: "המשימה השתנתה", message: effect.status === "completed" ? "יעד ממשי הושלם ביומן." : "המסלול ביומן השתנה בהתאם לתוצאה.", type: "quest" };
  }
  return null;
}

function effectsForRoll(definition: SkillCheckDefinition, outcome: ReturnType<typeof resolveSkillCheck>["outcome"]): StoryEffect[] {
  if (outcome === "critical-success") return [...(definition.successEffects ?? []), ...(definition.criticalSuccessEffects ?? [])];
  if (outcome === "critical-failure") return [...(definition.failureEffects ?? []), ...(definition.criticalFailureEffects ?? [])];
  return outcome === "success" ? [...(definition.successEffects ?? [])] : [...(definition.failureEffects ?? [])];
}

function recalculateEquipment(save: SaveData, equipment: Equipment): SaveData {
  const characterClass = classesById[save.character.classId];
  const bonuses = equipmentStatBonuses(equipment, save.inventory, itemsById);
  const equippedAttributes = Object.fromEntries(
    Object.entries(save.character.attributes).map(([key, value]) => [key, value + (bonuses[key] ?? 0)]),
  ) as SaveData["character"]["attributes"];
  const base = deriveStats(equippedAttributes, characterClass, save.character.level);
  const derivedStats = {
    maximumHealth: base.maximumHealth + (bonuses.maximumHealth ?? 0),
    armor: base.armor + (bonuses.armor ?? 0),
    accuracy: base.accuracy + (bonuses.accuracy ?? 0),
    initiative: base.initiative + (bonuses.initiative ?? 0),
    maximumPrimaryResource: base.maximumPrimaryResource + (bonuses.maximumPrimaryResource ?? 0),
    carryCapacity: base.carryCapacity + (bonuses.carryCapacity ?? 0),
  };
  return {
    ...save,
    equipment,
    character: {
      ...save.character,
      derivedStats,
      currentHealth: Math.min(save.character.currentHealth, derivedStats.maximumHealth),
      primaryResource: Math.min(save.character.primaryResource, derivedStats.maximumPrimaryResource),
    },
  };
}

export function GameClient({ initialSave, expectedSaveVersion, partySessionId }: { initialSave: SaveData; expectedSaveVersion: number; partySessionId?: string }) {
  return <GameStoreProvider initialSave={initialSave} expectedSaveVersion={expectedSaveVersion}><GameRuntime partySessionId={partySessionId} /></GameStoreProvider>;
}

function GameRuntime({ partySessionId }: { partySessionId?: string }) {
  const router = useRouter();
  const save = useGameStore((state) => state.save);
  const expectedVersion = useGameStore((state) => state.expectedSaveVersion);
  const dialogueNodeId = useGameStore((state) => state.dialogueNodeId);
  const combat = useGameStore((state) => state.combat);
  const dice = useGameStore((state) => state.dice);
  const activePanel = useGameStore((state) => state.activePanel);
  const saveStatus = useGameStore((state) => state.saveStatus);
  const cinematicOpen = useGameStore((state) => state.cinematicOpen);
  const chapterComplete = useGameStore((state) => state.chapterComplete);
  const replaceSave = useGameStore((state) => state.replaceSave);
  const checkpoint = useGameStore((state) => state.checkpoint);
  const setExpectedVersion = useGameStore((state) => state.setExpectedSaveVersion);
  const setCheckpoint = useGameStore((state) => state.setCheckpoint);
  const setDialogueNodeId = useGameStore((state) => state.setDialogueNodeId);
  const setCombat = useGameStore((state) => state.setCombat);
  const setDice = useGameStore((state) => state.setDice);
  const setActivePanel = useGameStore((state) => state.setActivePanel);
  const addNotification = useGameStore((state) => state.addNotification);
  const setSaveStatus = useGameStore((state) => state.setSaveStatus);
  const setCinematicOpen = useGameStore((state) => state.setCinematicOpen);
  const setChapterComplete = useGameStore((state) => state.setChapterComplete);
  const saveRef = useRef(save);
  const versionRef = useRef(expectedVersion);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastClockRef = useRef<number | null>(null);
  const recoveredCacheRef = useRef(false);
  const resolvedCombatRef = useRef(new Set<string>());
  const afterDiceRef = useRef<null | (() => void)>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [combatBusy, setCombatBusy] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(chapterComplete);
  const partyGame = usePartyGame({
    sessionId: partySessionId ?? "",
    characterId: save.character.id,
    enabled: Boolean(partySessionId),
  });
  const onlineParty = Boolean(partySessionId);
  const isPartyLeader = partyGame.state?.party.leaderCharacterId === save.character.id;
  const pendingPartyChecksRef = useRef(new Set<string>());

  const cacheKey = `shattered-crown:save:${save.character.id}`;

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    versionRef.current = expectedVersion;
  }, [expectedVersion]);

  const combatAmbience = combat
    ? combat.encounterId === "stone-guardian-boss" ? "boss" as const : "combat" as const
    : null;

  useEffect(() => {
    if (!combatAmbience) return;
    void audioManager.setAmbience(combatAmbience);
    return () => audioManager.stopAmbience(combatAmbience);
  }, [combatAmbience]);

  const notify = useCallback((type: GameNotification["type"], title: string, message: string, deduplicationKey?: string) => {
    const notification: Notification = { id: makeId("notice"), type, title, message, createdAt: new Date().toISOString(), deduplicationKey };
    addNotification(notification);
  }, [addNotification]);

  useEffect(() => {
    if (!onlineParty) return;
    if (partyGame.error) {
      notify("connection", "החיבור לחבורה דורש תשומת לב", partyGame.error, `party-error-${partyGame.error}`);
      return;
    }
    if (partyGame.connectionState === "connected") {
      notify("connection", "החיבור חודש", "מצב החבורה מסונכרן עם כל המשתתפים.", "party-connected");
    } else if (partyGame.connectionState === "reconnecting" || partyGame.connectionState === "disconnected") {
      notify("connection", "החיבור נותק", partyGame.connectionMessage, `party-${partyGame.connectionState}`);
    }
  }, [notify, onlineParty, partyGame.connectionMessage, partyGame.connectionState, partyGame.error]);

  const persistSnapshot = useCallback((snapshot: SaveData, reason: string): Promise<void> => {
    if (typeof window !== "undefined") localStorage.setItem(cacheKey, JSON.stringify({ save: snapshot, pending: true }));
    setSaveStatus("saving");
    const task = saveQueueRef.current.then(async () => {
      const result = await saveGameAction(snapshot, versionRef.current, reason, makeId("save-command"));
      if (result.ok) {
        versionRef.current = result.saveVersion;
        setExpectedVersion(result.saveVersion);
        setSaveStatus("saved");
        if (typeof window !== "undefined") localStorage.setItem(cacheKey, JSON.stringify({ save: snapshot, pending: false }));
        if (reason === "manual-save") notify("save", "המשחק נשמר", "ההתקדמות עודכנה בענן.", "manual-save");
      } else {
        setSaveStatus(result.code === "conflict" ? "conflict" : result.code === "network" ? "offline" : "error");
        notify(result.code === "conflict" ? "error" : "connection", result.code === "conflict" ? "התנגשות שמירה" : "השמירה ממתינה", result.message, `save-${result.code}`);
      }
    });
    saveQueueRef.current = task.catch(() => undefined);
    return task;
  }, [cacheKey, notify, setExpectedVersion, setSaveStatus]);

  const commit = useCallback((next: SaveData, reason: string, checkpoint = false): Promise<void> => {
    const now = Date.now();
    const elapsed = Math.max(0, Math.floor((now - (lastClockRef.current ?? now)) / 1000));
    lastClockRef.current = now;
    const timed = { ...next, playtimeSeconds: next.playtimeSeconds + elapsed, savedAt: new Date(now).toISOString() };
    replaceSave(timed);
    if (checkpoint) setCheckpoint(timed);
    return persistSnapshot(timed, reason);
  }, [persistSnapshot, replaceSave, setCheckpoint]);

  useEffect(() => {
    if (recoveredCacheRef.current) return;
    recoveredCacheRef.current = true;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;
      const cached = JSON.parse(raw) as { save?: unknown; pending?: boolean };
      const validated = validateAndMigrateSave(cached.save);
      if (validated.ok && cached.pending && validated.data.character.id === saveRef.current.character.id && new Date(validated.data.savedAt) > new Date(saveRef.current.savedAt)) {
        replaceSave(validated.data);
        setSaveStatus("offline");
        notify("connection", "שוחזר עותק מקומי", "נמצאה התקדמות שטרם הגיעה לענן. היא תישמר בחיבור הבא.", "cache-recovered");
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }, [cacheKey, notify, replaceSave, setSaveStatus]);

  useEffect(() => {
    const interval = window.setInterval(() => { void commit(saveRef.current, "periodic-autosave"); }, 60_000);
    const beforeUnload = () => localStorage.setItem(cacheKey, JSON.stringify({ save: saveRef.current, pending: saveStatus !== "saved" }));
    window.addEventListener("beforeunload", beforeUnload);
    return () => { window.clearInterval(interval); window.removeEventListener("beforeunload", beforeUnload); };
  }, [cacheKey, commit, saveStatus]);

  const applyEffects = useCallback((current: SaveData, effects: readonly StoryEffect[], eventId: string, announce = true): SaveData => {
    const result = applyEffectsToSave(current, effects, eventId);
    if (announce) {
      for (const itemId of result.acquiredItemIds) {
        const item = itemsById[itemId];
        if (item) { audioManager.play("pickup"); notify("item", "פריט חדש", `קיבלת: ${item.name}`); }
      }
      if (result.questUpdated) { audioManager.play("quest"); notify("quest", "המשימה עודכנה", "יעד הושלם או נתיב חדש נפתח ביומן.", `quest-${eventId}`); }
      if (result.experienceGranted > 0) notify("experience", "ניסיון", `צברת ${result.experienceGranted} נקודות ניסיון.`);
      const goldDelta = result.save.character.gold - current.character.gold;
      if (goldDelta !== 0) notify("item", goldDelta > 0 ? "תשלום התקבל" : "מטבעות שולמו", `${Math.abs(goldDelta)} מטבעות ${goldDelta > 0 ? "נוספו לארנק" : "הוסרו מן הארנק"}.`, `gold-${eventId}`);
      const reputationDelta = result.save.character.reputation - current.character.reputation;
      if (reputationDelta !== 0) notify("reputation", "המוניטין השתנה", `המוניטין ${reputationDelta > 0 ? "עלה" : "ירד"} ב־${Math.abs(reputationDelta)}.`, `reputation-${eventId}`);
      for (const effect of effects) {
        if (effect.kind !== "relationship") continue;
        const npc = npcsById[effect.npcId];
        const field = effect.field === "trust" ? "האמון" : effect.field === "respect" ? "הכבוד" : "הפחד";
        notify("reputation", `${npc?.name ?? "בן השיח"} הגיב`, `${field} ${effect.amount >= 0 ? "עלה" : "ירד"} ב־${Math.abs(effect.amount)}.`, `relationship-${eventId}-${effect.npcId}-${effect.field}`);
      }
      for (const consequence of consequenceEffects(effects).slice(0, 2)) {
        notify(consequenceNotificationType(consequence.tone), consequence.title, consequence.detail, `consequence-${eventId}-${consequence.key}`);
      }
      const healed = result.save.character.currentHealth - current.character.currentHealth;
      if (healed > 0) notify("reputation", "הטיפול השפיע", `${healed} נקודות חיים הושבו בפועל.`, `healing-${eventId}`);
      if (result.levelsGained > 0) { audioManager.play("victory"); notify("level", "עלית דרגה!", `הגעת לדרגה ${result.save.character.level}. החיים והמשאב המרבי גדלו.`, `level-${result.save.character.level}`); }
    }
    return result.save;
  }, [notify]);

  useEffect(() => {
    if (!onlineParty || !partyGame.state) return;
    if (partyGame.combat) {
      setCombat(partyGame.combat.state);
      const firstEnemy = Object.values(partyGame.combat.state.combatants).find((candidate) => candidate.kind === "enemy" && !candidate.defeated);
      if (firstEnemy) queueMicrotask(() => setSelectedTargetId((current) => current ?? firstEnemy.id));
    }

    const authoritativeSceneId = partyGame.scene?.authoredId;
    const authoritativeLocationId = partyGame.scene?.locationId ?? (authoritativeSceneId ? openingScenesById[authoritativeSceneId]?.locationId : null);
    let next = saveRef.current;
    let changed = false;
    if (authoritativeLocationId && authoritativeLocationId !== next.story.currentLocationId) {
      next = travelToLocation(next, authoritativeLocationId);
      next = applyEffects(next, progressEffectsForLocation(authoritativeLocationId), `party-location:${authoritativeLocationId}`);
      changed = true;
    }
    if (authoritativeSceneId && authoritativeSceneId !== next.story.currentSceneId) {
      next = { ...next, story: { ...next.story, currentSceneId: authoritativeSceneId } };
      changed = true;
    }
    if (changed) void commit(next, `party-sync:${partyGame.session?.version ?? 0}`, true);
  }, [applyEffects, commit, onlineParty, partyGame.combat, partyGame.scene, partyGame.session?.version, partyGame.state, setCombat]);

  useEffect(() => {
    if (!onlineParty || !partyGame.session) return;
    const checks = asRecord(partyGame.session.state.skill_checks);
    if (!checks) return;
    let next = saveRef.current;
    let changed = false;
    for (const [interactionId, rawResult] of Object.entries(checks)) {
      const appliedFlag = `party_skill_${interactionId}_applied`;
      if (next.story.flags[appliedFlag]) continue;
      const interaction = Object.values(locationsById)
        .flatMap((location) => location.interactions)
        .find((candidate) => candidate.id === interactionId);
      const result = partyDiceResult(rawResult);
      if (!interaction?.skillCheck || !result) continue;
      next = applyEffects(next, [...(interaction.effects ?? []), ...effectsForRoll(interaction.skillCheck, result.outcome)], `party-skill:${interactionId}`);
      next = withStoryFlag(next, appliedFlag, true);
      if (interaction.oneTime) next = withStoryFlag(next, `interaction_${interaction.id}_completed`, true);
      if (interaction.dialogueNodeId) {
        const node = dialoguesById[interaction.dialogueNodeId];
        if (node) {
          const enteredKey = `dialogue_${node.id}_entered`;
          if (!next.story.flags[enteredKey]) {
            next = applyEffects(next, node.onEnterEffects ?? [], `dialogue-enter:${node.id}`);
            next = withStoryFlag(next, enteredKey, true);
          }
          setDialogueNodeId(node.id);
        }
      }
      changed = true;
      // Every party member sees the same authoritative roll. The command's
      // character id identifies who rolled, but the shared result belongs to
      // the whole synchronized scene.
      setDice({ result, skillLabel: skillLabels[interaction.skillCheck.skill] });
    }
    if (changed) void commit(next, "party-skill-check");
  }, [applyEffects, commit, onlineParty, partyGame.session, setDialogueNodeId, setDice]);

  const openDialogue = useCallback((nodeId: string, current: SaveData): SaveData => {
    const node = dialoguesById[nodeId];
    if (!node) { notify("error", "שיחה לא זמינה", "תוכן השיחה לא נמצא. אפשר להמשיך לחקור."); return current; }
    const enteredKey = `dialogue_${node.id}_entered`;
    let next = current;
    if (!next.story.flags[enteredKey]) {
      next = applyEffects(next, node.onEnterEffects ?? [], `dialogue-enter:${node.id}`);
      next = withStoryFlag(next, enteredKey, true);
    }
    setDialogueNodeId(nodeId);
    return next;
  }, [applyEffects, notify, setDialogueNodeId]);

  useEffect(() => {
    if (!onlineParty || !partyGame.session) return;
    const resolved = asRecord(partyGame.session.state.resolved_interactions);
    if (!resolved) return;
    const currentSceneId = partyGame.scene?.authoredId;
    const currentScene = currentSceneId ? openingScenesById[currentSceneId] : undefined;
    let next = saveRef.current;
    let changed = false;
    for (const interactionId of Object.keys(resolved)) {
      const appliedFlag = `party_interaction_${interactionId}_applied`;
      if (next.story.flags[appliedFlag]) continue;
      const interaction = Object.values(locationsById)
        .flatMap((location) => location.interactions)
        .find((candidate) => candidate.id === interactionId);
      if (!interaction || interaction.skillCheck) continue;
      next = applyEffects(next, interaction.effects ?? [], `party-interaction:${interaction.id}`);
      next = withStoryFlag(next, appliedFlag, true);
      if (interaction.oneTime) next = withStoryFlag(next, `interaction_${interaction.id}_completed`, true);
      if (interaction.dialogueNodeId && currentScene?.interactionIds.includes(interaction.id)) {
        next = openDialogue(interaction.dialogueNodeId, next);
      }
      changed = true;
    }
    if (changed) void commit(next, "party-interaction-sync");
  }, [applyEffects, commit, onlineParty, openDialogue, partyGame.scene?.authoredId, partyGame.session]);

  const beginEncounter = useCallback((current: SaveData, encounterId: string) => {
    const encounter = encountersById[encounterId];
    if (!encounter) { notify("error", "הקרב לא נפתח", "העימות אינו קיים בתוכן המשחק."); return; }
    let checkpointSave = current;
    let player = createPlayerCombatant(current);
    if (current.story.flags.combat_advantage_road && encounterId === "road-ambush") {
      player = { ...player, statuses: [{ statusId: "hidden", remainingTurns: 1, stacks: 1, sourceCombatantId: player.id }] };
    }
    if (current.story.flags.surprised_on_road && encounterId === "road-ambush") {
      player = { ...player, statuses: [...player.statuses, { statusId: "frightened", remainingTurns: 2, stacks: 1, sourceCombatantId: player.id }] };
    }
    if (current.story.flags.flood_crossed_quietly && encounterId === "flooded-passage-pack") {
      player = { ...player, statuses: [...player.statuses, { statusId: "hidden", remainingTurns: 1, stacks: 1, sourceCombatantId: player.id }] };
    }
    if (current.story.flags.temporary_corruption) {
      player = { ...player, statuses: [...player.statuses, { statusId: "corrupted", remainingTurns: 2, stacks: 1, sourceCombatantId: player.id }] };
      checkpointSave = withStoryFlag(checkpointSave, "temporary_corruption", false);
      checkpointSave = withStoryFlag(checkpointSave, "corruption_entered_combat", true);
    }
    let enemyIds = [...encounter.enemyIds];
    if (encounterId === "road-ambush" && current.story.flags.tower_beacon_disabled) enemyIds = enemyIds.slice(0, 1);
    if (encounterId === "road-ambush" && current.story.flags.road_ambush_reinforced) enemyIds.push("corrupted-mine-vermin");
    if (encounterId === "flooded-passage-pack" && (current.story.flags.flood_pack_triggered || current.story.flags.made_noise_in_flood)) enemyIds.push("corrupted-mine-vermin");
    const ownsRuneHammer = current.inventory.some((entry) => entry.itemId === "rune-breaker-hammer" && entry.quantity > 0);
    const enemies = enemyIds.map((enemyId, index) => {
      let scaled = scaleEnemy(enemiesById[enemyId], 1, current.character.level);
      if (scaled.boss && current.story.flags.waystone_ward_restored) {
        scaled = { ...scaled, maximumHealth: Math.max(1, scaled.maximumHealth - 12), accuracy: Math.max(0, scaled.accuracy - 2) };
      }
      if (scaled.boss && current.story.flags.stone_magic_suspected) scaled = { ...scaled, armor: Math.max(10, scaled.armor - 1) };
      if (scaled.boss && current.story.flags.map_remembered) scaled = { ...scaled, accuracy: Math.max(0, scaled.accuracy - 1) };
      if (scaled.boss && ownsRuneHammer) scaled = { ...scaled, armor: Math.max(10, scaled.armor - 2) };
      const initialStatuses = scaled.boss
        ? [
            ...(current.story.flags.guardian_rune_understood || current.story.flags.seven_three_rhythm_known ? [{ statusId: "exposed-rune", remainingTurns: current.story.flags.guardian_rune_understood ? 3 : 1, stacks: 1, sourceCombatantId: player.id }] : []),
            ...(current.story.flags.guardian_awakened_early ? [{ statusId: "guarded", remainingTurns: 2, stacks: 1, sourceCombatantId: `enemy-${enemyId}-${index + 1}` }] : []),
            ...(current.story.flags.waystone_ward_restored ? [{ statusId: "chilled", remainingTurns: 2, stacks: 1, sourceCombatantId: player.id }] : []),
          ]
        : [];
      return createCombatantFromEnemy(scaled, `enemy-${enemyId}-${index + 1}`, initialStatuses);
    });
    setCheckpoint(checkpointSave);
    const state = createCombatState(encounter.id, [player, ...enemies], Date.now() >>> 0);
    setSelectedTargetId(enemies[0]?.id ?? null);
    setCombat(state);
    if (encounterId === "stone-guardian-boss") audioManager.play("boss");
    void commit(checkpointSave, `checkpoint:${encounter.checkpointId}`, true);
  }, [commit, notify, setCheckpoint, setCombat]);

  const closeDice = useCallback(() => {
    const afterDice = afterDiceRef.current;
    afterDiceRef.current = null;
    setDice(null);
    if (afterDice) queueMicrotask(afterDice);
  }, [setDice]);

  const handleInteraction = useCallback((interaction: LocationInteraction) => {
    if (onlineParty) {
      void (async () => {
        if (interaction.oneTime && saveRef.current.story.flags[`interaction_${interaction.id}_completed`]) return;
        let shouldSkipEncounter = false;
        if (interaction.skillCheck) {
          const result = await partyGame.submit("RESOLVE_SKILL_CHECK", { interactionId: interaction.id });
          if (!result.ok) {
            notify("error", "הבדיקה לא בוצעה", result.message);
            return;
          }
          const roll = partyDiceResult(result.data.result);
          if (roll) {
            const outcomeEffects = effectsForRoll(interaction.skillCheck, roll.outcome);
            shouldSkipEncounter = outcomeEffects.some((effect) => effect.kind === "set-flag" && effect.key === "road_ambush_avoided" && effect.value === true);
          }
        } else {
          const resolved = await partyGame.submit("RESOLVE_INTERACTION", { interactionId: interaction.id });
          if (!resolved.ok) {
            notify("error", "הפעולה לא הושלמה", resolved.message);
            return;
          }
        }
        if (interaction.encounterId && !shouldSkipEncounter) {
          const started = await partyGame.submit("BEGIN_ENCOUNTER", { encounterId: interaction.encounterId });
          if (!started.ok) notify("error", "הקרב לא נפתח", started.message);
        } else if (shouldSkipEncounter) {
          notify("discovery", "המערב נחשף", "החבורה עקפה את היצורים מבלי להיגרר לקרב.");
        }
      })();
      return;
    }
    let next = saveRef.current;
    if (interaction.oneTime && next.story.flags[`interaction_${interaction.id}_completed`]) return;
    let effects: StoryEffect[] = [...(interaction.effects ?? [])];
    let rollFeedback: (() => void) | null = null;
    if (interaction.skillCheck) {
      const result = resolveSkillCheck(Date.now() >>> 0, interaction.skillCheck, next.character.attributes, 2 + Math.floor((next.character.level - 1) / 4));
      audioManager.play("dice");
      setDice({ result, skillLabel: skillLabels[interaction.skillCheck.skill] });
      effects = [...effects, ...effectsForRoll(interaction.skillCheck, result.outcome)];
      const concreteFeedback = primaryEffectFeedback(effects);
      rollFeedback = () => notify(
        concreteFeedback?.type ?? (result.outcome.includes("success") ? "discovery" : "error"),
        concreteFeedback?.title ?? (result.outcome.includes("success") ? "הבדיקה הצליחה" : "הבדיקה נכשלה"),
        concreteFeedback?.message ?? (result.outcome.includes("success") ? "נחשף מידע חדש שנרשם ביומן." : "הכישלון יצר מחיר מיידי, אך הדרך נותרה פתוחה."),
        `roll-${interaction.id}-${result.outcome}`,
      );
    }
    next = applyEffects(next, effects, `interaction:${interaction.id}`, !rollFeedback);
    if (interaction.oneTime) next = withStoryFlag(next, `interaction_${interaction.id}_completed`, true);
    if (interaction.dialogueNodeId) next = openDialogue(interaction.dialogueNodeId, next);
    replaceSave(next);
    const shouldSkipRoadAmbush = interaction.encounterId === "road-ambush" && Boolean(next.story.flags.road_ambush_avoided);
    const startEncounter = interaction.encounterId && !shouldSkipRoadAmbush
      ? () => beginEncounter(next, interaction.encounterId as string)
      : null;
    const announceSkippedAmbush = shouldSkipRoadAmbush
      ? () => notify("discovery", "המערב נחשף", "עקפת את היצורים מבלי להיגרר לקרב.")
      : null;

    if (rollFeedback) {
      // Let the roll land and reveal before an encounter replaces exploration.
      // The continuation is single-use and runs only when the player closes
      // the locked dice presentation.
      afterDiceRef.current = () => {
        rollFeedback?.();
        announceSkippedAmbush?.();
        startEncounter?.();
      };
      if (!startEncounter) void commit(next, interaction.dialogueNodeId ? "dialogue-opened" : "interaction-completed");
      return;
    }

    if (startEncounter) startEncounter();
    else void commit(next, interaction.dialogueNodeId ? "dialogue-opened" : "interaction-completed");
    announceSkippedAmbush?.();
  }, [applyEffects, beginEncounter, commit, notify, onlineParty, openDialogue, partyGame, replaceSave, setDice]);

  const applyResolvedDialogueChoice = useCallback((choice: DialogueChoice, nodeId: string, authoritativeRoll?: DiceResult) => {
    const node = dialoguesById[nodeId];
    if (!node) return;
    let next = saveRef.current;
    const selectedKey = `dialogue_choice_${choice.id}_selected`;
    if (next.story.flags[selectedKey]) return;
    let effects: StoryEffect[] = next.story.flags[selectedKey] ? [] : [...(choice.effects ?? [])];
    if (choice.skillCheck) {
      const result = authoritativeRoll ?? resolveSkillCheck(Date.now() >>> 0, choice.skillCheck, next.character.attributes, 2 + Math.floor((next.character.level - 1) / 4));
      audioManager.play("dice");
      setDice({ result, skillLabel: skillLabels[choice.skillCheck.skill] });
      effects = [...effects, ...effectsForRoll(choice.skillCheck, result.outcome)];
    }
    next = applyEffects(next, effects, `dialogue-choice:${choice.id}`);
    next = withStoryFlag(next, selectedKey, true);
    if (choice.nextNodeId) next = openDialogue(choice.nextNodeId, next);
    else setDialogueNodeId(null);
    if (choice.exitAction === "open-shop") { setDialogueNodeId(null); setActivePanel("merchant"); }
    let chapterCompletionHandled = false;
    if (node.id === "grey-woman-vision" && choice.exitAction === "close") {
      next = withStoryFlag(next, "return_to_arfelon", true);
      audioManager.play("vision");
      notify("quest", "הפרק נמשך", "שוב לערפלון. אנשי הכפר יגיבו למעשיך, ועליך להחליט איזו אמת לחשוף.", "return-to-arfelon");
      if (onlineParty && isPartyLeader) {
        void (async () => {
          const currentSceneId = partyGame.scene?.authoredId;
          if (!currentSceneId) return;
          const nextSceneId = openingScenesById[currentSceneId]?.nextSceneIds[0];
          const advanced = await partyGame.submit("COMPLETE_SCENE", { sceneId: currentSceneId, nextSceneId });
          if (!advanced.ok) {
            notify("error", "החזרה לכפר ממתינה", advanced.message);
          }
        })();
      }
    }
    if (node.id.startsWith("elric-aftermath-") && choice.exitAction === "close") {
      next = applyEffects(next, [
        { kind: "quest-objective", questId: "shadows-beneath-village", objectiveId: "return-to-village", status: "completed" },
      ], "chapter-return-objective");
      next = withStoryFlag(next, "chapter_one_completed", true);
      next = { ...next, story: { ...next.story, currentSceneId: "scene-chapter-completion" } };
      const completedSave = next;
      const finishChapter = () => {
        setChapterComplete(true);
        setSummaryOpen(true);
        audioManager.play("victory");
        const completionId = makeId("chapter-completion");
        void commit(completedSave, "chapter-complete", true)
          .then(() => completeChapterAction(completedSave.character.id, completionId))
          .then((result) => {
            if (!result.ok) notify("error", "הפרס ממתין", result.message, "chapter-reward-pending");
          });
        if (onlineParty && isPartyLeader) {
          void partyGame.submit("COMPLETE_SCENE", { sceneId: "scene-chapter-completion" }).then((result) => {
            if (!result.ok) notify("error", "סיכום הפרק ממתין", result.message);
          });
        }
      };
      replaceSave(completedSave);
      if (choice.skillCheck) afterDiceRef.current = finishChapter;
      else finishChapter();
      chapterCompletionHandled = true;
    }
    if (!chapterCompletionHandled) {
      replaceSave(next);
      void commit(next, "major-dialogue-choice");
    }
  }, [applyEffects, commit, isPartyLeader, notify, onlineParty, openDialogue, partyGame, replaceSave, setActivePanel, setChapterComplete, setDialogueNodeId, setDice]);

  const handleDialogueChoice = useCallback((choice: DialogueChoice) => {
    const node = dialogueNodeId ? dialoguesById[dialogueNodeId] : undefined;
    if (!node) return;
    if (onlineParty) {
      void partyGame.submit("SUBMIT_DIALOGUE_VOTE", {
        sceneId: partyGame.session?.currentSceneId ?? saveRef.current.story.currentSceneId,
        decisionId: node.id,
        choiceId: choice.id,
      }).then((result) => {
        if (result.ok) notify("party", "ההצבעה נקלטה", "הבחירה תוכרע לאחר שכל חברי החבורה יצביעו.", `party-vote-${node.id}`);
        else notify("error", "ההצבעה לא נקלטה", result.message);
      });
      return;
    }
    applyResolvedDialogueChoice(choice, node.id);
  }, [applyResolvedDialogueChoice, dialogueNodeId, notify, onlineParty, partyGame]);

  useEffect(() => {
    if (!onlineParty || !partyGame.session) return;
    const checks = asRecord(partyGame.session.state.skill_checks) ?? {};
    for (const decision of partyGame.voteState.decisions) {
      if (!decision.resolvedChoiceId) continue;
      const node = dialoguesById[decision.decisionId];
      const choice = node?.choices.find((candidate) => candidate.id === decision.resolvedChoiceId);
      if (!node || !choice || saveRef.current.story.flags[`dialogue_choice_${choice.id}_selected`]) continue;
      if (choice.skillCheck) {
        const roll = partyDiceResult(checks[choice.id]);
        if (!roll) {
          if (isPartyLeader && !pendingPartyChecksRef.current.has(choice.id)) {
            pendingPartyChecksRef.current.add(choice.id);
            void partyGame.submit("RESOLVE_SKILL_CHECK", { interactionId: choice.id }).then((result) => {
              if (!result.ok) {
                pendingPartyChecksRef.current.delete(choice.id);
                notify("error", "בדיקת הקבוצה לא בוצעה", result.message);
              }
            });
          }
          continue;
        }
        pendingPartyChecksRef.current.delete(choice.id);
        applyResolvedDialogueChoice(choice, node.id, roll);
      } else {
        applyResolvedDialogueChoice(choice, node.id);
      }
    }
  }, [applyResolvedDialogueChoice, isPartyLeader, notify, onlineParty, partyGame, partyGame.session, partyGame.voteState.decisions]);

  const handleTravel = useCallback((exit: LocationExit) => {
    if (onlineParty) {
      void (async () => {
        const moved = await partyGame.submit("MOVE_TO_LOCATION", { locationId: exit.destinationId });
        if (!moved.ok) {
          notify("error", "המעבר לא הושלם", moved.message);
          return;
        }
        const currentSceneId = partyGame.scene?.authoredId;
        const targetSceneId = exit.destinationId === "arfelon-square" && saveRef.current.story.flags.vision_seen
          ? "scene-chapter-completion"
          : sceneByLocation[exit.destinationId];
        if (
          currentSceneId &&
          targetSceneId &&
          targetSceneId !== currentSceneId &&
          openingScenesById[currentSceneId]?.nextSceneIds.includes(targetSceneId)
        ) {
          const completed = await partyGame.submit("COMPLETE_SCENE", { sceneId: currentSceneId, nextSceneId: targetSceneId });
          if (!completed.ok) notify("error", "הסצנה לא התקדמה", completed.message);
        }
      })();
      return;
    }
    const current = saveRef.current;
    const newlyDiscovered = !current.discoveredLocationIds.includes(exit.destinationId);
    let next = travelToLocation(current, exit.destinationId);
    const targetSceneId = exit.destinationId === "arfelon-square" && current.story.flags.vision_seen
      ? "scene-chapter-completion"
      : sceneByLocation[exit.destinationId];
    next = { ...next, story: { ...next.story, currentSceneId: targetSceneId ?? next.story.currentSceneId } };
    next = applyEffects(next, progressEffectsForLocation(exit.destinationId), `travel:${exit.destinationId}`);
    if (exit.destinationId === "arfelon-square" && current.story.flags.vision_seen) {
      next = applyEffects(next, [{ kind: "quest-objective", questId: "shadows-beneath-village", objectiveId: "return-to-village", status: "completed" }], "return-to-arfelon");
    }
    if (newlyDiscovered) notify("discovery", "התגלה מקום חדש", exit.label, `location-${exit.destinationId}`);
    void commit(next, "location-transition", true);
  }, [applyEffects, commit, notify, onlineParty, partyGame]);

  const finishCombat = useCallback((state: CombatState) => {
    const key = `${state.encounterId}:${state.seed}`;
    if (resolvedCombatRef.current.has(key)) return;
    resolvedCombatRef.current.add(key);
    const player = Object.values(state.combatants).find((combatant) => combatant.kind === "player");
    let next = saveRef.current;
    const ownPlayer = Object.values(state.combatants).find((combatant) => combatant.kind === "player" && combatant.characterId === next.character.id) ?? player;
    if (ownPlayer) next = { ...next, character: { ...next.character, currentHealth: ownPlayer.currentHealth, primaryResource: ownPlayer.currentResource } };
    const effects: StoryEffect[] = [];
    const encounter = encountersById[state.encounterId];
    const experience = encounter.enemyIds.reduce((sum, id) => sum + (enemiesById[id]?.experienceReward ?? 0), 0);
    if (!onlineParty) effects.push({ kind: "experience", amount: experience });
    const victoryFlag = encounterVictoryFlags[state.encounterId];
    if (victoryFlag) effects.push({ kind: "set-flag", key: victoryFlag, value: true });
    if (state.encounterId === "stone-guardian-boss") {
      effects.push({ kind: "quest-objective", questId: "shadows-beneath-village", objectiveId: "defeat-guardian", status: "completed" });
      if (!onlineParty) effects.push({ kind: "grant-item", itemId: "guardian-core", quantity: 1 });
    }
    if (!onlineParty) {
      let seed = state.seed;
      for (const enemyId of encounter.enemyIds) {
        for (const loot of enemiesById[enemyId]?.lootTable ?? []) {
          const roll = nextRandom(seed); seed = roll.seed;
          if (roll.value <= loot.chance) effects.push({ kind: "grant-item", itemId: loot.itemId, quantity: loot.minimumQuantity });
        }
      }
    }
    next = applyEffects(next, effects, `encounter-reward:${state.encounterId}`);
    next = withStoryFlag(next, `interaction_${state.encounterId}_completed`, true);
    audioManager.play("victory");
    notify("experience", "ניצחון", onlineParty ? "העימות הסתיים. השלל המשותף ממתין לבחירת החבורה." : `העימות הסתיים. צברת ${experience} נקודות ניסיון.`, `victory-${state.encounterId}`);
    void commit(next, "combat-victory", true);
  }, [applyEffects, commit, notify, onlineParty]);

  useEffect(() => {
    if (onlineParty) return;
    if (!combat || combat.phase !== "active") return;
    const actorId = combat.turnOrder[combat.activeTurnIndex];
    const actor = combat.combatants[actorId];
    if (!actor || actor.kind !== "enemy") return;
    const timer = window.setTimeout(() => {
      const action = chooseEnemyAction(combat, actor.id, combatRules);
      if (!action) { setCombatBusy(false); return; }
      const result = submitCombatAction(combat, actor.id, action, makeId("enemy-command"), combatRules);
      if (result.ok) { setCombat(result.state); audioManager.play("damage"); }
      setCombatBusy(false);
    }, 620);
    return () => window.clearTimeout(timer);
  }, [combat, onlineParty, setCombat]);

  useEffect(() => {
    if (combat?.phase === "victory") finishCombat(combat);
    if (combat?.phase === "defeat") audioManager.play("defeat");
  }, [combat, finishCombat]);

  const submitPlayerAction = useCallback((action: CombatAction) => {
    const state = combat;
    if (!state || state.phase !== "active") return;
    const player = Object.values(state.combatants).find((candidate) => candidate.kind === "player" && (!onlineParty || candidate.characterId === saveRef.current.character.id));
    if (!player) return;
    if (onlineParty) {
      if (action.kind === "item") return;
      setCombatBusy(true);
      void partyGame.submit("SUBMIT_COMBAT_ACTION", { action }).then((result) => {
        if (!result.ok) notify("error", "הפעולה נדחתה", result.message);
        else audioManager.play(action.kind === "ability" && abilitiesById[action.abilityId]?.formula?.damageType === "arcane" ? "magic" : "sword");
      }).finally(() => setCombatBusy(false));
      return;
    }
    setCombatBusy(true);
    const result = submitCombatAction(state, player.id, action, makeId("combat-command"), combatRules);
    if (result.ok) {
      setCombat(result.state);
      const last = result.state.log.at(-1);
      audioManager.play(last?.kind === "healing" ? "heal" : last?.kind === "damage" && last.critical ? "critical" : action.kind === "ability" && abilitiesById[action.abilityId]?.formula?.damageType === "arcane" ? "magic" : "sword");
    } else notify("error", "הפעולה נדחתה", result.message);
    setCombatBusy(false);
  }, [combat, notify, onlineParty, partyGame, setCombat]);

  const consumeCombatItem = useCallback((entryId: string) => {
    const state = combat;
    if (!state) return;
    const player = Object.values(state.combatants).find((candidate) => candidate.kind === "player" && (!onlineParty || candidate.characterId === saveRef.current.character.id));
    const entry = saveRef.current.inventory.find((candidate) => candidate.id === entryId);
    const item = entry ? itemsById[entry.itemId] : undefined;
    if (!player || !entry || !item) return;
    if (onlineParty) {
      setCombatBusy(true);
      void partyGame.submit("USE_ITEM", { inventoryEntryId: entryId }).then((result) => {
        if (!result.ok) notify("error", "אי אפשר להשתמש בפריט", result.message);
        else audioManager.play("heal");
      }).finally(() => setCombatBusy(false));
      return;
    }
    const used = consumeInventoryItem({ inventory: saveRef.current.inventory, currentHealth: player.currentHealth, maximumHealth: player.maximumHealth, currentResource: player.currentResource, maximumResource: player.maximumResource }, entryId, item);
    if (!used.ok) { notify("error", "אי אפשר להשתמש בפריט", used.message); return; }
    const modifiedState = { ...state, combatants: { ...state.combatants, [player.id]: { ...player, currentHealth: used.value.currentHealth, currentResource: used.value.currentResource } } };
    const advanced = submitCombatAction(modifiedState, player.id, { kind: "defend" }, makeId("item-command"), combatRules);
    setCombat(advanced.ok ? advanced.state : modifiedState);
    const next = { ...saveRef.current, inventory: used.value.inventory, character: { ...saveRef.current.character, currentHealth: used.value.currentHealth, primaryResource: used.value.currentResource } };
    audioManager.play("heal");
    void commit(next, "combat-item-used");
  }, [combat, commit, notify, onlineParty, partyGame, setCombat]);

  const handleEquip = useCallback((entryId: string) => {
    const current = saveRef.current;
    const result = equipItem({ classId: current.character.classId, raceId: current.character.raceId, level: current.character.level, inventory: current.inventory, equipment: current.equipment, itemsById }, entryId);
    if (!result.ok) { notify("error", "הציוד לא הוחל", result.message); return; }
    const next = recalculateEquipment(current, result.value);
    notify("item", "הציוד הוחל", "נתוני הדמות עודכנו מיד.");
    void commit(next, "equipment-changed");
  }, [commit, notify]);

  const handleUnequip = useCallback((slot: EquipmentSlot) => { const current = saveRef.current; void commit(recalculateEquipment(current, unequipItem(current.equipment, slot)), "equipment-changed"); }, [commit]);
  const handleUseItem = useCallback((entryId: string) => {
    const current = saveRef.current; const entry = current.inventory.find((candidate) => candidate.id === entryId); const item = entry ? itemsById[entry.itemId] : undefined; if (!item) return;
    const result = consumeInventoryItem({ inventory: current.inventory, currentHealth: current.character.currentHealth, maximumHealth: current.character.derivedStats.maximumHealth, currentResource: current.character.primaryResource, maximumResource: current.character.derivedStats.maximumPrimaryResource }, entryId, item);
    if (!result.ok) { notify("error", "אי אפשר להשתמש בפריט", result.message); return; }
    audioManager.play("heal");
    notify("item", "הפריט הופעל", `חיים: +${result.value.healthRestored}, משאב: +${result.value.resourceRestored}`);
    void commit({ ...current, inventory: result.value.inventory, character: { ...current.character, currentHealth: result.value.currentHealth, primaryResource: result.value.currentResource } }, "item-used");
  }, [commit, notify]);
  const handleDrop = useCallback((entryId: string, confirmed: boolean) => { const current = saveRef.current; const entry = current.inventory.find((candidate) => candidate.id === entryId); const item = entry ? itemsById[entry.itemId] : undefined; if (!item) return; const result = dropItem(current.inventory, entryId, item, 1, confirmed); if (!result.ok) { notify("error", "הפריט לא הושלך", result.message); return; } void commit({ ...current, inventory: result.value }, "item-dropped"); }, [commit, notify]);
  const handleBuy = useCallback((itemId: string) => { const current = saveRef.current; const item = itemsById[itemId]; if (!item || current.character.gold < item.value) { notify("error", "אין מספיק זהב", "מירה לא מוסרת ציוד בהקפה."); return; } const result = addItem(current.inventory, item, 1, new Date().toISOString(), () => makeId("purchased")); if (!result.ok) { notify("error", "הרכישה נכשלה", result.message); return; } notify("item", "הרכישה הושלמה", `קיבלת: ${item.name}`); void commit({ ...current, inventory: result.value, character: { ...current.character, gold: current.character.gold - item.value } }, "merchant-purchase"); }, [commit, notify]);

  const finishCinematic = useCallback(() => {
    void audioManager.unlock();
    const next = withStoryFlag({ ...saveRef.current, story: { ...saveRef.current.story, currentSceneId: "scene-arrival" } }, "opening_cinematic_seen", true);
    setCinematicOpen(false);
    void commit(next, "opening-cinematic-completed", true);
  }, [commit, setCinematicOpen]);

  const returnToMenu = useCallback(async () => { await commit(saveRef.current, "return-to-menu"); router.push("/menu"); }, [commit, router]);

  const retryCombat = useCallback(() => {
    if (!combat) return;
    resolvedCombatRef.current.clear();
    if (onlineParty) {
      void partyGame.submit("BEGIN_ENCOUNTER", { encounterId: combat.encounterId }).then((result) => {
        if (result.ok) notify("connection", "הקרב מתחיל מחדש", "מצב החבורה שוחזר לנקודת הכניסה לעימות.");
        else notify("error", "לא ניתן להתחיל מחדש", result.message);
      });
      return;
    }
    beginEncounter(checkpoint, combat.encounterId);
    notify("connection", "הקרב מתחיל מחדש", "החיים והפריטים הוחזרו למצב שלפני הקרב.");
  }, [beginEncounter, checkpoint, combat, notify, onlineParty, partyGame]);

  const continueAfterCombat = useCallback(() => {
    if (!combat) return;
    if (onlineParty) {
      if (combat.phase !== "victory") {
        notify("connection", "החבורה הובסה", "אפשר לנסות שוב מנקודת הביקורת. אף דמות לא נמחקה.");
        return;
      }
      void (async () => {
        const rewardKey = partyGame.combat?.availableRewardKey;
        const scopeKey = partySessionId ? `encounter:${partySessionId}:${combat.encounterId}` : "";
        const sharedLoot = asRecord(partyGame.session?.state.shared_loot);
        if (rewardKey && scopeKey && sharedLoot?.[scopeKey] === undefined) {
          const claimed = await partyGame.submit("CLAIM_LOOT", {});
          if (claimed.ok) {
            const resultRecord = asRecord(claimed.data.result);
            const resolvedRewardKey = typeof resultRecord?.reward_key === "string" ? resultRecord.reward_key : null;
            const resolvedScopeKey = typeof resultRecord?.scope_key === "string" ? resultRecord.scope_key : null;
            const reward = resolvedRewardKey ? partyRewardsByKey[resolvedRewardKey] : undefined;
            const grant = asRecord(resultRecord?.grant);
            let next = saveRef.current;
            if (reward && resolvedScopeKey) {
              next = applyEffects(next, reward.experience > 0 ? [{ kind: "experience", amount: reward.experience }] : [], `party-reward:${resolvedScopeKey}`);
              next = { ...next, character: { ...next.character, gold: next.character.gold + reward.gold } };
              const inventoryEntryId = typeof grant?.inventory_entry_id === "string" ? grant.inventory_entry_id : null;
              if (reward.itemId && inventoryEntryId && !next.inventory.some((entry) => entry.id === inventoryEntryId)) {
                next = {
                  ...next,
                  inventory: [...next.inventory, {
                    id: inventoryEntryId,
                    itemId: reward.itemId,
                    quantity: reward.quantity ?? 1,
                    durability: null,
                    customData: { partyReward: true },
                    acquiredAt: new Date().toISOString(),
                  }],
                };
              }
              void commit(next, "party-shared-loot", true);
            }
            notify("item", "השלל נבחר", "הפרס המשותף נוסף לדמות שלך וננעל מפני כפילות.", `party-loot-${resolvedScopeKey ?? scopeKey}`);
          } else {
            notify("party", "השלל כבר נבחר", claimed.message, `party-loot-claimed-${scopeKey}`);
          }
        }

        if (isPartyLeader) {
          const currentSceneId = partyGame.scene?.authoredId;
          const nextSceneId = currentSceneId ? openingScenesById[currentSceneId]?.nextSceneIds[0] : undefined;
          if (currentSceneId && nextSceneId) {
            const advanced = await partyGame.submit("COMPLETE_SCENE", { sceneId: currentSceneId, nextSceneId });
            if (!advanced.ok) notify("error", "הסצנה לא התקדמה", advanced.message);
          }
        }
        setCombat(null);
        resolvedCombatRef.current.clear();
      })();
      return;
    }
    if (combat.phase === "victory") {
      setCombat(null);
    } else {
      const interactionId = encounterInteractionIds[combat.encounterId];
      const restored = interactionId
        ? withStoryFlag(checkpoint, `interaction_${interactionId}_completed`, false)
        : checkpoint;
      replaceSave(restored);
      setCombat(null);
      void commit(restored, "combat-retreat");
    }
    resolvedCombatRef.current.clear();
  }, [applyEffects, combat, commit, isPartyLeader, notify, onlineParty, partyGame, partySessionId, checkpoint, replaceSave, setCombat]);

  const playerCombatant = combat ? Object.values(combat.combatants).find((candidate) => candidate.kind === "player" && (!onlineParty || candidate.characterId === save.character.id)) : undefined;
  const combatItems = useMemo(() => save.inventory.flatMap((entry) => { const item = itemsById[entry.itemId]; return item?.usable && item.consumable ? [{ entryId: entry.id, item, quantity: entry.quantity }] : []; }), [save.inventory]);
  const enemyIntents = useMemo(() => {
    if (!combat) return {};
    return Object.fromEntries(Object.values(combat.combatants).filter((candidate) => candidate.kind === "enemy" && candidate.enemyId).map((enemy) => {
      const definition = enemy.enemyId ? enemiesById[enemy.enemyId] : undefined;
      const abilityId = enemy.abilityIds.find((id) => (enemy.cooldowns[id] ?? 0) === 0) ?? enemy.abilityIds[0];
      return [enemy.id, { abilityId, label: definition?.intentLabels[abilityId] ?? "בוחן את המטרה", severity: abilityId === "boss-rune-crush" ? "critical" as const : abilityId === "boss-telegraph-crush" ? "danger" as const : "normal" as const }];
    }));
  }, [combat]);

  const combatScreen = combat ? <CombatScene
      state={combat}
      playerCombatantId={playerCombatant?.id ?? save.character.id}
      abilities={abilitiesById}
      items={combatItems}
      statusDefinitions={statusesById}
      enemyIntents={enemyIntents}
      selectedTargetId={selectedTargetId}
      objective={encountersById[combat.encounterId]?.objective ?? "הבס את האויבים"}
      tutorialHints={encountersById[combat.encounterId]?.tutorialSteps}
      busy={combatBusy || partyGame.isSubmitting || (onlineParty ? partyGame.combat?.activeCharacterId !== save.character.id : combat.combatants[combat.turnOrder[combat.activeTurnIndex]]?.kind === "enemy")}
      onAbility={(abilityId, targetIds) => submitPlayerAction({ kind: "ability", abilityId, targetIds })}
      onTarget={setSelectedTargetId}
      onDefend={() => submitPlayerAction({ kind: "defend" })}
      onConsumable={(entryId) => consumeCombatItem(entryId)}
      onEscape={() => submitPlayerAction({ kind: "escape" })}
      onRetry={retryCombat}
      onContinue={continueAfterCombat}
    /> : null;

  const explorationScreen = <>
    <GameScene save={save} saveStatus={saveStatus} onInteraction={handleInteraction} onTravel={handleTravel} onOpenPanel={setActivePanel} onManualSave={() => void commit(saveRef.current, "manual-save")} onReturnToMenu={() => void returnToMenu()} />
    <DialoguePanel nodeId={dialogueNodeId} save={save} onChoice={handleDialogueChoice} onClose={() => setDialogueNodeId(null)} />
    <GamePanels panel={activePanel} save={save} onClose={() => setActivePanel(null)} onEquip={handleEquip} onUnequip={handleUnequip} onUse={handleUseItem} onDrop={handleDrop} onBuy={handleBuy} />
    <OpeningCinematic open={cinematicOpen} onFinish={finishCinematic} />
    <ChapterSummary open={summaryOpen} save={save} onReturnToMenu={() => void returnToMenu()} onClose={() => setSummaryOpen(false)} />
  </>;

  const persistentUI = <>
    <DiceOverlay presentation={dice} onClose={closeDice} />
    {!dice ? <GameNotifications /> : null}
    {partySessionId && !combatScreen ? <div className="fixed start-3 top-20 z-50 max-w-[min(20rem,calc(100vw-1.5rem))] border border-[#62c6df]/35 bg-[#07151b]/95 px-3 py-2 text-xs text-[#9eeaff] shadow-xl" role="status" aria-live="polite">
      <b className="block text-[#d8f7ff]">{partyGame.connectionMessage}</b>
      <span>{isPartyLeader ? "אתם מובילי החבורה" : "הפעולות הסיפוריות מוכרעות בידי החבורה"}</span>
      {dialogueNodeId ? (() => {
        const decision = partyGame.voteState.decisions.find((candidate) => candidate.decisionId === dialogueNodeId);
        return decision ? <span className="mt-1 block">הצבעות: <bdi>{decision.totalVotes}/{decision.requiredVotes}</bdi>{decision.resolvedChoiceId ? " · ההחלטה הוכרעה" : ""}</span> : null;
      })() : null}
    </div> : null}
  </>;

  return <GameModeShell combat={combatScreen} exploration={explorationScreen} persistent={persistentUI} />;
}
