import { cn } from "@/lib/cn";

type ProgressBarProps = {
  value: number;
  maximum: number;
  label: string;
  tone?: "health" | "resource" | "experience" | "guard";
  compact?: boolean;
  className?: string;
};

export function ProgressBar({ value, maximum, label, tone = "health", compact, className }: ProgressBarProps) {
  const safeMaximum = Math.max(1, maximum);
  const safeValue = Math.max(0, Math.min(value, safeMaximum));
  const percentage = Math.round((safeValue / safeMaximum) * 100);
  const gradients = {
    health: "from-[#5d1824] via-[#a73542] to-[#d65d5d]",
    resource: "from-[#174967] via-[#25789b] to-[#62c6df]",
    experience: "from-[#66501f] via-[#b78f36] to-[#f0cf82]",
    guard: "from-[#4b4c50] via-[#85888f] to-[#c8cbd0]",
  };

  return (
    <div className={cn("min-w-0", className)}>
      <div className={cn("mb-1 flex items-center justify-between gap-3 text-xs", compact && "sr-only")}>
        <span>{label}</span>
        <bdi className="ltr-isolate tabular-nums">{safeValue} / {safeMaximum}</bdi>
      </div>
      <div
        className={cn("glass-inset relative overflow-hidden rounded-sm", compact ? "h-2" : "h-3")}
        role="progressbar"
        aria-label={`${label}: ${safeValue} מתוך ${safeMaximum}`}
        aria-valuemin={0}
        aria-valuemax={safeMaximum}
        aria-valuenow={safeValue}
      >
        <div
          className={cn("h-full bg-gradient-to-l transition-[width] duration-500", gradients[tone])}
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
      </div>
    </div>
  );
}
