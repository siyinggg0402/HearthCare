"use client";

import { useState } from "react";
import { ArrowsClockwiseIcon, CaretRightIcon, UserPlusIcon } from "@phosphor-icons/react";
import { useHearth } from "@/lib/useHearth";
import { onDuty } from "@/lib/logic";
import { addDays, fmtDate, mondayOf, relativeDay, toDateStr } from "@/lib/time";
import type { FamilyMember, HearthState } from "@/lib/types";
import { Avatar, btnDark, btnLink, Field, inputCls, optionCls, SectionTitle, Sheet, Tray } from "@/components/ui";

export function RosterTab({ state, me }: { state: HearthState; me: FamilyMember }) {
  const { now, act } = useHearth();
  const today = toDateStr(now);
  const start = mondayOf(today);
  const days = Array.from({ length: 21 }, (_, i) => addDays(start, i));
  const [swapDate, setSwapDate] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const duty = onDuty(state, today);

  // Fairness: shifts and follow-ups over the last 30 days
  const from = addDays(today, -29);
  const shiftCounts = new Map<string, number>();
  for (let d = from; d <= today; d = addDays(d, 1)) {
    const m = onDuty(state, d);
    if (m) shiftCounts.set(m.id, (shiftCounts.get(m.id) ?? 0) + 1);
  }
  const followUps = new Map<string, number>();
  for (const e of state.escalations.filter((e) => e.date >= from && e.date <= today)) {
    followUps.set(e.memberId, (followUps.get(e.memberId) ?? 0) + 1);
  }

  return (
    <div>
      <Tray>
        <section className="flex items-center gap-3.5 rounded-[25px] bg-paper p-[18px] shadow-lift">
          <Avatar member={duty} size={48} ring />
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] text-ink-3">On duty today</span>
            <span className="text-xl font-semibold tracking-[-0.01em]">
              {duty?.name}
              {duty?.id === me.id && " (you)"}
            </span>
            <span className="text-sm leading-relaxed text-ink-2">
              Gets alerted if {state.patient.callName} doesn&apos;t confirm within {state.escalateAfterMin} minutes
            </span>
          </div>
        </section>
      </Tray>

      <SectionTitle
        right={
          <div className="flex rounded-full bg-[#eef1f4] p-0.5 text-[13px]" role="radiogroup" aria-label="Rotation">
            {(["weekly", "daily"] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={state.roster.mode === m}
                onClick={() => act({ type: "setRoster", order: state.roster.order, mode: m })}
                className={`rounded-full px-3 py-1 capitalize transition-colors duration-200 ${state.roster.mode === m ? "bg-paper font-semibold shadow-[0_1px_2px_rgb(30_39_48/0.08)]" : "text-ink-2"}`}
              >
                {m}
              </button>
            ))}
          </div>
        }
      >
        Next 3 weeks
      </SectionTitle>
      <ul className="rounded-[22px] bg-paper p-1.5 shadow-soft">
        {days.map((d) => {
          const m = onDuty(state, d);
          const swapped = !!state.roster.overrides[d];
          const past = d < today;
          return (
            <li key={d}>
              <button
                disabled={past}
                onClick={() => setSwapDate(d)}
                className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition-colors duration-150 ${d === today ? "bg-hearth-soft/70" : "hover:bg-ground"} ${past ? "opacity-45" : ""}`}
              >
                <span className={`w-24 text-sm ${d === today ? "font-semibold text-hearth-ink" : "text-ink-2"}`}>{relativeDay(d, today)}</span>
                <Avatar member={m} size={26} />
                <span className="flex-1">{m?.name}</span>
                {swapped && <span className="rounded-full bg-[#f1f3f6] px-2.5 py-0.5 text-xs text-ink-2">Swapped</span>}
                {!past && <CaretRightIcon size={14} className="text-ink-3" aria-label="Swap" />}
              </button>
            </li>
          );
        })}
      </ul>

      <SectionTitle
        right={
          <button onClick={() => setAdding(true)} className={btnLink}>
            <UserPlusIcon size={14} weight="bold" aria-hidden /> Invite
          </button>
        }
      >
        Family, last 30 days
      </SectionTitle>
      <ul className="rounded-[22px] bg-paper px-4 py-1 shadow-soft">
        {state.members.map((m, i) => (
          <li key={m.id} className={`flex items-center gap-3 py-3 ${i < state.members.length - 1 ? "shadow-[inset_0_-1px_0_rgb(30_39_48/0.05)]" : ""}`}>
            <Avatar member={m} size={36} />
            <div className="flex-1">
              <div className="font-medium">
                {m.name} {m.id === me.id && <span className="text-ink-3">(you)</span>}
              </div>
              <div className="text-[13px] text-ink-3">{m.relation}</div>
            </div>
            <div className="text-right text-[13px] text-ink-2">
              <div>
                <span className="text-base font-semibold tabular-nums text-ink">{shiftCounts.get(m.id) ?? 0}</span> days on duty
              </div>
              <div>{followUps.get(m.id) ?? 0} follow-ups</div>
            </div>
          </li>
        ))}
      </ul>

      <Sheet open={!!swapDate} onClose={() => setSwapDate(null)} title={swapDate ? `Who's on duty ${fmtDate(swapDate, { weekday: true })}?` : ""}>
        <div className="flex flex-col gap-2">
          {state.members.map((m) => {
            const current = !!swapDate && onDuty(state, swapDate)?.id === m.id;
            return (
              <button
                key={m.id}
                onClick={async () => {
                  await act({ type: "setRosterOverride", date: swapDate!, memberId: m.id });
                  setSwapDate(null);
                }}
                className={`${optionCls(current)} items-center`}
              >
                <Avatar member={m} size={32} /> <span className="font-semibold">{m.name}</span>
                {current && <span className="ml-auto text-[13px] text-ink-3">Current</span>}
              </button>
            );
          })}
          {swapDate && state.roster.overrides[swapDate] && (
            <button
              onClick={async () => {
                await act({ type: "setRosterOverride", date: swapDate, memberId: null });
                setSwapDate(null);
              }}
              className="mt-2 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-ink-2"
            >
              <ArrowsClockwiseIcon size={15} aria-hidden /> Undo swap (back to the usual rotation)
            </button>
          )}
        </div>
      </Sheet>

      <InviteSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { act } = useHearth();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title="Invite a family member">
      <div className="flex flex-col gap-3">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Relation" hint="(e.g. Daughter-in-law)">
          <input value={relation} onChange={(e) => setRelation(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Mobile number">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputCls} />
        </Field>
        <p className="px-1 text-[13px] text-ink-3">Prototype: they&apos;re added straight to the roster. The real app sends a WhatsApp invite link.</p>
        <button
          disabled={!name.trim()}
          className={`${btnDark} h-[54px]`}
          onClick={async () => {
            await act({ type: "addMember", member: { name: name.trim(), relation: relation.trim() || "Family", phone: phone.trim() } });
            setName("");
            setRelation("");
            setPhone("");
            onClose();
          }}
        >
          Add to family
        </button>
      </div>
    </Sheet>
  );
}
