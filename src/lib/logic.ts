// Pure functions that derive everything (dose status, escalations, adherence, patterns)
// from the stored state. Shared by client and server.

import type { CallLog, DoseLog, EscalationLog, FamilyMember, HearthState, Medication, Note, Question, Reading } from "./types";
import { addDays, addMinutes, at, dayPart, daysBetween, isWeekend, toDateStr } from "./time";

export function nowOf(state: HearthState): Date {
  return state.clock.mode === "sim" ? new Date(state.clock.now) : new Date();
}

// ---------- Roster ----------

export function onDuty(state: HearthState, date: string): FamilyMember | undefined {
  const { roster, members } = state;
  const override = roster.overrides[date];
  const id =
    override ??
    (() => {
      const n = roster.order.length;
      if (n === 0) return undefined;
      const diff = daysBetween(roster.anchor, date);
      const step = roster.mode === "weekly" ? Math.floor(diff / 7) : diff;
      return roster.order[((step % n) + n) % n];
    })();
  return members.find((m) => m.id === id);
}

export function escalationChain(state: HearthState, date: string): FamilyMember[] {
  const first = onDuty(state, date);
  const rest = state.roster.order
    .map((id) => state.members.find((m) => m.id === id))
    .filter((m): m is FamilyMember => !!m && m.id !== first?.id);
  return first ? [first, ...rest] : rest;
}

// ---------- Dose slots ----------

export type ItemState = "taken" | "taken_late" | "skipped" | "upcoming" | "due" | "overdue" | "missed";
export type SlotState = "taken" | "skipped" | "upcoming" | "due" | "overdue" | "missed";

export interface SlotItem {
  med: Medication;
  log?: DoseLog;
  state: ItemState;
}

export interface Slot {
  date: string;
  time: string;
  scheduled: Date;
  deadline: Date;
  items: SlotItem[];
  state: SlotState;
  snoozed: boolean;
  escalation?: {
    assignee: FamilyMember;
    attempts: EscalationLog[];
  };
}

export const slotKey = (date: string, time: string) => `${date} ${time}`;

function indexLogs(state: HearthState) {
  const byKey = new Map<string, DoseLog>();
  for (const l of state.doseLogs) byKey.set(`${l.date} ${l.time} ${l.medId}`, l);
  return byKey;
}

export function slotsForDate(state: HearthState, date: string, now = nowOf(state), logIndex = indexLogs(state)): Slot[] {
  const times = new Map<string, Medication[]>();
  for (const med of state.meds.filter((m) => m.active)) {
    for (const t of med.times) {
      if (!times.has(t)) times.set(t, []);
      times.get(t)!.push(med);
    }
  }
  const today = toDateStr(now);

  return [...times.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, meds]) => {
      const scheduled = at(date, time);
      const snooze = state.snoozes.filter((s) => s.date === date && s.time === time).at(-1);
      let deadline = addMinutes(scheduled, state.escalateAfterMin);
      if (snooze) {
        const snoozeDeadline = addMinutes(new Date(snooze.at), 30);
        if (snoozeDeadline > deadline) deadline = snoozeDeadline;
      }

      const items: SlotItem[] = meds.map((med) => {
        const log = logIndex.get(`${date} ${time} ${med.id}`);
        let s: ItemState;
        if (log) s = log.status === "skipped" ? "skipped" : log.late ? "taken_late" : "taken";
        else if (now < scheduled) s = "upcoming";
        else if (date < today) s = "missed";
        else if (now < deadline) s = "due";
        else s = "overdue";
        return { med, log, state: s };
      });

      const open = items.filter((i) => !i.log);
      let state_: SlotState;
      if (open.length === 0) state_ = items.some((i) => i.state === "skipped") ? "skipped" : "taken";
      else state_ = open[0].state as SlotState;

      const slot: Slot = { date, time, scheduled, deadline, items, state: state_, snoozed: !!snooze };

      if (state_ === "overdue") {
        const chain = escalationChain(state, date);
        const attempts = state.escalations.filter((e) => e.date === date && e.time === time);
        const noAnswers = attempts.filter((e) => e.outcome === "no_answer").length;
        if (chain.length) slot.escalation = { assignee: chain[noAnswers % chain.length], attempts };
      }
      return slot;
    });
}

export function slotsInRange(state: HearthState, from: string, to: string, now = nowOf(state)): Slot[] {
  const idx = indexLogs(state);
  const out: Slot[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(...slotsForDate(state, d, now, idx));
  return out;
}

/** The slot the patient should act on right now: the most recent slot today that has started, if still open.
 *  (Older unconfirmed doses are left to the family's follow-up, so the patient isn't nagged about them.) */
export function currentSlot(state: HearthState, now = nowOf(state)): Slot | undefined {
  const today = toDateStr(now);
  const latest = slotsForDate(state, today, now).findLast((s) => s.scheduled <= now);
  return latest && (latest.state === "due" || latest.state === "overdue") ? latest : undefined;
}

export function nextSlot(state: HearthState, now = nowOf(state)): Slot | undefined {
  const today = toDateStr(now);
  const later = slotsForDate(state, today, now).find((s) => s.state === "upcoming");
  return later ?? slotsForDate(state, addDays(today, 1), now)[0];
}

export function openEscalations(state: HearthState, now = nowOf(state)): Slot[] {
  return slotsForDate(state, toDateStr(now), now).filter((s) => s.escalation);
}

// ---------- Reminder delivery (WhatsApp pop-up, voice call) ----------

export interface ReminderPlan {
  /** When the latest WhatsApp reminder for this slot went out (null if channel is voice-only). */
  waAt: Date | null;
  /** When the voice call should ring (null if channel is WhatsApp-only). */
  callAt: Date | null;
  /** True while the phone should be ringing: call due, not yet answered or declined. */
  ringing: boolean;
}

export function reminderPlan(state: HearthState, slot: Slot, now = nowOf(state)): ReminderPlan {
  const channel = state.patient.reminderChannel ?? "whatsapp_voice";
  const open = slot.items.some((i) => !i.log);
  const lastSnooze = state.snoozes.filter((z) => z.date === slot.date && z.time === slot.time).at(-1);
  const snoozeAt = lastSnooze ? addMinutes(new Date(lastSnooze.at), 15) : null;

  // WhatsApp: at dose time, then again 15 min after "Later".
  let waAt: Date | null = null;
  if (channel !== "voice") waAt = snoozeAt && snoozeAt <= now ? snoozeAt : slot.scheduled;

  // Voice: at dose time (voice only) or as a fallback after `callAfterMin`; after "Later", 15 min later.
  let callAt: Date | null = null;
  if (channel !== "whatsapp") {
    callAt = channel === "voice" ? slot.scheduled : addMinutes(slot.scheduled, state.callAfterMin ?? 15);
    if (snoozeAt && snoozeAt > callAt) callAt = snoozeAt;
  }

  const handled = (state.calls ?? []).some(
    (c) => c.date === slot.date && c.time === slot.time && callAt && new Date(c.at) >= callAt,
  );
  const ringing = open && !!callAt && now >= callAt && now < slot.deadline && !handled;
  return { waAt: open ? waAt : null, callAt, ringing };
}

// ---------- Adherence & patterns ----------

export const SKIP_REASONS: Record<string, { en: string; zh: string }> = {
  forgot: { en: "Forgot", zh: "忘了" },
  side_effect: { en: "Side effect", zh: "副作用" },
  ran_out: { en: "Ran out", zh: "药吃完了" },
  unwell: { en: "Feeling unwell", zh: "不舒服" },
};

export const reasonLabel = (r?: string) => (r ? SKIP_REASONS[r]?.en ?? r : "No reason given");

export interface MedTimeStat {
  med: Medication;
  time: string;
  scheduled: number;
  taken: number;
  late: number;
  skipped: number;
  missed: number;
  rate: number;
}

export interface Stats {
  from: string;
  to: string;
  scheduled: number;
  taken: number;
  late: number;
  skipped: number;
  missed: number;
  rate: number;
  perMedTime: MedTimeStat[];
  patterns: string[];
  escalationsRaised: number;
}

export function computeStats(state: HearthState, from: string, to: string, now = nowOf(state)): Stats {
  // Only count slots whose outcome is settled (not upcoming or still in the reminder window).
  const slots = slotsInRange(state, from, to, now).filter((s) => s.state !== "upcoming" && s.state !== "due");
  const items = slots.flatMap((s) => s.items.map((i) => ({ ...i, date: s.date, time: s.time })));

  const isTaken = (st: ItemState) => st === "taken" || st === "taken_late";
  const isMiss = (st: ItemState) => st === "skipped" || st === "missed" || st === "overdue";

  const per = new Map<string, MedTimeStat>();
  for (const i of items) {
    const k = `${i.med.id}|${i.time}`;
    if (!per.has(k)) per.set(k, { med: i.med, time: i.time, scheduled: 0, taken: 0, late: 0, skipped: 0, missed: 0, rate: 0 });
    const p = per.get(k)!;
    p.scheduled++;
    if (isTaken(i.state)) p.taken++;
    if (i.state === "taken_late") p.late++;
    if (i.state === "skipped") p.skipped++;
    if (i.state === "missed" || i.state === "overdue") p.missed++;
  }
  const perMedTime = [...per.values()]
    .map((p) => ({ ...p, rate: p.scheduled ? p.taken / p.scheduled : 0 }))
    .sort((a, b) => a.med.name.localeCompare(b.med.name) || a.time.localeCompare(b.time));

  const scheduled = items.length;
  const taken = items.filter((i) => isTaken(i.state)).length;
  const late = items.filter((i) => i.state === "taken_late").length;
  const skipped = items.filter((i) => i.state === "skipped").length;
  const missed = items.filter((i) => i.state === "missed" || i.state === "overdue").length;

  // --- Pattern rules (deliberately simple and explainable) ---
  const patterns: string[] = [];
  const misses = items.filter((i) => isMiss(i.state));

  // 1. Time of day
  if (misses.length >= 3) {
    const byPart = new Map<string, number>();
    for (const m of misses) byPart.set(dayPart(m.time), (byPart.get(dayPart(m.time)) ?? 0) + 1);
    const [part, count] = [...byPart.entries()].sort((a, b) => b[1] - a[1])[0];
    if (count === misses.length) {
      patterns.push(`All ${count} missed doses were ${part} doses`);
    } else if (count / misses.length >= 0.6) {
      patterns.push(`${cap(part)} doses missed most often (${count} of ${misses.length} misses)`);
    }
  }

  // 2. Weekends vs weekdays
  const wkend = items.filter((i) => isWeekend(i.date));
  const wkday = items.filter((i) => !isWeekend(i.date));
  const wkendRate = wkend.length ? wkend.filter((i) => isMiss(i.state)).length / wkend.length : 0;
  const wkdayRate = wkday.length ? wkday.filter((i) => isMiss(i.state)).length / wkday.length : 0;
  if (wkend.filter((i) => isMiss(i.state)).length >= 2 && wkendRate >= Math.max(1.8 * wkdayRate, 0.05)) {
    patterns.push(`Misses more on weekends: ${pct(wkendRate)} of weekend doses vs ${pct(wkdayRate)} on weekdays`);
  }

  // 3. Repeated skip reasons per medication
  const skipGroups = new Map<string, { med: Medication; reason?: string; n: number }>();
  for (const i of items.filter((x) => x.state === "skipped")) {
    const k = `${i.med.id}|${i.log?.reason ?? ""}`;
    if (!skipGroups.has(k)) skipGroups.set(k, { med: i.med, reason: i.log?.reason, n: 0 });
    skipGroups.get(k)!.n++;
  }
  for (const g of [...skipGroups.values()].sort((a, b) => b.n - a.n)) {
    if (g.n >= 2) patterns.push(`Skipped ${g.med.name} ${g.n}× (reason: ${reasonLabel(g.reason).toLowerCase()})`);
  }

  // 4. Family follow-up
  const escalated = new Set(
    state.escalations.filter((e) => e.date >= from && e.date <= to).map((e) => slotKey(e.date, e.time)),
  );
  if (escalated.size > 0) {
    const lateSlots = new Set(items.filter((i) => i.state === "taken_late").map((i) => slotKey(i.date, i.time)));
    patterns.push(
      `Family followed up ${escalated.size}× after unconfirmed doses; dose then taken late ${lateSlots.size}×`,
    );
  }

  if (patterns.length === 0) patterns.push("No consistent pattern of missed doses");

  return {
    from,
    to,
    scheduled,
    taken,
    late,
    skipped,
    missed,
    rate: scheduled ? taken / scheduled : 0,
    perMedTime,
    patterns,
    escalationsRaised: escalated.size,
  };
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
export const pct = (r: number) => `${Math.round(r * 100)}%`;

// ---------- Refills ----------

export function refillStatus(state: HearthState, med: Medication) {
  const taken = state.doseLogs.filter((l) => l.medId === med.id && l.status === "taken" && l.date >= med.stock.asOf).length;
  const remaining = Math.max(0, med.stock.count - taken);
  const perDay = med.times.length || 1;
  const daysLeft = Math.floor(remaining / perDay);
  return { remaining, daysLeft, low: daysLeft <= 7 };
}

// ---------- Timeline ----------

export type TimelineEntry =
  | { kind: "dose"; at: string; date: string; time: string; status: "taken" | "skipped"; late: boolean; by: string; meds: Medication[]; reason?: string }
  | { kind: "escalation"; at: string; log: EscalationLog }
  | { kind: "call"; at: string; call: CallLog }
  | { kind: "note"; at: string; note: Note }
  | { kind: "reading"; at: string; reading: Reading }
  | { kind: "question"; at: string; question: Question };

export function timeline(state: HearthState, from: string, now = nowOf(state)): TimelineEntry[] {
  const nowIso = now.toISOString();
  const entries: TimelineEntry[] = [];

  const groups = new Map<string, Extract<TimelineEntry, { kind: "dose" }>>();
  for (const l of state.doseLogs) {
    if (l.date < from || l.at > nowIso) continue;
    const k = `${l.date}|${l.time}|${l.status}|${l.by}|${l.late ? 1 : 0}`;
    const med = state.meds.find((m) => m.id === l.medId);
    if (!med) continue;
    if (!groups.has(k))
      groups.set(k, { kind: "dose", at: l.at, date: l.date, time: l.time, status: l.status, late: !!l.late, by: l.by, meds: [], reason: l.reason });
    groups.get(k)!.meds.push(med);
  }
  entries.push(...groups.values());

  const fromIso = at(from, "00:00").toISOString();
  const inRange = (iso: string) => iso >= fromIso && iso <= nowIso;
  for (const e of state.escalations) if (e.date >= from && e.at <= nowIso) entries.push({ kind: "escalation", at: e.at, log: e });
  for (const c of state.calls ?? []) if (c.date >= from && c.at <= nowIso) entries.push({ kind: "call", at: c.at, call: c });
  for (const n of state.notes) if (inRange(n.at)) entries.push({ kind: "note", at: n.at, note: n });
  for (const r of state.readings) if (inRange(r.at)) entries.push({ kind: "reading", at: r.at, reading: r });
  for (const q of state.questions) if (inRange(q.at)) entries.push({ kind: "question", at: q.at, question: q });

  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

export function whoName(state: HearthState, by: string): string {
  if (by === "patient") return state.patient.name.split(" ").slice(0, 2).join(" ");
  return state.members.find((m) => m.id === by)?.name ?? "Someone";
}
