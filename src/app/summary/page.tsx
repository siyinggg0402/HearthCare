"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useHearth } from "@/lib/useHearth";
import { computeStats, pct, whoName } from "@/lib/logic";
import { addDays, fmtDate, fmtDateYear, fmtTime, toDateStr } from "@/lib/time";
import { Loading } from "@/components/ui";

const PERIODS = [14, 28, 42];

function SummaryInner() {
  const { state, now } = useHearth();
  const params = useSearchParams();
  const router = useRouter();
  const days = PERIODS.includes(Number(params.get("days"))) ? Number(params.get("days")) : 42;
  if (!state) return <Loading />;

  const today = toDateStr(now);
  const from = addDays(today, -(days - 1));
  const stats = computeStats(state, from, today, now);
  const fromIso = new Date(`${from}T00:00:00`).toISOString();
  const nowIso = now.toISOString();
  const p = state.patient;

  const notes = state.notes.filter((n) => n.at >= fromIso && n.at <= nowIso).sort((a, b) => b.at.localeCompare(a.at));
  const bp = state.readings.filter((r) => r.type === "bp" && r.at >= fromIso && r.at <= nowIso);
  const avg = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const sys = bp.map((r) => r.systolic!);
  const dia = bp.map((r) => r.diastolic!);
  const activeMeds = state.meds.filter((m) => m.active);

  return (
    <div className="min-h-dvh bg-[#ece6de] py-6 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-2 px-4">
        <Link href="/family" className="text-sm text-ink-2">
          ← Family app
        </Link>
        <div className="ml-auto flex rounded-lg border border-line bg-paper text-sm">
          {PERIODS.map((d) => (
            <button
              key={d}
              onClick={() => router.replace(`/summary?days=${d}`)}
              className={`px-3 py-1.5 first:rounded-l-lg last:rounded-r-lg ${d === days ? "bg-ink text-white" : ""}`}
            >
              {d / 7} weeks
            </button>
          ))}
        </div>
        <button onClick={() => window.print()} className="rounded-lg bg-hearth px-4 py-1.5 text-sm font-semibold text-white">
          Print / save PDF
        </button>
      </div>

      {/* A4 sheet */}
      <article className="mx-auto max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[13px] leading-snug text-ink shadow-md print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-ink pb-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-hearth">HearthCare · Home medication summary</div>
            <h1 className="text-xl font-bold">
              {p.name} {p.nameZh && <span className="font-normal">{p.nameZh}</span>}, {p.age}
            </h1>
            <div className="text-ink-2">
              {fmtDateYear(from)} to {fmtDateYear(today)} ({days} days)
            </div>
          </div>
          <div className="text-right text-[11px] text-ink-2">
            {state.appointment && (
              <>
                For {state.appointment.doctor}, {fmtDate(state.appointment.date)}
                <br />
              </>
            )}
            Generated {fmtDateYear(today)}
            <br />
            Family contacts: {state.members.length}
          </div>
        </header>

        {/* Adherence */}
        <section className="mt-3 grid grid-cols-[150px_1fr] gap-5">
          <div>
            <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-3">Adherence</h2>
            <div className="text-5xl font-bold leading-none">{pct(stats.rate)}</div>
            <div className="mt-1 text-ink-2">
              {stats.taken} of {stats.scheduled} doses taken
            </div>
            <div className="mt-2 text-[11px] text-ink-2">
              {stats.late > 0 && (
                <div>
                  {stats.late} taken late after a family call
                </div>
              )}
              <div>{stats.skipped} skipped (patient said so)</div>
              <div>{stats.missed} never confirmed</div>
            </div>
          </div>
          <div>
            <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-3">By medicine and time</h2>
            <table className="w-full">
              <tbody>
                {stats.perMedTime.map((r) => (
                  <tr key={`${r.med.id}${r.time}`}>
                    <td className="w-[150px] py-1 pr-2">
                      <span className="font-semibold">{r.med.name}</span> <span className="text-ink-3">{r.med.dose}</span>
                    </td>
                    <td className="w-12 py-1 tabular-nums text-ink-2">{fmtTime(r.time)}</td>
                    <td className="py-1">
                      <div className="h-2.5 w-full rounded-r bg-line" role="img" aria-label={`${pct(r.rate)} taken`}>
                        <div className="h-2.5 rounded-r bg-hearth" style={{ width: pct(r.rate) }} />
                      </div>
                    </td>
                    <td className="w-12 py-1 text-right font-semibold tabular-nums">{pct(r.rate)}</td>
                    <td className="w-24 py-1 pl-2 text-[11px] text-ink-3">
                      {r.skipped + r.missed > 0 ? `${r.skipped + r.missed} missed` : "none missed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Patterns */}
        <section className="mt-4">
          <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-3">Patterns noticed</h2>
          <ul className="list-disc space-y-0.5 pl-5">
            {stats.patterns.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>

        <div className="mt-4 grid grid-cols-[1fr_190px] gap-5">
          {/* Symptoms */}
          <section>
            <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-3">Symptoms and notes (patient and family&apos;s own words)</h2>
            {notes.length === 0 ? (
              <div className="text-ink-3">None reported.</div>
            ) : (
              <ul className="space-y-1">
                {notes.slice(0, 8).map((n) => (
                  <li key={n.id} className="flex gap-2">
                    <span className="w-12 shrink-0 tabular-nums text-ink-3">{fmtDate(toDateStr(new Date(n.at)))}</span>
                    <span>
                      “{n.translation ?? n.text}”
                      <span className="text-ink-3">
                        {" "}
                        ({n.by === "patient" ? (n.source === "voice" ? "patient, voice" : "patient") : whoName(state, n.by)}
                        {n.translation && `; original: ${n.text}`})
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Readings */}
          <section>
            <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-3">Home readings</h2>
            {bp.length ? (
              <div>
                <div>
                  <span className="text-ink-2">BP avg</span>{" "}
                  <b className="text-base">
                    {avg(sys)}/{avg(dia)}
                  </b>
                </div>
                <div className="text-[11px] text-ink-2">
                  Range {Math.min(...sys)}–{Math.max(...sys)} / {Math.min(...dia)}–{Math.max(...dia)} · {bp.length} readings
                </div>
                <div className="mt-1 text-[11px] text-ink-3">
                  Latest {bp.at(-1)!.systolic}/{bp.at(-1)!.diastolic} on {fmtDate(toDateStr(new Date(bp.at(-1)!.at)))}
                </div>
              </div>
            ) : (
              <div className="text-ink-3">None logged.</div>
            )}

            <h2 className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wide text-ink-3">Current medicines</h2>
            <ul className="text-[12px]">
              {activeMeds.map((m) => (
                <li key={m.id}>
                  {m.name} {m.dose} · {m.times.map(fmtTime).join(", ")}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Questions */}
        <section className="mt-4 rounded-lg border border-line bg-ground/60 p-3 print:bg-transparent">
          <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-3">Family&apos;s questions</h2>
          {state.questions.length ? (
            <ol className="list-decimal space-y-0.5 pl-5">
              {state.questions.map((q) => (
                <li key={q.id}>
                  {q.text} <span className="text-ink-3">({whoName(state, q.by)})</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="text-ink-3">None.</div>
          )}
        </section>

        <footer className="mt-4 border-t border-line pt-2 text-[10px] text-ink-3">
          Reported by the patient and family through HearthCare reminders. Not a clinical record. HearthCare does not diagnose or give
          medical advice. &quot;Taken&quot; means the patient or a family member confirmed the dose.
        </footer>
      </article>
    </div>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SummaryInner />
    </Suspense>
  );
}
