"use client";

import { useEffect, useState } from "react";
import { Crown, RefreshCw } from "lucide-react";

const SLOW_LOADING_DELAY_MS = 6_000;

export function RouteLoadingFallback() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), SLOW_LOADING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main
      id="main-content"
      className="screen-shell grid min-h-dvh place-items-center bg-[#08090b] px-6"
      aria-live="polite"
    >
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-5 w-fit animate-pulse motion-reduce:animate-none">
          <Crown className="size-12 text-[#c6a15b]" aria-hidden="true" />
        </div>
        <p className="display-font text-2xl text-[#e8dfce]">
          {slow ? "הטעינה מתארכת מהרגיל" : "הערפל מתפזר…"}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#a89f91]">
          {slow
            ? "החיבור לענן עדיין לא הסתיים. אפשר לנסות מחדש בלי לפגוע בהתקדמות השמורה."
            : "מכינים את הדרך אל ארצות ואלדר"}
        </p>
        {slow ? (
          <button
            type="button"
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 border border-[#c6a15b]/65 bg-[#6f5128] px-5 font-bold text-[#fff3d2] transition-colors hover:border-[#f0cf82] hover:bg-[#806033] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f0cf82]"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            טעינה מחדש
          </button>
        ) : null}
      </div>
    </main>
  );
}
