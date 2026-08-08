"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Sparkles } from "lucide-react";
import { characterRaces, racesById } from "@/content/races";
import { characterClasses, classesById } from "@/content/classes";
import { characterBackgrounds, backgroundsById } from "@/content/backgrounds";
import { abilitiesById } from "@/content/abilities";
import { itemsById } from "@/content/items";
import { applyRaceAttributes, classStartingInventory, deriveStats, pointBuyCost } from "@/game/character";
import type { AttributeKey, Attributes, BackgroundId, ClassId, RaceId } from "@/types/game";
import { createCharacterAction } from "@/lib/actions/characters";
import type { CharacterDraftInput } from "@/lib/validation/character";
import { getAssetPath } from "@/lib/assets/manifest";
import { portraitAfterRaceChange } from "@/lib/portraits";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { PortraitPicker } from "@/components/character-creation/PortraitPicker";
import { GameButton } from "@/components/ui/GameButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RunePanel } from "@/components/ui/RunePanel";
import { he } from "@/lib/i18n";

const steps = ["identity", "race", "class", "background", "attributes", "appearance", "summary"] as const;

const attributeLabels: Record<AttributeKey, string> = {
  strength: "כוח",
  dexterity: "זריזות",
  constitution: "חוסן",
  intelligence: "תבונה",
  wisdom: "חכמה",
  charisma: "כריזמה",
};

const difficultyLabels = { easy: "נגיש", medium: "בינוני", hard: "מורכב" } as const;
const resourceLabels = { stamina: "סיבולת", mana: "מאנה", focus: "מיקוד", faith: "אמונה", rage: "זעם", authority: "סמכות" } as const;

const defaultAttributes: Attributes = { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 };
const defaultDraft: CharacterDraftInput = {
  name: "",
  description: "",
  formOfAddress: "",
  raceId: "human",
  classId: "fighter",
  backgroundId: "former-soldier",
  portraitKey: "portrait-human-01",
  attributes: defaultAttributes,
};

export function CharacterCreator({ isKing = false }: { isKing?: boolean }) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<CharacterDraftInput>(defaultDraft);
  const [customPortraitUrl, setCustomPortraitUrl] = useState<string | null>(null);
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const step = steps[stepIndex];
  const race = racesById[draft.raceId];
  const characterClass = classesById[draft.classId];
  const finalAttributes = useMemo(() => applyRaceAttributes(draft.attributes, race), [draft.attributes, race]);
  const derived = useMemo(() => deriveStats(finalAttributes, characterClass), [finalAttributes, characterClass]);
  const pointsSpent = pointBuyCost(draft.attributes);
  const pointsRemaining = 27 - pointsSpent;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("shattered-crown-character-draft");
      if (raw) {
        const stored = { ...defaultDraft, ...JSON.parse(raw) as CharacterDraftInput };
        if (!isKing && stored.classId === "king") stored.classId = "fighter";
        queueMicrotask(() => setDraft(stored));
      }
    } catch {
      sessionStorage.removeItem("shattered-crown-character-draft");
    }
  }, [isKing]);

  useEffect(() => {
    sessionStorage.setItem("shattered-crown-character-draft", JSON.stringify(draft));
  }, [draft]);

  const update = <K extends keyof CharacterDraftInput>(key: K, value: CharacterDraftInput[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const chooseRace = (raceId: RaceId) => {
    const selected = racesById[raceId];
    setDraft((current) => ({
      ...current,
      raceId,
      portraitKey: portraitAfterRaceChange(current.portraitKey, selected.portraitKeys[0]),
    }));
  };

  const choosePortrait = (portraitKey: string, portraitUrl?: string | null) => {
    update("portraitKey", portraitKey);
    setCustomPortraitUrl(portraitUrl ?? null);
  };

  const validateStep = (): string | null => {
    if (step === "identity" && draft.name.trim().length < 2) return "יש לבחור שם בן שני תווים לפחות.";
    if (step === "attributes" && pointsRemaining < 0) return "חרגת מתקציב התכונות.";
    if (step === "appearance" && !draft.portraitKey) return "יש לבחור דיוקן.";
    return null;
  };

  const next = () => {
    const message = validateStep();
    if (message) { setError(message); return; }
    setError(null);
    setStepIndex((value) => Math.min(steps.length - 1, value + 1));
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const response = await createCharacterAction(draft, crypto.randomUUID());
      if (!response.ok) { setError(response.message); return; }
      sessionStorage.removeItem("shattered-crown-character-draft");
      router.push(`/game/${response.characterId}?opening=1`);
    });
  };

  return (
    <main id="main-content" className="min-h-dvh bg-[radial-gradient(circle_at_top,#18303b_0,transparent_28rem),#08090b] px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-bold tracking-[0.22em] text-[#62c6df]">חריטת גורל חדש</p><h1 className="display-font text-4xl text-[#f0cf82] sm:text-5xl">{he.characterCreation.title}</h1></div>
          <GameButton variant="ghost" disabled={portraitBusy || pending} onClick={() => router.push("/menu")}>שמירה ויציאה</GameButton>
        </header>

        <ol className="mb-6 grid grid-cols-7 gap-1" aria-label="שלבי יצירת הדמות">
          {steps.map((item, index) => (
            <li key={item}>
              <button
                className={`min-h-12 w-full border px-1 text-xs transition-colors sm:text-sm ${index === stepIndex ? "border-[#f0cf82] bg-[#c6a15b]/18 text-[#fff0c7]" : index < stepIndex ? "border-[#77b686]/35 bg-[#77b686]/8 text-[#bee1c6]" : "border-white/10 bg-black/20 text-[#807a72]"}`}
                onClick={() => index <= stepIndex && setStepIndex(index)}
                disabled={portraitBusy || index > stepIndex}
                aria-current={index === stepIndex ? "step" : undefined}
              >
                <span className="hidden sm:inline">{he.characterCreation.steps[item]}</span><span className="sm:hidden">{index + 1}</span>
              </button>
            </li>
          ))}
        </ol>

        <RunePanel className="min-h-[34rem] p-4 sm:p-7">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}>
              {step === "identity" ? <IdentityStep draft={draft} update={update} /> : null}
              {step === "race" ? <RaceStep selected={draft.raceId} onSelect={chooseRace} /> : null}
              {step === "class" ? <ClassStep selected={draft.classId} isKing={isKing} onSelect={(classId) => update("classId", classId)} /> : null}
              {step === "background" ? <BackgroundStep selected={draft.backgroundId} onSelect={(backgroundId) => update("backgroundId", backgroundId)} /> : null}
              {step === "attributes" ? <AttributesStep attributes={draft.attributes} race={race} remaining={pointsRemaining} onChange={(attributes) => update("attributes", attributes)} /> : null}
              {step === "appearance" ? <AppearanceStep race={race} selected={draft.portraitKey} selectedPortraitUrl={customPortraitUrl} onSelect={choosePortrait} onBusyChange={setPortraitBusy} /> : null}
              {step === "summary" ? <SummaryStep draft={draft} portraitUrl={customPortraitUrl} attributes={finalAttributes} derived={derived} /> : null}
            </motion.div>
          </AnimatePresence>
        </RunePanel>

        {error ? <p className="mt-4 border border-[#d05b54]/45 bg-[#d05b54]/10 p-3 text-[#ffc0ba]" role="alert">{error}</p> : null}
        <footer className="mt-5 flex items-center justify-between gap-3">
          <GameButton variant="secondary" onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0 || portraitBusy}><ChevronRight className="size-5" aria-hidden="true" />חזרה</GameButton>
          <p className="hidden text-sm text-[#8f877a] sm:block">הטיוטה נשמרת אוטומטית במכשיר עד סיום היצירה.</p>
          {step === "summary" ? <GameButton size="lg" loading={pending} onClick={submit}><Sparkles className="size-5" aria-hidden="true" />{he.characterCreation.startJourney}</GameButton> : <GameButton disabled={portraitBusy} onClick={next}>הבא<ChevronLeft className="size-5" aria-hidden="true" /></GameButton>}
        </footer>
      </div>
    </main>
  );
}

function StepHeading({ title, text }: { title: string; text: string }) {
  return <header className="mb-6"><h2 className="display-font text-3xl text-[#f0cf82] sm:text-4xl">{title}</h2><p className="mt-2 max-w-3xl text-[#a89f91]">{text}</p></header>;
}

function IdentityStep({ draft, update }: { draft: CharacterDraftInput; update: <K extends keyof CharacterDraftInput>(key: K, value: CharacterDraftInput[K]) => void }) {
  return <div><StepHeading title="מי יעמוד מול הערפל?" text="השם והעבר יופיעו בדיאלוגים, ביומן ובחדרי החבורה." /><div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2"><b>שם הדמות</b><input className="fantasy-input" value={draft.name} maxLength={24} onChange={(event) => update("name", event.target.value)} autoFocus /></label><label className="space-y-2"><b>צורת פנייה</b><input className="fantasy-input" value={draft.formOfAddress} maxLength={32} onChange={(event) => update("formOfAddress", event.target.value)} placeholder="למשל: אדוני, גבירתי" /></label><label className="space-y-2 sm:col-span-2"><b>תיאור קצר <span className="font-normal text-[#8f877a]">(רשות)</span></b><textarea className="fantasy-input min-h-32 resize-y" value={draft.description} maxLength={240} onChange={(event) => update("description", event.target.value)} placeholder="מה מבחינים בך מטיילים אחרים?" /><span className="block text-end text-xs text-[#8f877a]"><bdi className="ltr-isolate">{draft.description.length}/240</bdi></span></label></div></div>;
}

function RaceStep({ selected, onSelect }: { selected: RaceId; onSelect: (id: RaceId) => void }) {
  return <div><StepHeading title="מורשת עתיקה" text="לכל גזע תכונות, זיכרונות ואפשרויות דיאלוג ייחודיות." /><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{characterRaces.map((race) => <ChoiceCard key={race.id} selected={selected === race.id} onClick={() => onSelect(race.id)} title={race.name} badge={race.passiveTrait.name}><div className="relative mb-3 aspect-[16/7] overflow-hidden border border-white/10"><Image src={getAssetPath(race.portraitKeys[0])} alt={`תצוגה מקדימה של ${race.name}`} fill sizes="(max-width:768px) 50vw, 33vw" className="object-cover object-[center_30%]" /></div><p>{race.lore}</p><p className="mt-3 text-sm text-[#b7dce4]"><b>השפעה:</b> {race.gameplayEffect}</p><p className="mt-2 text-xs text-[#a89f91]">מומלץ: {race.recommendedClasses.map((id) => classesById[id].name).join(" · ")}</p></ChoiceCard>)}</div></div>;
}

function ClassStep({ selected, isKing, onSelect }: { selected: ClassId; isKing: boolean; onSelect: (id: ClassId) => void }) {
  const availableClasses = isKing ? characterClasses : characterClasses.filter((entry) => entry.id !== "king");
  return (
    <div>
      <StepHeading title="דרך הלחימה" text="כל מקצוע משתמש במשאב ובמערכת יכולות שונים — לא רק בשם אחר לאותה התקפה." />
      {isKing ? (
        <p className="mb-4 flex items-center gap-2 border border-[#f0cf82]/40 bg-[#c6a15b]/12 px-4 py-3 text-sm text-[#ffe7a6]">
          <Sparkles className="size-4" aria-hidden="true" />
          המקצוע המלכותי נפתח לחשבון בעל סמכות הכתר בלבד.
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {availableClasses.map((entry) => (
          <ChoiceCard
            key={entry.id}
            selected={selected === entry.id}
            onClick={() => onSelect(entry.id)}
            title={entry.name}
            badge={entry.id === "king" ? "בלעדי · נושא הכתר" : difficultyLabels[entry.difficulty]}
          >
            <div className="relative mb-3 aspect-video overflow-hidden border border-[#c6a15b]/20 bg-[#090a0b]">
              <Image
                src={getAssetPath(entry.previewAssetKey)}
                alt={`איור מקצוע מלא של ${entry.name}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.015]"
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" aria-hidden="true" />
            </div>
            <div className="mb-3 flex gap-2" aria-label={`יכולות הפתיחה של ${entry.name}`}>
              {entry.startingAbilityIds.map((abilityId) => {
                const ability = abilitiesById[abilityId];
                return (
                  <div key={abilityId} className="relative aspect-square flex-1 overflow-hidden border border-white/10" title={ability.name}>
                    <Image src={getAssetPath(ability.iconAssetKey)} alt={ability.name} fill sizes="80px" className="object-cover" />
                  </div>
                );
              })}
            </div>
            <p className="text-[#d3cabb]">{entry.role}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div><dt className="text-[#8f877a]">חיים</dt><dd><bdi className="ltr-isolate">{entry.startingHealth}</bdi></dd></div>
              <div><dt className="text-[#8f877a]">משאב</dt><dd>{resourceLabels[entry.resourceType]}</dd></div>
            </dl>
            <p className="mt-3 text-sm"><b>חוזקות:</b> {entry.strengths.join(" · ")}</p>
            <p className="mt-1 text-sm text-[#a89f91]"><b>חולשות:</b> {entry.weaknesses.join(" · ")}</p>
          </ChoiceCard>
        ))}
      </div>
    </div>
  );
}

function BackgroundStep({ selected, onSelect }: { selected: BackgroundId; onSelect: (id: BackgroundId) => void }) {
  return <div><StepHeading title="הדרך שמאחוריך" text="הרקע פותח תגובות, מיומנויות וחפץ התחלתי שמשפיעים כבר בערפלון." /><div className="grid gap-3 md:grid-cols-2">{characterBackgrounds.map((entry) => <ChoiceCard key={entry.id} selected={selected === entry.id} onClick={() => onSelect(entry.id)} title={entry.name} badge={`מיומנות: ${skillLabel(entry.skillProficiency)}`}><p>{entry.history}</p><p className="mt-3 text-sm text-[#b7dce4]">{entry.dialogueOpportunity}</p><p className="mt-2 text-sm text-[#d9bf7c]">חפץ: {itemsById[entry.startingItemId]?.name}</p></ChoiceCard>)}</div></div>;
}

function AttributesStep({ attributes, race, remaining, onChange }: { attributes: Attributes; race: (typeof characterRaces)[number]; remaining: number; onChange: (attributes: Attributes) => void }) {
  const adjust = (key: AttributeKey, delta: number) => {
    const next = { ...attributes, [key]: Math.max(8, Math.min(15, attributes[key] + delta)) };
    if (pointBuyCost(next) <= 27 || delta < 0) onChange(next);
  };
  return <div><StepHeading title="עיצוב התכונות" text="הקצו עשרים ושבע נקודות. ציונים גבוהים עולים יותר ומשפיעים מיד על החיים, הדיוק והתושייה." /><div className="mb-5 flex items-center justify-between border border-[#c6a15b]/25 bg-black/25 p-4"><span>{he.characterCreation.pointsRemaining}</span><strong className={`display-font text-3xl ${remaining < 0 ? "text-[#d05b54]" : "text-[#f0cf82]"}`}><bdi className="ltr-isolate">{remaining}</bdi></strong></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(Object.keys(attributeLabels) as AttributeKey[]).map((key) => { const bonus = race.attributeEffects[key] ?? 0; return <div key={key} className="glass-inset p-4"><div className="mb-3 flex items-center justify-between"><b>{attributeLabels[key]}</b>{bonus ? <span className="text-xs text-[#77b686]">תוסף גזע +{bonus}</span> : null}</div><div className="flex items-center justify-between gap-3"><GameButton size="icon" variant="secondary" onClick={() => adjust(key, -1)} disabled={attributes[key] <= 8} aria-label={`הפחתת ${attributeLabels[key]}`}><Minus className="size-4" /></GameButton><strong className="display-font text-3xl"><bdi className="ltr-isolate">{attributes[key] + bonus}</bdi></strong><GameButton size="icon" variant="secondary" onClick={() => adjust(key, 1)} disabled={attributes[key] >= 15} aria-label={`הגדלת ${attributeLabels[key]}`}><Plus className="size-4" /></GameButton></div></div>; })}</div></div>;
}

function AppearanceStep({ race, selected, selectedPortraitUrl, onSelect, onBusyChange }: { race: (typeof characterRaces)[number]; selected: string; selectedPortraitUrl: string | null; onSelect: (key: string, portraitUrl?: string | null) => void; onBusyChange: (busy: boolean) => void }) {
  return <div><StepHeading title="פנים למסע" text="בחרו דיוקן מעולם המשחק או העלו תמונה אישית שתופיע בדיאלוגים, בקרב ובחבורה." /><PortraitPicker race={race} selected={selected} selectedPortraitUrl={selectedPortraitUrl} onSelect={onSelect} onBusyChange={onBusyChange} /></div>;
}

function SummaryStep({ draft, portraitUrl, attributes, derived }: { draft: CharacterDraftInput; portraitUrl: string | null; attributes: Attributes; derived: ReturnType<typeof deriveStats> }) {
  const race = racesById[draft.raceId]; const characterClass = classesById[draft.classId]; const background = backgroundsById[draft.backgroundId];
  const inventory = classStartingInventory(characterClass, background, new Date(0).toISOString()).map((entry) => itemsById[entry.itemId]).filter(Boolean);
  return <div><StepHeading title="השבועה האחרונה" text="בדקו את הבחירות. לאחר היציאה לדרך הדמות תישמר בענן והפרק הראשון ייפתח." /><div className="grid gap-6 lg:grid-cols-[16rem_1fr]"><div className="relative aspect-[3/4] overflow-hidden border border-[#c6a15b]/45"><CharacterPortrait portraitKey={draft.portraitKey} portraitUrl={portraitUrl} alt={`דיוקן הדמות ${draft.name}`} sizes="256px" className="object-cover" testId="character-summary-portrait" /></div><div><h3 className="display-font text-4xl text-[#f0cf82]">{draft.name}</h3><p className="text-[#b9ad9c]">{race.name} · {characterClass.name} · {background.name}</p>{draft.description ? <p className="mt-3 italic text-[#d3cabb]">{draft.description}</p> : null}<div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">{(Object.keys(attributeLabels) as AttributeKey[]).map((key) => <div key={key} className="glass-inset p-2 text-center"><span className="block text-xs text-[#8f877a]">{attributeLabels[key]}</span><bdi className="ltr-isolate text-xl font-bold">{attributes[key]}</bdi></div>)}</div><div className="mt-5 grid gap-3 sm:grid-cols-3"><ProgressBar label="חיים" value={derived.maximumHealth} maximum={derived.maximumHealth} /><ProgressBar label={resourceLabels[characterClass.resourceType]} value={derived.maximumPrimaryResource} maximum={derived.maximumPrimaryResource} tone="resource" /><div className="glass-inset p-3 text-center"><span className="block text-xs text-[#8f877a]">שריון</span><bdi className="ltr-isolate text-xl font-bold">{derived.armor}</bdi></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><h4 className="mb-2 font-bold text-[#d9bf7c]">ציוד התחלתי</h4><ul className="space-y-1 text-sm text-[#b9ad9c]">{inventory.map((item) => <li key={item.id}>• {item.name}</li>)}</ul></div><div><h4 className="mb-2 font-bold text-[#d9bf7c]">יכולות התחלתיות</h4><ul className="space-y-1 text-sm text-[#b9ad9c]">{characterClass.startingAbilityIds.map((id) => <li key={id}>• {abilitiesById[id]?.name}</li>)}</ul></div></div></div></div></div>;
}

function ChoiceCard({ selected, onClick, title, badge, children }: { selected: boolean; onClick: () => void; title: string; badge: string; children: React.ReactNode }) {
  return <button onClick={onClick} aria-pressed={selected} className={`group relative min-h-48 border p-4 text-start transition-[transform,border-color,background] hover:-translate-y-0.5 ${selected ? "border-[#f0cf82] bg-[#c6a15b]/12" : "border-white/10 bg-black/20 hover:border-[#c6a15b]/45"}`}>{selected ? <Check className="absolute end-3 top-3 z-10 size-5 text-[#f0cf82]" aria-hidden="true" /> : null}<h3 className="display-font pe-8 text-2xl text-[#f0cf82]">{title}</h3><span className="my-2 inline-block border border-[#62c6df]/30 bg-[#62c6df]/8 px-2 py-1 text-xs text-[#b7dce4]">{badge}</span><div className="text-sm leading-6 text-[#b9ad9c]">{children}</div></button>;
}

function skillLabel(skill: string) {
  const labels: Record<string, string> = { athletics: "אתלטיקה", arcana: "מאגיה", survival: "הישרדות", deception: "הטעיה", persuasion: "שכנוע", medicine: "רפואה", perception: "תפיסה" };
  return labels[skill] ?? "תושייה";
}
