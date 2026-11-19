"use client";

import { useState } from "react";
import Link from "next/link";
import { useHearth } from "@/lib/useHearth";
import { computeStats, pct, whoName } from "@/lib/logic";
import { addDays, daysBetween, fmtDate, fmtTime, toDateStr } from "@/lib/time";
import type { FamilyMember, HearthState } from "@/lib/types";
import { Avatar, btnPrimary, Card, inputCls, SectionTitle, Sheet } from "@/components/ui";

export function VisitTab({ state, me }: { state: HearthState; me: FamilyMember }) {
  const { now, act } = useHearth();
  const today = toDateStr(now);
  const appt = state.appointment;
  const [q, setQ] = useState("");
  const [editAppt, setEditAppt] = useState(false);
  const stats = computeStats(state, addDays(today, -41), today, now);

  return (
    <div>
      <SectionTitle right={<button onClick={() => setEditAppt(true)} className="text-sm font-semibold text-hearth">Edit</button>}>
        Next appointment
      </SectionTitle>
      <Card>
        {appt ? (
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-hearth-soft px-3 py-2 text-center text-hearth">
              <div className="text-xs font-semibold uppercase">{fmtDate(appt.date).split(" ")[1]}</div>
              <div className="text-2xl font-bold leading-none">{fmtDate(appt.date).split(" ")[0]}</div>
            </div>
            <div>
              <div className="font-semibold">
                {appt.doctor} · {appt.clinic}
              </div>
              <div className="text-sm text-ink-2">
                {fmtDate(appt.date, { weekday: true })}, {fmtTime(appt.time)}
                {daysBetween(today, appt.date) >= 0 && ` · in ${daysBetween(today, appt.date)} day${daysBetween(today, appt.date) === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-ink-3">No appointment set.</div>
        )}
      </Card>

      <SectionTitle>Doctor summary</SectionTitle>
      <Card>
        <div className="mb-3 text-sm text-ink-2">One page for the doctor, covering the last 6 weeks.</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold">{pct(stats.rate)}</div>
            <div className="text-xs text-ink-3">adherence</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.skipped + stats.missed}</div>
            <div className="text-xs text-ink-3">doses missed</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{state.questions.length}</div>
            <div className="text-xs text-ink-3">questions</div>
          </div>
        </div>
        <Link href="/summary" className={`${btnPrimary} mt-4 block text-center`}>
          Open doctor summary
        </Link>
      </Card>

      <SectionTitle>Questions for the doctor</SectionTitle>
      <Card className="!p-0">
        <ul className="divide-y divide-line">
          {state.questions.map((x) => {
            const by = state.members.find((m) => m.id === x.by);
            return (
              <li key={x.id} className="flex items-start gap-3 px-3 py-3">
                <Avatar member={by} size={26} />
                <div className="flex-1 text-sm">
                  {x.text}
                  <div className="text-xs text-ink-3">{whoName(state, x.by)}</div>
                </div>
                <button onClick={() => act({ type: "deleteQuestion", id: x.id })} className="text-ink-3" aria-label="Remove question">
                  ✕
                </button>
              </li>
            );
          })}
          {state.questions.length === 0 && <li className="px-3 py-3 text-sm text-ink-3">No questions yet.</li>}
        </ul>
        <form
          className="flex gap-2 border-t border-line p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!q.trim()) return;
            await act({ type: "addQuestion", text: q.trim(), by: me.id });
            setQ("");
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a question…" className={inputCls} />
          <button disabled={!q.trim()} className={btnPrimary}>
            Add
          </button>
        </form>
      </Card>

      <ApptSheet open={editAppt} onClose={() => setEditAppt(false)} state={state} />
    </div>
  );
}

function ApptSheet({ open, onClose, state }: { open: boolean; onClose: () => void; state: HearthState }) {
  const { act } = useHearth();
  const a = state.appointment;
  const [date, setDate] = useState(a?.date ?? "");
  const [time, setTime] = useState(a?.time ?? "10:00");
  const [clinic, setClinic] = useState(a?.clinic ?? "");
  const [doctor, setDoctor] = useState(a?.doctor ?? "");
  return (
    <Sheet open={open} onClose={onClose} title="Appointment">
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
        </div>
        <input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="Doctor" className={inputCls} />
        <input value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="Clinic" className={inputCls} />
        <button
          disabled={!date}
          className={btnPrimary}
          onClick={async () => {
            await act({ type: "setAppointment", appointment: { date, time, clinic, doctor } });
            onClose();
          }}
        >
          Save
        </button>
      </div>
    </Sheet>
  );
}
