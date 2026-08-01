import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppProviders } from "@/components/providers/AppProviders";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

const siteUrl = getSiteUrl() ?? "http://localhost:3000";

const heebo = localFont({
  src: "../../public/fonts/heebo-variable.ttf",
  variable: "--font-body",
  display: "swap",
  weight: "100 900",
});

const frank = localFont({
  src: "../../public/fonts/frank-ruhl-libre-variable.ttf",
  variable: "--font-display",
  display: "swap",
  weight: "300 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "הכתר המנופץ",
    template: "%s | הכתר המנופץ",
  },
  description: "משחק תפקידים פנטסטי מקוון בעברית — בחירות, קוביות, קרבות וסודות בארצות ואלדר.",
  applicationName: "הכתר המנופץ",
  openGraph: {
    title: "הכתר המנופץ",
    description: "המסע אל הצללים שמתחת לערפלון מתחיל.",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/assets/rebuild/backgrounds/social-preview.webp", width: 1200, height: 630, alt: "שבעת שברי הכתר מרחפים מעל מזבח אבן בערפל" }],
  },
  twitter: { card: "summary_large_image", images: ["/assets/rebuild/backgrounds/social-preview.webp"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08090b",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} ${frank.variable}`} suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">דלג לתוכן הראשי</a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
