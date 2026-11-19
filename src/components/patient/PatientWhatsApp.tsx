"use client";

import { useEffect, useRef, useState } from "react";
import { useHearth } from "@/lib/useHearth";
import { slotsForDate, SKIP_REASONS, whoName, type Slot } from "@/lib/logic";
import { medName, t, type StrKey } from "@/lib/i18n";
import { addMinutes, toDateStr, toTimeStr } from "@/lib/time";
import { useVoiceNote } from "@/components/VoiceNote";
import { openMeds, REASON_KEYS, slotTitleKey } from "./shared";
import type { HearthState, Lang } from "@/lib/types";

interface Msg {
  id: string;
  at: Date;
  from: "bot" | "me";
  text: string;
  sub?: string; // English line under a Chinese message
  voice?: boolean;
  buttons?: { label: string; onClick: () => void }[];
}

/**
 * Simulated WhatsApp chat. The real product would send these through the WhatsApp Business API;
 * the conversation is derived entirely from the shared state, so it stays in sync with the family app.
 */
export function PatientWhatsApp({ state, onBack, fill = false }: { state: HearthState; onBack?: () => void; fill?: boolean }) {
  const { now, act } = useHearth();
  const lang = state.patient.lang;
  const [flow, setFlow] = useState<{ step: "reason"; slot: Slot } | { step: "which"; slot: Slot; reason: string } | null>(null);
  const [draft, setDraft] = useState("");
  const voice = useVoiceNote(lang);
  const bottomRef = useRef<HTMLDivElement>(null);

  const L = (k: StrKey) => ({ text: t(k, lang), sub: lang !== "en" ? t(k, "en") : undefined });
  const today = toDateStr(now);
  const slots = slotsForDate(state, today, now).filter((s) => s.scheduled <= now);
  const msgs: Msg[] = [];

  const confirm = (s: Slot, status: "taken" | "skipped", medIds: string[], reason?: string) => {
    setFlow(null);
    act({ type: "confirmDose", date: s.date, time: s.time, medIds, status, by: "patient", reason });
  };

  const latestOpen = [...slots].reverse().find((s) => s.items.some((i) => !i.log));

  for (const s of slots) {
    const medsList = (meds: typeof s.items) => meds.map((i) => medName(i.med, lang)).join(" + ");
    const isActive = s === latestOpen && !flow;
    const reminder = (at: Date, id: string, withButtons: boolean): Msg => ({
      id,
      at,
      from: "bot",
      text: `${t(slotTitleKey(s), lang)}：${medsList(s.items)}。${t("takenQ", lang)}`,
      sub: lang !== "en" ? `${t(slotTitleKey(s), "en")}: ${s.items.map((i) => i.med.name).join(" + ")}. Taken?` : undefined,
      buttons: withButtons
        ? [
            { label: `✓ ${t("taken", lang)}`, onClick: () => confirm(s, "taken", openMeds(s).map((m) => m.id)) },
            { label: `⏰ ${t("later", lang)}`, onClick: () => act({ type: "snooze", date: s.date, time: s.time }) },
            { label: `✗ ${t("skipped", lang)}`, onClick: () => setFlow({ step: "reason", slot: s }) },
          ]
        : undefined,
    });

    const snoozes = state.snoozes.filter((z) => z.date === s.date && z.time === s.time);
    const lastRemindAt = snoozes.length ? addMinutes(new Date(snoozes.at(-1)!.at), 15) : s.scheduled;
    const remindedAgain = snoozes.length > 0 && lastRemindAt <= now;

    msgs.push(reminder(s.scheduled, `r-${s.time}`, isActive && !remindedAgain));
    snoozes.forEach((z, i) => {
      const zAt = new Date(z.at);
      msgs.push({ id: `z-${s.time}-${i}`, at: zAt, from: "me", text: `⏰ ${t("later", lang)}` });
      msgs.push({ id: `zr-${s.time}-${i}`, at: zAt, from: "bot", ...L("remindAgain") });
    });
    if (remindedAgain) msgs.push(reminder(lastRemindAt, `rr-${s.time}`, isActive));

    // Replies (grouped by time + status + who)
    const groups = new Map<string, typeof s.items>();
    for (const it of s.items.filter((i) => i.log)) {
      const k = `${it.log!.at}|${it.log!.status}|${it.log!.by}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(it);
    }
    for (const [k, items] of groups) {
      const log = items[0].log!;
      const logAt = new Date(log.at);
      if (log.by === "patient") {
        if (log.status === "taken") {
          msgs.push({ id: `a-${k}`, at: logAt, from: "me", text: `✓ ${t("taken", lang)}` });
          msgs.push({ id: `ab-${k}`, at: logAt, from: "bot", ...L("thanks") });
        } else {
          const reason = log.reason && SKIP_REASONS[log.reason] ? SKIP_REASONS[log.reason][lang] : log.reason;
          msgs.push({ id: `a-${k}`, at: logAt, from: "me", text: `✗ ${t("skipped", lang)}：${medsList(items)}${reason ? `（${reason}）` : ""}` });
          msgs.push({ id: `ab-${k}`, at: logAt, from: "bot", ...L("noted") });
        }
      } else {
        const who = whoName(state, log.by);
        msgs.push({
          id: `f-${k}`,
          at: logAt,
          from: "bot",
          text: lang === "zh" ? `${who} 已记录：${log.status === "taken" ? "已经吃了" : "没吃"} ✓` : `${who} logged: ${log.status === "taken" ? "taken" : "not taken"} ✓`,
          sub: lang === "zh" ? `${who} logged: ${log.status === "taken" ? "taken" : "not taken"}` : undefined,
        });
      }
    }

    if (s.escalation || s.items.some((i) => i.log?.late)) {
      const who = s.escalation?.assignee.name ?? whoName(state, s.items.find((i) => i.log?.late)?.log?.by ?? "");
      if (s.deadline <= now) {
        msgs.push({
          id: `e-${s.time}`,
          at: s.deadline,
          from: "bot",
          text: lang === "zh" ? `还没收到回复，我们已经通知 ${who} 联系你。` : `No reply yet, so we've let ${who} know to check on you.`,
          sub: lang === "zh" ? `No reply yet, so we've let ${who} know to check on you.` : undefined,
        });
      }
    }
  }

  // Patient's own notes today
  for (const n of state.notes.filter((n) => n.by === "patient" && toDateStr(new Date(n.at)) === today && new Date(n.at) <= now)) {
    msgs.push({ id: `n-${n.id}`, at: new Date(n.at), from: "me", text: n.text, voice: n.source === "voice" });
    msgs.push({ id: `nb-${n.id}`, at: new Date(n.at), from: "bot", ...L("sent") });
  }

  msgs.sort((a, b) => a.at.getTime() - b.at.getTime());

  // Ephemeral skip flow
  if (flow?.step === "reason") {
    msgs.push({
      id: "flow-reason",
      at: now,
      from: "bot",
      ...L("whySkipped"),
      buttons: [
        ...REASON_KEYS.map((r) => ({
          label: SKIP_REASONS[r][lang],
          onClick: () => {
            const meds = openMeds(flow.slot);
            if (meds.length > 1) setFlow({ step: "which", slot: flow.slot, reason: r });
            else confirm(flow.slot, "skipped", meds.map((m) => m.id), r);
          },
        })),
        { label: t("cancel", lang), onClick: () => setFlow(null) },
      ],
    });
  }
  if (flow?.step === "which") {
    msgs.push({
      id: "flow-which",
      at: now,
      from: "bot",
      ...L("whichSkipped"),
      buttons: [
        { label: t("all", lang), onClick: () => confirm(flow.slot, "skipped", openMeds(flow.slot).map((m) => m.id), flow.reason) },
        ...openMeds(flow.slot).map((m) => ({ label: medName(m, lang), onClick: () => confirm(flow.slot, "skipped", [m.id], flow.reason) })),
      ],
    });
  }

  const count = msgs.length;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [count]);

  useEffect(() => {
    if (voice.listening) setDraft(voice.text);
  }, [voice.text, voice.listening]);

  const send = (source: "voice" | "typed") => {
    if (!draft.trim()) return;
    act({ type: "addNote", text: draft.trim(), source, by: "patient" });
    setDraft("");
    voice.setText("");
  };

  return (
    <div className={`mx-auto flex ${fill ? "h-full" : "h-dvh"} max-w-md flex-col bg-wa-bg`}>
      <header className="flex items-center gap-3 bg-wa-green px-4 py-3 text-white">
        {onBack && (
          <button onClick={onBack} className="-ml-2 px-1 text-3xl leading-none" aria-label="Back">
            ‹
          </button>
        )}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">🔥</div>
        <div>
          <div className="font-semibold">HearthCare ✓</div>
          <div className="text-xs opacity-80">{lang === "zh" ? "企业账号" : "Business account"}</div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mx-auto mb-3 w-fit rounded-lg bg-white/80 px-3 py-1 text-xs text-ink-2">{lang === "zh" ? "今天" : "Today"}</div>
        {msgs.length === 0 && (
          <div className="mx-auto mt-10 max-w-[80%] rounded-lg bg-white/70 p-3 text-center text-sm text-ink-2">
            {lang === "zh" ? "今天还没有提醒" : "No reminders yet today"}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {msgs.map((m) => (
            <Bubble key={m.id} m={m} lang={lang} />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 bg-wa-bg px-2 pb-3 pt-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send("typed")}
          placeholder={lang === "zh" ? "告诉家人你的感觉…" : "Tell your family how you feel…"}
          className="flex-1 rounded-full bg-white px-4 py-3 text-base outline-none"
        />
        {draft.trim() && !voice.listening ? (
          <button onClick={() => send(voice.text ? "voice" : "typed")} className="h-12 w-12 rounded-full bg-wa-green text-white" aria-label="Send">
            ➤
          </button>
        ) : (
          <button
            onClick={() => (voice.listening ? voice.stop() : voice.start())}
            disabled={!voice.supported}
            className={`h-12 w-12 rounded-full text-white disabled:opacity-40 ${voice.listening ? "animate-pulse bg-bad" : "bg-wa-green"}`}
            aria-label={voice.listening ? "Stop recording" : "Record voice note"}
            title={voice.supported ? "" : "Voice not supported in this browser, type instead"}
          >
            🎤
          </button>
        )}
      </div>
    </div>
  );
}

function Bubble({ m, lang }: { m: Msg; lang: Lang }) {
  const mine = m.from === "me";
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div className={`max-w-[85%] rounded-xl px-3 py-2 shadow-sm ${mine ? "rounded-tr-sm bg-wa-out" : "rounded-tl-sm bg-white"}`}>
        {m.voice && <div className="mb-1 text-xs text-ink-3">🎤 {lang === "zh" ? "语音（已转文字）" : "Voice note (transcribed)"}</div>}
        <div className="text-[17px] leading-snug">{m.text}</div>
        {m.sub && <div className="mt-0.5 text-xs italic text-ink-3">{m.sub}</div>}
        <div className="mt-0.5 text-right text-[10px] text-ink-3">{toTimeStr(m.at)}</div>
      </div>
      {m.buttons && (
        <div className="mt-1 flex w-[85%] flex-wrap gap-1.5">
          {m.buttons.map((b) => (
            <button
              key={b.label}
              onClick={b.onClick}
              className="min-w-[28%] flex-1 whitespace-nowrap rounded-xl bg-white px-2 py-2.5 text-[17px] font-semibold text-wa-green shadow-sm active:bg-wa-out"
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
