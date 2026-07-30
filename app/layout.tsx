import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { ui } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "localhost";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || (host.startsWith("localhost") ? "http" : "https");
  const origin = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", origin).toString();

  return {
    metadataBase: origin,
    title: ui.meta.title,
    description: ui.meta.description,
    applicationName: ui.brand.name,
    category: ui.meta.category,
    openGraph: {
      type: "website",
      locale: "he_IL",
      url: origin,
      siteName: ui.brand.name,
      title: ui.meta.title,
      description: ui.meta.description,
      images: [
        {
          url: socialImage,
          width: 1730,
          height: 909,
          alt: ui.meta.socialAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ui.meta.title,
      description: ui.meta.description,
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080b0c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
