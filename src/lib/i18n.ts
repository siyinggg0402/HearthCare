// Patient-facing strings. Prototype supports English and Mandarin Chinese.
import type { Lang } from "./types";

const STRINGS = {
  morning: { en: "Morning medicine", zh: "早上的药" },
  afternoon: { en: "Afternoon medicine", zh: "下午的药" },
  evening: { en: "Evening medicine", zh: "晚上的药" },
  night: { en: "Night medicine", zh: "睡前的药" },
  taken: { en: "Taken", zh: "吃了" },
  later: { en: "Later", zh: "等一下" },
  skipped: { en: "Didn't take", zh: "没吃" },
  whySkipped: { en: "Why didn't you take it?", zh: "为什么没吃？" },
  whichSkipped: { en: "Which one didn't you take?", zh: "哪一个没吃？" },
  all: { en: "All of them", zh: "全部" },
  back: { en: "Back", zh: "返回" },
  allDone: { en: "All done for now", zh: "现在没有药要吃" },
  wellDone: { en: "Well done!", zh: "做得好！" },
  next: { en: "Next", zh: "下一次" },
  tomorrow: { en: "tomorrow", zh: "明天" },
  tellFamily: { en: "Tell family how you feel", zh: "告诉家人你的感觉" },
  recording: { en: "Listening… tap to stop", zh: "正在听…按一下停止" },
  typeInstead: { en: "Or type here", zh: "或者在这里打字" },
  send: { en: "Send", zh: "发送" },
  sent: { en: "Sent to your family", zh: "已经告诉家人" },
  remindAgain: { en: "OK, I'll remind you again in 15 minutes", zh: "好的，15分钟后再提醒你" },
  thanks: { en: "Thank you! Your family can see it.", zh: "谢谢！家人看到了。" },
  takenQ: { en: "Taken?", zh: "吃了吗？" },
  onDutyToday: { en: "on duty today", zh: "今天负责照顾你" },
  noted: { en: "Noted. Your family will check in.", zh: "知道了，家人会联系你。" },
  cancel: { en: "Cancel", zh: "取消" },
} as const;

export type StrKey = keyof typeof STRINGS;

export function t(key: StrKey, lang: Lang): string {
  return STRINGS[key][lang];
}

export function medName(med: { name: string; nameZh?: string }, lang: Lang) {
  return lang === "zh" && med.nameZh ? med.nameZh : med.name;
}

export function medPurpose(med: { purpose?: string; purposeZh?: string }, lang: Lang) {
  return lang === "zh" ? med.purposeZh ?? med.purpose : med.purpose;
}

export function fmtTimeLang(time: string, lang: Lang): string {
  const [h, m] = time.split(":").map(Number);
  if (lang === "zh") {
    const part = h < 12 ? "早上" : h < 18 ? "下午" : "晚上";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${part}${h12}点${m ? `${m}分` : ""}`;
  }
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}
