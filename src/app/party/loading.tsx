import { LoaderCircle, UsersRound } from "lucide-react";

export default function PartyLoading() {
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_top,#18303b_0,transparent_32rem),#08090b] px-5 text-center">
      <div role="status" aria-live="polite">
        <span className="mx-auto mb-5 grid size-16 place-items-center border border-[#c6a15b]/35 bg-black/30 text-[#f0cf82]">
          <UsersRound className="size-8" aria-hidden="true" />
        </span>
        <h1 className="display-font text-4xl text-[#f0cf82]">מכינים את חדר החבורה</h1>
        <p className="mt-2 flex items-center justify-center gap-2 text-[#b9ad9c]"><LoaderCircle className="size-4 animate-spin" />מתחברים לשרת…</p>
      </div>
    </main>
  );
}
