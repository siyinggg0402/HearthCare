"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/lib/i18n";
import { MicrophoneIcon, PaperPlaneRightIcon, StopIcon } from "@phosphor-icons/react";

// Minimal typing for the browser Web Speech API (Chrome/Safari prefix it as webkit).
interface SpeechRec {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function getRecognizer(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Records a short spoken note and transcribes it in the browser (Mandarin or English).
 * Prototype: uses the free Web Speech API; production would use a server-side STT model.
 * Falls back to typing when speech isn't available.
 */
export function useVoiceNote(lang: Lang) {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => setSupported(!!getRecognizer()), []);

  const start = () => {
    const Rec = getRecognizer();
    if (!Rec) return;
    const rec = new Rec();
    rec.lang = lang === "zh" ? "zh-CN" : "en-SG";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      setText(s);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setText("");
    setListening(true);
    rec.start();
  };

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  return { listening, text, setText, supported, start, stop };
}

export function VoiceNotePanel({
  lang,
  onSend,
  onCancel,
}: {
  lang: Lang;
  onSend: (text: string, source: "voice" | "typed") => void;
  onCancel: () => void;
}) {
  const v = useVoiceNote(lang);
  const [usedVoice, setUsedVoice] = useState(false);

  return (
    <div className="enter flex flex-col gap-4">
      {v.supported && (
        <button
          onClick={() => {
            if (v.listening) v.stop();
            else {
              setUsedVoice(true);
              v.start();
            }
          }}
          className={`press flex h-40 w-full flex-col items-center justify-center gap-3 rounded-[32px] text-[23px] font-semibold transition-colors duration-200 ${
            v.listening ? "bg-bad-soft text-bad shadow-[inset_0_0_0_1.5px_rgb(179_54_43/0.25)]" : "bg-paper text-ink shadow-lift"
          }`}
        >
          <span
            aria-hidden
            className={`flex h-[72px] w-[72px] items-center justify-center rounded-full ${v.listening ? "animate-pulse bg-bad text-white" : "bg-hearth text-white"}`}
          >
            {v.listening ? <StopIcon size={32} weight="fill" /> : <MicrophoneIcon size={34} weight="bold" />}
          </span>
          {v.listening ? t("recording", lang) : t("tellFamily", lang)}
        </button>
      )}
      <label className="flex flex-col gap-2">
        <span className="px-2 text-lg font-semibold">{t("typeInstead", lang)}</span>
        <textarea
          value={v.text}
          onChange={(e) => v.setText(e.target.value)}
          rows={3}
          className="w-full rounded-[24px] bg-paper p-4 text-xl shadow-soft outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-hearth),0_0_0_4px_rgb(194_85_58/0.14)]"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onCancel} className="press h-16 rounded-full bg-[#f3f5f7] text-xl font-semibold shadow-hairline">
          {t("cancel", lang)}
        </button>
        <button
          disabled={!v.text.trim()}
          onClick={() => {
            v.stop();
            onSend(v.text.trim(), usedVoice ? "voice" : "typed");
          }}
          className="press flex h-16 items-center justify-center gap-2 rounded-full bg-hearth text-xl font-semibold text-white disabled:opacity-40"
        >
          <PaperPlaneRightIcon size={22} weight="bold" aria-hidden />
          {t("send", lang)}
        </button>
      </div>
    </div>
  );
}
