"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";
import { ArtDirectedPicture } from "@/components/ui/ArtDirectedPicture";
import { openingChapter } from "@/content/chapters/opening";
import { getAssetPath } from "@/lib/assets/manifest";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";

const cinematicScenes = [
  { eyebrow: "לפני אלף שנים", title: "שבעה שליטים כרעו יחד", assetKey: "background-standing-stones" },
  { eyebrow: "כתר הברית", title: "ניצחון שנקנה בכלא", assetKey: "background-guardian-sanctum" },
  { eyebrow: "שבעה רסיסים", title: "האמת נשחקה לאגדה", assetKey: "background-hidden-chamber" },
  { eyebrow: "עכשיו", title: "הערפל שוב לוחש", assetKey: "background-shard-sanctum" },
  { eyebrow: "ערפלון", title: "כאן מתחיל המסע שלך", assetKey: "background-village-gate" },
] as const;

export function OpeningCinematic({ open, onFinish }: { open: boolean; onFinish: () => void }) {
  const [activeScene, setActiveScene] = useState(0);
  const continueRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const onFinishRef = useRef(onFinish);
  const activeSceneRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();
  const sceneIndex = Math.min(activeScene, cinematicScenes.length - 1);
  const scene = cinematicScenes[sceneIndex];
  const isFinalScene = sceneIndex === cinematicScenes.length - 1;

  const advance = () => {
    if (isFinalScene) onFinish();
    else {
      const nextScene = Math.min(sceneIndex + 1, cinematicScenes.length - 1);
      activeSceneRef.current = nextScene;
      setActiveScene(nextScene);
    }
  };

  const goBack = () => {
    const previousScene = Math.max(0, sceneIndex - 1);
    activeSceneRef.current = previousScene;
    setActiveScene(previousScene);
  };

  useEffect(() => {
    onFinishRef.current = onFinish;
    activeSceneRef.current = sceneIndex;
  }, [onFinish, sceneIndex]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScrollLock = acquireBodyScrollLock();
    const focusTimer = window.setTimeout(() => continueRef.current?.focus(), 120);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const focusableItems = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
        const first = focusableItems[0];
        const last = focusableItems[focusableItems.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        onFinishRef.current();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        const currentScene = activeSceneRef.current;
        if (currentScene === cinematicScenes.length - 1) onFinishRef.current();
        else {
          const nextScene = Math.min(currentScene + 1, cinematicScenes.length - 1);
          activeSceneRef.current = nextScene;
          setActiveScene(nextScene);
        }
      } else if (event.key === "ArrowRight" && activeSceneRef.current > 0) {
        event.preventDefault();
        const previousScene = Math.max(0, activeSceneRef.current - 1);
        activeSceneRef.current = previousScene;
        setActiveScene(previousScene);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      releaseScrollLock();
      previousFocus?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.section
          ref={panelRef}
          className="fixed inset-0 z-[150] isolate overflow-hidden bg-black"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="opening-cinematic-title"
          aria-describedby="opening-cinematic-narration"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={scene.assetKey}
              className="absolute inset-0"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.045 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <ArtDirectedPicture
                desktopSrc={getAssetPath(scene.assetKey)}
                mobileSrc={getAssetPath(`${scene.assetKey}-mobile`)}
                alt=""
                priority
                pictureClassName="absolute inset-0"
                className="opacity-80"
              />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_34%,transparent_5%,rgba(0,0,0,.15)_48%,rgba(0,0,0,.88)_100%),linear-gradient(to_bottom,rgba(0,0,0,.28),transparent_35%,rgba(0,0,0,.94)_88%)]" aria-hidden="true" />
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(105deg,transparent_42%,rgba(240,207,130,.18)_50%,transparent_58%)]" aria-hidden="true" />

          <div className="safe-inline-area absolute inset-x-0 top-0 z-20 flex items-center justify-between pt-[max(.7rem,env(safe-area-inset-top))] [--safe-inline-padding:.75rem] sm:[--safe-inline-padding:1.5rem]">
            <div className="max-w-[65vw] truncate border border-[#c6a15b]/25 bg-black/45 px-3 py-2 text-[0.58rem] font-bold tracking-[.12em] text-[#d6c49d] backdrop-blur-sm sm:text-xs">פרק ראשון · {openingChapter.name} · <bdi>{sceneIndex + 1}/{cinematicScenes.length}</bdi></div>
            <GameButton variant="ghost" className="min-h-11 bg-black/35" onClick={onFinish}><SkipForward className="size-4" aria-hidden="true" /> דילוג</GameButton>
          </div>

          <div className="safe-inline-area relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end pb-[max(1rem,env(safe-area-inset-bottom))] [--safe-inline-padding:1rem] sm:[--safe-inline-padding:2rem]">
            <div className="mb-[min(4dvh,2rem)] max-w-3xl border-r border-[#c6a15b]/48 bg-gradient-to-l from-black/50 to-transparent py-3 pe-4 text-right sm:py-5 sm:pe-7">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={scene.title}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                >
                  <p className="text-[0.66rem] font-bold tracking-[.28em] text-[#c6a15b] sm:text-xs">{scene.eyebrow}</p>
                  <h1 id="opening-cinematic-title" className="display-font mt-1 text-3xl leading-tight text-[#f4dfad] drop-shadow-[0_3px_20px_rgba(0,0,0,.9)] sm:text-6xl">{scene.title}</h1>
                  <p id="opening-cinematic-narration" className="mt-3 max-w-2xl text-sm leading-7 text-[#e5dccd] drop-shadow-[0_2px_8px_rgba(0,0,0,.95)] sm:mt-5 sm:text-xl sm:leading-9" aria-live="polite">{openingChapter.openingNarration[sceneIndex]}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#c6a15b]/22 pt-3 sm:pt-4">
              <div className="flex items-center gap-1.5" aria-label={`קטע ${sceneIndex + 1} מתוך ${cinematicScenes.length}`}>
                {cinematicScenes.map((item, index) => (
                  <span key={item.title} className={`h-1 transition-[width,background-color] ${index === sceneIndex ? "w-9 bg-[#f0cf82]" : index < sceneIndex ? "w-4 bg-[#c6a15b]/55" : "w-4 bg-white/18"}`} aria-hidden="true" />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {sceneIndex > 0 ? <GameButton variant="ghost" size="icon" className="h-11 w-11 bg-black/35" onClick={goBack} aria-label="הקטע הקודם"><ChevronRight className="size-5" aria-hidden="true" /></GameButton> : null}
                <GameButton ref={continueRef} size="lg" className="min-w-36 sm:min-w-48" onClick={advance}>{isFinalScene ? "כניסה לערפלון" : "המשך"}<ChevronLeft className="size-5" aria-hidden="true" /></GameButton>
              </div>
            </div>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
