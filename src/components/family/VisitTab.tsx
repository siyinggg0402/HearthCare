"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, PencilSimpleIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useHearth } from "@/lib/useHearth";
import { computeStats, pct, whoName } from "@/lib/logic";
import { addDays, daysBetween, fmtDate, fmtTime, toDateStr } from "@/lib/time";
import type { FamilyMember, HearthState } from "@/lib/types";
import { Avatar, btnDark, btnLink, Card, Field, inputCls, SectionTitle, Sheet, Tray } from "@/components/ui";

export function VisitTab({ state, me }: { state: HearthState; me: FamilyMember }) {
  const { now, act } = useHearth();
  const today = toDateStr(now);
  const appt = state.appointment;
  const [q, setQ] = useState("");
  const [editAppt, setEditAppt] = useState(false);
  const stats = computeStats(state, addDays(today, -41), today, now);
  const inDays = appt ? daysBetween(today, appt.date) : -1;

  return (
    <div>
      <Card className="flex items-center gap-3.5">
        {appt ? (
          <>
            <div className="flex w-14 flex-col items-center rounded-[16px] bg-hearth-soft py-2 text-hearth-ink">
              <span className="text-xs font-semibold">{fmtDate(appt.date).split(" ")[1]}</span>
              <span className="text-2xl font-semibold leading-none">{fmtDate(appt.date).split(" ")[0]}</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold">{appt.doctor}</div>
              <div className="text-sm text-ink-2">
                {appt.clinic}. {fmtDate(appt.date, { weekday: true })}, {fmtTime(appt.time)}
                {inDays >= 0 && `, in ${inDays} day${inDays === 1 ? "" : "s"}`}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 text-sm text-ink-3">No appointment set.</div>
        )}
        <button onClick={() => setEditAppt(true)} className="press flex h-10 w-10 items-center justify-center rounded-full bg-[#f3f5f7] text-ink-2" aria-label="Edit appointment">
          <PencilSimpleIcon size={18} aria-hidden />
        </button>
      </Card>

      <SectionTitle>Doctor summary</SectionTitle>
      <Tray>
        <section className="flex flex-col gap-4 rounded-[25px] bg-paper p-[18px] shadow-lift">
          <p className="text-sm text-ink-2">One page for the doctor, covering the last 6 weeks.</p>
          <div className="grid grid-cols-3 gap-1.5 rounded-[18px] bg-ground p-1.5">
            {[
              [pct(stats.rate), "confirmed"],
              [String(stats.skipped + stats.missed), "doses missed"],
              [String(state.questions.length), "questions"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-[14px] bg-paper py-2.5 text-center shadow-[0_1px_2px_rgb(30_39_48/0.04)]">
                <div className="text-2xl font-semibold tabular-nums tracking-[-0.02em]">{n}</div>
                <div className="text-xs text-ink-3">{l}</div>
              </div>
            ))}
          </div>
          <Link href="/summary" className={`${btnDark} h-[56px] !justify-between !pl-6 !pr-1.5`}>
            Open doctor summary
            <span aria-hidden className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white/[0.12]">
              <ArrowRightIcon size={18} />
            </span>
          </Link>
        </section>
      </Tray>

      <SectionTitle>Questions for the doctor</SectionTitle>
      <div className="rounded-[22px] bg-paper shadow-soft">
        <ul className="px-4">
          {state.questions.map((x) => {
            const by = state.members.find((m) => m.id === x.by);
            return (
              <li key={x.id} className="flex items-start gap-3 py-3 shadow-[inset_0_-1px_0_rgb(30_39_48/0.05)]">
                <Avatar member={by} size={26} />
                <div className="flex-1 text-sm leading-relaxed">
                  {x.text}
                  <div className="text-[13px] text-ink-3">{whoName(state, x.by)}</div>
                </div>
                <button onClick={() => act({ type: "deleteQuestion", id: x.id })} className="press -mr-1 p-1.5 text-ink-3" aria-label="Remove question">
                  <XIcon size={16} aria-hidden />
                </button>
              </li>
            );
          })}
          {state.questions.length === 0 && <li className="py-3.5 text-sm text-ink-3">No questions yet. Add anything you want to ask at the visit.</li>}
        </ul>
        <form
          className="flex gap-2 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!q.trim()) return;
            await act({ type: "addQuestion", text: q.trim(), by: me.id });
            setQ("");
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="New question for the doctor" placeholder="Add a question" className={inputCls} />
          <button disabled={!q.trim()} className={`${btnLink} !px-4 disabled:opacity-40`} aria-label="Add question">
            <PlusIcon size={14} weight="bold" aria-hidden /> Add
          </button>
        </form>
      </div>

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
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Time">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Doctor">
          <input value={doctor} onChange={(e) => setDoctor(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Clinic">
          <input value={clinic} onChange={(e) => setClinic(e.target.value)} className={inputCls} />
        </Field>
        <button
          disabled={!date}
          className={`${btnDark} mt-1 h-[54px]`}
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
