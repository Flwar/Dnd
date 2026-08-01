import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, Skull, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";

interface CombatOutcomeProps {
  result: "victory" | "defeat" | "escaped";
  onRetry: () => void;
  onContinue: () => void;
}

export function CombatOutcome({ result, onRetry, onContinue }: CombatOutcomeProps) {
  const victory = result === "victory";
  const escaped = result === "escaped";
  const title = victory ? "ניצחון" : escaped ? "נסיגה הושלמה" : "החבורה הובסה";
  const description = victory
    ? "האויבים נפלו. הניסיון, השלל והתקדמות המשימה נשמרים כעת."
    : escaped
      ? "יצאתם מן העימות. תוכלו להתארגן ולנסות שוב מן המחסום האחרון."
      : "הדמות לא אבדה. השמירה תחזור למחסום שלפני הקרב ללא שכפול תגמולים.";
  const Icon = victory ? Trophy : escaped ? ArrowLeft : Skull;

  return (
    <motion.section
      role="status"
      aria-labelledby="combat-outcome-title"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "relative overflow-hidden border p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,.55)] sm:p-8",
        victory ? "border-[#c6a15b]/55 bg-[radial-gradient(circle_at_top,rgba(198,161,91,.18),transparent_55%),#11120f]" : "border-[#93424d]/55 bg-[radial-gradient(circle_at_top,rgba(147,66,77,.18),transparent_55%),#120d10]",
      )}
    >
      <Icon className={cn("mx-auto mb-3 size-10", victory ? "text-[#f0cf82]" : "text-[#d66a71]")} aria-hidden="true" />
      <h2 id="combat-outcome-title" className="text-3xl font-bold text-[#f4e9d5]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl leading-7 text-[#aaa194]">{description}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {victory ? (
          <button type="button" onClick={onContinue} className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#c6a15b]/65 bg-[#62471f] px-6 font-bold text-[#fff0c7] outline-none hover:border-[#f0cf82] focus-visible:ring-2 focus-visible:ring-[#70c7da]">
            <Sparkles className="size-5" aria-hidden="true" /> קבלת התגמולים והמשך
          </button>
        ) : (
          <button type="button" onClick={onRetry} className="inline-flex min-h-12 items-center justify-center gap-2 border border-[#c6a15b]/65 bg-[#62471f] px-6 font-bold text-[#fff0c7] outline-none hover:border-[#f0cf82] focus-visible:ring-2 focus-visible:ring-[#70c7da]">
            <RotateCcw className="size-5" aria-hidden="true" /> ניסיון נוסף מן המחסום
          </button>
        )}
        {!victory ? (
          <button type="button" onClick={onContinue} className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/15 bg-black/25 px-6 text-[#d4cbbb] outline-none hover:border-[#c6a15b]/45 focus-visible:ring-2 focus-visible:ring-[#70c7da]">
            <ArrowLeft className="size-5" aria-hidden="true" /> חזרה למסע
          </button>
        ) : null}
      </div>
    </motion.section>
  );
}
