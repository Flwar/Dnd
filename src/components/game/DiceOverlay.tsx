"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
  glow: string;
  textClass: string;
  revealSound: SoundCue;
};

type Vector3 = readonly [number, number, number];

type FaceGeometry = {
  matrix: string;
  translation: string;
  normal: Vector3;
};

type FaceStyle = CSSProperties & {
  "--face-light": number;
  "--face-specular": number;
};

const outcomes: Record<DiceResult["outcome"], OutcomeTheme> = {
  "critical-success": {
    label: "הצלחה מכרעת",
    announcement: "הצלחה מכרעת! הגורל נוטה לטובתך.",
    accent: "#f4cf73",
    bright: "#fff5b8",
    glow: "rgba(244, 207, 115, 0.72)",
    textClass: "text-[#ffe28f]",
    revealSound: "critical",
  },
  success: {
    label: "הצלחה",
    announcement: "בדיקת המיומנות הצליחה.",
    accent: "#77d89a",
    bright: "#d8ffe4",
    glow: "rgba(119, 216, 154, 0.55)",
    textClass: "text-[#9ce8b5]",
    revealSound: "confirm",
  },
  failure: {
    label: "כישלון",
    announcement: "בדיקת המיומנות נכשלה.",
    accent: "#e56c65",
    bright: "#ffd1c7",
    glow: "rgba(229, 108, 101, 0.55)",
    textClass: "text-[#f19a91]",
    revealSound: "damage",
  },
  "critical-failure": {
    label: "כישלון מכריע",
    announcement: "כישלון מכריע. הגורל פנה נגדך.",
    accent: "#dc5364",
    bright: "#ffb8c0",
    glow: "rgba(220, 83, 100, 0.7)",
    textClass: "text-[#ff8d9b]",
    revealSound: "critical",
  },
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
      normal: outward,
    };
  });
}

const faces = buildFaceGeometry();
const worldLightDirection = normalize([-0.58, -0.72, 0.82]);
const halfVector = normalize(add(worldLightDirection, [0, 0, 1]));

function rotateNormal(normal: Vector3, rotateX: number, rotateY: number, rotateZ: number): Vector3 {
  const xRadians = rotateX * Math.PI / 180;
  const yRadians = rotateY * Math.PI / 180;
  const zRadians = rotateZ * Math.PI / 180;
  const cosX = Math.cos(xRadians);
  const sinX = Math.sin(xRadians);
  const cosY = Math.cos(yRadians);
  const sinY = Math.sin(yRadians);
  const cosZ = Math.cos(zRadians);
  const sinZ = Math.sin(zRadians);

  const afterX: Vector3 = [
    normal[0],
    normal[1] * cosX - normal[2] * sinX,
    normal[1] * sinX + normal[2] * cosX,
  ];
  const afterY: Vector3 = [
    afterX[0] * cosY + afterX[2] * sinY,
    afterX[1],
    -afterX[0] * sinY + afterX[2] * cosY,
  ];
  return [
    afterY[0] * cosZ - afterY[1] * sinZ,
    afterY[0] * sinZ + afterY[1] * cosZ,
    afterY[2],
  ];
}

function faceLighting(normal: Vector3, rotateX = 0, rotateY = 0, rotateZ = 0) {
  const worldNormal = rotateNormal(normal, rotateX, rotateY, rotateZ);
  const diffuse = Math.max(0, dot(worldNormal, worldLightDirection));
  const cameraFacing = Math.max(0, worldNormal[2]);
  const specular = Math.pow(Math.max(0, dot(worldNormal, halfVector)), 20);
  return {
    brightness: Math.max(0.34, Math.min(1.08, 0.36 + diffuse * 0.58 + cameraFacing * 0.1)),
    specular: Math.min(0.5, specular * 0.46),
  };
}

function findOppositeFaceIndices(): readonly number[] {
  return faces.map((face, index) => {
    let oppositeIndex = index;
    let smallestDot = Number.POSITIVE_INFINITY;
    faces.forEach((candidate, candidateIndex) => {
      const normalDot = dot(face.normal, candidate.normal);
      if (normalDot < smallestDot) {
        smallestDot = normalDot;
        oppositeIndex = candidateIndex;
      }
    });
    return oppositeIndex;
  });
}

const oppositeFaceIndices = findOppositeFaceIndices();

// Every opposing pair on a standard d20 totals 21. We keep that physical rule
// while rotating which engraved face lands in front for the authoritative roll.
function faceValuesForRoll(value: number, seed: number): readonly number[] {
  const faceValues = Array<number>(20).fill(0);
  const assigned = new Set<number>();
  const frontOpposite = oppositeFaceIndices[0];
  faceValues[0] = value;
  faceValues[frontOpposite] = 21 - value;
  assigned.add(0);
  assigned.add(frontOpposite);

  const selectedPair = Math.min(value, 21 - value);
  const remainingPairs = Array.from({ length: 10 }, (_, index) => [index + 1, 20 - index] as const)
    .filter(([low]) => low !== selectedPair);
  const offset = Math.abs(seed) % remainingPairs.length;
  const orderedPairs = [...remainingPairs.slice(offset), ...remainingPairs.slice(0, offset)];
  let pairIndex = 0;

  for (let faceIndex = 1; faceIndex < faces.length; faceIndex += 1) {
    if (assigned.has(faceIndex)) continue;
    const oppositeIndex = oppositeFaceIndices[faceIndex];
    const [low, high] = orderedPairs[pairIndex];
    const reverse = Math.abs(seed + faceIndex * 37) % 2 === 1;
    faceValues[faceIndex] = reverse ? high : low;
    faceValues[oppositeIndex] = reverse ? low : high;
    assigned.add(faceIndex);
    assigned.add(oppositeIndex);
    pairIndex += 1;
  }

  return faceValues;
}

function D20Model({
  value,
  seed,
  settled,
  selected,
  dual,
  registerFace,
}: {
  value: number;
  seed: number;
  settled: boolean;
  selected: boolean;
  dual: boolean;
  registerFace: (index: number, element: HTMLDivElement | null) => void;
}) {
  const accessibleLabel = settled
    ? `קוביית עשרים פאות. התוצאה היא ${value}`
    : "קוביית עשרים פאות מתגלגלת";
  const engravedValues = faceValuesForRoll(value, seed);

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
      data-material="obsidian-bronze"
    >
      {faces.map((face, index) => {
        const lighting = faceLighting(face.normal);
        const faceStyle: FaceStyle = {
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
          background: "linear-gradient(135deg, #8a683e, #47331f 58%, #1a1715)",
          filter: "brightness(var(--face-light)) saturate(.82)",
          "--face-light": lighting.brightness,
          "--face-specular": lighting.specular,
        };
        const engravedValue = engravedValues[index];

        return (
          <div
            key={index}
            ref={(element) => registerFace(index, element)}
            aria-hidden="true"
            data-testid="d20-face"
            data-face={index + 1}
            data-face-value={engravedValue}
            style={faceStyle}
          >
            <div
              className="absolute inset-[0.28em]"
              style={{
                clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
                background: "radial-gradient(circle at 50% 48%,rgba(83,77,68,.42),transparent 58%),repeating-linear-gradient(27deg,rgba(255,255,255,.022) 0 .08em,transparent .08em .72em),linear-gradient(160deg,#252627,#111416 62%,#07090a)",
                boxShadow: "inset 0 0 1.1em rgba(197,151,83,.1), inset 0 -1.8em 2.8em rgba(0,0,0,.52)",
              }}
            />
            <div
              className="absolute inset-[0.28em] bg-[radial-gradient(circle_at_50%_42%,rgba(255,229,176,.52),transparent_58%)]"
              style={{
                clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
                opacity: "var(--face-specular)",
              }}
            />
            <span
              data-testid={index === 0 && settled ? "d20-front-value" : "d20-face-number"}
              className={`absolute left-1/2 top-2/3 grid min-w-[5em] -translate-x-1/2 -translate-y-1/2 place-items-center font-sans font-black leading-none text-[#c49a5d] [text-shadow:0_-0.045em_0_rgba(255,224,164,.22),0_0.085em_0.08em_rgba(0,0,0,.96)] ${engravedValue >= 10 ? "text-[3.9em]" : "text-[4.7em]"}`}
              style={{ transform: "translate(-50%, -50%) translateZ(0.42em)" }}
            >
              <bdi>{engravedValue}</bdi>
            </span>
          </div>
        );
      })}
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
  const faceElements = useRef<Array<HTMLDivElement | null>>([]);
  const registerFace = useCallback((faceIndex: number, element: HTMLDivElement | null) => {
    faceElements.current[faceIndex] = element;
  }, []);
  const updateFaceLighting = useCallback((rotateX: number, rotateY: number, rotateZ: number) => {
    faces.forEach((face, faceIndex) => {
      const element = faceElements.current[faceIndex];
      if (!element) return;
      const lighting = faceLighting(face.normal, rotateX, rotateY, rotateZ);
      element.style.setProperty("--face-light", String(lighting.brightness));
      element.style.setProperty("--face-specular", String(lighting.specular));
    });
  }, []);

  useEffect(() => {
    if (settled || reducedMotion) {
      updateFaceLighting(0, 0, 0);
      return;
    }
    updateFaceLighting(-105 * direction, (135 + variation * 24) * direction, -32 * direction);
  }, [direction, reducedMotion, settled, updateFaceLighting, variation]);

  const numericMotionValue = (value: unknown) => {
    if (typeof value === "number") return value;
    const parsed = Number.parseFloat(String(value ?? 0));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return (
    <div className="relative z-10 grid shrink-0 place-items-center [perspective:900px]" data-testid="animated-die">
      <span aria-hidden="true" className="absolute bottom-[7%] left-1/2 z-0 h-[7%] w-[62%] -translate-x-1/2">
        <motion.span
          data-testid="d20-ground-shadow"
          className="block size-full rounded-[50%] bg-black/85 blur-[0.65rem]"
          initial={reducedMotion ? false : { opacity: 0.24, scaleX: 0.58, scaleY: 0.54 }}
          animate={settled || reducedMotion ? {
            opacity: selected ? 0.76 : 0.56,
            scaleX: selected ? 1 : 0.84,
            scaleY: selected ? 0.72 : 0.62,
          } : {
            opacity: [0.24, 0.66, 0.34, 0.74],
            scaleX: [0.58, 1.04, 0.74, 1],
            scaleY: [0.54, 0.8, 0.6, 0.72],
          }}
          transition={settled || reducedMotion
            ? { duration: reducedMotion ? 0.01 : 0.18, ease: "easeOut" }
            : { duration: 1.52, times: [0, 0.38, 0.76, 1], ease: [0.2, 0.75, 0.25, 1] }}
        />
      </span>

      {selected && settled ? (
        <>
          <motion.span
            aria-hidden="true"
            data-testid="d20-outcome-halo"
            className="absolute inset-[10%] rounded-full border"
            style={{ borderColor: theme.accent, boxShadow: `0 0 42px ${theme.glow}, inset 0 0 34px ${theme.glow}` }}
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: [0, 0.72, 0], scale: [0.55, 1.36, 1.62] }}
            transition={{ duration: reducedMotion ? 0.01 : 0.7, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute inset-[18%] rounded-full blur-2xl"
            style={{ background: theme.glow }}
            initial={{ opacity: 0, scale: 0.78 }}
            animate={{ opacity: 0.5, scale: 1.04 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.3 }}
          />
          <RollParticles theme={theme} outcome={outcome} settled={settled} reducedMotion={reducedMotion} />
        </>
      ) : null}

      <motion.div
        data-testid="d20-rotating-body"
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
        onUpdate={(latest) => updateFaceLighting(
          numericMotionValue(latest.rotateX),
          numericMotionValue(latest.rotateY),
          numericMotionValue(latest.rotateZ),
        )}
      >
        <D20Model value={value} seed={seed} settled={settled} selected={selected} dual={dual} registerFace={registerFace} />
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
        <div
          aria-hidden="true"
          data-testid="dice-stone-surface"
          className="pointer-events-none absolute inset-x-[-0.75rem] bottom-[-7%] z-0 h-[46%] overflow-hidden rounded-[50%] border-t border-[#8d7350]/35 bg-[radial-gradient(ellipse_at_50%_24%,rgba(137,116,84,.22),transparent_48%),repeating-linear-gradient(168deg,rgba(255,255,255,.018)_0_1px,transparent_1px_13px),linear-gradient(180deg,#272521,#0c0d0e_78%)] shadow-[inset_0_12px_28px_rgba(255,220,160,.025),0_-5px_30px_rgba(0,0,0,.45)]"
          style={{ transform: "perspective(520px) rotateX(64deg)", transformOrigin: "50% 100%" }}
        >
          <span className="absolute inset-x-[12%] top-[18%] h-px rotate-[-4deg] bg-gradient-to-r from-transparent via-black/70 to-transparent" />
          <span className="absolute start-[25%] top-[30%] h-px w-[46%] rotate-[7deg] bg-black/55" />
        </div>
        {displayedRolls.map((roll, index) => (
          <AnimatedDie
            key={`${index}-${roll}`}
            value={roll}
            index={index}
            selected={index === selectedIndex}
            settled={settled}
            reducedMotion={reducedMotion}
            theme={outcomeTheme}
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
