"use client";

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/types";
import { t } from "@/lib/i18n";

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
    <div className="flex flex-col gap-4">
      {v.supported && (
        <button
          onClick={() => {
            if (v.listening) v.stop();
            else {
              setUsedVoice(true);
              v.start();
            }
          }}
          className={`flex h-36 w-full flex-col items-center justify-center gap-2 rounded-3xl text-2xl font-semibold text-white ${
            v.listening ? "animate-pulse bg-bad" : "bg-hearth"
          }`}
        >
          <span className="text-5xl" aria-hidden>
            🎤
          </span>
          {v.listening ? t("recording", lang) : t("tellFamily", lang)}
        </button>
      )}
      <textarea
        value={v.text}
        onChange={(e) => v.setText(e.target.value)}
        placeholder={t("typeInstead", lang)}
        rows={3}
        className="w-full rounded-2xl border-2 border-line bg-paper p-3 text-xl outline-none focus:border-hearth"
      />
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onCancel} className="rounded-2xl border-2 border-line bg-paper py-4 text-xl font-semibold">
          {t("cancel", lang)}
        </button>
        <button
          disabled={!v.text.trim()}
          onClick={() => {
            v.stop();
            onSend(v.text.trim(), usedVoice ? "voice" : "typed");
          }}
          className="rounded-2xl bg-ok py-4 text-xl font-semibold text-white disabled:opacity-40"
        >
          {t("send", lang)}
        </button>
      </div>
    </div>
  );
}
