"use client";

import { forwardRef } from "react";
import { LoaderCircle } from "lucide-react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";
import { audioManager, type SoundCue } from "@/lib/audio/audio-manager";

type GameButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  sound?: SoundCue;
};

export const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  function GameButton(
    { className, children, variant = "primary", size = "md", loading, disabled, sound = "confirm", onClick, onMouseEnter, ...props },
    ref,
  ) {
    return (
      <motion.button
        ref={ref}
        type="button"
        whileHover={disabled || loading ? undefined : { y: -1 }}
        whileTap={disabled || loading ? undefined : { scale: 0.985 }}
        transition={{ duration: 0.12 }}
        className={cn(
          "group relative inline-flex touch-manipulation items-center justify-center gap-2 overflow-hidden border font-semibold tracking-wide transition-[color,background,border-color,box-shadow,opacity] duration-200 disabled:cursor-not-allowed disabled:opacity-45",
          "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/8 before:to-transparent before:transition-transform before:duration-500 hover:before:translate-x-full",
          variant === "primary" && "border-[#c6a15b]/70 bg-gradient-to-b from-[#8b6b34] to-[#4d351b] text-[#fff3d2] shadow-[inset_0_1px_rgba(255,239,194,.18),0_8px_24px_rgba(0,0,0,.35)] hover:border-[#f0cf82] hover:from-[#9c793d] hover:to-[#5b3e20]",
          variant === "secondary" && "border-[#899195]/35 bg-gradient-to-b from-[#2b3034] to-[#15181b] text-[#e8dfce] hover:border-[#c6a15b]/55 hover:text-[#f0cf82]",
          variant === "danger" && "border-[#a43b4e]/70 bg-gradient-to-b from-[#6f2633] to-[#35131a] text-[#ffe7e4] hover:border-[#d05b54]",
          variant === "ghost" && "border-transparent bg-transparent text-[#c8c0b3] hover:border-[#c6a15b]/30 hover:bg-[#c6a15b]/8 hover:text-[#f0cf82]",
          size === "sm" && "min-h-[44px] px-3 py-1.5 text-sm",
          size === "md" && "min-h-12 px-5 py-2.5",
          size === "lg" && "min-h-14 px-8 py-3 text-lg",
          size === "icon" && "size-12 p-0",
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        onMouseEnter={(event) => {
          if (!disabled && !loading) audioManager.play("hover");
          onMouseEnter?.(event);
        }}
        onClick={(event) => {
          if (!disabled && !loading) audioManager.play(sound);
          onClick?.(event);
        }}
        {...props}
      >
        {loading ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
        <span className="relative z-10">{children}</span>
      </motion.button>
    );
  },
);
