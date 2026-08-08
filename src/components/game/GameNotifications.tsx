"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleAlert, Cloud, Compass, PackageOpen, ScrollText, Sparkles, Users, X } from "lucide-react";
import { useGameStore } from "@/store/game-store";
import type { Notification } from "@/types/game";

const icons = {
  item: PackageOpen,
  quest: ScrollText,
  experience: Sparkles,
  level: Sparkles,
  reputation: Users,
  discovery: Compass,
  save: Cloud,
  error: CircleAlert,
  connection: Cloud,
  party: Users,
};

const notificationStyles: Record<Notification["type"], { accent: string; icon: string; glow: string }> = {
  item: { accent: "bg-[#c6a15b]", icon: "text-[#f0cf82]", glow: "shadow-[#c6a15b]/10" },
  quest: { accent: "bg-[#d1aa58]", icon: "text-[#f0cf82]", glow: "shadow-[#c6a15b]/10" },
  experience: { accent: "bg-[#62c6df]", icon: "text-[#9eeaff]", glow: "shadow-[#62c6df]/10" },
  level: { accent: "bg-[#f0cf82]", icon: "text-[#ffe4a3]", glow: "shadow-[#f0cf82]/15" },
  reputation: { accent: "bg-[#9f8ac4]", icon: "text-[#cab7eb]", glow: "shadow-[#9f8ac4]/10" },
  discovery: { accent: "bg-[#62c6df]", icon: "text-[#9eeaff]", glow: "shadow-[#62c6df]/10" },
  save: { accent: "bg-[#77b686]", icon: "text-[#a8dcb5]", glow: "shadow-[#77b686]/10" },
  error: { accent: "bg-[#d05b54]", icon: "text-[#ff9b94]", glow: "shadow-[#d05b54]/15" },
  connection: { accent: "bg-[#62c6df]", icon: "text-[#9eeaff]", glow: "shadow-[#62c6df]/10" },
  party: { accent: "bg-[#77b686]", icon: "text-[#a8dcb5]", glow: "shadow-[#77b686]/10" },
};

export function GameNotifications() {
  const notifications = useGameStore((state) => state.notifications);
  const dismiss = useGameStore((state) => state.dismissNotification);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!notifications.length) return;
    const now = Date.now();
    const timers = notifications.map((notification) => {
      const lifetime = notification.type === "error" ? 7000 : 4300;
      const createdAt = Date.parse(notification.createdAt);
      const elapsed = Number.isFinite(createdAt) ? Math.max(0, now - createdAt) : 0;
      return window.setTimeout(() => dismiss(notification.id), Math.max(100, lifetime - elapsed));
    });
    return () => timers.forEach(window.clearTimeout);
  }, [notifications, dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(max(.5rem,env(safe-area-inset-top))+3.75rem)] z-[130] mx-auto flex w-[min(24rem,calc(100vw-1rem))] flex-col gap-2 sm:inset-x-auto sm:end-4 sm:top-20" aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {notifications.slice(-3).map((notification) => {
          const Icon = icons[notification.type];
          const style = notificationStyles[notification.type];
          const duration = notification.type === "error" ? 7 : 4.3;
          return (
            <motion.div
              key={notification.id}
              layout={!prefersReducedMotion}
              initial={prefersReducedMotion ? false : { opacity: 0, y: -14, scale: 0.975 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.985 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={`pointer-events-auto relative overflow-hidden border bg-[linear-gradient(130deg,rgba(25,28,32,.98),rgba(7,9,11,.985))] shadow-2xl ${style.glow} backdrop-blur-md ${notification.type === "error" ? "border-[#d05b54]/60" : "border-[#c6a15b]/32"}`}
              role={notification.type === "error" ? "alert" : "status"}
              aria-atomic="true"
            >
              <div className={`absolute inset-y-0 start-0 w-1 ${style.accent}`} aria-hidden="true" />
              <div className="flex items-start gap-3 px-3 py-3 ps-4">
                <div className="grid size-9 shrink-0 place-items-center border border-white/10 bg-black/25 shadow-inner">
                  <Icon className={`size-[1.15rem] ${style.icon}`} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold leading-5 text-[#f3e8d3]">{notification.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-[#bdb4a7] sm:text-sm">{notification.message}</p>
                </div>
                <button type="button" className="grid size-9 shrink-0 place-items-center text-[#8f887e] transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-[#f0cf82]" onClick={() => dismiss(notification.id)} aria-label={`סגירת ההודעה: ${notification.title}`}><X className="size-4" aria-hidden="true" /></button>
              </div>
              {!prefersReducedMotion ? <motion.div className={`absolute inset-x-0 bottom-0 h-px origin-right ${style.accent}`} initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration, ease: "linear" }} aria-hidden="true" /> : null}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
