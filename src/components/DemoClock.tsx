"use client";

import { useState } from "react";
import { ClockIcon, XIcon } from "@phosphor-icons/react";
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

  const chip = "press rounded-full bg-ground px-3 py-1.5 font-medium shadow-hairline transition-colors duration-150 hover:bg-hearth-soft";
  const panel = (
    <div className={`rounded-[24px] bg-paper p-4 text-sm ${inline ? "shadow-soft" : "w-[19rem] shadow-float"}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[13px] text-ink-3">{sim ? "Demo clock (frozen)" : "Real time"}</div>
          <div className="text-xl font-semibold tabular-nums">
            {fmtClock(now)} <span className="text-sm font-normal text-ink-2">{fmtDate(today, { weekday: true })}</span>
          </div>
        </div>
        {!inline && (
          <button onClick={() => setOpen(false)} className="press flex h-8 w-8 items-center justify-center rounded-full bg-ground text-ink-2" aria-label="Close demo clock">
            <XIcon size={14} weight="bold" aria-hidden />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map(([label, d]) => (
          <button key={label} onClick={() => jump(d)} className={chip}>
            {label}
          </button>
        ))}
        <button onClick={() => jump(addMinutes(now, 15))} className={chip}>
          +15 min
        </button>
        <button onClick={() => jump(at(addDays(today, 1), "07:55"))} className={chip}>
          Next day
        </button>
      </div>
      <div className="mt-3 flex gap-1.5 pt-3 shadow-[inset_0_1px_0_rgb(30_39_48/0.06)]">
        <button onClick={() => act({ type: "setClock", clock: { mode: "real" } })} className="press rounded-full px-3 py-1.5 text-ink-2 hover:bg-ground">
          Use real time
        </button>
        <button
          onClick={() => {
            if (confirm("Reset all demo data back to Mdm Tan's sample history?")) act({ type: "resetDemo" });
          }}
          className="press ml-auto rounded-full px-3 py-1.5 text-bad hover:bg-bad-soft"
        >
          Reset demo
        </button>
      </div>
    </div>
  );

  if (inline) return panel;
  return (
    <div className="no-print fixed bottom-24 left-3 z-30">
      {open ? (
        <div className="enter">{panel}</div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="press flex items-center gap-1.5 rounded-full bg-paper/85 px-3 py-1.5 text-xs font-semibold tabular-nums text-ink-2 shadow-float backdrop-blur-xl"
        >
          <ClockIcon size={14} weight="bold" aria-hidden /> {fmtClock(now)}
        </button>
      )}
    </div>
  );
}
