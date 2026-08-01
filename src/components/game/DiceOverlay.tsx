"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { GameButton } from "@/components/ui/GameButton";
import { audioManager, type SoundCue } from "@/lib/audio/audio-manager";
import { useSettingsStore } from "@/store/settings-store";
import type { DicePresentation } from "@/store/game-store";
import type { DiceResult } from "@/types/game";

type OutcomeTheme = {
  label: string;
  announcement: string;
  accent: string;
  bright: string;
  dark: string;
  glow: string;
  textClass: string;
  revealSound: SoundCue;
};

type Vector3 = readonly [number, number, number];

type FaceGeometry = {
  matrix: string;
  translation: string;
  light: number;
};

const outcomes: Record<DiceResult["outcome"], OutcomeTheme> = {
  "critical-success": {
    label: "הצלחה מכרעת",
    announcement: "הצלחה מכרעת! הגורל נוטה לטובתך.",
    accent: "#f4cf73",
    bright: "#fff5b8",
    dark: "#4f3210",
    glow: "rgba(244, 207, 115, 0.72)",
    textClass: "text-[#ffe28f]",
    revealSound: "critical",
  },
  success: {
    label: "הצלחה",
    announcement: "בדיקת המיומנות הצליחה.",
    accent: "#77d89a",
    bright: "#d8ffe4",
    dark: "#123d2b",
    glow: "rgba(119, 216, 154, 0.55)",
    textClass: "text-[#9ce8b5]",
    revealSound: "confirm",
  },
  failure: {
    label: "כישלון",
    announcement: "בדיקת המיומנות נכשלה.",
    accent: "#e56c65",
    bright: "#ffd1c7",
    dark: "#4d161b",
    glow: "rgba(229, 108, 101, 0.55)",
    textClass: "text-[#f19a91]",
    revealSound: "damage",
  },
  "critical-failure": {
    label: "כישלון מכריע",
    announcement: "כישלון מכריע. הגורל פנה נגדך.",
    accent: "#dc5364",
    bright: "#ffb8c0",
    dark: "#360914",
    glow: "rgba(220, 83, 100, 0.7)",
    textClass: "text-[#ff8d9b]",
    revealSound: "critical",
  },
};

const rollingTheme: OutcomeTheme = {
  label: "",
  announcement: "",
  accent: "#74b7c9",
  bright: "#d8f7ff",
  dark: "#132f3b",
  glow: "rgba(96, 194, 220, 0.5)",
  textClass: "text-[#d8f7ff]",
  revealSound: "dice",
};

const particleVectors = [
  [-88, -62], [-48, -91], [4, -106], [54, -88], [94, -48], [108, 2],
  [84, 58], [45, 92], [-5, 106], [-58, 86], [-96, 46], [-108, -4],
  [-55, -44], [54, -39], [58, 43], [-48, 50],
] as const;

const phi = (1 + Math.sqrt(5)) / 2;

const vertices: readonly Vector3[] = [
  [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
  [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
  [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
];

// The winding of these triangles points away from the centre. Each entry is
// rendered as its own CSS plane; together the twenty planes form a real
// icosahedron rather than a flat illustration of one.
const faceIndices = [
  [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
  [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
  [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
] as const;

const add = (a: Vector3, b: Vector3): Vector3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const subtract = (a: Vector3, b: Vector3): Vector3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (vector: Vector3, amount: number): Vector3 => [vector[0] * amount, vector[1] * amount, vector[2] * amount];
const dot = (a: Vector3, b: Vector3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (vector: Vector3) => Math.sqrt(dot(vector, vector));
const normalize = (vector: Vector3): Vector3 => scale(vector, 1 / length(vector));
const average = (a: Vector3, b: Vector3, c: Vector3): Vector3 => scale(add(add(a, b), c), 1 / 3);
const rounded = (value: number) => Number(value.toFixed(6));

function buildFaceGeometry(): readonly FaceGeometry[] {
  const [frontAIndex, frontBIndex, frontCIndex] = faceIndices[0];
  const frontA = vertices[frontAIndex];
  const frontB = vertices[frontBIndex];
  const frontC = vertices[frontCIndex];
  const frontCentre = average(frontA, frontB, frontC);
  const cameraRight = normalize(subtract(frontC, frontB));
  const cameraDown = normalize(subtract(scale(add(frontB, frontC), 0.5), frontA));
  const cameraForward = normalize(frontCentre);

  // A raw edge is two units. Scaling by ten gives a 20em CSS triangle. Using
  // em here lets the complete solid shrink fluidly on narrow phones.
  const orient = (vertex: Vector3): Vector3 => [
    dot(vertex, cameraRight) * 10,
    dot(vertex, cameraDown) * 10,
    dot(vertex, cameraForward) * 10,
  ];
  const oriented = vertices.map(orient);
  const faceHeight = 10 * Math.sqrt(3);

  return faceIndices.map(([aIndex, bIndex, cIndex]) => {
    const a = oriented[aIndex];
    const b = oriented[bIndex];
    const c = oriented[cIndex];
    const centre = average(a, b, c);
    const xAxis = scale(subtract(c, b), 1 / 20);
    const yAxis = scale(subtract(scale(add(b, c), 0.5), a), 1 / faceHeight);
    const outward = normalize(centre);
    const matrix = `matrix3d(${[
      xAxis[0], xAxis[1], xAxis[2], 0,
      yAxis[0], yAxis[1], yAxis[2], 0,
      outward[0], outward[1], outward[2], 0,
      0, 0, 0, 1,
    ].map(rounded).join(",")})`;

    return {
      matrix,
      translation: `translate3d(${rounded(centre[0])}em,${rounded(centre[1])}em,${rounded(centre[2])}em)`,
      light: Math.max(0.42, Math.min(1.08, 0.7 + outward[2] * 0.28 - outward[0] * 0.08)),
    };
  });
}

const faces = buildFaceGeometry();

function D20Model({
  value,
  theme,
  settled,
  selected,
  dual,
}: {
  value: number;
  theme: OutcomeTheme;
  settled: boolean;
  selected: boolean;
  dual: boolean;
}) {
  const accessibleLabel = settled
    ? `קוביית עשרים פאות. התוצאה היא ${value}`
    : "קוביית עשרים פאות מתגלגלת";

  return (
    <div
      role="img"
      aria-label={accessibleLabel}
      className="relative shrink-0"
      style={{
        width: "40em",
        height: "40em",
        fontSize: dual ? "clamp(2.7px, 0.9vw, 4px)" : "clamp(4.2px, 1.2vw, 5.4px)",
        transformStyle: "preserve-3d",
      }}
      data-testid="d20-model"
      data-selected={settled ? selected : undefined}
    >
      {faces.map((face, index) => {
        const faceStyle: CSSProperties = {
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "20em",
          height: `${rounded(10 * Math.sqrt(3))}em`,
          marginLeft: "-10em",
          marginTop: `${rounded(-(20 * Math.sqrt(3)) / 3)}em`,
          transformOrigin: "50% 66.666667%",
          transform: `${face.translation} ${face.matrix}`,
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
          clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
          background: theme.bright,
          filter: `brightness(${face.light})`,
        };

        return (
          <div key={index} aria-hidden="true" data-testid="d20-face" data-face={index + 1} style={faceStyle}>
            <div
              className="absolute inset-[0.28em]"
              style={{
                clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
                background: `linear-gradient(145deg, rgba(255,255,255,.32), transparent 30%), radial-gradient(circle at 38% 30%, ${theme.accent}, ${theme.dark} 78%)`,
                boxShadow: "inset 0 0 1.1em rgba(255,255,255,.16), inset 0 -1.5em 2.4em rgba(0,0,0,.38)",
              }}
            />
            {index === 0 && settled ? (
              <span
                data-testid="d20-front-value"
                className="absolute left-1/2 top-2/3 grid size-[7em] place-items-center rounded-full border-[0.22em] font-sans text-[5.2em] font-black leading-none text-[#fffdf2] [text-shadow:0_0.08em_0.08em_#080707,0_0_0.32em_rgba(0,0,0,.8)]"
                style={{
                  borderColor: `${theme.bright}99`,
                  background: "rgba(7, 10, 12, .26)",
                  transform: "translate(-50%, -50%) translateZ(0.45em)",
                  boxShadow: `0 0 1.1em ${theme.glow}, inset 0 0 .8em rgba(0,0,0,.35)`,
                }}
              >
                <bdi>{value}</bdi>
              </span>
            ) : null}
          </div>
        );
      })}

      <span
        aria-hidden="true"
        className="absolute start-[12%] top-[82%] h-[8%] w-[76%] rounded-[50%] blur-[1.5em]"
        style={{ background: theme.glow, transform: "translateZ(-18em) rotateX(78deg)" }}
      />
    </div>
  );
}

function ModeBadge({ result }: { result: DiceResult }) {
  if (result.mode === "normal") return null;
  const advantage = result.mode === "advantage";
  return (
    <div
      className={`mx-auto inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${advantage ? "border-[#62c6df]/45 bg-[#17313a]/85 text-[#9de8f8]" : "border-[#b478c7]/45 bg-[#2d1935]/85 text-[#e1acec]"}`}
      data-testid="dice-mode-badge"
    >
      {advantage ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
      <span>{advantage ? "יתרון — התוצאה הגבוהה נבחרה" : "חיסרון — התוצאה הנמוכה נבחרה"}</span>
    </div>
  );
}

function RollParticles({
  theme,
  outcome,
  settled,
  reducedMotion,
}: {
  theme: OutcomeTheme;
  outcome: DiceResult["outcome"];
  settled: boolean;
  reducedMotion: boolean;
}) {
  const critical = outcome === "critical-success" || outcome === "critical-failure";
  const success = outcome === "success" || outcome === "critical-success";
  const count = critical ? particleVectors.length : 10;
  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-visible" aria-hidden="true">
      {particleVectors.slice(0, count).map(([x, y], index) => (
        <motion.span
          key={`${x}-${y}`}
          className={critical && index % 3 === 0 ? "absolute left-1/2 top-1/2 h-1 w-8 rounded-full" : "absolute left-1/2 top-1/2 size-1.5 rounded-full"}
          style={{
            background: index % 2 === 0 ? theme.bright : theme.accent,
            boxShadow: `0 0 10px ${theme.glow}`,
            transformOrigin: "0 50%",
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.2, rotate: index * 23 }}
          animate={settled ? {
            x,
            y: success ? y : Math.abs(y) * 0.72 + 15,
            opacity: [0, 1, 0],
            scale: [0.2, critical ? 1.45 : 1, 0.25],
          } : { opacity: 0 }}
          transition={{ duration: critical ? 0.82 : 0.64, delay: index * 0.018, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function AnimatedDie({
  value,
  index,
  selected,
  settled,
  reducedMotion,
  theme,
  outcome,
  seed,
  dual,
}: {
  value: number;
  index: number;
  selected: boolean;
  settled: boolean;
  reducedMotion: boolean;
  theme: OutcomeTheme;
  outcome: DiceResult["outcome"];
  seed: number;
  dual: boolean;
}) {
  const direction = index % 2 === 0 ? 1 : -1;
  const variation = Math.abs(seed + index * 137) % 4;

  return (
    <div className="relative grid shrink-0 place-items-center [perspective:900px]" data-testid="animated-die">
      {selected ? (
        <>
          <motion.span
            aria-hidden="true"
            className="absolute inset-[10%] rounded-full border"
            style={{ borderColor: theme.accent, boxShadow: `0 0 42px ${theme.glow}, inset 0 0 34px ${theme.glow}` }}
            initial={{ opacity: 0, scale: 0.55 }}
            animate={settled ? { opacity: [0, 0.72, 0], scale: [0.55, 1.36, 1.62] } : { opacity: 0, scale: 0.55 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.7, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute inset-[18%] rounded-full blur-2xl"
            style={{ background: theme.glow }}
            animate={settled ? { opacity: 0.58, scale: 1.05 } : { opacity: [0.18, 0.4, 0.2], scale: [0.76, 1.08, 0.82] }}
            transition={settled ? { duration: 0.3 } : { duration: 0.55, repeat: Infinity }}
          />
          <RollParticles theme={theme} outcome={outcome} settled={settled} reducedMotion={reducedMotion} />
        </>
      ) : null}

      <motion.div
        className="relative z-10 will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
        initial={reducedMotion ? false : {
          rotateX: -105 * direction,
          rotateY: (135 + variation * 24) * direction,
          rotateZ: -32 * direction,
          y: -52,
          scale: 0.5,
        }}
        animate={settled || reducedMotion ? {
          rotateX: 0,
          rotateY: 0,
          rotateZ: 0,
          y: 0,
          x: 0,
          scale: selected ? 1 : 0.84,
        } : {
          rotateX: [-105 * direction, 310 * direction, -690 * direction, 0],
          rotateY: [(135 + variation * 24) * direction, -270 * direction, 620 * direction, 0],
          rotateZ: [-32 * direction, 120 * direction, -72 * direction, 0],
          y: [-52, 16, -14, 0],
          x: [index === 0 ? -12 : 12, index === 0 ? 7 : -7, 0],
          scale: [0.5, 1.04, 0.9, 1],
        }}
        transition={settled || reducedMotion
          ? { duration: reducedMotion ? 0.01 : 0.18, ease: "easeOut" }
          : { duration: 1.52, times: [0, 0.38, 0.76, 1], ease: [0.2, 0.75, 0.25, 1] }}
      >
        <D20Model value={value} theme={theme} settled={settled} selected={selected} dual={dual} />
      </motion.div>

      {dual && settled ? (
        <motion.span
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute -bottom-1 z-30 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold ${selected ? "border-[#f0cf82]/60 bg-[#4d351b]/95 text-[#ffe5a5]" : "border-white/15 bg-black/70 text-[#9d978d]"}`}
        >
          {selected ? "התוצאה שנבחרה" : "התוצאה שלא נבחרה"}
        </motion.span>
      ) : null}
    </div>
  );
}

function DiceRollResult({
  presentation,
  reducedMotion,
  onClose,
}: {
  presentation: DicePresentation;
  reducedMotion: boolean;
  onClose: () => void;
}) {
  const { result } = presentation;
  const outcomeTheme = outcomes[result.outcome];
  const [settled, setSettled] = useState(reducedMotion);
  const revealSoundPlayed = useRef(false);
  const critical = result.outcome === "critical-success" || result.outcome === "critical-failure";
  const shownTheme = settled ? outcomeTheme : rollingTheme;
  const displayedRolls = result.mode === "normal" ? [result.selectedRoll] : result.rolls.slice(0, 2);
  const selectedIndex = Math.max(0, displayedRolls.findIndex((roll) => roll === result.selectedRoll));
  const dual = displayedRolls.length > 1;

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), reducedMotion ? 0 : 1540);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  useEffect(() => {
    if (!settled || revealSoundPlayed.current) return;
    revealSoundPlayed.current = true;
    audioManager.play(outcomeTheme.revealSound);
  }, [settled, outcomeTheme.revealSound]);

  return (
    <div className="text-center" data-animation-state={settled ? "settled" : "rolling"}>
      <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#c9bea9] sm:text-sm">{presentation.skillLabel}</p>
      <ModeBadge result={result} />

      <div
        className={`relative mx-auto my-1 flex items-center justify-center gap-1 [perspective:1100px] sm:my-3 sm:gap-3 ${dual ? "min-h-[10rem] w-full" : "min-h-[11rem] sm:min-h-[13.5rem]"}`}
        data-testid="dice-stage"
        data-dice-count={displayedRolls.length}
      >
        {displayedRolls.map((roll, index) => (
          <AnimatedDie
            key={`${index}-${roll}`}
            value={roll}
            index={index}
            selected={index === selectedIndex}
            settled={settled}
            reducedMotion={reducedMotion}
            theme={shownTheme}
            outcome={result.outcome}
            seed={result.seed}
            dual={dual}
          />
        ))}
      </div>

      <div className="min-h-11" aria-live="polite" aria-atomic="true">
        {settled ? (
          <motion.div initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className={`display-font flex items-center justify-center gap-2 text-2xl sm:text-3xl ${outcomeTheme.textClass}`}>
              {critical ? <Sparkles className="size-5" aria-hidden="true" /> : null}
              <p>{outcomeTheme.label}</p>
              {critical ? <Sparkles className="size-5" aria-hidden="true" /> : null}
            </div>
            <p className="sr-only">{outcomeTheme.announcement}</p>
            {critical ? (
              <p className="mt-1 text-xs font-bold tracking-[0.12em]" style={{ color: outcomeTheme.bright }}>
                {result.outcome === "critical-success" ? "20 טבעי" : "1 טבעי"}
              </p>
            ) : null}
          </motion.div>
        ) : (
          <p className="text-sm text-[#bdb4a7]" role="status">{dual ? "הקוביות מתגלגלות…" : "הקובייה מתגלגלת…"}</p>
        )}
      </div>

      {settled && dual ? (
        <p className="mt-1 text-sm text-[#a89f91]">
          ההטלות: <bdi className="ltr-isolate font-bold text-[#ded5c7]">{displayedRolls.join(" / ")}</bdi>
        </p>
      ) : null}

      {settled ? (
        <motion.div
          className="mx-auto my-3 grid max-w-sm grid-cols-3 divide-x divide-x-reverse divide-[#c6a15b]/20 border-y border-[#c6a15b]/20 py-2 text-xs sm:my-4 sm:text-sm"
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.22 }}
        >
          <span>קובייה<bdi className="mt-0.5 block text-lg font-black text-white">{result.selectedRoll}</bdi></span>
          <span>תוסף<bdi className="mt-0.5 block text-lg font-black text-white">{result.modifier >= 0 ? "+" : ""}{result.modifier}</bdi></span>
          <span>דרגת קושי<bdi className="mt-0.5 block text-lg font-black text-white">{result.difficulty}</bdi></span>
        </motion.div>
      ) : (
        <div aria-hidden="true" className="mx-auto my-3 h-[3.65rem] max-w-sm border-y border-[#c6a15b]/10 bg-[linear-gradient(90deg,transparent,rgba(198,161,91,.06),transparent)] sm:my-4" />
      )}

      {settled ? (
        <p className="text-sm text-[#bdb4a7]">
          תוצאה סופית: <bdi className="ltr-isolate text-lg font-black text-white">{result.finalResult}</bdi>
        </p>
      ) : null}
      <GameButton
        className="mt-3 w-full sm:mt-4"
        variant={settled ? "primary" : "secondary"}
        sound={settled ? "confirm" : "dice"}
        onClick={settled ? onClose : () => setSettled(true)}
      >
        {settled ? "המשך" : "דלג לתוצאה"}
      </GameButton>
    </div>
  );
}

export function DiceOverlay({ presentation, onClose }: { presentation: DicePresentation | null; onClose: () => void }) {
  const manualReducedMotion = useSettingsStore((state) => state.reducedMotion);
  const systemReducedMotion = useReducedMotion();
  const result = presentation?.result;
  const rollIdentity = presentation
    ? `${presentation.skillLabel}-${presentation.result.seed}-${presentation.result.selectedRoll}-${presentation.result.outcome}`
    : "closed";

  return (
    <Modal
      open={Boolean(presentation)}
      title="בדיקת מיומנות"
      onClose={onClose}
      className="sm:max-w-xl"
      overlayClassName="z-[170] overscroll-none"
      allowClose={false}
    >
      {result && presentation ? (
        <DiceRollResult
          key={rollIdentity}
          presentation={presentation}
          reducedMotion={manualReducedMotion || Boolean(systemReducedMotion)}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}
