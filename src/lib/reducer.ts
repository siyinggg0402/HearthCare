import type { Action, HearthState } from "./types";
import { nowOf } from "./logic";
import { buildSeed, uid } from "./seed";
import { toDateStr } from "./time";

// Muted avatar colours that sit well on the slate palette (white initials stay readable).
const COLORS = ["#5a7397", "#3e7c76", "#7a6ba8", "#a06a4f", "#5f7f4a", "#9a5c7a"];

/** Applies an action to the state. Mutates and returns the same object. */
export function applyAction(state: HearthState, action: Action): HearthState {
  const nowIso = nowOf(state).toISOString();

  switch (action.type) {
    case "confirmDose": {
      for (const medId of action.medIds) {
        state.doseLogs = state.doseLogs.filter(
          (l) => !(l.date === action.date && l.time === action.time && l.medId === medId),
        );
        state.doseLogs.push({
          id: uid(),
          date: action.date,
          time: action.time,
          medId,
          status: action.status,
          at: nowIso,
          by: action.by,
          reason: action.reason,
          late: action.late,
        });
      }
      break;
    }
    case "undoDose":
      state.doseLogs = state.doseLogs.filter(
        (l) => !(l.date === action.date && l.time === action.time && action.medIds.includes(l.medId)),
      );
      break;

    case "snooze":
      state.snoozes.push({ date: action.date, time: action.time, at: nowIso });
      break;

    case "logCall":
      state.calls.push({ id: uid(), date: action.date, time: action.time, at: nowIso, result: action.result });
      break;

    case "escalationOutcome": {
      const { date, time, memberId, outcome, note } = action;
      state.escalations.push({ id: uid(), date, time, memberId, outcome, note, at: nowIso });
      if (outcome !== "no_answer") {
        const medIds = state.meds
          .filter((m) => m.active && m.times.includes(time))
          .map((m) => m.id)
          .filter((id) => !state.doseLogs.some((l) => l.date === date && l.time === time && l.medId === id));
        for (const medId of medIds) {
          state.doseLogs.push({
            id: uid(),
            date,
            time,
            medId,
            status: outcome === "skipped" ? "skipped" : "taken",
            at: nowIso,
            by: memberId,
            late: outcome === "took_late",
            reason: outcome === "skipped" ? note || undefined : undefined,
          });
        }
      }
      break;
    }
    case "addNote":
      state.notes.push({ id: uid(), at: nowIso, text: action.text, source: action.source, by: action.by });
      break;

    case "addReading":
      state.readings.push({ ...action.reading, id: uid(), at: nowIso });
      break;

    case "addQuestion":
      state.questions.push({ id: uid(), text: action.text, by: action.by, at: nowIso });
      break;

    case "deleteQuestion":
      state.questions = state.questions.filter((q) => q.id !== action.id);
      break;

    case "setClock":
      state.clock = action.clock;
      break;

    case "resetDemo":
      return buildSeed(new Date());

    case "setRosterOverride":
      if (action.memberId) state.roster.overrides[action.date] = action.memberId;
      else delete state.roster.overrides[action.date];
      break;

    case "setRoster":
      state.roster.order = action.order;
      state.roster.mode = action.mode;
      break;

    case "addMember": {
      const id = uid();
      state.members.push({ ...action.member, id, color: COLORS[state.members.length % COLORS.length] });
      state.roster.order.push(id);
      break;
    }
    case "upsertMed": {
      const { id, ...rest } = action.med;
      if (id) {
        state.meds = state.meds.map((m) => (m.id === id ? { ...m, ...rest } : m));
      } else {
        state.meds.push({ ...rest, id: uid() });
      }
      break;
    }
    case "deleteMed":
      // Soft-delete so history and summaries keep working.
      state.meds = state.meds.map((m) => (m.id === action.id ? { ...m, active: false } : m));
      break;

    case "updatePatient":
      state.patient = { ...state.patient, ...action.patient };
      break;

    case "setAppointment":
      state.appointment = action.appointment;
      break;
  }
  return state;
}

export const todayOf = (state: HearthState) => toDateStr(nowOf(state));
