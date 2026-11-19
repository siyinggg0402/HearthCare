"use client";

import { useEffect, useRef, useState } from "react";
import { useHearth } from "@/lib/useHearth";
import { currentSlot, nextSlot, reminderPlan, SKIP_REASONS, type Slot } from "@/lib/logic";
import { fmtTimeLang, medName, t } from "@/lib/i18n";
import { dayPart, pad, toDateStr } from "@/lib/time";
import { playDing, playRing, speak, stopSpeaking, unlockAudio } from "@/lib/sound";
import { PatientWhatsApp } from "./PatientWhatsApp";
import { openMeds, REASON_KEYS, slotTitleKey } from "./shared";
import type { HearthState, Lang } from "@/lib/types";

type CallPhase = "menu" | "reason" | "ending";

const ZH_DAYS = "日一二三四五六";
const EN_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function longDate(d: Date, lang: Lang) {
  return lang === "zh"
    ? `${d.getMonth() + 1}月${d.getDate()}日 星期${ZH_DAYS[d.getDay()]}`
    : `${EN_DAYS[d.getDay()]}, ${d.getDate()} ${EN_MONTHS[d.getMonth()]}`;
}

function callScript(state: HearthState, slot: Slot) {
  const lang = state.patient.lang;
  const meds = openMeds(slot);
  const part = dayPart(slot.time);
  if (lang === "zh") {
    const greet = { morning: "早上好", afternoon: "下午好", evening: "晚上好", night: "晚上好" }[part];
    return `${state.patient.nameZh ?? state.patient.name}，${greet}！现在是吃药时间。${t(slotTitleKey(slot), "zh")}：${meds
      .map((m) => medName(m, "zh"))
      .join("和")}。吃了，请按1。等一下，请按2。没吃，请按3。`;
  }
  return `Hello ${state.patient.name}. It's time for your ${part} medicine: ${meds
    .map((m) => m.name)
    .join(" and ")}. Press 1 if you have taken it. Press 2 to be reminded later. Press 3 if you are not taking it.`;
}

const REASON_PROMPT = {
  zh: "为什么没吃？忘了，请按1。副作用，请按2。药吃完了，请按3。不舒服，请按4。",
  en: "Why are you not taking it? Forgot, press 1. Side effect, press 2. Ran out, press 3. Feeling unwell, press 4.",
};

/**
 * A simulated phone for the elderly patient: home screen, WhatsApp notification pop-ups,
 * and an incoming voice-call reminder that reads the medicine aloud (text-to-speech).
 */
export function ElderPhone({ state, askSound = true }: { state: HearthState; askSound?: boolean }) {
  const { now, act } = useHearth();
  const lang = state.patient.lang;
  const [soundOn, setSoundOn] = useState(false);
  const [screen, setScreen] = useState<"home" | "whatsapp">("home");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [notifReason, setNotifReason] = useState(false);
  const [call, setCall] = useState<{ slot: Slot; phase: CallPhase; caption: string; started: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const dinged = useRef<Set<string>>(new Set());

  const slot = currentSlot(state, now);
  const plan = slot ? reminderPlan(state, slot, now) : null;
  const waKey = slot && plan?.waAt && plan.waAt <= now ? `${slot.date}|${slot.time}|${plan.waAt.getTime()}` : null;
  const showNotif = !!waKey && !dismissed.has(waKey) && screen === "home" && !call && !plan?.ringing;
  const ringing = !!plan?.ringing && !call;

  // Ding once per new WhatsApp reminder.
  useEffect(() => {
    if (waKey && !dinged.current.has(waKey)) {
      dinged.current.add(waKey);
      if (soundOn) playDing();
    }
  }, [waKey, soundOn]);

  // Ringtone while the call is ringing.
  useEffect(() => {
    if (!ringing || !soundOn) return;
    playRing();
    const id = setInterval(playRing, 2500);
    return () => clearInterval(id);
  }, [ringing, soundOn]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  // ----- Actions -----
  const confirmSlot = (s: Slot, status: "taken" | "skipped", reason?: string) =>
    act({ type: "confirmDose", date: s.date, time: s.time, medIds: openMeds(s).map((m) => m.id), status, by: "patient", reason });

  const say = async (text: string) => {
    setCall((c) => (c ? { ...c, caption: text } : c));
    if (soundOn) await speak(text, lang);
    else await new Promise((r) => setTimeout(r, 2500));
  };

  const acceptCall = async () => {
    if (!slot) return;
    act({ type: "logCall", date: slot.date, time: slot.time, result: "answered" });
    const script = callScript(state, slot);
    setCall({ slot, phase: "menu", caption: script, started: Date.now() });
    if (soundOn) speak(script, lang);
  };

  const endCall = async (text: string, toastText: string) => {
    setCall((c) => (c ? { ...c, phase: "ending" } : c));
    await say(text);
    setCall(null);
    setToast(toastText);
  };

  const pressKey = async (key: number) => {
    if (!call) return;
    stopSpeaking();
    if (call.phase === "menu") {
      if (key === 1) {
        await confirmSlot(call.slot, "taken");
        return endCall(`${t("thanks", lang)}${lang === "zh" ? "再见！" : " Goodbye!"}`, t("thanks", lang));
      }
      if (key === 2) {
        await act({ type: "snooze", date: call.slot.date, time: call.slot.time });
        return endCall(t("remindAgain", lang), t("remindAgain", lang));
      }
      if (key === 3) {
        setCall({ ...call, phase: "reason", caption: REASON_PROMPT[lang] });
        if (soundOn) speak(REASON_PROMPT[lang], lang);
      }
    } else if (call.phase === "reason") {
      const reason = REASON_KEYS[key - 1];
      if (!reason) return;
      await confirmSlot(call.slot, "skipped", reason);
      return endCall(t("noted", lang), t("noted", lang));
    }
  };

  const hangUp = () => {
    stopSpeaking();
    setCall(null);
  };

  // ----- Render -----
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#1c1512] text-white select-none">
      {screen === "whatsapp" && !call && !ringing ? (
        <div className="h-full text-ink">
          <PatientWhatsApp state={state} fill onBack={() => setScreen("home")} />
        </div>
      ) : (
        <HomeScreen
          state={state}
          now={now}
          lang={lang}
          openSlot={slot}
          onOpenWhatsApp={() => {
            if (waKey) setDismissed((d) => new Set(d).add(waKey));
            setScreen("whatsapp");
          }}
        />
      )}

      {/* WhatsApp notification pop-up */}
      {showNotif && slot && (
        <div className="absolute inset-x-2 top-9 z-20 animate-[drop_0.35s_ease-out] rounded-3xl bg-white/95 p-3 text-ink shadow-2xl backdrop-blur">
          <button
            className="flex w-full items-start gap-3 text-left"
            onClick={() => {
              setDismissed((d) => new Set(d).add(waKey!));
              setScreen("whatsapp");
            }}
          >
            <WaIcon size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between text-xs text-ink-3">
                <span className="font-semibold uppercase tracking-wide">WhatsApp</span>
                <span>{lang === "zh" ? "现在" : "now"}</span>
              </div>
              <div className="text-lg font-semibold leading-tight">HearthCare ✓</div>
              <div className="text-lg leading-snug">
                {t(slotTitleKey(slot), lang)}：{openMeds(slot).map((m) => medName(m, lang)).join(" + ")}。{t("takenQ", lang)}
              </div>
              {lang !== "en" && (
                <div className="text-xs italic text-ink-3">
                  {t(slotTitleKey(slot), "en")}: {openMeds(slot).map((m) => m.name).join(" + ")}. Taken?
                </div>
              )}
            </div>
          </button>
          {!notifReason ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={async () => {
                  await confirmSlot(slot, "taken");
                  setToast(t("thanks", lang));
                }}
                className="rounded-2xl bg-ok py-3 text-lg font-bold text-white"
              >
                ✓ {t("taken", lang)}
              </button>
              <button
                onClick={async () => {
                  await act({ type: "snooze", date: slot.date, time: slot.time });
                  setToast(t("remindAgain", lang));
                }}
                className="rounded-2xl bg-warn-soft py-3 text-lg font-bold text-warn"
              >
                ⏰ {t("later", lang)}
              </button>
              <button onClick={() => setNotifReason(true)} className="rounded-2xl bg-bad-soft py-3 text-lg font-bold text-bad">
                ✗ {t("skipped", lang)}
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <div className="mb-2 text-base font-semibold">{t("whySkipped", lang)}</div>
              <div className="grid grid-cols-2 gap-2">
                {REASON_KEYS.map((r) => (
                  <button
                    key={r}
                    onClick={async () => {
                      setNotifReason(false);
                      await confirmSlot(slot, "skipped", r);
                      setToast(t("noted", lang));
                    }}
                    className="rounded-2xl bg-cream py-3 text-lg font-semibold"
                  >
                    {SKIP_REASONS[r][lang]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Incoming voice call */}
      {ringing && slot && (
        <div className="absolute inset-0 z-30 flex flex-col items-center bg-gradient-to-b from-[#3b2a20] to-[#120d0a] px-6 pb-14 pt-20">
          <div className="text-lg opacity-80">{lang === "zh" ? "语音来电…" : "Incoming voice call…"}</div>
          <div className="relative mt-10 flex h-36 w-36 items-center justify-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-hearth/40" />
            <span className="relative flex h-32 w-32 items-center justify-center rounded-full bg-hearth text-6xl">🔥</span>
          </div>
          <div className="mt-8 text-3xl font-bold">HearthCare</div>
          <div className="mt-1 text-2xl opacity-90">{lang === "zh" ? "吃药提醒" : "Medicine reminder"}</div>
          {lang !== "en" && <div className="text-sm opacity-60">Medicine reminder</div>}
          <div className="mt-auto flex w-full justify-between px-4">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => act({ type: "logCall", date: slot.date, time: slot.time, result: "declined" })}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-bad text-4xl"
                aria-label="Decline"
              >
                <span className="rotate-[135deg]">📞</span>
              </button>
              <span className="text-lg">{lang === "zh" ? "拒绝" : "Decline"}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={acceptCall}
                className="flex h-20 w-20 animate-bounce items-center justify-center rounded-full bg-ok text-4xl"
                aria-label="Answer"
              >
                📞
              </button>
              <span className="text-lg">{lang === "zh" ? "接听" : "Answer"}</span>
            </div>
          </div>
        </div>
      )}

      {/* In-call screen */}
      {call && (
        <InCall
          call={call}
          lang={lang}
          onKey={pressKey}
          onRepeat={() => {
            const text = call.phase === "reason" ? REASON_PROMPT[lang] : callScript(state, call.slot);
            setCall({ ...call, caption: text });
            if (soundOn) speak(text, lang);
          }}
          onHangUp={hangUp}
        />
      )}

      {toast && !call && (
        <div className="absolute inset-x-4 bottom-10 z-20 rounded-2xl bg-ok px-4 py-4 text-center text-xl font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Sound unlock (browsers block audio until the first tap) */}
      {askSound && !soundOn && (
        <button
          onClick={() => {
            unlockAudio();
            setSoundOn(true);
          }}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/70 text-center backdrop-blur-sm"
        >
          <span className="text-6xl">🔊</span>
          <span className="text-2xl font-bold">{lang === "zh" ? "点一下开启声音" : "Tap to turn on sound"}</span>
          {lang !== "en" && <span className="text-base opacity-70">Tap to turn on sound</span>}
        </button>
      )}

      <style>{`@keyframes drop { from { transform: translateY(-120%); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
    </div>
  );
}

function HomeScreen({
  state,
  now,
  lang,
  openSlot,
  onOpenWhatsApp,
}: {
  state: HearthState;
  now: Date;
  lang: Lang;
  openSlot?: Slot;
  onOpenWhatsApp: () => void;
}) {
  const next = nextSlot(state, now);
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-[#7c2d12] via-[#9a3412] to-[#431407] px-5 pb-8 pt-3">
      <div className="flex justify-between text-sm font-semibold">
        <span>
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </span>
        <span>📶 🔋</span>
      </div>
      <div className="mt-14 text-center">
        <div className="text-7xl font-light tabular-nums">
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </div>
        <div className="mt-1 text-xl opacity-90">{longDate(now, lang)}</div>
      </div>

      {/* HearthCare widget */}
      <button onClick={onOpenWhatsApp} className="mt-10 rounded-3xl bg-white/15 p-4 text-left backdrop-blur">
        <div className="text-sm font-semibold uppercase tracking-wide opacity-80">🔥 HearthCare</div>
        {openSlot ? (
          <div className="mt-1 text-2xl font-bold">
            💊 {lang === "zh" ? "现在要吃药" : "Medicine time now"}
            <div className="text-lg font-normal opacity-90">{openSlot.items.filter((i) => !i.log).map((i) => medName(i.med, lang)).join(" + ")}</div>
          </div>
        ) : (
          <div className="mt-1 text-2xl font-bold">
            ✓ {t("allDone", lang)}
            {next && (
              <div className="text-lg font-normal opacity-90">
                {t("next", lang)}: {next.date !== toDateStr(now) && `${t("tomorrow", lang)} `}
                {fmtTimeLang(next.time, lang)}
              </div>
            )}
          </div>
        )}
      </button>

      <div className="mt-auto grid grid-cols-4 gap-4 text-center text-sm">
        <AppIcon label="WhatsApp" onClick={onOpenWhatsApp} badge={openSlot ? 1 : 0}>
          <WaIcon size={60} />
        </AppIcon>
        <AppIcon label={lang === "zh" ? "电话" : "Phone"}>
          <span className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-ok text-3xl">📞</span>
        </AppIcon>
        <AppIcon label={lang === "zh" ? "相册" : "Photos"}>
          <span className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-white text-3xl">🌸</span>
        </AppIcon>
        <AppIcon label={lang === "zh" ? "家人" : "Family"}>
          <span className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl bg-sky-500 text-3xl">👨‍👩‍👧</span>
        </AppIcon>
      </div>
    </div>
  );
}

function AppIcon({ label, children, onClick, badge = 0 }: { label: string; children: React.ReactNode; onClick?: () => void; badge?: number }) {
  return (
    <button onClick={onClick} className="relative flex flex-col items-center gap-1">
      {children}
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-bad text-sm font-bold">{badge}</span>
      )}
      <span className="drop-shadow">{label}</span>
    </button>
  );
}

function WaIcon({ size }: { size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-2xl bg-[#25d366] text-white"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      💬
    </span>
  );
}

function InCall({
  call,
  lang,
  onKey,
  onRepeat,
  onHangUp,
}: {
  call: { phase: CallPhase; caption: string; started: number };
  lang: Lang;
  onKey: (k: number) => void;
  onRepeat: () => void;
  onHangUp: () => void;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const secs = Math.floor((Date.now() - call.started) / 1000);

  const menu: { k: number; label: string; cls: string }[] =
    call.phase === "reason"
      ? REASON_KEYS.map((r, i) => ({ k: i + 1, label: SKIP_REASONS[r][lang], cls: "bg-white/15" }))
      : [
          { k: 1, label: `${t("taken", lang)}`, cls: "bg-ok" },
          { k: 2, label: `${t("later", lang)}`, cls: "bg-warn" },
          { k: 3, label: `${t("skipped", lang)}`, cls: "bg-bad" },
        ];

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gradient-to-b from-[#2a1d16] to-[#0f0b09] px-5 pb-8 pt-12">
      <div className="text-center">
        <div className="text-2xl font-bold">HearthCare</div>
        <div className="tabular-nums opacity-70">
          {pad(Math.floor(secs / 60))}:{pad(secs % 60)}
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-white/10 p-4">
        <div className="mb-1 text-xs uppercase tracking-wide opacity-60">🔊 {lang === "zh" ? "正在说" : "Speaking"}</div>
        <div className="text-xl leading-relaxed">{call.caption}</div>
      </div>

      {call.phase !== "ending" && (
        <div className="mt-5 flex flex-col gap-3">
          {menu.map((m) => (
            <button key={m.k} onClick={() => onKey(m.k)} className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 text-2xl font-bold ${m.cls}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-2xl">{m.k}</span>
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-end justify-between px-6">
        <button onClick={onRepeat} className="flex flex-col items-center gap-1 text-sm opacity-80">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-2xl">🔁</span>
          {lang === "zh" ? "再听一次" : "Repeat"}
        </button>
        <button onClick={onHangUp} className="flex flex-col items-center gap-1 text-sm" aria-label="Hang up">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-bad text-3xl">
            <span className="rotate-[135deg]">📞</span>
          </span>
          {lang === "zh" ? "挂断" : "Hang up"}
        </button>
      </div>
    </div>
  );
}
