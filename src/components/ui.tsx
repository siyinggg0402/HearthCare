"use client";

import { Drawer } from "vaul";
import { CheckIcon, ClockIcon, WarningCircleIcon, XIcon, type Icon } from "@phosphor-icons/react";
import type { FamilyMember, Medication } from "@/lib/types";
import type { ItemState, SlotState } from "@/lib/logic";

export function Avatar({ member, size = 32, ring = false }: { member?: FamilyMember; size?: number; ring?: boolean }) {
  if (!member) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        background: member.color,
        width: size,
        height: size,
        fontSize: size * 0.4,
        boxShadow: ring ? "0 0 0 3px #fff, 0 0 0 4.5px rgb(194 85 58 / 0.6)" : undefined,
      }}
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

const STATE_STYLE: Record<SlotState | ItemState, { label: string; cls: string; Icon: Icon }> = {
  taken: { label: "Taken", cls: "bg-ok-soft text-ok", Icon: CheckIcon },
  taken_late: { label: "Taken late", cls: "bg-warn-soft text-warn-ink", Icon: CheckIcon },
  skipped: { label: "Skipped", cls: "bg-[#f1f3f6] text-ink-2", Icon: XIcon },
  upcoming: { label: "Upcoming", cls: "bg-[#f1f3f6] text-ink-2", Icon: ClockIcon },
  due: { label: "Waiting", cls: "bg-warn-soft text-warn-ink", Icon: ClockIcon },
  overdue: { label: "No reply", cls: "bg-bad-soft text-bad", Icon: WarningCircleIcon },
  missed: { label: "Missed", cls: "bg-bad-soft text-bad", Icon: XIcon },
};

export function StatusChip({ state, label }: { state: SlotState | ItemState; label?: string }) {
  const s = STATE_STYLE[state];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${s.cls}`}>
      <s.Icon size={13} weight="bold" aria-hidden />
      {label ?? s.label}
    </span>
  );
}

/** Soft white surface. Elevation comes from a faint diffused shadow, never a grey border. */
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[22px] bg-paper p-4 shadow-soft ${className}`}>{children}</div>;
}

/** Double-bezel: an outer tray holding an inner card, for the one thing on screen that matters most. */
export function Tray({ children, tone = "neutral", className = "" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "bad"; className?: string }) {
  const tray = { neutral: "bg-tray shadow-[inset_0_0_0_1px_rgb(30_39_48/0.04)]", ok: "bg-ok/[0.06]", bad: "bg-bad/[0.06]" }[tone];
  return <div className={`rounded-[30px] p-[5px] ${tray} ${className}`}>{children}</div>;
}

/** Skeleton shaped like a typical screen: header, hero card, list. */
export function Loading() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-7" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-7 w-40 rounded-full" />
      <div className="skeleton h-4 w-56 rounded-full" />
      <div className="skeleton mt-2 h-28 rounded-[26px]" />
      <div className="skeleton h-16 rounded-[22px]" />
      <div className="skeleton h-16 rounded-[22px]" />
    </div>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2.5 mt-7 flex items-center justify-between px-1">
      <h2 className="text-base font-semibold">{children}</h2>
      {right}
    </div>
  );
}

/** Bottom sheet with drag-to-dismiss (vaul). */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[3px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-2 bottom-2 z-50 mx-auto max-h-[88dvh] max-w-md overflow-y-auto rounded-[32px] bg-paper px-5 pb-6 pt-2.5 shadow-[0_-4px_40px_-8px_rgb(30_39_48/0.18)] outline-none"
        >
          <Drawer.Handle className="!mx-auto !mb-4 !h-[5px] !w-[38px] !bg-[#e1e5e9]" />
          <Drawer.Title className="mb-4 px-0.5 text-[21px] font-semibold tracking-[-0.01em]">{title}</Drawer.Title>
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/** A labelled field: label above, input below. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="px-1 text-[13.5px] font-semibold">
        {label} {hint && <span className="font-normal text-ink-3">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Small drawing of the pill so the patient can recognise it by sight. */
export function PillSwatch({ med, size = 56 }: { med: Medication; size?: number }) {
  const a = med.appearance ?? { color: "#ffffff", shape: "round" as const };
  const shape = {
    round: { w: size * 0.4, h: size * 0.4, r: 999 },
    oval: { w: size * 0.58, h: size * 0.28, r: 999 },
    capsule: { w: size * 0.62, h: size * 0.26, r: 999 },
  }[a.shape];
  return (
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded-[18px] bg-[#f3f5f7]" style={{ width: size, height: size }}>
      <span
        style={{
          width: shape.w,
          height: shape.h,
          borderRadius: shape.r,
          background:
            a.shape === "capsule" && a.color2 ? `linear-gradient(90deg, ${a.color} 50%, ${a.color2} 50%)` : a.color,
          boxShadow: "0 0 0 1px rgb(30 39 48 / 0.14), 0 2px 4px rgb(30 39 48 / 0.06)",
        }}
      />
    </span>
  );
}

export const inputCls =
  "w-full rounded-full bg-ground px-4 py-3 text-[15px] text-ink shadow-hairline outline-none placeholder:text-ink-3 focus:shadow-[inset_0_0_0_1.5px_var(--color-hearth),0_0_0_4px_rgb(194_85_58/0.14)]";
export const textareaCls =
  "w-full rounded-[20px] bg-ground px-4 py-3 text-[15px] text-ink shadow-hairline outline-none placeholder:text-ink-3 focus:shadow-[inset_0_0_0_1.5px_var(--color-hearth),0_0_0_4px_rgb(194_85_58/0.14)]";
export const btnPrimary =
  "press inline-flex items-center justify-center gap-2 rounded-full bg-hearth px-5 py-3 font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_12px_24px_-12px_rgb(194_85_58/0.55)] disabled:opacity-40 disabled:shadow-none";
export const btnDark =
  "press inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-white shadow-[0_14px_28px_-14px_rgb(30_39_48/0.5)] disabled:opacity-40";
export const btnGhost =
  "press inline-flex items-center justify-center gap-2 rounded-full bg-[#f3f5f7] px-5 py-3 font-semibold text-ink shadow-hairline";
export const btnLink = "press inline-flex items-center gap-1 rounded-full bg-hearth-soft px-3 py-1.5 text-[13px] font-semibold text-hearth-ink";
/** Radio/option tile: soft grey, brand tint when selected. */
export const optionCls = (selected: boolean) =>
  `flex cursor-pointer items-start gap-3 rounded-[20px] px-4 py-3.5 text-left transition-[background-color,box-shadow] duration-200 ${
    selected ? "bg-hearth-soft shadow-[inset_0_0_0_1.5px_rgb(194_85_58/0.55)]" : "bg-ground"
  }`;
