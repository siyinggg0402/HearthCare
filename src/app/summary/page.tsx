"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, PrinterIcon } from "@phosphor-icons/react";
import { useHearth } from "@/lib/useHearth";
import { computeStats, pct, slotsInRange, whoName, type ItemState } from "@/lib/logic";
import { addDays, dayOfWeek, fmtDate, fmtDateYear, fmtTime, isWeekend, toDateStr } from "@/lib/time";
import type { HearthState } from "@/lib/types";
import { Loading } from "@/components/ui";

const PERIODS = [14, 28, 42];

// Lightness differs between states (not just hue), so the grid still reads in greyscale print.
const CELL: Record<"taken" | "late" | "skipped" | "missed" | "none", { bg: string; label: string }> = {
  taken: { bg: "#dce7e1", label: "Taken" },
  late: { bg: "#f2cc8f", label: "Late, after a call" },
  skipped: { bg: "#e08a70", label: "Skipped, reason given" },
  missed: { bg: "#4a5562", label: "Never confirmed" },
  none: { bg: "#f3f5f7", label: "Not yet due" },
};
const cellKind = (s?: ItemState): keyof typeof CELL =>
  s === "taken" ? "taken" : s === "taken_late" ? "late" : s === "skipped" ? "skipped" : s === "missed" || s === "overdue" ? "missed" : "none";

function SummaryInner() {
  const { state, now } = useHearth();
  const params = useSearchParams();
  const router = useRouter();
  const days = PERIODS.includes(Number(params.get("days"))) ? Number(params.get("days")) : 42;
  if (!state) return <Loading />;

  const today = toDateStr(now);
  const from = addDays(today, -(days - 1));
  const stats = computeStats(state, from, today, now);
  const prev = computeStats(state, addDays(from, -days), addDays(from, -1), now);
  // Only compare when the previous period has nearly as much data, or a short history makes the change meaningless.
  const delta = prev.scheduled >= stats.scheduled * 0.8 ? Math.round((stats.rate - prev.rate) * 100) : null;
  const fromIso = new Date(`${from}T00:00:00`).toISOString();
  const nowIso = now.toISOString();
  const p = state.patient;

  const slots = slotsInRange(state, from, today, now);
  const missedItems = slots.flatMap((s) => s.items.filter((i) => i.state === "missed" || i.state === "overdue").map(() => s.date));
  const missedWeekend = missedItems.filter(isWeekend).length;

  const notes = state.notes.filter((n) => n.at >= fromIso && n.at <= nowIso).sort((a, b) => b.at.localeCompare(a.at));
  const bp = state.readings.filter((r) => r.type === "bp" && r.at >= fromIso && r.at <= nowIso).sort((a, b) => a.at.localeCompare(b.at));
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const sys = bp.map((r) => r.systolic!);
  const dia = bp.map((r) => r.diastolic!);
  const activeMeds = state.meds.filter((m) => m.active);

  return (
    <div className="min-h-dvh py-6 print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-2 px-4">
        <Link href="/family" className="press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-ink-2 hover:bg-paper">
          <ArrowLeftIcon size={15} aria-hidden /> Family app
        </Link>
        <div className="ml-auto flex rounded-full bg-[#eef1f4] p-0.5 text-sm" role="radiogroup" aria-label="Period">
          {PERIODS.map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={d === days}
              onClick={() => router.replace(`/summary?days=${d}`)}
              className={`rounded-full px-3 py-1.5 transition-colors duration-200 ${d === days ? "bg-paper font-semibold shadow-[0_1px_2px_rgb(30_39_48/0.08)]" : "text-ink-2"}`}
            >
              {d / 7} weeks
            </button>
          ))}
        </div>
        <button onClick={() => window.print()} className="press flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          <PrinterIcon size={16} aria-hidden /> Print or save PDF
        </button>
      </div>

      {/* A4 sheet */}
      <article
        className="mx-auto flex max-w-[210mm] flex-col gap-6 rounded-[24px] bg-white px-[13mm] py-[12mm] text-[13px] leading-normal text-ink shadow-[0_24px_60px_-30px_rgb(30_39_48/0.25)] print:max-w-none print:rounded-none print:p-0 print:shadow-none"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
        <header className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="self-start rounded-full bg-hearth-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-hearth-ink">HearthCare home medication report</span>
            <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.015em]">
              {p.name} {p.nameZh && <span className="font-normal text-ink-2">{p.nameZh}</span>}, {p.age}
            </h1>
            <div className="text-ink-2">
              {fmtDateYear(from)} to {fmtDateYear(today)} ({days} days)
            </div>
          </div>
          <div className="flex flex-col gap-0.5 pt-1 text-right text-xs text-ink-2">
            {state.appointment && (
              <span className="font-semibold text-ink">
                For {state.appointment.doctor}, {fmtDate(state.appointment.date)}, {fmtTime(state.appointment.time)}
              </span>
            )}
            {state.appointment?.clinic && <span>{state.appointment.clinic}</span>}
            <span>Family: {state.members.map((m) => m.name).join(", ")}</span>
            <span>Generated {fmtDateYear(today)}</span>
          </div>
        </header>

        {/* Headline numbers */}
        <section aria-label="Headline numbers" className="grid grid-cols-3 gap-[5px] rounded-[22px] bg-ground p-[5px]">
          <Stat label="Doses confirmed" value={pct(stats.rate)}>
            {stats.taken} of {stats.scheduled}.
            {delta !== null && delta !== 0 && (
              <span className={`font-semibold ${delta < 0 ? "text-bad" : "text-ok"}`}>
                {" "}
                {delta < 0 ? "Down" : "Up"} {Math.abs(delta)} points
              </span>
            )}
            {delta !== null && delta !== 0 && " on the previous period"}
          </Stat>
          <Stat label="Doses never confirmed" value={String(stats.missed)}>
            {stats.missed > 0 ? `${missedWeekend} of them on a weekend. ${stats.late} more taken late after a call.` : `${stats.late} taken late after a family call.`}
          </Stat>
          <Stat label="Average home BP" value={bp.length ? `${avg(sys)}/${avg(dia)}` : "None"}>
            {bp.length ? `${bp.length} reading${bp.length === 1 ? "" : "s"}, ${sys.filter((s) => s > 130).length} above 130` : "No readings logged"}
          </Stat>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-[15px] font-semibold">Worth discussing</h2>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-[#2e3842]">
            {stats.patterns.map((x) => (
              <li key={x}>{x}.</li>
            ))}
          </ol>
        </section>

        <DoseGrid state={state} from={from} today={today} days={days} slots={slots} perMedTime={stats.perMedTime} />

        <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-8">
          <section className="flex flex-col gap-2">
            <h2 className="text-[15px] font-semibold">Home blood pressure, systolic</h2>
            {bp.length >= 2 ? <BpChart readings={bp.map((r) => ({ at: r.at, sys: r.systolic!, dia: r.diastolic! }))} /> : <p className="text-ink-3">Not enough readings for a trend.</p>}
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-[15px] font-semibold">Current medicines</h2>
            <div className="flex flex-col gap-1">
              {activeMeds.map((m) => (
                <div key={m.id} className="flex justify-between gap-2 rounded-[12px] bg-ground px-3 py-2">
                  <span>
                    <span className="font-semibold">{m.name}</span> {m.dose}
                  </span>
                  <span className="text-ink-2">{m.times.map(fmtTime).join(", ")}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-8">
          <section className="flex flex-col gap-2">
            <h2 className="text-[15px] font-semibold">In their own words</h2>
            {notes.length === 0 ? (
              <p className="text-ink-3">None reported.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[#2e3842]">
                {notes.slice(0, 6).map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <span className="w-12 shrink-0 tabular-nums text-ink-3">{fmtDate(toDateStr(new Date(n.at)))}</span>
                    <span>
                      “{n.translation ?? n.text}”{" "}
                      <span className="text-ink-3">
                        {n.by === "patient" ? (n.source === "voice" ? `${p.callName}, voice note` : p.callName) : whoName(state, n.by)}
                        {n.translation && `. Original: ${n.text}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-[15px] font-semibold">Family&apos;s questions</h2>
            {state.questions.length ? (
              <ol className="flex list-decimal flex-col gap-1.5 pl-[18px] text-[#2e3842]">
                {state.questions.map((q) => (
                  <li key={q.id}>
                    {q.text} <span className="text-ink-3">{whoName(state, q.by)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-ink-3">None.</p>
            )}
          </section>
        </div>

        <footer className="mt-auto pt-3 text-[10.5px] text-ink-3 shadow-[inset_0_1px_0_#eef1f4]">
          Reported by the patient and family through HearthCare reminders. Not a clinical record, and HearthCare does not diagnose or give
          medical advice. &quot;Taken&quot; means the patient or a family member confirmed the dose.
        </footer>
      </article>
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[17px] bg-white px-[18px] py-4 shadow-[0_1px_2px_rgb(30_39_48/0.04)]">
      <span className="text-xs text-ink-2">{label}</span>
      <span className="text-[34px] font-semibold leading-tight tracking-[-0.02em] tabular-nums">{value}</span>
      <span className="text-xs text-ink-2">{children}</span>
    </div>
  );
}

function DoseGrid({
  state,
  from,
  today,
  days,
  slots,
  perMedTime,
}: {
  state: HearthState;
  from: string;
  today: string;
  days: number;
  slots: ReturnType<typeof slotsInRange>;
  perMedTime: ReturnType<typeof computeStats>["perMedTime"];
}) {
  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));
  const idx = new Map<string, ItemState>();
  for (const s of slots) for (const i of s.items) idx.set(`${s.date}|${s.time}|${i.med.id}`, i.state);
  // One row per medicine and time, in the order of the day.
  const rows = state.meds
    .filter((m) => m.active)
    .flatMap((m) => m.times.map((time) => ({ med: m, time })))
    .sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name));

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-semibold">Every dose, day by day</h2>
        <div className="flex flex-wrap justify-end gap-x-3.5 gap-y-1 text-[11.5px] text-ink-2">
          {(["taken", "late", "skipped", "missed"] as const).map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="h-[9px] w-[9px] rounded-[3px]" style={{ background: CELL[k].bg }} />
              {CELL[k].label}
            </span>
          ))}
        </div>
      </div>
      <div
        role="img"
        aria-label={`Dose grid for ${days} days. ${perMedTime.map((r) => `${r.med.name} ${fmtTime(r.time)}: ${pct(r.rate)} taken`).join(". ")}`}
        className="flex flex-col gap-[7px] rounded-[20px] bg-[#fafbfc] px-[18px] py-4 shadow-[inset_0_0_0_1px_rgb(30_39_48/0.05)]"
      >
        <div className="flex items-end gap-3">
          <span className="w-[124px] shrink-0" />
          <div className="flex flex-1 gap-[2px]">
            {dates.map((d) => (
              <span key={d} className="relative h-3.5 flex-1">
                {dayOfWeek(d) === 1 && <span className="absolute left-0 top-0 whitespace-nowrap text-[10.5px] leading-none text-ink-3">{fmtDate(d)}</span>}
              </span>
            ))}
          </div>
          <span className="w-10 shrink-0" />
        </div>
        {rows.map(({ med, time }) => {
          const stat = perMedTime.find((r) => r.med.id === med.id && r.time === time);
          return (
            <div key={`${med.id}${time}`} className="flex items-center gap-3">
              <span className="flex w-[124px] shrink-0 justify-between text-[12.5px]">
                <span className="font-semibold">{med.name}</span>
                <span className="tabular-nums text-ink-3">{fmtTime(time)}</span>
              </span>
              <div className="flex flex-1 gap-[2px]">
                {dates.map((d) => {
                  const k = d > today ? "none" : cellKind(idx.get(`${d}|${time}|${med.id}`));
                  return <span key={d} title={`${fmtDate(d, { weekday: true })}: ${CELL[k].label}`} className={`h-4 flex-1 rounded-[3px] ${dayOfWeek(d) === 1 ? "ml-[3px]" : ""}`} style={{ background: CELL[k].bg }} />;
                })}
              </div>
              <span className="w-10 shrink-0 text-right font-semibold tabular-nums">{stat ? pct(stat.rate) : ""}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BpChart({ readings }: { readings: { at: string; sys: number; dia: number }[] }) {
  const W = 300;
  const H = 90;
  const sysVals = readings.map((r) => r.sys);
  const lo = Math.min(120, Math.floor((Math.min(...sysVals) - 5) / 10) * 10);
  const hi = Math.max(160, Math.ceil((Math.max(...sysVals) + 5) / 10) * 10);
  const y = (v: number) => ((hi - v) / (hi - lo)) * H;
  const x = (i: number) => (readings.length === 1 ? W / 2 : (i / (readings.length - 1)) * W);
  const pts = readings.map((r, i) => `${x(i).toFixed(1)},${y(r.sys).toFixed(1)}`).join(" ");
  const last = readings.at(-1)!;
  const above = sysVals.filter((s) => s > 130).length;
  return (
    <>
      <svg
        role="img"
        aria-label={`Systolic readings from ${Math.min(...sysVals)} to ${Math.max(...sysVals)}; ${above} of ${readings.length} above the 130 target`}
        width="100%"
        height="108"
        viewBox={`-30 -8 ${W + 40} ${H + 28}`}
        preserveAspectRatio="none"
        className="block"
      >
        <rect x="0" y={y(130)} width={W} height={H - y(130)} rx="4" fill="#ebf6ef" />
        {[hi, 130, lo].map((v) => (
          <text key={v} x="-8" y={y(v) + 3} fontSize="9" fill="#626c77" textAnchor="end">
            {v}
          </text>
        ))}
        <line x1="0" y1="0" x2={W} y2="0" stroke="#eef1f4" />
        <polyline fill="none" stroke="#56606b" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" points={pts} />
        <circle cx={x(readings.length - 1)} cy={y(last.sys)} r="3.5" fill="#fff" stroke="#1e2730" strokeWidth="1.5" />
        <text x={W} y={H + 16} fontSize="9" fill="#626c77" textAnchor="end">
          Latest {last.sys}/{last.dia}, {fmtDate(toDateStr(new Date(last.at)))}
        </text>
        <text x="0" y={H + 16} fontSize="9" fill="#626c77">
          {fmtDate(toDateStr(new Date(readings[0].at)))}
        </text>
      </svg>
      <span className="text-[11.5px] text-ink-3">Green band: at or under the 130 target.</span>
    </>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SummaryInner />
    </Suspense>
  );
}
