// Core data model for the HearthCare prototype.
// Dates are local "YYYY-MM-DD", times are "HH:MM", timestamps are ISO strings.

export type Lang = "en" | "zh";

export interface Patient {
  name: string;
  nameZh?: string;
  callName: string; // what the family calls them, e.g. "Ma"
  age: number;
  lang: Lang;
  phone: string;
  reminderChannel: ReminderChannel;
}

/** whatsapp_voice = WhatsApp first, voice call if no reply after `callAfterMin`. */
export type ReminderChannel = "whatsapp" | "voice" | "whatsapp_voice";

export interface CallLog {
  id: string;
  date: string;
  time: string;
  at: string;
  result: "answered" | "declined";
}

export interface Medication {
  id: string;
  name: string;
  nameZh?: string;
  dose: string; // e.g. "500mg"
  purpose?: string;
  purposeZh?: string;
  times: string[]; // ["08:00", "20:00"]
  stock: { count: number; asOf: string }; // pills on hand at a given date
  active: boolean;
  /** What the pill looks like, so the patient can recognise it. */
  appearance?: PillAppearance;
}

export interface PillAppearance {
  shape: "round" | "oval" | "capsule";
  color: string;
  color2?: string; // second half of a capsule
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string; // "Son", "Daughter"
  phone: string;
  color: string; // avatar colour
}

export type DoseStatus = "taken" | "skipped";

export interface DoseLog {
  id: string;
  date: string;
  time: string;
  medId: string;
  status: DoseStatus;
  at: string; // when it was logged
  by: "patient" | string; // memberId if logged by family
  reason?: string; // skip reason key or free text
  late?: boolean; // confirmed after escalation
}

export interface Snooze {
  date: string;
  time: string;
  at: string;
}

export type EscalationOutcome = "took_late" | "skipped" | "no_answer" | "already_taken";

export interface EscalationLog {
  id: string;
  date: string;
  time: string;
  memberId: string;
  outcome: EscalationOutcome;
  note?: string;
  at: string;
}

export interface Note {
  id: string;
  at: string;
  text: string;
  translation?: string; // English rendering when the note is in Chinese
  source: "voice" | "typed";
  by: "patient" | string;
}

export interface Reading {
  id: string;
  at: string;
  type: "bp" | "glucose";
  systolic?: number;
  diastolic?: number;
  value?: number; // glucose mmol/L
  by: "patient" | string;
}

export interface Question {
  id: string;
  text: string;
  by: string;
  at: string;
}

export interface Appointment {
  date: string;
  time: string;
  clinic: string;
  doctor: string;
}

export interface Roster {
  order: string[]; // memberIds in rotation
  mode: "weekly" | "daily";
  anchor: string; // date the rotation starts from (a Monday for weekly)
  overrides: Record<string, string>; // date -> memberId (swaps)
}

export type Clock = { mode: "real" } | { mode: "sim"; now: string };

export interface HearthState {
  version: number;
  patient: Patient;
  meds: Medication[];
  members: FamilyMember[];
  roster: Roster;
  doseLogs: DoseLog[];
  snoozes: Snooze[];
  escalations: EscalationLog[];
  calls: CallLog[];
  notes: Note[];
  readings: Reading[];
  questions: Question[];
  appointment?: Appointment;
  clock: Clock;
  escalateAfterMin: number; // minutes before on-duty member is alerted
  callAfterMin: number; // minutes before an unanswered WhatsApp reminder becomes a voice call
  handoffAfterMin: number; // minutes before "no answer" escalates further (informational)
}

export type Action =
  | { type: "confirmDose"; date: string; time: string; medIds: string[]; status: DoseStatus; by: string; reason?: string; late?: boolean }
  | { type: "undoDose"; date: string; time: string; medIds: string[] }
  | { type: "snooze"; date: string; time: string }
  | { type: "logCall"; date: string; time: string; result: "answered" | "declined" }
  | { type: "escalationOutcome"; date: string; time: string; memberId: string; outcome: EscalationOutcome; note?: string }
  | { type: "addNote"; text: string; source: "voice" | "typed"; by: string }
  | { type: "addReading"; reading: Omit<Reading, "id" | "at"> }
  | { type: "addQuestion"; text: string; by: string }
  | { type: "deleteQuestion"; id: string }
  | { type: "setClock"; clock: Clock }
  | { type: "resetDemo" }
  | { type: "setRosterOverride"; date: string; memberId: string | null }
  | { type: "setRoster"; order: string[]; mode: "weekly" | "daily" }
  | { type: "addMember"; member: Omit<FamilyMember, "id" | "color"> }
  | { type: "upsertMed"; med: Omit<Medication, "id"> & { id?: string } }
  | { type: "deleteMed"; id: string }
  | { type: "updatePatient"; patient: Partial<Patient> }
  | { type: "setAppointment"; appointment: Appointment };
