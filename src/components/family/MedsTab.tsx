"use client";

import { useState } from "react";
import { useHearth } from "@/lib/useHearth";
import { refillStatus } from "@/lib/logic";
import { CHANNELS } from "@/lib/channels";
import { fmtTime, toDateStr } from "@/lib/time";
import type { HearthState, Lang, Medication } from "@/lib/types";
import { btnGhost, btnPrimary, Card, inputCls, SectionTitle, Sheet } from "@/components/ui";

export function MedsTab({ state }: { state: HearthState }) {
  const { act } = useHearth();
  const [editing, setEditing] = useState<Medication | "new" | null>(null);
  const p = state.patient;

  return (
    <div>
      <SectionTitle>Patient</SectionTitle>
      <Card className="flex flex-col gap-3">
        <div>
          <div className="text-lg font-semibold">
            {p.name} {p.nameZh && <span className="font-normal text-ink-2">{p.nameZh}</span>}
          </div>
          <div className="text-sm text-ink-2">
            {p.age} years · {p.phone} · family calls them “{p.callName}”
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-ink-3">Reminder language</div>
          <div className="flex gap-2">
            {(
              [
                ["en", "English"],
                ["zh", "中文 Chinese"],
              ] as [Lang, string][]
            ).map(([l, label]) => (
              <button
                key={l}
                onClick={() => act({ type: "updatePatient", patient: { lang: l } })}
                className={`flex-1 rounded-xl border-2 py-2 font-semibold ${p.lang === l ? "border-hearth bg-hearth-soft text-hearth" : "border-line"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-ink-3">How to remind</div>
          <div className="flex flex-col gap-1.5">
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                onClick={() => act({ type: "updatePatient", patient: { reminderChannel: c.key } })}
                className={`rounded-xl border-2 px-3 py-2 text-left ${p.reminderChannel === c.key ? "border-hearth bg-hearth-soft" : "border-line"}`}
              >
                <span className="font-semibold">{c.label}</span>
                <span className="block text-xs text-ink-2">{c.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="text-sm text-ink-2">
          Alerts the on-duty family member after <b>{state.escalateAfterMin} minutes</b> without a reply.
        </div>
      </Card>

      <SectionTitle right={<button onClick={() => setEditing("new")} className="text-sm font-semibold text-hearth">+ Add medicine</button>}>
        Medicines
      </SectionTitle>
      <div className="flex flex-col gap-2">
        {state.meds
          .filter((m) => m.active)
          .map((m) => {
            const r = refillStatus(state, m);
            return (
              <Card key={m.id} className="!p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {m.name} {m.dose} {m.nameZh && <span className="font-normal text-ink-3">{m.nameZh}</span>}
                    </div>
                    <div className="text-sm text-ink-2">
                      {m.purpose} · {m.times.map(fmtTime).join(", ")}
                    </div>
                    <div className={`mt-1 text-xs ${r.low ? "font-semibold text-warn" : "text-ink-3"}`}>
                      {r.low && "⚠ "}
                      {r.remaining} pills left, about {r.daysLeft} days
                    </div>
                  </div>
                  <button onClick={() => setEditing(m)} className="text-sm text-hearth">
                    Edit
                  </button>
                </div>
              </Card>
            );
          })}
      </div>

      <MedSheet key={editing === "new" ? "new" : editing?.id ?? "none"} med={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

const TIME_PRESETS = ["08:00", "13:00", "20:00", "22:00"];

function MedSheet({ med, onClose }: { med: Medication | "new" | null; onClose: () => void }) {
  const { act, now } = useHearth();
  const existing = med && med !== "new" ? med : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [nameZh, setNameZh] = useState(existing?.nameZh ?? "");
  const [dose, setDose] = useState(existing?.dose ?? "");
  const [purpose, setPurpose] = useState(existing?.purpose ?? "");
  const [times, setTimes] = useState<string[]>(existing?.times ?? ["08:00"]);
  const [customTime, setCustomTime] = useState("");
  const [stock, setStock] = useState(existing ? "" : "30");

  const toggle = (t: string) => setTimes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t].sort()));

  return (
    <Sheet open={!!med} onClose={onClose} title={existing ? `Edit ${existing.name}` : "Add medicine"}>
      <div className="flex flex-col gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Metformin)" className={inputCls} />
        <input value={nameZh} onChange={(e) => setNameZh(e.target.value)} placeholder="Chinese name (optional)" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dose (500mg)" className={inputCls} />
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="For (Diabetes)" className={inputCls} />
        </div>
        <div className="text-xs uppercase tracking-wide text-ink-3">Times</div>
        <div className="flex flex-wrap gap-2">
          {[...new Set([...TIME_PRESETS, ...times])].sort().map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`rounded-lg border-2 px-3 py-1.5 text-sm font-semibold ${times.includes(t) ? "border-hearth bg-hearth-soft text-hearth" : "border-line"}`}
            >
              {fmtTime(t)}
            </button>
          ))}
          <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="rounded-lg border border-line px-2 text-sm" />
          {customTime && (
            <button
              onClick={() => {
                if (!times.includes(customTime)) toggle(customTime);
                setCustomTime("");
              }}
              className="text-sm text-hearth"
            >
              Add
            </button>
          )}
        </div>
        <input
          inputMode="numeric"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder={existing ? "Refilled? Pills on hand now (leave blank to keep)" : "Pills on hand"}
          className={inputCls}
        />
        <button
          disabled={!name.trim() || times.length === 0}
          className={`${btnPrimary} mt-2`}
          onClick={async () => {
            const base = existing ?? { stock: { count: 0, asOf: toDateStr(now) }, active: true };
            await act({
              type: "upsertMed",
              med: {
                ...base,
                id: existing?.id,
                name: name.trim(),
                nameZh: nameZh.trim() || undefined,
                dose: dose.trim(),
                purpose: purpose.trim() || undefined,
                purposeZh: existing?.purposeZh,
                times,
                stock: stock.trim() ? { count: Number(stock) || 0, asOf: toDateStr(now) } : base.stock,
                active: true,
              },
            });
            onClose();
          }}
        >
          Save
        </button>
        {existing && (
          <button
            className={`${btnGhost} text-bad`}
            onClick={async () => {
              if (!confirm(`Stop reminders for ${existing.name}? History is kept for the doctor summary.`)) return;
              await act({ type: "deleteMed", id: existing.id });
              onClose();
            }}
          >
            Stop this medicine
          </button>
        )}
      </div>
    </Sheet>
  );
}
