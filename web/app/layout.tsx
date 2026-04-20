import type { Metadata } from "next";
import { dmSans, jetbrainsMono, outfit } from "./fonts";
import "./globals.scss";

export const metadata: Metadata = {
  title: {
    default: "Watto — Marathon training plans",
    template: "%s | Watto",
  },
  description:
    "Adaptive marathon training plans tuned to your race date, pace, and mileage.",
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
      </body>
    </html>
  );
}
