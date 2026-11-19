// Demo data: Mdm Tan and her three children, with ~6 weeks of realistic history.
// Deterministic (seeded PRNG) so the demo looks the same every reset.

import type { DoseLog, EscalationLog, HearthState, Note, Reading } from "./types";
import { escalationChain } from "./logic";
import { addDays, addMinutes, at, isWeekend, mondayOf, toDateStr } from "./time";

export const uid = () => Math.random().toString(36).slice(2, 10);

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HISTORY_DAYS = 42;

export function buildSeed(now = new Date()): HearthState {
  const rand = mulberry32(20261119);
  const today = toDateStr(now);
  const start = addDays(today, -HISTORY_DAYS);

  const state: HearthState = {
    version: 1,
    patient: { name: "Tan Ah Lian", nameZh: "陈亚莲", callName: "Ma", age: 78, lang: "zh", phone: "+65 9123 4567", reminderChannel: "whatsapp_voice" },
    meds: [
      {
        id: "metformin",
        name: "Metformin",
        nameZh: "二甲双胍",
        dose: "500mg",
        purpose: "Diabetes",
        purposeZh: "糖尿病",
        times: ["08:00", "20:00"],
        stock: { count: 120, asOf: start },
        active: true,
        appearance: { shape: "oval", color: "#ffffff" },
      },
      {
        id: "amlodipine",
        name: "Amlodipine",
        nameZh: "氨氯地平",
        dose: "5mg",
        purpose: "Blood pressure",
        purposeZh: "血压",
        times: ["08:00"],
        stock: { count: 47, asOf: start },
        active: true,
        appearance: { shape: "round", color: "#f6e1b8" },
      },
      {
        id: "atorvastatin",
        name: "Atorvastatin",
        nameZh: "阿托伐他汀",
        dose: "20mg",
        purpose: "Cholesterol",
        purposeZh: "胆固醇",
        times: ["20:00"],
        stock: { count: 90, asOf: start },
        active: true,
        appearance: { shape: "capsule", color: "#f4d4cc", color2: "#ffffff" },
      },
    ],
    members: [
      { id: "wm", name: "Wei Ming", relation: "Son", phone: "+65 9000 0001", color: "#5a7397" },
      { id: "ml", name: "Mei Ling", relation: "Daughter", phone: "+65 9000 0002", color: "#3e7c76" },
      { id: "jh", name: "Jun Hao", relation: "Son", phone: "+65 9000 0003", color: "#7a6ba8" },
    ],
    roster: { order: ["wm", "ml", "jh"], mode: "weekly", anchor: mondayOf(today), overrides: {} },
    doseLogs: [],
    snoozes: [],
    escalations: [],
    calls: [],
    notes: [],
    readings: [],
    questions: [],
    appointment: { date: addDays(today, 3), time: "10:30", clinic: "Sunrise Family Clinic", doctor: "Dr Lim" },
    clock: { mode: "sim", now: at(today, "07:55").toISOString() },
    escalateAfterMin: 45,
    callAfterMin: 15,
    handoffAfterMin: 20,
  };

  const logs: DoseLog[] = [];
  const escs: EscalationLog[] = [];
  const iso = (date: string, time: string, jitterMin: number) => addMinutes(at(date, time), jitterMin).toISOString();

  // Days on which Mdm Tan skips her statin citing muscle ache (concentrated in the last 4 weeks).
  const statinSkipDays = new Set([-26, -22, -17, -13, -9, -5].map((d) => addDays(today, d)));

  for (let date = start; date < today; date = addDays(date, 1)) {
    const weekend = isWeekend(date);
    for (const time of ["08:00", "20:00"]) {
      const medIds = time === "08:00" ? ["metformin", "amlodipine"] : ["metformin", "atorvastatin"];
      const [onTime, late] = time === "08:00" ? [0.96, 0.02] : weekend ? [0.55, 0.25] : [0.85, 0.1];
      const r = rand();

      if (r < onTime) {
        const t = iso(date, time, Math.floor(rand() * 20));
        for (const medId of medIds) {
          if (medId === "atorvastatin" && statinSkipDays.has(date)) {
            logs.push({ id: uid(), date, time, medId, status: "skipped", at: t, by: "patient", reason: "muscle ache" });
          } else {
            logs.push({ id: uid(), date, time, medId, status: "taken", at: t, by: "patient" });
          }
        }
      } else if (r < onTime + late) {
        // Unconfirmed → on-duty child called; sometimes the first person didn't pick up.
        const chain = escalationChain(state, date);
        let who = chain[0];
        let minute = 47;
        if (rand() < 0.2 && chain[1]) {
          escs.push({ id: uid(), date, time, memberId: who.id, outcome: "no_answer", at: iso(date, time, minute) });
          who = chain[1];
          minute += 20;
        }
        const takenAt = iso(date, time, minute + 3);
        const note = pick(rand, ["Forgot, took it after my call", "Was out at a friend's place, took it when home", "Fell asleep watching TV, took it now"]);
        escs.push({ id: uid(), date, time, memberId: who.id, outcome: "took_late", note, at: takenAt });
        for (const medId of medIds) logs.push({ id: uid(), date, time, medId, status: "taken", at: takenAt, by: who.id, late: true });
      }
      // else: genuinely missed, no log
    }
  }
  state.doseLogs = logs;
  state.escalations = escs;

  const noteAt = (days: number, time: string) => at(addDays(today, days), time).toISOString();
  const notes: Note[] = [
    { id: uid(), at: noteAt(-18, "09:10"), text: "早上起来有点头晕", translation: "Feeling a bit dizzy after waking up", source: "voice", by: "patient" },
    { id: uid(), at: noteAt(-12, "21:30"), text: "Ma says she hasn't been sleeping well this week.", source: "typed", by: "ml" },
    { id: uid(), at: noteAt(-10, "20:40"), text: "腿酸酸的，晚上那颗药吃了更酸", translation: "Legs feel achy, worse after the evening pill", source: "voice", by: "patient" },
    { id: uid(), at: noteAt(-7, "10:30"), text: "膝盖痛，走路难", translation: "Knee pain, hard to walk", source: "voice", by: "patient" },
    { id: uid(), at: noteAt(-4, "16:05"), text: "膝盖还是痛", translation: "Knee still painful", source: "voice", by: "patient" },
  ];
  state.notes = notes;

  const bp: [number, number, number, string][] = [
    [-40, 142, 86, "ml"], [-35, 138, 84, "patient"], [-30, 145, 88, "ml"], [-25, 136, 82, "wm"], [-20, 140, 85, "ml"],
    [-15, 134, 80, "patient"], [-11, 139, 86, "jh"], [-6, 137, 83, "ml"], [-2, 141, 87, "patient"],
  ];
  state.readings = bp.map(
    ([d, s, di, by]): Reading => ({ id: uid(), at: noteAt(d, "09:00"), type: "bp", systolic: s, diastolic: di, by }),
  );

  state.questions = [
    { id: uid(), text: "Can the evening Metformin be taken at dinner (around 7pm) instead of 8pm?", by: "ml", at: noteAt(-3, "22:10") },
    { id: uid(), text: "She says her legs ache after the evening pill. Could it be the cholesterol medicine?", by: "wm", at: noteAt(-2, "21:00") },
    { id: uid(), text: "Knee pain for a week. Should she see a physio?", by: "jh", at: noteAt(-1, "19:45") },
  ];

  return state;
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

