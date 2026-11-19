"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellIcon,
  CheckIcon,
  ClockIcon,
  HeartbeatIcon,
  MicrophoneIcon,
  NotePencilIcon,
  PhoneCallIcon,
  PhoneIcon,
  PillIcon,
  PlusIcon,
  QuestionIcon,
  WarningCircleIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useHearth } from "@/lib/useHearth";
import {
  computeStats,
  escalationChain,
  nextSlot,
  openEscalations,
  reasonLabel,
  refillStatus,
  slotsForDate,
  timeline,
  whoName,
  type Slot,
  type TimelineEntry,
} from "@/lib/logic";
import { addDays, dayOfWeek, fmtClock, fmtTime, relativeDay, toDateStr } from "@/lib/time";
import type { EscalationOutcome, FamilyMember, HearthState } from "@/lib/types";
import { Avatar, btnDark, btnGhost, btnLink, Card, Field, inputCls, optionCls, SectionTitle, Sheet, StatusChip, textareaCls, Tray } from "@/components/ui";

export function TodayTab({ state, me }: { state: HearthState; me: FamilyMember }) {
  const { now } = useHearth();
  const today = toDateStr(now);
  const escalations = openEscalations(state, now);
  const slots = slotsForDate(state, today, now);
  const lowMeds = state.meds.filter((m) => m.active).map((m) => ({ m, r: refillStatus(state, m) })).filter((x) => x.r.low);
  const [sheet, setSheet] = useState<null | "note" | "bp">(null);

  return (
    <div className="flex flex-col">
      {escalations.length > 0 ? (
        <div className="flex flex-col gap-3">
          {escalations.map((s) => (
            <EscalationCard key={`${s.date}${s.time}`} slot={s} state={state} me={me} />
          ))}
        </div>
      ) : (
        <StatusHero state={state} slots={slots} />
      )}

      <SectionTitle>Today</SectionTitle>
      <div className="flex flex-col rounded-[22px] bg-paper shadow-soft">
        {slots.length === 0 && <div className="px-4 py-4 text-sm text-ink-3">No medicines scheduled today.</div>}
        {slots.map((s, i) => (
          <div key={s.time} className={`flex items-center gap-3 px-4 py-[15px] ${i < slots.length - 1 ? "shadow-[inset_0_-1px_0_rgb(30_39_48/0.05)]" : ""}`}>
            <div className="w-16 shrink-0 text-[15px] font-semibold tabular-nums">{fmtTime(s.time)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] leading-snug">{s.items.map((i) => i.med.name).join(", ")}</div>
              <SlotDetail slot={s} state={state} />
            </div>
            <StatusChip state={s.state} label={s.state === "upcoming" && s.snoozed ? "Later" : undefined} />
          </div>
        ))}
      </div>

      <SectionTitle>This week</SectionTitle>
      <WeekStrip state={state} today={today} />

      {lowMeds.map(({ m, r }) => (
        <div key={m.id} className="mt-2.5 flex items-center gap-2.5 rounded-full bg-warn-soft py-2.5 pl-4 pr-4 text-[13.5px] text-warn-ink shadow-[inset_0_0_0_1px_rgb(154_91_12/0.08)]">
          <PillIcon size={18} aria-hidden />
          <span>
            <span className="font-semibold">{m.name}</span> runs out in about {r.daysLeft} day{r.daysLeft === 1 ? "" : "s"} ({r.remaining} left)
          </span>
        </div>
      ))}

      <SectionTitle
        right={
          <div className="flex gap-1.5">
            <button onClick={() => setSheet("note")} className={btnLink}>
              <PlusIcon size={13} weight="bold" aria-hidden /> Note
            </button>
            <button onClick={() => setSheet("bp")} className={btnLink}>
              <PlusIcon size={13} weight="bold" aria-hidden /> BP
            </button>
          </div>
        }
      >
        Activity
      </SectionTitle>
      <Timeline state={state} entries={timeline(state, addDays(today, -6), now)} today={today} />

      <NoteSheet open={sheet === "note"} onClose={() => setSheet(null)} me={me} />
      <BpSheet open={sheet === "bp"} onClose={() => setSheet(null)} me={me} />
    </div>
  );
}

// ---------- Status hero: "is Ma okay?" in one glance ----------

function StatusHero({ state, slots }: { state: HearthState; slots: Slot[] }) {
  const { now } = useHearth();
  const ma = state.patient.callName;
  const past = slots.filter((s) => s.scheduled <= now);
  const confirmed = past.filter((s) => s.state === "taken").length;
  const waiting = past.find((s) => s.state === "due" || s.state === "overdue");
  const skipped = past.find((s) => s.state === "skipped" || s.state === "missed");
  const next = nextSlot(state, now);
  const nextText = next ? `Next reminder ${next.date !== toDateStr(now) ? "tomorrow " : "at "}${fmtTime(next.time)}.` : "";

  let tone: "ok" | "wait" | "neutral" = "ok";
  let title = `${ma} is on track today`;
  let body = past.length === 0 ? `No doses due yet. ${nextText}` : `${confirmed} of ${past.length} dose${past.length === 1 ? "" : "s"} confirmed so far. ${nextText}`;
  if (waiting) {
    tone = "wait";
    title = `Waiting for ${ma} to confirm ${fmtTime(waiting.time)}`;
    body = waiting.snoozed ? `${ma} asked to be reminded later.` : `Reminder sent at ${fmtTime(waiting.time)}. You'll be told if there's no reply.`;
  } else if (skipped) {
    tone = "neutral";
    title = `${ma} skipped the ${fmtTime(skipped.time)} dose`;
    const reason = skipped.items.find((i) => i.log?.reason)?.log?.reason;
    body = `${reason ? `Reason: ${reasonLabel(reason).toLowerCase()}. ` : ""}${nextText}`;
  }

  const style = {
    ok: { tray: "ok" as const, bg: "from-paper to-[#f6fbf8]", icon: "bg-ok-soft text-ok", I: CheckIcon },
    wait: { tray: "neutral" as const, bg: "from-paper to-[#fffaf2]", icon: "bg-warn-soft text-warn", I: ClockIcon },
    neutral: { tray: "neutral" as const, bg: "from-paper to-paper", icon: "bg-[#f1f3f6] text-ink-2", I: XIcon },
  }[tone];

  return (
    <Tray tone={style.tray}>
      <section className={`flex items-start gap-3.5 rounded-[25px] bg-gradient-to-b ${style.bg} p-[18px] shadow-[inset_0_1px_0_#fff,0_14px_32px_-18px_rgb(30_39_48/0.18)]`}>
        <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${style.icon}`}>
          <style.I size={20} weight="bold" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold leading-snug tracking-[-0.01em]">{title}</h1>
          <p className="text-[14.5px] leading-relaxed text-ink-2">{body}</p>
        </div>
      </section>
    </Tray>
  );
}

// ---------- Week at a glance ----------

const DAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

function WeekStrip({ state, today }: { state: HearthState; today: string }) {
  const { now } = useHearth();
  const from = addDays(today, -6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const week = computeStats(state, from, today, now);
  const counted = week.taken + week.skipped + week.missed;

  return (
    <div className="flex flex-col gap-3.5 rounded-[22px] bg-paper p-4 shadow-soft">
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {days.map((d) => {
          const ss = slotsForDate(state, d, now);
          const items = ss.flatMap((s) => s.items);
          const isToday = d === today;
          const missed = items.some((i) => i.state === "missed" || i.state === "skipped");
          const late = items.some((i) => i.state === "taken_late");
          const kind = isToday ? "today" : missed ? "missed" : late ? "late" : items.length ? "ok" : "none";
          const label = { today: "Today, in progress", missed: "A dose was missed or skipped", late: "Taken late after a family call", ok: "All doses taken", none: "Nothing scheduled" }[kind];
          const cls = {
            ok: "bg-ok-mark",
            late: "bg-warn-mark",
            missed: "bg-paper shadow-[inset_0_0_0_2px_var(--color-bad-mark)]",
            today: "bg-[linear-gradient(90deg,var(--color-ok-mark)_50%,#e8ecf0_50%)] shadow-[0_0_0_2px_#fff,0_0_0_3.5px_var(--color-ink-2)]",
            none: "bg-[#eef1f4]",
          }[kind];
          return (
            <span key={d} className="flex flex-col items-center gap-1.5">
              <span className="text-xs text-ink-3">{DAY_LETTER[dayOfWeek(d)]}</span>
              <span role="img" aria-label={`${relativeDay(d, today)}: ${label}`} className={`h-[26px] w-[26px] rounded-full ${cls}`} />
            </span>
          );
        })}
      </div>
      <div className="text-sm text-ink-2">
        <span className="font-semibold text-ink">
          {week.taken} of {counted}
        </span>{" "}
        doses confirmed in the last 7 days
        {week.escalationsRaised > 0 && `, ${week.escalationsRaised} family follow-up${week.escalationsRaised === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}

function SlotDetail({ slot, state }: { slot: Slot; state: HearthState }) {
  const logged = slot.items.filter((i) => i.log);
  const ma = state.patient.callName;
  if (logged.length === 0) {
    if (slot.state === "due") return <div className="text-[13px] text-ink-3">Reminder sent {fmtTime(slot.time)}{slot.snoozed ? `, ${ma} asked for later` : ""}</div>;
    if (slot.state === "overdue") return <div className="text-[13px] text-bad">No reply since {fmtTime(slot.time)}</div>;
    if (slot.state === "upcoming") return <div className="text-[13px] text-ink-3">{state.patient.reminderChannel === "voice" ? "Voice call" : "WhatsApp"} at {fmtTime(slot.time)}</div>;
    return null;
  }
  const l = logged[0].log!;
  const skippedItems = logged.filter((i) => i.log?.status === "skipped");
  return (
    <div className="text-[13px] text-ink-3">
      {l.by === "patient" ? `${ma} tapped ${l.status === "taken" ? "Taken" : "Didn't take"}` : `${whoName(state, l.by)} logged it`} at {fmtClock(new Date(l.at))}
      {skippedItems.length > 0 && l.status !== "skipped" && `. Skipped ${skippedItems.map((i) => i.med.name).join(", ")}`}
      {skippedItems.length > 0 && `: ${reasonLabel(skippedItems[0].log?.reason).toLowerCase()}`}
    </div>
  );
}

// ---------- Escalation ----------

const OUTCOMES: { key: EscalationOutcome; label: string; hint: (next?: string) => string }[] = [
  { key: "took_late", label: "Yes, she took it now", hint: () => "Logged as taken late" },
  { key: "already_taken", label: "She had already taken it", hint: () => "She just forgot to tap" },
  { key: "skipped", label: "She's not taking it today", hint: () => "Add the reason below" },
  { key: "no_answer", label: "I couldn't reach her", hint: (next) => (next ? `${next} gets the alert next` : "The alert stays open") },
];

function EscalationCard({ slot, state, me }: { slot: Slot; state: HearthState; me: FamilyMember }) {
  const { act } = useHearth();
  const [open, setOpen] = useState(false);
  const calling = useRef(false);
  const assignee = slot.escalation!.assignee;
  const mine = assignee.id === me.id;
  const ma = state.patient.callName;
  const minutes = Math.round((slot.deadline.getTime() - slot.scheduled.getTime()) / 60000);
  const chain = escalationChain(state, slot.date);
  const nextUp = chain[chain.findIndex((m) => m.id === assignee.id) + 1];
  const tel = `tel:${state.patient.phone.replace(/\s/g, "")}`;

  // Coming back to the app after the call: ask straight away instead of making them find the button.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && calling.current) {
        calling.current = false;
        setOpen(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const quick = (outcome: EscalationOutcome) => act({ type: "escalationOutcome", date: slot.date, time: slot.time, memberId: me.id, outcome });
  const openMeds = slot.items.filter((i) => !i.log).map((i) => i.med.name);

  return (
    <Tray tone={mine ? "bad" : "neutral"} className="drop-in">
      <section
        className={`flex flex-col gap-4 rounded-[25px] bg-gradient-to-b px-[18px] pb-[18px] pt-5 ${
          mine ? "from-paper to-[#fff8f7] shadow-[inset_0_1px_0_#fff,0_16px_36px_-18px_rgb(179_54_43/0.28)]" : "from-paper to-paper shadow-[inset_0_1px_0_#fff,0_14px_32px_-18px_rgb(30_39_48/0.18)]"
        }`}
      >
        <div className="flex items-start gap-3.5">
          <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${mine ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn"}`}>
            {mine ? <BellIcon size={20} weight="bold" /> : <ClockIcon size={20} weight="bold" />}
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold leading-snug tracking-[-0.01em]">
              {ma} hasn&apos;t confirmed her {fmtTime(slot.time)} medicine
            </h1>
            <p className="text-[14.5px] leading-relaxed text-ink-2">
              {openMeds.join(" and ")}. No reply after {minutes} minutes.
            </p>
          </div>
        </div>

        {mine ? (
          <>
            <a
              href={tel}
              onClick={() => (calling.current = true)}
              className="press flex h-[58px] items-center justify-between rounded-full bg-bad pl-6 pr-1.5 text-[17px] font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_12px_24px_-12px_rgb(179_54_43/0.6)]"
            >
              Call {ma} now
              <span aria-hidden className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white/[0.18]">
                <PhoneIcon size={20} weight="bold" />
              </span>
            </a>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => quick("already_taken")} className={`${btnGhost} !py-3 text-sm`}>
                She already took it
              </button>
              {nextUp ? (
                <button onClick={() => quick("no_answer")} className={`${btnGhost} !py-3 text-sm`}>
                  Pass to {nextUp.name.split(" ")[0]}
                </button>
              ) : (
                <button onClick={() => setOpen(true)} className={`${btnGhost} !py-3 text-sm`}>
                  Log what happened
                </button>
              )}
            </div>
            <button onClick={() => setOpen(true)} className="-mt-1 self-center text-[13px] font-semibold text-ink-2 underline decoration-ink-3/40 underline-offset-4">
              Log what happened
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <Avatar member={assignee} size={22} /> {assignee.name} is on duty and has been alerted.
            <a href={tel} className={`${btnLink} ml-auto`}>
              <PhoneIcon size={13} weight="bold" aria-hidden /> Call
            </a>
          </div>
        )}

        {mine && nextUp && (
          <div className="flex items-center gap-2 text-[13px] text-ink-3">
            <Avatar member={nextUp} size={20} /> If you can&apos;t reach her, {nextUp.name} is next on the roster.
          </div>
        )}
        {slot.escalation!.attempts.length > 0 && (
          <ul className="flex flex-col gap-1 text-[13px] text-ink-2">
            {slot.escalation!.attempts.map((a) => (
              <li key={a.id}>
                {fmtClock(new Date(a.at))}: {whoName(state, a.memberId)} couldn&apos;t reach {ma}
              </li>
            ))}
          </ul>
        )}
      </section>

      <OutcomeSheet open={open} onClose={() => setOpen(false)} slot={slot} state={state} me={me} nextName={nextUp?.name} />
    </Tray>
  );
}

function OutcomeSheet({
  open,
  onClose,
  slot,
  state,
  me,
  nextName,
}: {
  open: boolean;
  onClose: () => void;
  slot: Slot;
  state: HearthState;
  me: FamilyMember;
  nextName?: string;
}) {
  const { act } = useHearth();
  const [outcome, setOutcome] = useState<EscalationOutcome>("took_late");
  const [note, setNote] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title={`Did you reach ${state.patient.callName}?`}>
      <p className="-mt-2 mb-4 px-0.5 text-[15px] text-ink-2">This updates the family and her report.</p>
      <div className="flex flex-col gap-2" role="radiogroup">
        {OUTCOMES.map((o) => (
          <label key={o.key} className={optionCls(outcome === o.key)}>
            <input type="radio" name="outcome" checked={outcome === o.key} onChange={() => setOutcome(o.key)} className="mt-1 h-[18px] w-[18px] accent-hearth" />
            <span>
              <span className="font-semibold">{o.label}</span>
              <span className="block text-[13px] text-ink-3">{o.hint(nextName)}</span>
            </span>
          </label>
        ))}
        <div className="mt-2">
          <Field label="Note" hint="(optional)">
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <button
          className={`${btnDark} mt-3 h-[58px]`}
          onClick={async () => {
            await act({ type: "escalationOutcome", date: slot.date, time: slot.time, memberId: me.id, outcome, note: note.trim() || undefined });
            onClose();
            setNote("");
          }}
        >
          Save and tell the family
        </button>
      </div>
    </Sheet>
  );
}

// ---------- Timeline ----------

export function Timeline({ state, entries, today }: { state: HearthState; entries: TimelineEntry[]; today: string }) {
  if (entries.length === 0) return <Card className="text-sm text-ink-3">Nothing yet this week.</Card>;
  const byDay = new Map<string, TimelineEntry[]>();
  for (const e of entries) {
    const d = toDateStr(new Date(e.at));
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(e);
  }
  return (
    <div className="flex flex-col gap-4">
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day} className="flex flex-col gap-2">
          <div className="px-1 text-[13px] font-semibold text-ink-3">{relativeDay(day, today)}</div>
          <ul className="rounded-[22px] bg-paper px-4 py-1 shadow-soft">
            {list.map((e, i) => (
              <li key={`${e.kind}${e.at}${i}`} className={`flex gap-3 py-[13px] text-sm ${i < list.length - 1 ? "shadow-[inset_0_-1px_0_rgb(30_39_48/0.05)]" : ""}`}>
                <span className="w-[58px] shrink-0 pt-0.5 text-[12.5px] tabular-nums text-ink-3">{fmtClock(new Date(e.at))}</span>
                <EntryText state={state} e={e} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Line({ I, tone = "text-ink-2", children }: { I: Icon; tone?: string; children: React.ReactNode }) {
  return (
    <span className="flex min-w-0 flex-1 gap-2">
      <I size={16} weight="bold" className={`mt-0.5 shrink-0 ${tone}`} aria-hidden />
      <span className="min-w-0 flex-1 leading-relaxed">{children}</span>
    </span>
  );
}

function EntryText({ state, e }: { state: HearthState; e: TimelineEntry }) {
  const ma = state.patient.callName;
  switch (e.kind) {
    case "dose": {
      const meds = e.meds.map((m) => m.name).join(" + ");
      const who = e.by === "patient" ? ma : whoName(state, e.by);
      if (e.status === "taken")
        return (
          <Line I={CheckIcon} tone={e.late ? "text-warn" : "text-ok"}>
            {meds} ({fmtTime(e.time)}) {e.late ? `taken late, logged by ${who}` : `confirmed by ${who}`}
          </Line>
        );
      return (
        <Line I={XIcon}>
          {meds} ({fmtTime(e.time)}) skipped: {reasonLabel(e.reason).toLowerCase()}
          {e.by !== "patient" && ` (logged by ${who})`}
        </Line>
      );
    }
    case "escalation": {
      const who = whoName(state, e.log.memberId);
      const label = {
        took_late: `called ${ma}; the ${fmtTime(e.log.time)} dose was taken late`,
        already_taken: `checked: ${ma} had already taken the ${fmtTime(e.log.time)} dose`,
        skipped: `checked: ${ma} isn't taking the ${fmtTime(e.log.time)} dose`,
        no_answer: `couldn't reach ${ma} about the ${fmtTime(e.log.time)} dose`,
      }[e.log.outcome];
      return (
        <Line I={e.log.outcome === "no_answer" ? WarningCircleIcon : PhoneIcon} tone={e.log.outcome === "no_answer" ? "text-bad" : "text-ink-2"}>
          <span className="font-semibold">{who}</span> {label}
          {e.log.note && <span className="text-ink-2">: “{e.log.note}”</span>}
        </Line>
      );
    }
    case "call":
      return (
        <Line I={PhoneCallIcon}>
          Reminder call for the {fmtTime(e.call.time)} dose: {ma} {e.call.result === "answered" ? "answered" : "declined"}
        </Line>
      );
    case "note":
      return (
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Line I={e.note.source === "voice" ? MicrophoneIcon : NotePencilIcon}>
            <span className="font-semibold">
              {e.note.by === "patient" ? ma : whoName(state, e.note.by)} {e.note.source === "voice" ? "left a voice note" : "added a note"}
            </span>
          </Line>
          <span className="rounded-[14px] bg-ground px-3 py-2.5 leading-relaxed">
            “{e.note.translation ?? e.note.text}”
            {e.note.translation && <span className="block text-[12.5px] text-ink-3">{e.note.text}</span>}
          </span>
        </span>
      );
    case "reading":
      return (
        <Line I={HeartbeatIcon}>
          BP <span className="font-semibold tabular-nums">{e.reading.systolic}/{e.reading.diastolic}</span> logged by{" "}
          {e.reading.by === "patient" ? ma : whoName(state, e.reading.by)}
        </Line>
      );
    case "question":
      return (
        <Line I={QuestionIcon}>
          <span className="font-semibold">{whoName(state, e.question.by)}</span> added a question for the doctor: “{e.question.text}”
        </Line>
      );
  }
}

// ---------- Quick-add sheets ----------

function NoteSheet({ open, onClose, me }: { open: boolean; onClose: () => void; me: FamilyMember }) {
  const { act } = useHearth();
  const [text, setText] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title="Add a note">
      <Field label="What's going on?" hint="(the doctor sees this in the summary)">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={textareaCls} />
      </Field>
      <button
        disabled={!text.trim()}
        className={`${btnDark} mt-4 h-[54px] w-full`}
        onClick={async () => {
          await act({ type: "addNote", text: text.trim(), source: "typed", by: me.id });
          setText("");
          onClose();
        }}
      >
        Save note
      </button>
    </Sheet>
  );
}

function BpSheet({ open, onClose, me }: { open: boolean; onClose: () => void; me: FamilyMember }) {
  const { act } = useHearth();
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const valid = Number(sys) > 60 && Number(sys) < 260 && Number(dia) > 30 && Number(dia) < 160;
  return (
    <Sheet open={open} onClose={onClose} title="Log blood pressure">
      <div className="flex items-end gap-2">
        <Field label="Systolic" hint="(top)">
          <input inputMode="numeric" value={sys} onChange={(e) => setSys(e.target.value)} className={inputCls} />
        </Field>
        <span className="pb-2.5 text-2xl text-ink-3">/</span>
        <Field label="Diastolic" hint="(bottom)">
          <input inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <button
        disabled={!valid}
        className={`${btnDark} mt-4 h-[54px] w-full`}
        onClick={async () => {
          await act({ type: "addReading", reading: { type: "bp", systolic: Number(sys), diastolic: Number(dia), by: me.id } });
          setSys("");
          setDia("");
          onClose();
        }}
      >
        Save reading
      </button>
    </Sheet>
  );
}

