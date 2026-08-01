"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, Cloud, Compass, PackageOpen, ScrollText, Sparkles, Users } from "lucide-react";
import { useGameStore } from "@/store/game-store";

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

export function GameNotifications() {
  const notifications = useGameStore((state) => state.notifications);
  const dismiss = useGameStore((state) => state.dismissNotification);

  useEffect(() => {
    if (!notifications.length) return;
    const timers = notifications.map((notification) =>
      window.setTimeout(() => dismiss(notification.id), notification.type === "error" ? 7000 : 4300),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [notifications, dismiss]);

  return (
    <div className="pointer-events-none fixed end-3 top-20 z-[130] flex w-[min(23rem,calc(100vw-1.5rem))] flex-col gap-2" aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {notifications.map((notification) => {
          const Icon = icons[notification.type];
          return (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, x: -24, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -18, height: 0 }}
              className={`pointer-events-auto border bg-[#101317]/96 p-3 shadow-2xl backdrop-blur ${notification.type === "error" ? "border-[#d05b54]/65" : "border-[#c6a15b]/40"}`}
              role={notification.type === "error" ? "alert" : "status"}
              onClick={() => dismiss(notification.id)}
            >
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 size-5 shrink-0 ${notification.type === "error" ? "text-[#ef827b]" : "text-[#f0cf82]"}`} aria-hidden="true" />
                <div>
                  <p className="font-bold text-[#f3e8d3]">{notification.title}</p>
                  <p className="mt-0.5 text-sm text-[#bdb4a7]">{notification.message}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
