import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Flow — Marathon training plans",
    template: "%s | Flow",
  },
  description: "Adaptive marathon training plans tuned to your race date, pace, and mileage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
