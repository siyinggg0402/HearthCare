"use client";

import { useState } from "react";
import { PencilSimpleIcon, PlusIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useHearth } from "@/lib/useHearth";
import { refillStatus } from "@/lib/logic";
import { CHANNELS } from "@/lib/channels";
import { fmtTime, toDateStr } from "@/lib/time";
import type { HearthState, Lang, Medication, PillAppearance } from "@/lib/types";
import { btnDark, btnGhost, btnLink, Card, Field, inputCls, optionCls, PillSwatch, SectionTitle, Sheet } from "@/components/ui";

export function MedsTab({ state }: { state: HearthState }) {
  const { act } = useHearth();
  const [editing, setEditing] = useState<Medication | "new" | null>(null);
  const p = state.patient;

  return (
    <div>
      <Card className="flex flex-col gap-5 !p-5">
        <div>
          <div className="text-xl font-semibold tracking-[-0.01em]">
            {p.name} {p.nameZh && <span className="font-normal text-ink-3">{p.nameZh}</span>}
          </div>
          <div className="mt-0.5 text-sm text-ink-2">
            {p.age} years, {p.phone}. The family calls her “{p.callName}”.
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="px-1 text-[13.5px] font-semibold">Reminder language</span>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-[#eef1f4] p-1" role="radiogroup" aria-label="Reminder language">
            {(
              [
                ["en", "English"],
                ["zh", "中文 Chinese"],
              ] as [Lang, string][]
            ).map(([l, label]) => (
              <button
                key={l}
                role="radio"
                aria-checked={p.lang === l}
                onClick={() => act({ type: "updatePatient", patient: { lang: l } })}
                className={`rounded-full py-2 font-semibold transition-colors duration-200 ${p.lang === l ? "bg-paper shadow-[0_1px_2px_rgb(30_39_48/0.08)]" : "text-ink-2"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="px-1 text-[13.5px] font-semibold">How to remind</span>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="How to remind">
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                role="radio"
                aria-checked={p.reminderChannel === c.key}
                onClick={() => act({ type: "updatePatient", patient: { reminderChannel: c.key } })}
                className={`${optionCls(p.reminderChannel === c.key)} flex-col !gap-0.5`}
              >
                <span className="font-semibold">{c.label}</span>
                <span className="text-[13px] text-ink-2">{c.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="px-1 text-sm text-ink-2">
          Alerts the on-duty family member after <span className="font-semibold text-ink">{state.escalateAfterMin} minutes</span> without a reply.
        </p>
      </Card>

      <SectionTitle
        right={
          <button onClick={() => setEditing("new")} className={btnLink}>
            <PlusIcon size={13} weight="bold" aria-hidden /> Add medicine
          </button>
        }
      >
        Medicines
      </SectionTitle>
      <div className="flex flex-col gap-2.5">
        {state.meds
          .filter((m) => m.active)
          .map((m) => {
            const r = refillStatus(state, m);
            return (
              <Card key={m.id} className="flex items-center gap-3.5 !p-3.5">
                <PillSwatch med={m} size={52} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    {m.name} <span className="font-normal text-ink-2">{m.dose}</span> {m.nameZh && <span className="font-normal text-ink-3">{m.nameZh}</span>}
                  </div>
                  <div className="text-[13.5px] text-ink-2">
                    {m.purpose ? `${m.purpose}, ` : ""}
                    {m.times.map(fmtTime).join(" and ")}
                  </div>
                  <div className={`mt-0.5 flex items-center gap-1 text-[13px] ${r.low ? "font-semibold text-warn-ink" : "text-ink-3"}`}>
                    {r.low && <WarningCircleIcon size={14} weight="bold" aria-hidden />}
                    {r.remaining} left, about {r.daysLeft} days
                  </div>
                </div>
                <button onClick={() => setEditing(m)} className="press flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f5f7] text-ink-2" aria-label={`Edit ${m.name}`}>
                  <PencilSimpleIcon size={18} aria-hidden />
                </button>
              </Card>
            );
          })}
      </div>

      <MedSheet key={editing === "new" ? "new" : editing?.id ?? "none"} med={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

const TIME_PRESETS = ["08:00", "13:00", "20:00", "22:00"];
const SHAPES: PillAppearance["shape"][] = ["round", "oval", "capsule"];
const COLORS = ["#ffffff", "#f6e1b8", "#f4d4cc", "#cfe3f4", "#d9ecd4", "#e9d8f0"];

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
  const [look, setLook] = useState<PillAppearance>(existing?.appearance ?? { shape: "round", color: "#ffffff" });

  const toggle = (t: string) => setTimes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t].sort()));
  const chip = (on: boolean) =>
    `press rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors duration-150 ${on ? "bg-hearth-soft text-hearth-ink shadow-[inset_0_0_0_1.5px_rgb(194_85_58/0.5)]" : "bg-ground text-ink-2 shadow-hairline"}`;

  return (
    <Sheet open={!!med} onClose={onClose} title={existing ? `Edit ${existing.name}` : "Add medicine"}>
      <div className="flex flex-col gap-3">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Chinese name" hint="(optional)">
          <input value={nameZh} onChange={(e) => setNameZh(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Dose">
            <input value={dose} onChange={(e) => setDose(e.target.value)} className={inputCls} />
          </Field>
          <Field label="For">
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <span className="px-1 text-[13.5px] font-semibold">What it looks like</span>
          <div className="flex items-center gap-3">
            <PillSwatch appearance={look} size={56} />
            <div className="flex flex-col gap-2">
              <div className="flex gap-1.5">
                {SHAPES.map((sh) => (
                  <button key={sh} type="button" onClick={() => setLook({ ...look, shape: sh })} className={`${chip(look.shape === sh)} capitalize`}>
                    {sh}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setLook({ ...look, color: c })}
                    aria-label={`Colour ${c}`}
                    aria-pressed={look.color === c}
                    className="press h-7 w-7 rounded-full"
                    style={{ background: c, boxShadow: look.color === c ? "0 0 0 2px #fff, 0 0 0 3.5px #c2553a" : "inset 0 0 0 1px rgb(30 39 48 / 0.15)" }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="px-1 text-[13.5px] font-semibold">Times</span>
          <div className="flex flex-wrap items-center gap-2">
            {[...new Set([...TIME_PRESETS, ...times])].sort().map((t) => (
              <button key={t} type="button" onClick={() => toggle(t)} className={chip(times.includes(t))} aria-pressed={times.includes(t)}>
                {fmtTime(t)}
              </button>
            ))}
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              aria-label="Another time"
              className="rounded-full bg-ground px-3 py-1.5 text-sm shadow-hairline outline-none"
            />
            {customTime && (
              <button
                type="button"
                onClick={() => {
                  if (!times.includes(customTime)) toggle(customTime);
                  setCustomTime("");
                }}
                className={btnLink}
              >
                Add
              </button>
            )}
          </div>
        </div>

        <Field label={existing ? "Refilled? Pills on hand now" : "Pills on hand"} hint={existing ? "(leave blank to keep)" : undefined}>
          <input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} />
        </Field>
        <button
          disabled={!name.trim() || times.length === 0}
          className={`${btnDark} mt-2 h-[54px]`}
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
                appearance: look,
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
