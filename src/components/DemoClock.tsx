"use client";

import { useState } from "react";
import { useHearth } from "@/lib/useHearth";
import { addDays, addMinutes, at, fmtClock, fmtDate, toDateStr } from "@/lib/time";

/** Demo control: freeze/jump the simulated clock so the whole day can be shown in two minutes. */
export function DemoClock({ inline = false }: { inline?: boolean }) {
  const { state, now, act } = useHearth();
  const [open, setOpen] = useState(inline);
  if (!state) return null;

  const today = toDateStr(now);
  const sim = state.clock.mode === "sim";
  const jump = (d: Date) => act({ type: "setClock", clock: { mode: "sim", now: d.toISOString() } });

  const presets: [string, Date][] = [
    ["7:55am", at(today, "07:55")],
    ["8:00am", at(today, "08:00")],
    ["8:15am", at(today, "08:15")],
    ["8:00pm", at(today, "20:00")],
    ["8:15pm", at(today, "20:15")],
    ["8:50pm", at(today, "20:50")],
  ];

  const panel = (
    <div className={`rounded-2xl border border-line bg-paper p-3 text-sm ${inline ? "" : "w-72 shadow-lg"}`}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-3">{sim ? "Demo clock (frozen)" : "Real time"}</div>
          <div className="text-xl font-semibold tabular-nums">
            {fmtClock(now)} <span className="text-sm font-normal text-ink-2">{fmtDate(today, { weekday: true })}</span>
          </div>
        </div>
        {!inline && (
          <button onClick={() => setOpen(false)} className="text-ink-3" aria-label="Close demo clock">
            ✕
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map(([label, d]) => (
          <button key={label} onClick={() => jump(d)} className="rounded-lg bg-ground px-2.5 py-1 font-medium hover:bg-hearth-soft">
            {label}
          </button>
        ))}
        <button onClick={() => jump(addMinutes(now, 15))} className="rounded-lg bg-ground px-2.5 py-1 font-medium hover:bg-hearth-soft">
          +15 min
        </button>
        <button
          onClick={() => jump(at(addDays(today, 1), "07:55"))}
          className="rounded-lg bg-ground px-2.5 py-1 font-medium hover:bg-hearth-soft"
        >
          Next day
        </button>
      </div>
      <div className="mt-2 flex gap-1.5 border-t border-line pt-2">
        <button
          onClick={() => act({ type: "setClock", clock: { mode: "real" } })}
          className="rounded-lg px-2.5 py-1 text-ink-2 hover:bg-ground"
        >
          Use real time
        </button>
        <button
          onClick={() => {
            if (confirm("Reset all demo data back to Mdm Tan's sample history?")) act({ type: "resetDemo" });
          }}
          className="ml-auto rounded-lg px-2.5 py-1 text-bad hover:bg-bad-soft"
        >
          Reset demo
        </button>
      </div>
    </div>
  );

  if (inline) return panel;
  return (
    <div className="no-print fixed bottom-20 left-3 z-30">
      {open ? (
        panel
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold tabular-nums text-ink-2 shadow"
        >
          🕒 {fmtClock(now)}
        </button>
      )}
    </div>
  );
}
