"use client";

import { useEffect, useState } from "react";
import { useHearth } from "@/lib/useHearth";
import { currentSlot, nextSlot, onDuty, SKIP_REASONS, type Slot } from "@/lib/logic";
import { fmtTimeLang, medName, medPurpose, t } from "@/lib/i18n";
import { toDateStr, fmtClock } from "@/lib/time";
import { Avatar } from "@/components/ui";
import { VoiceNotePanel } from "@/components/VoiceNote";
import { Bi, openMeds, REASON_KEYS, slotTitleKey } from "./shared";
import type { HearthState } from "@/lib/types";

type View = { name: "home" } | { name: "reason"; slot: Slot } | { name: "which"; slot: Slot; reason: string } | { name: "voice" };

/** Large-text patient screen: one card, three buttons. */
export function PatientApp({ state }: { state: HearthState }) {
  const { now, act } = useHearth();
  const lang = state.patient.lang;
  const [view, setView] = useState<View>({ name: "home" });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const slot = currentSlot(state, now);
  const next = nextSlot(state, now);
  const duty = onDuty(state, toDateStr(now));
  const name = lang === "zh" ? state.patient.nameZh ?? state.patient.name : state.patient.name;

  const confirm = async (s: Slot, status: "taken" | "skipped", medIds: string[], reason?: string) => {
    await act({ type: "confirmDose", date: s.date, time: s.time, medIds, status, by: "patient", reason });
    setToast(status === "taken" ? t("thanks", lang) : t("noted", lang));
    setView({ name: "home" });
  };

  const bigBtn = "flex w-full items-center justify-center gap-3 rounded-3xl py-5 text-3xl font-bold active:scale-[0.98]";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-4 pb-8 pt-6">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-lg text-ink-2">{lang === "zh" ? "你好" : "Hello"},</div>
          <div className="text-3xl font-bold">{name}</div>
        </div>
        <div className="text-right text-3xl font-semibold tabular-nums text-ink-2">{fmtClock(now)}</div>
      </header>

      {toast && <div className="rounded-2xl bg-ok-soft p-4 text-center text-2xl font-semibold text-ok">{toast}</div>}

      {view.name === "home" && (
        <>
          {slot ? (
            <section className="rounded-3xl border-2 border-hearth/30 bg-paper p-5 shadow-sm">
              <Bi k={slotTitleKey(slot)} lang={lang} className="text-3xl font-bold text-hearth" />
              <div className="mt-1 text-xl text-ink-2">{fmtTimeLang(slot.time, lang)}</div>
              <ul className="my-5 flex flex-col gap-3">
                {openMeds(slot).map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <span className="text-3xl" aria-hidden>
                      💊
                    </span>
                    <div>
                      <div className="text-2xl font-semibold">
                        {medName(m, lang)} <span className="text-lg font-normal text-ink-2">{m.dose}</span>
                      </div>
                      <div className="text-base text-ink-3">
                        {medPurpose(m, lang)}
                        {lang === "zh" && ` · ${m.name}`}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3">
                <button onClick={() => confirm(slot, "taken", openMeds(slot).map((m) => m.id))} className={`${bigBtn} bg-ok text-white`}>
                  ✓ <Bi k="taken" lang={lang} />
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      await act({ type: "snooze", date: slot.date, time: slot.time });
                      setToast(t("remindAgain", lang));
                    }}
                    className={`${bigBtn} bg-warn-soft text-2xl text-warn`}
                  >
                    ⏰ <Bi k="later" lang={lang} />
                  </button>
                  <button onClick={() => setView({ name: "reason", slot })} className={`${bigBtn} bg-bad-soft text-2xl text-bad`}>
                    ✗ <Bi k="skipped" lang={lang} />
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-3xl bg-ok-soft p-6 text-center">
              <div className="text-6xl" aria-hidden>
                ✓
              </div>
              <Bi k="allDone" lang={lang} className="mt-2 text-3xl font-bold text-ok" />
              {next && (
                <div className="mt-4 text-xl text-ink-2">
                  {t("next", lang)}: {next.date !== toDateStr(now) && `${t("tomorrow", lang)} `}
                  {fmtTimeLang(next.time, lang)}
                </div>
              )}
            </section>
          )}

          <button
            onClick={() => setView({ name: "voice" })}
            className="flex items-center justify-center gap-3 rounded-3xl border-2 border-line bg-paper py-5 text-2xl font-semibold"
          >
            🎤 <Bi k="tellFamily" lang={lang} />
          </button>

          {duty && (
            <a href={`tel:${duty.phone.replace(/\s/g, "")}`} className="mt-auto flex items-center gap-3 rounded-2xl bg-paper p-4">
              <Avatar member={duty} size={48} />
              <div className="text-lg">
                <div className="font-semibold">
                  {duty.name} 📞
                </div>
                <div className="text-ink-2">{t("onDutyToday", lang)}</div>
              </div>
            </a>
          )}
        </>
      )}

      {view.name === "reason" && (
        <section className="flex flex-col gap-3">
          <Bi k="whySkipped" lang={lang} className="mb-2 text-3xl font-bold" />
          {REASON_KEYS.map((r) => (
            <button
              key={r}
              onClick={() => {
                const meds = openMeds(view.slot);
                if (meds.length > 1) setView({ name: "which", slot: view.slot, reason: r });
                else confirm(view.slot, "skipped", meds.map((m) => m.id), r);
              }}
              className="rounded-3xl border-2 border-line bg-paper py-5 text-2xl font-semibold"
            >
              {SKIP_REASONS[r][lang]}
              {lang === "zh" && <span className="ml-2 text-base font-normal text-ink-3">{SKIP_REASONS[r].en}</span>}
            </button>
          ))}
          <button onClick={() => setView({ name: "home" })} className="mt-2 py-3 text-xl text-ink-2">
            ← {t("back", lang)}
          </button>
        </section>
      )}

      {view.name === "which" && (
        <section className="flex flex-col gap-3">
          <Bi k="whichSkipped" lang={lang} className="mb-2 text-3xl font-bold" />
          <button
            onClick={() => confirm(view.slot, "skipped", openMeds(view.slot).map((m) => m.id), view.reason)}
            className="rounded-3xl border-2 border-line bg-paper py-5 text-2xl font-semibold"
          >
            {t("all", lang)}
          </button>
          {openMeds(view.slot).map((m) => (
            <button
              key={m.id}
              onClick={() => confirm(view.slot, "skipped", [m.id], view.reason)}
              className="rounded-3xl border-2 border-line bg-paper py-5 text-2xl font-semibold"
            >
              💊 {medName(m, lang)} <span className="text-base font-normal text-ink-3">{medPurpose(m, lang)}</span>
            </button>
          ))}
          <button onClick={() => setView({ name: "reason", slot: view.slot })} className="mt-2 py-3 text-xl text-ink-2">
            ← {t("back", lang)}
          </button>
        </section>
      )}

      {view.name === "voice" && (
        <VoiceNotePanel
          lang={lang}
          onCancel={() => setView({ name: "home" })}
          onSend={async (text, source) => {
            await act({ type: "addNote", text, source, by: "patient" });
            setToast(t("sent", lang));
            setView({ name: "home" });
          }}
        />
      )}
    </div>
  );
}
