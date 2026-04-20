import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { dmSans, jetbrainsMono, outfit } from "./fonts";
import { siteUrl } from "@/lib/site";
import "./globals.scss";

const title = "Watto — Marathon training plans";
const description =
  "Adaptive marathon training plans tuned to your race date, pace, and mileage. Block-periodised, synced with Strava.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · Watto",
  },
  description,
  applicationName: "Watto",
  keywords: [
    "marathon training plan",
    "running coach",
    "adaptive training",
    "Strava",
    "block periodisation",
    "marathon pace",
  ],
  authors: [{ name: "Watto" }],
  creator: "Watto",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Watto",
    title,
    description,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#5a7a3a",
  colorScheme: "light",
};

const fontClasses = [outfit.variable, dmSans.variable, jetbrainsMono.variable].join(
  " ",
);

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal?: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontClasses}>
      <body>
        {children}
        {modal}
        <Analytics />
      </body>
    </html>
  );
}
