import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PowerPulse — power out?",
  description:
    "Ask about a power outage in your own language and get a straight answer: is it planned, how long, and what to do — grounded in the utility's own published records.",
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
  // viewportFit: cover is what makes env(safe-area-inset-*) non-zero on iOS.
  // We deliberately do NOT set maximumScale -- blocking pinch-zoom is an
  // accessibility bug, and this user may be reading in the dark.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-black font-sans">
        {/*
          Designed at 390px, floors at 360px (budget Android). On a laptop it
          centres as a phone-width column, so a judge watching on a desktop
          sees the mobile product rather than a stretched one.
        */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col bg-bg sm:border-x sm:border-line">
          {children}
        </div>
      </body>
    </html>
  );
}
