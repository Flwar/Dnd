"use client";

import { forwardRef } from "react";
import { LoaderCircle } from "lucide-react";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
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
    const reduceMotion = useReducedMotion();

    return (
      <motion.button
        ref={ref}
        type="button"
        data-variant={variant}
        data-size={size}
        whileHover={disabled || loading || reduceMotion ? undefined : { y: -2 }}
        whileTap={disabled || loading || reduceMotion ? undefined : { y: 0, scale: 0.985 }}
        transition={{ duration: 0.12 }}
        className={cn(
          "game-button group relative inline-flex touch-manipulation items-center justify-center gap-2 overflow-hidden border font-semibold tracking-wide transition-[color,background,border-color,box-shadow,opacity] duration-200 disabled:cursor-not-allowed disabled:opacity-45",
          "before:absolute before:inset-0 before:translate-x-[115%] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:transition-transform before:duration-500 hover:before:-translate-x-[115%]",
          variant === "primary" && "border-[#d2ad62]/75 bg-[linear-gradient(180deg,#957440_0%,#67481f_48%,#3f2a15_100%)] text-[#fff4d8] shadow-[inset_0_1px_rgba(255,239,194,.22),inset_0_-8px_18px_rgba(39,19,6,.22),0_10px_28px_rgba(0,0,0,.38)] hover:border-[#ffe19a] hover:shadow-[inset_0_1px_rgba(255,239,194,.28),inset_0_-8px_18px_rgba(39,19,6,.2),0_14px_34px_rgba(0,0,0,.46),0_0_22px_rgba(198,161,91,.1)]",
          variant === "secondary" && "border-[#899195]/38 bg-[linear-gradient(180deg,#30353a_0%,#1d2125_48%,#111417_100%)] text-[#e8dfce] shadow-[inset_0_1px_rgba(255,255,255,.08),0_8px_22px_rgba(0,0,0,.28)] hover:border-[#c6a15b]/62 hover:text-[#ffe4a4] hover:shadow-[inset_0_1px_rgba(255,255,255,.1),0_12px_28px_rgba(0,0,0,.36)]",
          variant === "danger" && "border-[#b64d5f]/72 bg-[linear-gradient(180deg,#7b2c3a,#4e1d28_50%,#2b1017)] text-[#ffe9e6] shadow-[inset_0_1px_rgba(255,220,215,.12),0_8px_22px_rgba(0,0,0,.32)] hover:border-[#ef786f]",
          variant === "ghost" && "border-transparent bg-transparent text-[#c8c0b3] hover:border-[#c6a15b]/28 hover:bg-[#c6a15b]/[.07] hover:text-[#ffe0a0]",
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
        <span className="game-button__frame" aria-hidden="true" />
        <span className="relative z-10 inline-flex min-w-0 items-center justify-center gap-2">
          {loading ? <LoaderCircle className="size-5 shrink-0 animate-spin" aria-hidden="true" /> : null}
          {children}
        </span>
      </motion.button>
    );
  },
);
