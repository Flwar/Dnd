"use client";

import { GameButton } from "@/components/ui/GameButton";

export default function GameError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-dvh place-items-center bg-[#07090b] px-6"><section className="stone-panel max-w-xl p-7 text-center"><h1 className="display-font text-3xl text-[#ef827b]">המסע לא נטען</h1><p className="mt-3 leading-7 text-[#bdb4a7]">לא הצלחנו לקרוא את השמירה בבטחה. הנתונים בענן לא נמחקו; אפשר לנסות להתחבר שוב.</p><div className="mt-6 flex justify-center gap-3"><GameButton onClick={reset}>ניסיון נוסף</GameButton><GameButton variant="secondary" onClick={() => { window.location.href = "/menu"; }}>חזרה לתפריט</GameButton></div></section></main>;
}
