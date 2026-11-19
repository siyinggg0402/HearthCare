import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { HearthProvider } from "@/lib/useHearth";

// Atkinson Hyperlegible was designed for low-vision readers; Noto Sans SC covers the Chinese text.
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-atkinson", display: "swap" });
const notoSc = Noto_Sans_SC({ weight: ["400", "500", "600", "700"], variable: "--font-noto-sc", display: "swap", preload: false });

export const metadata: Metadata = {
  title: "HearthCare",
  description: "Medication reminders, a family duty roster and a one-page doctor summary.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f7f9",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${atkinson.variable} ${notoSc.variable}`}>
      <body className="antialiased">
        <HearthProvider>{children}</HearthProvider>
      </body>
    </html>
  );
}
