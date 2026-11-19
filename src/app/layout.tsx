import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HearthProvider } from "@/lib/useHearth";

export const metadata: Metadata = {
  title: "HearthCare",
  description: "Medication reminders, a family duty roster and a one-page doctor summary.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf6ef",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <HearthProvider>{children}</HearthProvider>
      </body>
    </html>
  );
}
