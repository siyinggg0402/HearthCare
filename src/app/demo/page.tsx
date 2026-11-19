"use client";

import { useState } from "react";
import Link from "next/link";
import { useHearth } from "@/lib/useHearth";
import { onDuty } from "@/lib/logic";
import { toDateStr } from "@/lib/time";
import { DemoClock } from "@/components/DemoClock";

const STEPS = [
  { t: "Start", text: "Tap Mdm Tan's phone once to turn on sound." },
  { t: "8:00am", text: "A WhatsApp reminder pops up on her phone in Mandarin. Tap ✓ 吃了 on the notification." },
  { t: "8:00pm", text: "The evening reminder pops up. Ignore it this time." },
  { t: "8:15pm", text: "No reply, so her phone rings. Answer: the reminder is read aloud. Hang up without pressing anything." },
  { t: "8:50pm", text: "Still unconfirmed, so the on-duty son gets an alert on the right. He taps Call Ma, then logs “Took it now”." },
  { t: "Any", text: "Patient sends a voice note: 膝盖痛，走路难 (“knee pain, hard to walk”). It appears in the family timeline." },
  { t: "Clinic", text: "Open the doctor summary: adherence, the evening and weekend pattern, skipped statin with reason, symptoms, and the family's questions." },
];

export default function DemoPage() {
  const { state, now } = useHearth();
  const [patientMode, setPatientMode] = useState<"phone" | "whatsapp" | "app">("phone");
  const duty = state ? onDuty(state, toDateStr(now)) : undefined;
  const [familyAs, setFamilyAs] = useState<string>("");
  const asId = familyAs || duty?.id || "wm";

  return (
    <div className="min-h-dvh bg-[#2b211a] px-4 py-5 text-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3">
        <Link href="/" className="text-lg font-bold">
          🔥 HearthCare <span className="font-normal opacity-60">demo stage</span>
        </Link>
        <Link href="/summary" target="_blank" className="ml-auto rounded-lg bg-hearth px-3 py-1.5 text-sm font-semibold">
          Open doctor summary ↗
        </Link>
      </div>

      <div className="mx-auto mt-5 grid max-w-[1200px] gap-6 lg:grid-cols-[auto_auto_1fr]">
        <Phone
          label="Mdm Tan (patient)"
          controls={
            <div className="flex gap-1 text-xs">
              {(["phone", "whatsapp", "app"] as const).map((m) => (
                <button key={m} onClick={() => setPatientMode(m)} className={`rounded px-2 py-0.5 ${patientMode === m ? "bg-white/20" : "opacity-60"}`}>
                  {{ phone: "Phone pop-ups", whatsapp: "WhatsApp", app: "App" }[m]}
                </button>
              ))}
            </div>
          }
          src={patientMode === "phone" ? "/elder?embed=1" : `/patient?embed=1&mode=${patientMode}`}
        />
        <Phone
          label="Family member"
          controls={
            state && (
              <select value={asId} onChange={(e) => setFamilyAs(e.target.value)} className="rounded bg-white/10 px-1 text-xs outline-none">
                {state.members.map((m) => (
                  <option key={m.id} value={m.id} className="text-ink">
                    {m.name}
                    {m.id === duty?.id ? " (on duty)" : ""}
                  </option>
                ))}
              </select>
            )
          }
          src={`/family?embed=1&as=${asId}`}
          key={asId}
        />
        <div className="flex flex-col gap-4 text-ink">
          <DemoClock inline />
          <div className="rounded-2xl bg-paper p-4 text-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Demo script (about 2 min)</div>
            <ol className="space-y-2">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-14 shrink-0 font-semibold text-hearth">{s.t}</span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function Phone({ label, src, controls }: { label: string; src: string; controls?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-[360px] items-center justify-between text-sm">
        <span className="font-semibold">{label}</span>
        {controls}
      </div>
      <div className="h-[740px] w-[360px] overflow-hidden rounded-[2.5rem] border-[10px] border-black bg-black shadow-2xl">
        <iframe src={src} className="h-full w-full rounded-[1.8rem] bg-ground" title={label} />
      </div>
    </div>
  );
}
