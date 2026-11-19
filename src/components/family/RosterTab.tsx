"use client";

import { useState } from "react";
import { useHearth } from "@/lib/useHearth";
import { onDuty } from "@/lib/logic";
import { addDays, fmtDate, mondayOf, relativeDay, toDateStr } from "@/lib/time";
import type { FamilyMember, HearthState } from "@/lib/types";
import { Avatar, btnPrimary, Card, inputCls, SectionTitle, Sheet } from "@/components/ui";

export function RosterTab({ state, me }: { state: HearthState; me: FamilyMember }) {
  const { now, act } = useHearth();
  const today = toDateStr(now);
  const start = mondayOf(today);
  const days = Array.from({ length: 21 }, (_, i) => addDays(start, i));
  const [swapDate, setSwapDate] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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
      <Card className="flex items-center gap-3">
        <Avatar member={onDuty(state, today)} size={44} />
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-3">On duty today</div>
          <div className="text-lg font-semibold">
            {onDuty(state, today)?.name}
            {onDuty(state, today)?.id === me.id && " (you)"}
          </div>
          <div className="text-sm text-ink-2">Gets alerted if {state.patient.callName} doesn&apos;t confirm within {state.escalateAfterMin} min</div>
        </div>
      </Card>

      <SectionTitle
        right={
          <div className="flex rounded-lg border border-line text-xs">
            {(["weekly", "daily"] as const).map((m) => (
              <button
                key={m}
                onClick={() => act({ type: "setRoster", order: state.roster.order, mode: m })}
                className={`px-2.5 py-1 capitalize ${state.roster.mode === m ? "bg-ink text-white" : ""} ${m === "weekly" ? "rounded-l-lg" : "rounded-r-lg"}`}
              >
                {m}
              </button>
            ))}
          </div>
        }
      >
        Next 3 weeks
      </SectionTitle>
      <Card className="!p-0">
        <ul className="divide-y divide-line">
          {days.map((d) => {
            const m = onDuty(state, d);
            const swapped = !!state.roster.overrides[d];
            const past = d < today;
            return (
              <li key={d}>
                <button
                  disabled={past}
                  onClick={() => setSwapDate(d)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left ${d === today ? "bg-hearth-soft" : ""} ${past ? "opacity-40" : ""}`}
                >
                  <span className="w-24 text-sm text-ink-2">{relativeDay(d, today)}</span>
                  <Avatar member={m} size={26} />
                  <span className="flex-1 font-medium">{m?.name}</span>
                  {swapped && <span className="rounded-full bg-cream px-2 py-0.5 text-xs text-ink-2">swapped</span>}
                  {!past && <span className="text-xs text-ink-3">Swap ›</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <SectionTitle right={<button onClick={() => setAdding(true)} className="text-sm font-semibold text-hearth">+ Invite</button>}>
        Family · last 30 days
      </SectionTitle>
      <Card className="!p-0">
        <ul className="divide-y divide-line">
          {state.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar member={m} size={34} />
              <div className="flex-1">
                <div className="font-medium">
                  {m.name} {m.id === me.id && <span className="text-ink-3">(you)</span>}
                </div>
                <div className="text-xs text-ink-3">{m.relation}</div>
              </div>
              <div className="text-right text-xs text-ink-2">
                <div>
                  <b className="text-base text-ink">{shiftCounts.get(m.id) ?? 0}</b> days on duty
                </div>
                <div>{followUps.get(m.id) ?? 0} follow-ups</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Sheet open={!!swapDate} onClose={() => setSwapDate(null)} title={swapDate ? `Who's on duty ${fmtDate(swapDate, { weekday: true })}?` : ""}>
        <div className="flex flex-col gap-2">
          {state.members.map((m) => (
            <button
              key={m.id}
              onClick={async () => {
                await act({ type: "setRosterOverride", date: swapDate!, memberId: m.id });
                setSwapDate(null);
              }}
              className="flex items-center gap-3 rounded-xl border border-line p-3 text-left"
            >
              <Avatar member={m} size={30} /> <span className="font-medium">{m.name}</span>
              {swapDate && onDuty(state, swapDate)?.id === m.id && <span className="ml-auto text-xs text-ink-3">current</span>}
            </button>
          ))}
          {swapDate && state.roster.overrides[swapDate] && (
            <button
              onClick={async () => {
                await act({ type: "setRosterOverride", date: swapDate, memberId: null });
                setSwapDate(null);
              }}
              className="mt-1 text-sm text-ink-2"
            >
              Undo swap (back to the usual rotation)
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
      <div className="flex flex-col gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={inputCls} />
        <input value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="Relation (e.g. Daughter-in-law)" className={inputCls} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" inputMode="tel" className={inputCls} />
        <p className="text-xs text-ink-3">Prototype: they&apos;re added straight to the roster. The real app sends a WhatsApp invite link.</p>
        <button
          disabled={!name.trim()}
          className={btnPrimary}
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
