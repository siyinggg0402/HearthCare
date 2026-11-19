"use client";

import { useEffect, useState } from "react";
import { ArrowCounterClockwiseIcon, ArrowLeftIcon, CheckIcon, ClockIcon, MicrophoneIcon, PhoneIcon, XIcon } from "@phosphor-icons/react";
import { useHearth } from "@/lib/useHearth";
import { currentSlot, nextSlot, onDuty, slotsForDate, SKIP_REASONS, type Slot } from "@/lib/logic";
import { fmtTimeLang, medName, medPurpose, t } from "@/lib/i18n";
import { fmtClock, toDateStr, toTimeStr } from "@/lib/time";
import { Avatar, PillSwatch, Tray } from "@/components/ui";
import { VoiceNotePanel } from "@/components/VoiceNote";
import { Bi, greetingKey, openMeds, REASON_KEYS, slotShortKey, slotTitleKey } from "./shared";
import type { HearthState, Lang } from "@/lib/types";

type View = { name: "home" } | { name: "reason"; slot: Slot } | { name: "which"; slot: Slot; reason: string } | { name: "voice" };
type Flash =
  | { kind: "taken"; date: string; time: string; medIds: string[] }
  | { kind: "later" }
  | { kind: "message"; text: string };

const UNDO_MS = 6000;

const card = "rounded-[28px] bg-paper shadow-lift";
const bigChoice = "press flex w-full flex-col items-center justify-center rounded-full bg-[#f3f5f7] py-5 text-[24px] font-semibold shadow-hairline";

/** Large-text patient screen: one question, one answer. */
export function PatientApp({ state }: { state: HearthState }) {
  const { now, act } = useHearth();
  const lang = state.patient.lang;
  const [view, setView] = useState<View>({ name: "home" });
  const [flash, setFlash] = useState<Flash | null>(null);

  // Undo window after "taken"; other confirmations fade after a few seconds.
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), flash.kind === "taken" ? UNDO_MS : 4000);
    return () => clearTimeout(id);
  }, [flash]);

  const slot = currentSlot(state, now);
  const next = nextSlot(state, now);
  const today = toDateStr(now);
  const duty = onDuty(state, today);
  const name = lang === "zh" ? state.patient.nameZh ?? state.patient.name : state.patient.name;

  const confirm = async (s: Slot, status: "taken" | "skipped", medIds: string[], reason?: string) => {
    await act({ type: "confirmDose", date: s.date, time: s.time, medIds, status, by: "patient", reason });
    setFlash(status === "taken" ? { kind: "taken", date: s.date, time: s.time, medIds } : { kind: "message", text: t("noted", lang) });
    setView({ name: "home" });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-[18px] px-[18px] pb-7 pt-8">
      <header className="flex items-end justify-between px-2">
        <div className="flex flex-col gap-1">
          <span className="text-[29px] font-semibold leading-tight tracking-[-0.01em]">
            {t(greetingKey(toTimeStr(now)), lang)}
            {lang === "zh" ? "，" : ", "}
            {name}
          </span>
          {lang !== "en" && <span className="text-lg text-ink-2">{t(greetingKey(toTimeStr(now)), "en")}</span>}
        </div>
        <span className="text-[28px] font-medium tabular-nums text-ink-2">{fmtClock(now)}</span>
      </header>

      {view.name === "home" && (
        <>
          <Tray>
            {flash?.kind === "taken" ? (
              <DoneCard
                lang={lang}
                next={next ? `${next.date !== today ? `${t("tomorrow", lang)} ` : ""}${fmtTimeLang(next.time, lang)}` : null}
                onUndo={async () => {
                  await act({ type: "undoDose", date: flash.date, time: flash.time, medIds: flash.medIds });
                  setFlash(null);
                }}
              />
            ) : flash?.kind === "later" ? (
              <MessageCard lang={lang} tone="wait" text={t("remindAgain", lang)} sub={lang !== "en" ? t("remindAgain", "en") : undefined} onBack={() => setFlash(null)} />
            ) : flash?.kind === "message" ? (
              <MessageCard lang={lang} tone="ok" text={flash.text} onBack={() => setFlash(null)} />
            ) : slot ? (
              <DoseCard
                slot={slot}
                lang={lang}
                onTaken={() => confirm(slot, "taken", openMeds(slot).map((m) => m.id))}
                onLater={async () => {
                  await act({ type: "snooze", date: slot.date, time: slot.time });
                  setFlash({ kind: "later" });
                }}
                onSkip={() => setView({ name: "reason", slot })}
              />
            ) : (
              <AllDoneCard state={state} lang={lang} />
            )}
          </Tray>

          {!slot && !flash && next && (
            <section className="flex flex-col items-center gap-1 py-2 text-center">
              <span className="text-[17px] text-ink-2">{lang === "zh" ? "下一次 Next" : "Next"}</span>
              <span className="text-[29px] font-bold">
                {next.date !== today && `${t("tomorrow", lang)} `}
                {fmtTimeLang(next.time, lang)}
              </span>
            </section>
          )}

          <div className="mt-auto flex flex-col gap-3">
            {duty && (
              <a
                href={`tel:${duty.phone.replace(/\s/g, "")}`}
                className="press flex items-center gap-3.5 rounded-full bg-paper/75 py-2.5 pl-3 pr-2.5 shadow-[inset_0_0_0_1px_rgb(30_39_48/0.05),0_10px_30px_-18px_rgb(30_39_48/0.18)]"
              >
                <Avatar member={duty} size={52} ring />
                <span className="flex flex-1 flex-col leading-snug">
                  <span className="text-[21px] font-semibold">{duty.name}</span>
                  <span className="text-base text-ink-2">
                    {t("onDutyToday", lang)}
                    {lang !== "en" && ` · ${t("onDutyToday", "en")}`}
                  </span>
                </span>
                <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-ok-soft text-ok" aria-label={`${t("callFamily", "en")} ${duty.name}`}>
                  <PhoneIcon size={26} weight="bold" aria-hidden />
                </span>
              </a>
            )}
            <button
              onClick={() => setView({ name: "voice" })}
              className="press flex h-[72px] items-center justify-center gap-3 rounded-full shadow-[inset_0_0_0_1.5px_rgb(30_39_48/0.10)]"
            >
              <MicrophoneIcon size={26} weight="bold" aria-hidden />
              <Bi k="tellMyFamily" lang={lang} className="items-start text-[23px] font-semibold" subClassName="text-ink-2" />
            </button>
          </div>
        </>
      )}

      {view.name === "reason" && (
        <section className="enter flex flex-col gap-3">
          <Bi k="whySkipped" lang={lang} className="mb-2 px-2 text-[30px] font-bold" subClassName="text-ink-2" />
          {REASON_KEYS.map((r) => (
            <button
              key={r}
              onClick={() => {
                const meds = openMeds(view.slot);
                if (meds.length > 1) setView({ name: "which", slot: view.slot, reason: r });
                else confirm(view.slot, "skipped", meds.map((m) => m.id), r);
              }}
              className={bigChoice}
            >
              {SKIP_REASONS[r][lang]}
              {lang !== "en" && <span className="text-base font-normal text-ink-2">{SKIP_REASONS[r].en}</span>}
            </button>
          ))}
          <BackButton lang={lang} onClick={() => setView({ name: "home" })} />
        </section>
      )}

      {view.name === "which" && (
        <section className="enter flex flex-col gap-3">
          <Bi k="whichSkipped" lang={lang} className="mb-2 px-2 text-[30px] font-bold" subClassName="text-ink-2" />
          <button onClick={() => confirm(view.slot, "skipped", openMeds(view.slot).map((m) => m.id), view.reason)} className={bigChoice}>
            {t("all", lang)}
            {lang !== "en" && <span className="text-base font-normal text-ink-2">{t("all", "en")}</span>}
          </button>
          {openMeds(view.slot).map((m) => (
            <button key={m.id} onClick={() => confirm(view.slot, "skipped", [m.id], view.reason)} className={`${bigChoice} !flex-row gap-3 !justify-start px-4`}>
              <PillSwatch med={m} size={48} />
              <span className="flex flex-col items-start">
                {medName(m, lang)}
                <span className="text-base font-normal text-ink-2">{medPurpose(m, lang)}</span>
              </span>
            </button>
          ))}
          <BackButton lang={lang} onClick={() => setView({ name: "reason", slot: view.slot })} />
        </section>
      )}

      {view.name === "voice" && (
        <VoiceNotePanel
          lang={lang}
          onCancel={() => setView({ name: "home" })}
          onSend={async (text, source) => {
            await act({ type: "addNote", text, source, by: "patient" });
            setFlash({ kind: "message", text: t("sent", lang) });
            setView({ name: "home" });
          }}
        />
      )}
    </div>
  );
}

function DoseCard({ slot, lang, onTaken, onLater, onSkip }: { slot: Slot; lang: Lang; onTaken: () => void; onLater: () => void; onSkip: () => void }) {
  const meds = openMeds(slot);
  return (
    <section className={`${card} flex flex-col gap-[22px] px-5 pb-5 pt-[26px]`}>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[36px] font-bold leading-tight tracking-[-0.015em]">{t(slotTitleKey(slot), lang)}</h1>
        <span className="text-[19px] text-ink-2">
          {lang !== "en" && `${t(slotTitleKey(slot), "en")}, `}
          {fmtTimeLang(slot.time, "en")}
        </span>
      </div>

      <ul className="flex flex-col gap-4">
        {meds.map((m) => (
          <li key={m.id} className="flex items-center gap-3.5">
            <PillSwatch med={m} />
            <span className="flex flex-col gap-0.5">
              <span className="text-[25px] font-semibold leading-tight">
                {medName(m, lang)} <span className="text-[17px] font-normal text-ink-2">{m.dose}</span>
              </span>
              <span className="text-[17px] text-ink-2">
                {lang === "zh" ? `${m.name}, ${medPurpose(m, "zh") ?? ""} ${m.purpose?.toLowerCase() ?? ""}` : m.purpose}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <button
          onClick={onTaken}
          className="press flex h-[84px] items-center gap-4 rounded-full bg-hearth pl-3 pr-7 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_12px_24px_-12px_rgb(194_85_58/0.55)]"
        >
          <span aria-hidden className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white/[0.18]">
            <CheckIcon size={30} weight="bold" />
          </span>
          <Bi k={meds.length > 1 ? "tookThem" : "tookIt"} lang={lang} className="items-start text-[30px] font-bold" subClassName="!font-medium" />
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onLater} className="press flex h-[72px] items-center justify-center gap-2.5 rounded-full bg-[#f3f5f7] shadow-hairline">
            <ClockIcon size={24} weight="bold" aria-hidden />
            <Bi k="later" lang={lang} className="items-start text-[23px] font-semibold" subClassName="text-ink-2" />
          </button>
          <button onClick={onSkip} className="press flex h-[72px] items-center justify-center gap-2.5 rounded-full bg-[#f3f5f7] shadow-hairline">
            <XIcon size={24} weight="bold" aria-hidden />
            <Bi k="skipped" lang={lang} className="items-start text-[23px] font-semibold" subClassName="text-ink-2" />
          </button>
        </div>
      </div>
    </section>
  );
}

function DoneCard({ lang, next, onUndo }: { lang: Lang; next: string | null; onUndo: () => void }) {
  return (
    <section className={`${card} enter flex flex-col items-center gap-3 px-6 pb-[26px] pt-10 text-center`}>
      <span aria-hidden className="flex h-[116px] w-[116px] items-center justify-center rounded-full bg-ok-soft text-ok shadow-[0_0_0_10px_rgb(235_246_239/0.5)]">
        <svg className="draw" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <Bi k="doneThanks" lang={lang} className="mt-2 text-[34px] font-bold" subClassName="text-ink-2" />
      {next && (
        <span className="text-lg text-ink-2">
          {t("next", lang)}: {next}
        </span>
      )}
      <button onClick={onUndo} className="press mt-3.5 flex h-[60px] items-center gap-3 rounded-full bg-[#f3f5f7] pl-2.5 pr-6 text-[19px] font-semibold shadow-hairline">
        <span aria-hidden className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-paper shadow-[0_1px_2px_rgb(30_39_48/0.08)]">
          <ArrowCounterClockwiseIcon size={22} weight="bold" />
        </span>
        {t("undo", lang)}
        {lang !== "en" && " Undo"}
      </button>
    </section>
  );
}

function MessageCard({ lang, tone, text, sub, onBack }: { lang: Lang; tone: "ok" | "wait"; text: string; sub?: string; onBack: () => void }) {
  const Icon = tone === "ok" ? CheckIcon : ClockIcon;
  return (
    <section className={`${card} enter flex flex-col items-center gap-3 px-6 pb-7 pt-9 text-center`}>
      <span aria-hidden className={`flex h-[92px] w-[92px] items-center justify-center rounded-full ${tone === "ok" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
        <Icon size={42} weight="bold" />
      </span>
      <span className="text-[30px] font-bold leading-snug">{text}</span>
      {sub && <span className="text-lg text-ink-2">{sub}</span>}
      <button onClick={onBack} className="press mt-2.5 h-16 rounded-full bg-[#f3f5f7] px-8 text-[21px] font-semibold shadow-hairline">
        {t("back", lang)}
        {lang !== "en" && " Back"}
      </button>
    </section>
  );
}

function AllDoneCard({ state, lang }: { state: HearthState; lang: Lang }) {
  const { now } = useHearth();
  const slots = slotsForDate(state, toDateStr(now), now);
  const allTaken = slots.length > 0 && slots.every((s) => s.scheduled <= now);
  return (
    <section className={`${card} flex flex-col items-center gap-2.5 px-[22px] pb-[22px] pt-11 text-center`}>
      <span aria-hidden className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-ok-soft text-ok shadow-[0_0_0_12px_rgb(235_246_239/0.5)]">
        <CheckIcon size={58} weight="bold" />
      </span>
      <Bi k={allTaken ? "dayDone" : "allDone"} lang={lang} className="mt-[18px] text-[34px] font-bold tracking-[-0.01em]" subClassName="text-ink-2" />
      {slots.length > 0 && (
        <div className="mt-[18px] flex w-full flex-col gap-2">
          {slots.map((s) => {
            const log = s.items.find((i) => i.log)?.log;
            return (
              <div key={s.time} className="flex items-center justify-between rounded-[20px] bg-ground px-[18px] py-3.5">
                <Bi k={slotShortKey(s)} lang={lang} className="items-start text-[21px] font-semibold" subClassName="text-ink-2" />
                {s.state === "taken" && log ? (
                  <span className="flex items-center gap-2 text-lg font-semibold text-ok">
                    <CheckIcon size={20} weight="bold" aria-hidden />
                    {fmtClock(new Date(log.at))}
                  </span>
                ) : s.state === "skipped" ? (
                  <span className="text-lg font-semibold text-ink-2">{t("skipped", lang)}</span>
                ) : (
                  <span className="text-lg text-ink-2">{fmtTimeLang(s.time, lang)}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BackButton({ lang, onClick }: { lang: Lang; onClick: () => void }) {
  return (
    <button onClick={onClick} className="press mt-2 flex items-center justify-center gap-2 py-3 text-xl text-ink-2">
      <ArrowLeftIcon size={22} aria-hidden /> {t("back", lang)}
    </button>
  );
}
