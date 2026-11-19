"use client";

import { useState } from "react";
import Link from "next/link";
import { useHearth } from "@/lib/useHearth";
import { onDuty } from "@/lib/logic";
import { toDateStr } from "@/lib/time";
import { DemoClock } from "@/components/DemoClock";
import { ArrowUpRightIcon, FireIcon } from "@phosphor-icons/react";

const STEPS = [
  { t: "Start", text: "Tap Mdm Tan's phone once to turn on sound." },
  { t: "8:00am", text: "A WhatsApp reminder pops up on her phone in Mandarin. Tap 吃了 on the notification." },
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
    <div className="min-h-dvh px-4 py-5">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-lg font-semibold">
          <FireIcon size={20} weight="fill" className="text-hearth" aria-hidden /> HearthCare <span className="font-normal text-ink-3">demo stage</span>
        </Link>
        <Link href="/summary" target="_blank" className="press ml-auto flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          Open doctor summary <ArrowUpRightIcon size={14} aria-hidden />
        </Link>
      </div>

      <div className="mx-auto mt-5 grid max-w-[1200px] gap-6 lg:grid-cols-[auto_auto_1fr]">
        <Phone
          label="Mdm Tan (patient)"
          controls={
            <div className="flex rounded-full bg-[#eef1f4] p-0.5 text-xs">
              {(["phone", "whatsapp", "app"] as const).map((m) => (
                <button key={m} onClick={() => setPatientMode(m)} className={`rounded-full px-2.5 py-1 ${patientMode === m ? "bg-paper font-semibold shadow-[0_1px_2px_rgb(30_39_48/0.08)]" : "text-ink-2"}`}>
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
              <select value={asId} onChange={(e) => setFamilyAs(e.target.value)} aria-label="Family member" className="rounded-full bg-paper px-2.5 py-1 text-xs shadow-hairline outline-none">
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
          <div className="rounded-[24px] bg-paper p-5 text-sm shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Demo script, about 2 minutes</h2>
            <ol className="space-y-2.5">
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-14 shrink-0 font-semibold tabular-nums text-hearth-ink">{s.t}</span>
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
      <div className="rounded-[3rem] bg-tray p-2 shadow-[inset_0_0_0_1px_rgb(30_39_48/0.05)]">
        <div className="h-[740px] w-[360px] overflow-hidden rounded-[2.6rem] bg-ground shadow-lift">
          <iframe src={src} className="h-full w-full" title={label} />
        </div>
      </div>
    </div>
  );
}
