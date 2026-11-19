"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCurrentMember, useHearth } from "@/lib/useHearth";
import { onDuty, openEscalations } from "@/lib/logic";
import { toDateStr } from "@/lib/time";
import { Avatar, Loading } from "@/components/ui";
import { DemoClock } from "@/components/DemoClock";
import { TodayTab } from "@/components/family/TodayTab";
import { RosterTab } from "@/components/family/RosterTab";
import { MedsTab } from "@/components/family/MedsTab";
import { VisitTab } from "@/components/family/VisitTab";

const TABS = [
  { key: "today", label: "Today", icon: "🏠" },
  { key: "roster", label: "Roster", icon: "🗓" },
  { key: "meds", label: "Medicines", icon: "💊" },
  { key: "visit", label: "Doctor visit", icon: "🩺" },
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
    <div className="mx-auto min-h-dvh max-w-md pb-24">
      <header className="sticky top-0 z-20 border-b border-line bg-cream/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-ink-3">{embed ? "HearthCare" : <Link href="/">HearthCare</Link>} · Family</div>
            <div className="text-xl font-bold">
              {state.patient.callName}&apos;s care <span className="text-base font-normal text-ink-2">{state.patient.nameZh}</span>
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-2 text-sm">
            <Avatar member={me} size={28} />
            <select value={me.id} onChange={(e) => (asOverride ? setAsOverride(e.target.value) : setMemberId(e.target.value))} className="bg-transparent font-medium outline-none" aria-label="Viewing as">
              {state.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {duty && (
          <div className="mt-2 flex items-center gap-2 text-sm text-ink-2">
            <Avatar member={duty} size={20} />
            {duty.id === me.id ? <b className="text-hearth">You&apos;re on duty today</b> : <span>{duty.name} is on duty today</span>}
          </div>
        )}
        {error && <div className="mt-2 rounded-lg bg-bad-soft px-2 py-1 text-xs text-bad">Can&apos;t reach server: {error}</div>}
      </header>

      <main className="px-4 pt-2">
        {tab === "today" && <TodayTab state={state} me={me} />}
        {tab === "roster" && <RosterTab state={state} me={me} />}
        {tab === "meds" && <MedsTab state={state} />}
        {tab === "visit" && <VisitTab state={state} me={me} />}
      </main>

      <nav className="fixed bottom-0 left-1/2 z-20 grid w-full max-w-md -translate-x-1/2 grid-cols-4 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`relative flex flex-col items-center gap-0.5 py-2 text-xs ${tab === t.key ? "font-semibold text-hearth" : "text-ink-3"}`}>
            <span className="text-lg" aria-hidden>
              {t.icon}
            </span>
            {t.label}
            {t.key === "today" && myAlerts > 0 && (
              <span className="absolute right-[30%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">
                {myAlerts}
              </span>
            )}
          </button>
        ))}
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
