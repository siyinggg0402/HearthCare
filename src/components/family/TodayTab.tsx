"use client";

import { useState } from "react";
import { useHearth } from "@/lib/useHearth";
import {
  computeStats,
  openEscalations,
  pct,
  reasonLabel,
  refillStatus,
  slotsForDate,
  timeline,
  whoName,
  type Slot,
  type TimelineEntry,
} from "@/lib/logic";
import { addDays, fmtClock, fmtTime, relativeDay, toDateStr } from "@/lib/time";
import type { EscalationOutcome, FamilyMember, HearthState } from "@/lib/types";
import { Avatar, btnGhost, btnPrimary, Card, inputCls, SectionTitle, Sheet, StatusChip } from "@/components/ui";

export function TodayTab({ state, me }: { state: HearthState; me: FamilyMember }) {
  const { now } = useHearth();
  const today = toDateStr(now);
  const escalations = openEscalations(state, now);
  const slots = slotsForDate(state, today, now);
  const week = computeStats(state, addDays(today, -6), today, now);
  const lowMeds = state.meds.filter((m) => m.active).map((m) => ({ m, r: refillStatus(state, m) })).filter((x) => x.r.low);
  const [sheet, setSheet] = useState<null | "note" | "bp">(null);

  return (
    <div>
      {escalations.map((s) => (
        <EscalationCard key={s.time} slot={s} state={state} me={me} />
      ))}

      <SectionTitle>Today&apos;s medicine</SectionTitle>
      <div className="flex flex-col gap-2">
        {slots.map((s) => (
          <Card key={s.time} className="flex items-center gap-3 !p-3">
            <div className="w-12 shrink-0 text-lg font-semibold tabular-nums">{fmtTime(s.time)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-medium leading-snug">{s.items.map((i) => i.med.name).join(" + ")}</div>
              <SlotDetail slot={s} state={state} />
            </div>
            <StatusChip state={s.state} />
          </Card>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Card className="!p-3">
          <div className="text-xs uppercase tracking-wide text-ink-3">Last 7 days</div>
          <div className="text-2xl font-bold">{pct(week.rate)}</div>
          <div className="text-xs text-ink-2">doses confirmed</div>
        </Card>
        <Card className="!p-3">
          <div className="text-xs uppercase tracking-wide text-ink-3">Family follow-ups</div>
          <div className="text-2xl font-bold">{week.escalationsRaised}</div>
          <div className="text-xs text-ink-2">this week</div>
        </Card>
      </div>

      {lowMeds.map(({ m, r }) => (
        <div key={m.id} className="mt-2 flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          <span aria-hidden>⚠</span>
          <span>
            <b>{m.name}</b> running low: about {r.daysLeft} day{r.daysLeft === 1 ? "" : "s"} left ({r.remaining} pills)
          </span>
        </div>
      ))}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => setSheet("note")} className={btnGhost}>
          📝 Add note
        </button>
        <button onClick={() => setSheet("bp")} className={btnGhost}>
          🩺 Log BP
        </button>
      </div>

      <SectionTitle>Activity</SectionTitle>
      <Timeline state={state} entries={timeline(state, addDays(today, -6), now)} today={today} />

      <NoteSheet open={sheet === "note"} onClose={() => setSheet(null)} me={me} />
      <BpSheet open={sheet === "bp"} onClose={() => setSheet(null)} me={me} />
    </div>
  );
}

function SlotDetail({ slot, state }: { slot: Slot; state: HearthState }) {
  const logged = slot.items.filter((i) => i.log);
  if (logged.length === 0) {
    if (slot.state === "due") return <div className="text-xs text-ink-3">Reminder sent {fmtTime(slot.time)}{slot.snoozed ? ", asked for later" : ""}</div>;
    if (slot.state === "overdue") return <div className="text-xs text-bad">No reply since {fmtTime(slot.time)}</div>;
    return null;
  }
  const l = logged[0].log!;
  return (
    <div className="text-xs text-ink-3">
      {l.status === "taken" ? "Taken" : "Skipped"} {fmtClock(new Date(l.at))}
      {l.by !== "patient" && ` · logged by ${whoName(state, l.by)}`}
      {logged.some((i) => i.log?.status === "skipped") &&
        ` · skipped ${logged.filter((i) => i.log?.status === "skipped").map((i) => i.med.name).join(", ")}: ${reasonLabel(l.reason).toLowerCase()}`}
    </div>
  );
}

// ---------- Escalation ----------

const OUTCOMES: { key: EscalationOutcome; label: string; hint: string }[] = [
  { key: "took_late", label: "Took it now", hint: "Called, they took it late" },
  { key: "already_taken", label: "Had already taken it", hint: "Just forgot to tap" },
  { key: "skipped", label: "Not taking it today", hint: "Add the reason below" },
  { key: "no_answer", label: "Couldn't reach them", hint: "Passes the alert to the next person on the roster" },
];

function EscalationCard({ slot, state, me }: { slot: Slot; state: HearthState; me: FamilyMember }) {
  const { act } = useHearth();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<EscalationOutcome>("took_late");
  const [note, setNote] = useState("");
  const assignee = slot.escalation!.assignee;
  const mine = assignee.id === me.id;
  const ma = state.patient.callName;
  const minutes = Math.round((slot.deadline.getTime() - slot.scheduled.getTime()) / 60000);

  return (
    <div className={`mb-3 rounded-2xl border-2 p-4 ${mine ? "border-bad bg-bad-soft" : "border-line bg-paper"}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {mine ? "🔔" : "⏳"}
        </span>
        <div className="flex-1">
          <div className="font-semibold">
            {mine ? `You're on duty. ${ma} hasn't confirmed the ${fmtTime(slot.time)} medicine.` : `${ma} hasn't confirmed the ${fmtTime(slot.time)} medicine.`}
          </div>
          <div className="mt-0.5 text-sm text-ink-2">
            {slot.items.filter((i) => !i.log).map((i) => i.med.name).join(", ")} · no reply after {minutes} min
          </div>
          {!mine && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Avatar member={assignee} size={22} /> {assignee.name} is on duty and has been alerted
            </div>
          )}
          {slot.escalation!.attempts.length > 0 && (
            <ul className="mt-2 text-xs text-ink-2">
              {slot.escalation!.attempts.map((a) => (
                <li key={a.id}>
                  {fmtClock(new Date(a.at))}: {whoName(state, a.memberId)} couldn&apos;t reach {ma}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={`tel:${state.patient.phone.replace(/\s/g, "")}`} className={`${mine ? btnPrimary : btnGhost} text-center`}>
          📞 Call {ma}
        </a>
        <button onClick={() => setOpen(true)} className={btnGhost}>
          Log what happened
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={`What happened with ${ma}'s ${fmtTime(slot.time)} medicine?`}>
        <div className="flex flex-col gap-2">
          {OUTCOMES.map((o) => (
            <label key={o.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${outcome === o.key ? "border-hearth bg-hearth-soft" : "border-line"}`}>
              <input type="radio" name="outcome" checked={outcome === o.key} onChange={() => setOutcome(o.key)} className="mt-1 accent-hearth" />
              <span>
                <span className="font-semibold">{o.label}</span>
                <span className="block text-sm text-ink-2">{o.hint}</span>
              </span>
            </label>
          ))}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (e.g. forgot, was out at the market)" className={`${inputCls} mt-2`} />
          <button
            className={`${btnPrimary} mt-2`}
            onClick={async () => {
              await act({ type: "escalationOutcome", date: slot.date, time: slot.time, memberId: me.id, outcome, note: note.trim() || undefined });
              setOpen(false);
              setNote("");
            }}
          >
            Save
          </button>
        </div>
      </Sheet>
    </div>
  );
}

// ---------- Timeline ----------

export function Timeline({ state, entries, today }: { state: HearthState; entries: TimelineEntry[]; today: string }) {
  if (entries.length === 0) return <div className="text-sm text-ink-3">Nothing yet.</div>;
  const byDay = new Map<string, TimelineEntry[]>();
  for (const e of entries) {
    const d = toDateStr(new Date(e.at));
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(e);
  }
  return (
    <div className="flex flex-col gap-4">
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day}>
          <div className="mb-1 text-xs font-semibold text-ink-3">{relativeDay(day, today)}</div>
          <Card className="!p-0">
            <ul className="divide-y divide-line">
              {list.map((e, i) => (
                <li key={i} className="flex gap-3 px-3 py-2.5 text-sm">
                  <span className="w-14 shrink-0 tabular-nums text-ink-3">{fmtClock(new Date(e.at))}</span>
                  <EntryText state={state} e={e} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ))}
    </div>
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
          <span>
            <span className={e.late ? "text-warn" : "text-ok"}>✓</span> {meds} ({fmtTime(e.time)}) {e.late ? `taken late, logged by ${who}` : `confirmed by ${who}`}
          </span>
        );
      return (
        <span>
          <span className="text-bad">✗</span> {meds} ({fmtTime(e.time)}) skipped: {reasonLabel(e.reason).toLowerCase()}
          {e.by !== "patient" && ` (logged by ${who})`}
        </span>
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
        <span>
          📞 <b>{who}</b> {label}
          {e.log.note && <span className="text-ink-2">: “{e.log.note}”</span>}
        </span>
      );
    }
    case "call":
      return (
        <span>
          ☎️ Reminder call for the {fmtTime(e.call.time)} dose: {ma} {e.call.result === "answered" ? "answered" : "declined"}
        </span>
      );
    case "note":
      return (
        <span>
          {e.note.source === "voice" ? "🎤" : "📝"} <b>{e.note.by === "patient" ? ma : whoName(state, e.note.by)}</b>: “{e.note.text}”
          {e.note.translation && <span className="block text-ink-3">“{e.note.translation}”</span>}
        </span>
      );
    case "reading":
      return (
        <span>
          🩺 BP {e.reading.systolic}/{e.reading.diastolic} logged by {e.reading.by === "patient" ? ma : whoName(state, e.reading.by)}
        </span>
      );
    case "question":
      return (
        <span>
          ❓ <b>{whoName(state, e.question.by)}</b> added a question for the doctor: “{e.question.text}”
        </span>
      );
  }
}

// ---------- Quick-add sheets ----------

function NoteSheet({ open, onClose, me }: { open: boolean; onClose: () => void; me: FamilyMember }) {
  const { act } = useHearth();
  const [text, setText] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title="Add a note">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={inputCls} placeholder="e.g. Ma said her knee is better today" />
      <button
        disabled={!text.trim()}
        className={`${btnPrimary} mt-3 w-full`}
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
      <div className="flex items-center gap-2">
        <input inputMode="numeric" value={sys} onChange={(e) => setSys(e.target.value)} placeholder="Systolic" className={inputCls} />
        <span className="text-2xl text-ink-3">/</span>
        <input inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="Diastolic" className={inputCls} />
      </div>
      <button
        disabled={!valid}
        className={`${btnPrimary} mt-3 w-full`}
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
