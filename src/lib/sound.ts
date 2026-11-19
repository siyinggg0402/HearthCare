"use client";

// Browser audio for the elder-phone demo: notification ding, ringtone, and text-to-speech.
// Browsers only allow sound after a tap, so call `unlockAudio()` from a click handler first.

let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    void ctx.resume();
    // Warm up speech synthesis (Safari needs a speak() inside a gesture).
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis?.speak(u);
  } catch {
    /* sound is optional */
  }
}

export const audioReady = () => !!ctx && ctx.state === "running";

function tone(freq: number, start: number, dur: number, gain = 0.15) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
}

export function playDing() {
  tone(880, 0, 0.18);
  tone(1320, 0.16, 0.3);
  navigator.vibrate?.(200);
}

/** One ring cycle (~1.2s). Call on an interval while ringing. */
export function playRing() {
  for (let i = 0; i < 4; i++) {
    tone(i % 2 ? 480 : 440, i * 0.3, 0.28, 0.12);
  }
  navigator.vibrate?.([400, 200, 400]);
}

function pickVoice(lang: "en" | "zh"): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const want = lang === "zh" ? ["zh-CN", "zh_CN", "cmn", "zh"] : ["en-SG", "en-GB", "en-US", "en"];
  for (const w of want) {
    const v = voices.find((x) => x.lang.replace("_", "-").toLowerCase().startsWith(w.toLowerCase()));
    if (v) return v;
  }
  return undefined;
}

/** Speaks text slowly and clearly. Resolves when finished (or immediately if TTS is unavailable). */
export function speak(text: string, lang: "en" | "zh"): Promise<void> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "zh" ? "zh-CN" : "en-SG";
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.rate = 0.85;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}
