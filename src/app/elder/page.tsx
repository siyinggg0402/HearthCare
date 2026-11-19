"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useHearth } from "@/lib/useHearth";
import { currentSlot, nextSlot, reminderPlan } from "@/lib/logic";
import { addMinutes, fmtClock, fmtTime } from "@/lib/time";
import { CHANNELS } from "@/lib/channels";
import { Loading, optionCls } from "@/components/ui";
import { ArrowLeftIcon, BellIcon, ChatCircleTextIcon, PhoneIcon, type Icon } from "@phosphor-icons/react";
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
  const triggers: { label: string; at: Date; Icon: Icon }[] = [];
  if (slot && plan) {
    if (channel !== "voice") triggers.push({ label: "WhatsApp reminder pops up", at: slot.scheduled, Icon: ChatCircleTextIcon });
    if (plan.callAt) triggers.push({ label: "Voice call rings", at: plan.callAt, Icon: PhoneIcon });
    triggers.push({ label: "Family member alerted", at: addMinutes(slot.scheduled, state.escalateAfterMin), Icon: BellIcon });
  }

  return (
    <div className="min-h-dvh lg:py-8">
      <div className="mx-auto flex max-w-5xl items-start justify-center gap-10">
        {/* Phone: full screen on a real phone, framed on desktop */}
        <div className="h-dvh w-full lg:h-[800px] lg:w-[380px] lg:shrink-0 lg:overflow-hidden lg:rounded-[2.8rem] lg:shadow-[0_0_0_8px_rgb(30_39_48/0.06),0_30px_60px_-30px_rgb(30_39_48/0.35)]">
          <ElderPhone state={state} askSound={askSound} />
        </div>

        {/* Controls (desktop) */}
        <aside className="hidden w-[400px] flex-col gap-4 lg:flex">
          <div>
            <Link href="/" className="flex items-center gap-1 text-sm text-ink-3">
              <ArrowLeftIcon size={14} aria-hidden /> HearthCare
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.01em]">Elder phone demo</h1>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              What Mdm Tan sees and hears. Reminders pop up on her phone at dose time. If she doesn&apos;t reply, the phone rings
              and reads the reminder aloud in Mandarin; she presses 1, 2 or 3.
            </p>
          </div>

          <div className="rounded-[24px] bg-paper p-5 text-sm shadow-soft">
            <h2 className="mb-3 text-base font-semibold">Reminder channel</h2>
            <div className="flex flex-col gap-1.5">
              {CHANNELS.map((c) => (
                <label
                  key={c.key}
                  className={optionCls(channel === c.key)}
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
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-[#eef1f4] p-1">
              {(["zh", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => act({ type: "updatePatient", patient: { lang: l } })}
                  className={`rounded-full py-1.5 font-semibold ${state.patient.lang === l ? "bg-paper shadow-[0_1px_2px_rgb(30_39_48/0.08)]" : "text-ink-2"}`}
                >
                  {l === "zh" ? "中文" : "English"}
                </button>
              ))}
            </div>
          </div>

          {slot && (
            <div className="rounded-[24px] bg-paper p-5 text-sm shadow-soft">
              <h2 className="mb-3 text-base font-semibold">
                Play the {fmtTime(slot.time)} reminder <span className="font-normal text-ink-3">(now {fmtClock(now)})</span>
              </h2>
              <div className="flex flex-col gap-1.5">
                {triggers.map((tr) => (
                  <button
                    key={tr.label}
                    onClick={() => jump(tr.at)}
                    className={`press flex items-center justify-between rounded-full px-4 py-2.5 text-left font-medium ${now >= tr.at ? "bg-ground text-ink-3" : "bg-hearth-soft text-ink hover:bg-hearth/20"}`}
                  >
                    <span className="flex items-center gap-2">
                      <tr.Icon size={16} weight="bold" aria-hidden />
                      {tr.label}
                    </span>
                    <span className="tabular-nums">{fmtClock(tr.at)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <DemoClock inline />
          <p className="px-1 text-xs text-ink-3">
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
