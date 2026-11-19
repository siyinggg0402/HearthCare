// Prototype persistence: a single JSON file on the server (data/db.json).
// Swap this module for Supabase/Postgres when the pilot needs multi-device hosting.
import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Action, HearthState } from "./types";
import { applyAction } from "./reducer";
import { buildSeed } from "./seed";

const FILE = path.join(process.cwd(), "data", "db.json");

let cache: HearthState | null = null;
let queue: Promise<unknown> = Promise.resolve();

export async function getState(): Promise<HearthState> {
  if (cache) return cache;
  try {
    cache = migrate(JSON.parse(await fs.readFile(FILE, "utf8")) as HearthState);
  } catch {
    cache = buildSeed();
    await save(cache);
  }
  return cache;
}

async function save(state: HearthState) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(state, null, 1));
}

/** Serialises writes so concurrent taps from several phones don't clobber each other. */
export function dispatch(action: Action): Promise<HearthState> {
  const run = queue.then(async () => {
    const next = applyAction(await getState(), action);
    cache = next;
    await save(next);
    return next;
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Fills in fields added after a db.json was first written. */
function migrate(s: HearthState): HearthState {
  s.calls ??= [];
  s.callAfterMin ??= 15;
  s.patient.reminderChannel ??= "whatsapp_voice";
  // Pill looks and the softer avatar palette arrived with the redesign.
  const seed = buildSeed();
  for (const m of s.meds) m.appearance ??= seed.meds.find((x) => x.id === m.id)?.appearance;
  for (const m of s.members) {
    const fresh = seed.members.find((x) => x.id === m.id);
    if (fresh && ["#c2410c", "#0f766e", "#4338ca"].includes(m.color)) m.color = fresh.color;
  }
  return s;
}
