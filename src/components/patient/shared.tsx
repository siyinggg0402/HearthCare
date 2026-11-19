"use client";

import type { Lang, Medication } from "@/lib/types";
import { t, type StrKey } from "@/lib/i18n";
import type { Slot } from "@/lib/logic";
import { dayPart } from "@/lib/time";

/** Primary language large, English underneath (only when the patient's language isn't English). */
export function Bi({ k, lang, className = "", subClassName = "" }: { k: StrKey; lang: Lang; className?: string; subClassName?: string }) {
  return (
    <span className={`flex flex-col leading-tight ${className}`}>
      <span>{t(k, lang)}</span>
      {lang !== "en" && <span className={`text-[0.55em] font-normal opacity-70 ${subClassName}`}>{t(k, "en")}</span>}
    </span>
  );
}

export const slotTitleKey = (slot: Pick<Slot, "time">): StrKey => dayPart(slot.time);

export function openMeds(slot: Slot): Medication[] {
  return slot.items.filter((i) => !i.log).map((i) => i.med);
}

export const REASON_KEYS = ["forgot", "side_effect", "ran_out", "unwell"] as const;
