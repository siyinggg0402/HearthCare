"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCurrentMember, useHearth } from "@/lib/useHearth";
import { onDuty, openEscalations } from "@/lib/logic";
import { toDateStr } from "@/lib/time";
import { Avatar, Loading } from "@/components/ui";
import { DemoClock } from "@/components/DemoClock";
import { CalendarBlankIcon, HouseIcon, PillIcon, StethoscopeIcon } from "@phosphor-icons/react";
import { TodayTab } from "@/components/family/TodayTab";
import { RosterTab } from "@/components/family/RosterTab";
import { MedsTab } from "@/components/family/MedsTab";
import { VisitTab } from "@/components/family/VisitTab";

const TABS = [
  { key: "today", label: "Today", Icon: HouseIcon },
  { key: "roster", label: "Roster", Icon: CalendarBlankIcon },
  { key: "meds", label: "Medicines", Icon: PillIcon },
  { key: "visit", label: "Visit", Icon: StethoscopeIcon },
] as const;
type Tab = (typeof TABS)[number]["key"];

function FamilyInner() {
  const { state, now, error } = useHearth();
  const params = useSearchParams();
  const embed = params.has("embed");
  const [memberId, setMemberId] = useCurrentMember();
  const [tab, setTab] = useState<Tab>("today");

  // ?as=ml lets the demo page show a specific sibling's phone without changing this device's saved choice.
  const [asOverride, setAsOverride] = useState<string | null>(params.get("as"));

  if (!state) return <Loading />;
  const me = state.members.find((m) => m.id === (asOverride ?? memberId)) ?? state.members[0];
  const today = toDateStr(now);
  const duty = onDuty(state, today);
  const myAlerts = openEscalations(state, now).filter((s) => s.escalation?.assignee.id === me.id).length;

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-32">
      <header className="px-5 pb-1 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-ink-3">{embed ? "HearthCare" : <Link href="/">HearthCare</Link>}</span>
            <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.015em]">
              {state.patient.callName}&apos;s care <span className="text-base font-normal text-ink-3">{state.patient.nameZh}</span>
            </h1>
          </div>
          <label className="press relative cursor-pointer" title="Switch family member">
            <Avatar member={me} size={42} ring={duty?.id === me.id} />
            <select
              value={me.id}
              onChange={(e) => (asOverride ? setAsOverride(e.target.value) : setMemberId(e.target.value))}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label={`Viewing as ${me.name}. Switch family member`}
            >
              {state.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {duty && (
          <div className="mt-2.5 flex items-center gap-2 text-sm text-ink-2">
            {duty.id === me.id ? (
              <span className="rounded-full bg-hearth-soft px-2.5 py-1 text-[12.5px] font-semibold text-hearth-ink">You&apos;re on duty today</span>
            ) : (
              <>
                <Avatar member={duty} size={20} />
                <span>{duty.name} is on duty today</span>
              </>
            )}
          </div>
        )}
        {error && <div className="mt-3 rounded-full bg-bad-soft px-3 py-1.5 text-xs text-bad">Can&apos;t reach the server: {error}</div>}
      </header>

      <main className="px-4 pt-4">
        {tab === "today" && <TodayTab state={state} me={me} />}
        {tab === "roster" && <RosterTab state={state} me={me} />}
        {tab === "meds" && <MedsTab state={state} />}
        {tab === "visit" && <VisitTab state={state} me={me} />}
      </main>

      <nav
        aria-label="Main"
        className="fixed bottom-[max(18px,env(safe-area-inset-bottom))] left-1/2 z-20 grid h-16 w-[calc(100%-32px)] max-w-[calc(28rem-32px)] -translate-x-1/2 grid-cols-4 rounded-full bg-paper/80 p-1.5 shadow-float backdrop-blur-xl"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-full text-[11.5px] ${active ? "bg-hearth-soft font-semibold text-hearth-ink" : "text-ink-3"}`}
            >
              <t.Icon size={21} weight={active ? "bold" : "regular"} aria-hidden />
              {t.label}
              {t.key === "today" && myAlerts > 0 && (
                <span
                  aria-label={`${myAlerts} alert${myAlerts === 1 ? "" : "s"}`}
                  className="absolute right-3 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-bad px-1 text-[10.5px] font-bold text-white shadow-[0_0_0_2px_#fff]"
                >
                  {myAlerts}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {!embed && <DemoClock />}
    </div>
  );
}

export default function FamilyPage() {
  return (
    <Suspense fallback={<Loading />}>
      <FamilyInner />
    </Suspense>
  );
}
