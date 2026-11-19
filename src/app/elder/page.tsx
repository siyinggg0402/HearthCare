"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHearth } from "@/lib/useHearth";
import { currentSlot, nextSlot, reminderPlan } from "@/lib/logic";
import { addMinutes, fmtClock, fmtTime } from "@/lib/time";
import { CHANNELS } from "@/lib/channels";
import { Loading } from "@/components/ui";
import { DemoClock } from "@/components/DemoClock";
import { ElderPhone } from "@/components/patient/ElderPhone";


function ElderInner() {
  const { state, now, act } = useHearth();
  const params = useSearchParams();
  const embed = params.has("embed");
  const askSound = !params.has("quiet");
  if (!state) return <Loading />;

  if (embed) {
    return (
      <div className="h-dvh">
        <ElderPhone state={state} askSound={askSound} />
      </div>
    );
  }

  // Quick triggers for the slot that's open now, or the next one.
  const slot = currentSlot(state, now) ?? nextSlot(state, now);
  const plan = slot ? reminderPlan(state, slot, now) : null;
  const jump = (d: Date) => act({ type: "setClock", clock: { mode: "sim", now: d.toISOString() } });
  const channel = state.patient.reminderChannel;
  const triggers: { label: string; at: Date }[] = [];
  if (slot && plan) {
    if (channel !== "voice") triggers.push({ label: "💬 WhatsApp reminder pops up", at: slot.scheduled });
    if (plan.callAt) triggers.push({ label: "📞 Voice call rings", at: plan.callAt });
    triggers.push({ label: "🔔 Family member alerted", at: addMinutes(slot.scheduled, state.escalateAfterMin) });
  }

  return (
    <div className="min-h-dvh lg:bg-[#2b211a] lg:py-8">
      <div className="mx-auto flex max-w-5xl items-start justify-center gap-10">
        {/* Phone: full screen on a real phone, framed on desktop */}
        <div className="h-dvh w-full lg:h-[800px] lg:w-[380px] lg:shrink-0 lg:overflow-hidden lg:rounded-[3rem] lg:border-[12px] lg:border-black lg:shadow-2xl">
          <ElderPhone state={state} askSound={askSound} />
        </div>

        {/* Controls (desktop) */}
        <aside className="hidden w-[400px] flex-col gap-4 lg:flex">
          <div className="text-white">
            <Link href="/" className="text-sm opacity-60">
              ← HearthCare
            </Link>
            <h1 className="mt-1 text-2xl font-bold">Elder phone demo</h1>
            <p className="mt-1 text-sm opacity-75">
              What Mdm Tan sees and hears. Reminders pop up on her phone at dose time. If she doesn&apos;t reply, the phone rings
              and reads the reminder aloud in Mandarin; she presses 1, 2 or 3.
            </p>
          </div>

          <div className="rounded-2xl bg-paper p-4 text-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Reminder channel</div>
            <div className="flex flex-col gap-1.5">
              {CHANNELS.map((c) => (
                <label
                  key={c.key}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border-2 p-2.5 ${channel === c.key ? "border-hearth bg-hearth-soft" : "border-line"}`}
                >
                  <input
                    type="radio"
                    className="mt-1 accent-hearth"
                    checked={channel === c.key}
                    onChange={() => act({ type: "updatePatient", patient: { reminderChannel: c.key } })}
                  />
                  <span>
                    <span className="font-semibold">{c.label}</span>
                    <span className="block text-ink-2">{c.desc}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {(["zh", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => act({ type: "updatePatient", patient: { lang: l } })}
                  className={`flex-1 rounded-lg border-2 py-1.5 font-semibold ${state.patient.lang === l ? "border-hearth text-hearth" : "border-line"}`}
                >
                  {l === "zh" ? "中文" : "English"}
                </button>
              ))}
            </div>
          </div>

          {slot && (
            <div className="rounded-2xl bg-paper p-4 text-sm">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
                Play the {fmtTime(slot.time)} reminder · now {fmtClock(now)}
              </div>
              <div className="flex flex-col gap-1.5">
                {triggers.map((tr) => (
                  <button
                    key={tr.label}
                    onClick={() => jump(tr.at)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left font-medium ${now >= tr.at ? "bg-cream text-ink-3" : "bg-hearth-soft text-ink hover:bg-hearth/20"}`}
                  >
                    <span>{tr.label}</span>
                    <span className="tabular-nums">{fmtClock(tr.at)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <DemoClock inline />
          <p className="text-xs text-white/50">
            Sound: tap the phone once to allow audio. The voice uses your browser&apos;s built-in text-to-speech (Chrome and Safari
            include Mandarin voices).
          </p>
        </aside>
      </div>
    </div>
  );
}

export default function ElderPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ElderInner />
    </Suspense>
  );
}
