"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { GameButton } from "@/components/ui/GameButton";
import { acquireBodyScrollLock } from "@/lib/body-scroll-lock";
import { cn } from "@/lib/cn";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  closeLabel?: string;
  allowClose?: boolean;
};

export function Modal({ open, title, onClose, children, className, overlayClassName, closeLabel = "סגירת החלון", allowClose = true }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    ) ?? []);
    window.setTimeout(() => focusables()[0]?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      // A modal owns keyboard input while it is open. In particular, this
      // prevents game and dialogue shortcuts registered on `window` from
      // acting on obscured controls beneath the modal.
      event.stopPropagation();
      if (event.key === "Escape" && allowClose) {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const releaseScrollLock = acquireBodyScrollLock();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      releaseScrollLock();
      previous?.focus();
    };
  }, [open, allowClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={cn("fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/78 p-0 backdrop-blur-sm sm:p-5", overlayClassName)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && allowClose) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn("mobile-safe-modal stone-panel relative my-auto max-h-dvh w-full overscroll-contain overflow-x-hidden overflow-y-auto sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-4xl", className)}
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="mb-5 flex items-center justify-between gap-4 border-b border-[#c6a15b]/20 pb-4">
              <h2 id={titleId} className="display-font text-2xl text-[#f0cf82] sm:text-3xl">{title}</h2>
              {allowClose ? (
                <GameButton variant="ghost" size="icon" onClick={onClose} aria-label={closeLabel}>
                  <X className="size-6" aria-hidden="true" />
                </GameButton>
              ) : null}
            </header>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
