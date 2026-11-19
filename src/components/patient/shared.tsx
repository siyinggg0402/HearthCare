"use client";

import type { Lang, Medication } from "@/lib/types";
import { t, type StrKey } from "@/lib/i18n";
import type { Slot } from "@/lib/logic";
import { dayPart } from "@/lib/time";

/**
 * Primary language large, English underneath (only when the patient's language isn't English).
 * The English line keeps full colour and a readable size: it's there for the person who needs it.
 */
export function Bi({ k, lang, className = "", subClassName = "" }: { k: StrKey; lang: Lang; className?: string; subClassName?: string }) {
  return (
    <span className={`flex flex-col leading-tight ${className}`}>
      <span>{t(k, lang)}</span>
      {lang !== "en" && <span className={`text-[max(0.6em,15px)] font-normal ${subClassName}`}>{t(k, "en")}</span>}
    </span>
  );
}

export const slotTitleKey = (slot: Pick<Slot, "time">): StrKey => dayPart(slot.time);

export const slotShortKey = (slot: Pick<Slot, "time">): StrKey => `${dayPart(slot.time)}Short` as StrKey;

export function greetingKey(time: string): StrKey {
  const part = dayPart(time);
  return part === "morning" ? "greetMorning" : part === "afternoon" ? "greetAfternoon" : "greetEvening";
}

export function openMeds(slot: Slot): Medication[] {
  return slot.items.filter((i) => !i.log).map((i) => i.med);
}

export const REASON_KEYS = ["forgot", "side_effect", "ran_out", "unwell"] as const;
