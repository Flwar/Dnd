import { cn } from "@/lib/cn";

interface CombatMeterProps {
  label: string;
  value: number;
  maximum: number;
  tone: "health" | "resource" | "guard";
  compact?: boolean;
}

const toneClasses = {
  health: "from-[#571522] via-[#a52f40] to-[#ec6b69]",
  resource: "from-[#123c59] via-[#24789c] to-[#70d4eb]",
  guard: "from-[#34383e] via-[#7a8088] to-[#d1d5db]",
} as const;

export function CombatMeter({ label, value, maximum, tone, compact = false }: CombatMeterProps) {
  const safeMaximum = Math.max(1, Math.round(maximum));
  const safeValue = Math.max(0, Math.min(Math.round(value), safeMaximum));
  const percentage = Math.round((safeValue / safeMaximum) * 100);

  return (
    <div className="min-w-0">
      <div className={cn("mb-1 flex items-center justify-between gap-3 text-[0.7rem] text-[#d6ccbb]", compact && "sr-only")}>
        <span>{label}</span>
        <bdi dir="ltr" className="tabular-nums">{safeValue} / {safeMaximum}</bdi>
      </div>
      <div
        role="progressbar"
        aria-label={`${label}: ${safeValue} מתוך ${safeMaximum}`}
        aria-valuemin={0}
        aria-valuemax={safeMaximum}
        aria-valuenow={safeValue}
        className={cn(
          "relative overflow-hidden rounded-sm border border-white/10 bg-black/65 shadow-[inset_0_1px_4px_rgba(0,0,0,.8)]",
          compact ? "h-1.5" : "h-2.5",
        )}
      >
        <div
          className={cn(
            "h-full bg-gradient-to-l shadow-[inset_0_1px_rgba(255,255,255,.25)] transition-[width] duration-300 motion-reduce:transition-none",
            toneClasses[tone],
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
