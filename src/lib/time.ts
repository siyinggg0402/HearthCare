// Small local-time helpers. Everything runs in the device's local timezone (SGT for the pilot).

export const pad = (n: number) => String(n).padStart(2, "0");

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeStr(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function at(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function addDays(date: string, n: number): string {
  const d = at(date, "12:00");
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60_000);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((at(b, "12:00").getTime() - at(a, "12:00").getTime()) / 86_400_000);
}

export function dayOfWeek(date: string): number {
  return at(date, "12:00").getDay(); // 0 = Sunday
}

export function isWeekend(date: string): boolean {
  const d = dayOfWeek(date);
  return d === 0 || d === 6;
}

export function mondayOf(date: string): string {
  const dow = dayOfWeek(date);
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

export function fmtTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${pad(m)}${suffix}`;
}

export function fmtClock(d: Date): string {
  return fmtTime(toTimeStr(d));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function fmtDate(date: string, opts: { weekday?: boolean } = {}): string {
  const d = at(date, "12:00");
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return opts.weekday ? `${DAYS[d.getDay()]} ${base}` : base;
}

export function fmtDateYear(date: string): string {
  const d = at(date, "12:00");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function relativeDay(date: string, today: string): string {
  const diff = daysBetween(date, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff === -1) return "Tomorrow";
  return fmtDate(date, { weekday: true });
}

export function dayPart(time: string): "morning" | "afternoon" | "evening" | "night" {
  const h = Number(time.split(":")[0]);
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}
