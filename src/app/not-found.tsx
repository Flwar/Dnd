import Link from "next/link";
import { MapPinned } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main-content" className="screen-shell grid min-h-dvh place-items-center p-6">
      <section className="stone-panel max-w-lg p-8 text-center">
        <MapPinned className="mx-auto mb-4 size-10 text-[#c6a15b]" aria-hidden="true" />
        <h1 className="display-font text-3xl">הדרך הזו אינה קיימת במפה</h1>
        <p className="mt-3 text-[#a89f91]">אולי הערפל בלע אותה, ואולי היא עוד לא התגלתה.</p>
        <Link className="mt-6 inline-flex min-h-12 items-center border border-[#c6a15b]/60 px-6 text-[#f0cf82] hover:bg-[#c6a15b]/10" href="/">
          חזרה לשערי המסע
        </Link>
      </section>
    </main>
  );
}
