"use client";

import Link from "next/link";
import { DemoClock } from "@/components/DemoClock";

const VIEWS = [
  { href: "/elder", icon: "📱", title: "Elder phone (pop-ups)", desc: "WhatsApp notifications pop up; voice call reads the reminder aloud." },
  { href: "/patient", icon: "👵", title: "Patient app", desc: "Large-text app: Taken / Later / Didn't take, plus voice notes." },
  { href: "/patient?mode=whatsapp", icon: "💬", title: "Patient on WhatsApp", desc: "Simulated WhatsApp reminders with reply buttons." },
  { href: "/family", icon: "👨‍👩‍👧", title: "Family", desc: "Shared timeline, duty roster, escalation alerts, medicines." },
  { href: "/summary", icon: "🩺", title: "Doctor summary", desc: "One printable page: adherence, patterns, symptoms, questions." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-1 text-sm font-semibold uppercase tracking-widest text-hearth">Prototype</div>
      <h1 className="text-4xl font-bold">🔥 HearthCare</h1>
      <p className="mt-2 max-w-xl text-lg text-ink-2">
        Reminds elderly patients to take their medicine, lets the whole family share the job of checking in, and turns it into a
        one-page summary the doctor can read in 30 seconds.
      </p>

      <Link
        href="/demo"
        className="mt-6 flex items-center justify-between rounded-2xl bg-ink p-5 text-white transition hover:opacity-95"
      >
        <div>
          <div className="text-lg font-semibold">▶ Demo stage</div>
          <div className="text-sm opacity-75">Patient and family phones side by side, with the demo clock. Best for pitching.</div>
        </div>
        <span className="text-2xl">→</span>
      </Link>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {VIEWS.map((v) => (
          <Link key={v.href} href={v.href} className="rounded-2xl border border-line bg-paper p-5 transition hover:border-hearth">
            <div className="text-3xl">{v.icon}</div>
            <div className="mt-2 font-semibold">{v.title}</div>
            <div className="text-sm text-ink-2">{v.desc}</div>
          </Link>
        ))}
      </div>

      <h2 className="mb-2 mt-10 text-sm font-semibold uppercase tracking-wide text-ink-3">Demo clock</h2>
      <DemoClock inline />
      <p className="mt-3 text-sm text-ink-3">
        Tip: open the family view on your phone (same Wi-Fi, use this computer&apos;s IP address) and the patient view here. Every
        screen syncs every 1.5 seconds.
      </p>
    </div>
  );
}
