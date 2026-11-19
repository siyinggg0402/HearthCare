"use client";

import type { FamilyMember } from "@/lib/types";
import type { ItemState, SlotState } from "@/lib/logic";

export function Avatar({ member, size = 32 }: { member?: FamilyMember; size?: number }) {
  if (!member) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ background: member.color, width: size, height: size, fontSize: size * 0.42 }}
      title={member.name}
    >
      {member.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)}
    </span>
  );
}

const STATE_STYLE: Record<SlotState | ItemState, { label: string; cls: string; icon: string }> = {
  taken: { label: "Taken", cls: "bg-ok-soft text-ok", icon: "✓" },
  taken_late: { label: "Taken late", cls: "bg-warn-soft text-warn", icon: "✓" },
  skipped: { label: "Skipped", cls: "bg-bad-soft text-bad", icon: "✗" },
  upcoming: { label: "Upcoming", cls: "bg-line text-ink-2", icon: "○" },
  due: { label: "Waiting", cls: "bg-warn-soft text-warn", icon: "…" },
  overdue: { label: "No reply", cls: "bg-bad-soft text-bad", icon: "!" },
  missed: { label: "Missed", cls: "bg-bad-soft text-bad", icon: "✗" },
};

export function StatusChip({ state }: { state: SlotState | ItemState }) {
  const s = STATE_STYLE[state];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-paper p-4 ${className}`}>{children}</div>;
}

export function Loading() {
  return <div className="flex min-h-dvh items-center justify-center text-ink-3">Loading…</div>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-3">{children}</h2>
      {right}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-paper p-5 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-base outline-none focus:border-hearth";
export const btnPrimary =
  "rounded-xl bg-hearth px-4 py-2.5 font-semibold text-white active:scale-[0.98] disabled:opacity-40";
export const btnGhost = "rounded-xl border border-line bg-paper px-4 py-2.5 font-semibold text-ink active:scale-[0.98]";
