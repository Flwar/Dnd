import { Crown } from "lucide-react";

export default function Loading() {
  return (
    <main className="screen-shell grid min-h-dvh place-items-center bg-[#08090b] px-6" aria-live="polite">
      <div className="text-center">
        <Crown className="mx-auto mb-5 size-12 animate-pulse text-[#c6a15b]" aria-hidden="true" />
        <p className="display-font text-2xl text-[#e8dfce]">הערפל מתפזר…</p>
        <p className="mt-2 text-sm text-[#a89f91]">מכינים את הדרך אל ארצות ואלדר</p>
      </div>
    </main>
  );
}
