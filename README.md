# HearthCare

Medication reminders for elderly patients, a family duty roster for checking in, and a one-page summary for the doctor.

This is the **prototype**: one web app with patient, family and doctor views, preloaded with demo data (Mdm Tan, 78, and her three children).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. For pitching, use **/demo**, which shows the patient and family phones side by side with the demo clock.

To use a real phone, open `http://<your-computer's-IP>:3000/family` on the same Wi-Fi. All screens sync every 1.5 s.

## Views

| Route | What it is |
|---|---|
| `/elder` | **Elder phone demo**: WhatsApp notification pops up at dose time; if there's no reply, the phone rings and reads the reminder aloud (press 1/2/3) |
| `/patient` | Large-text app: Taken / Later / Didn't take, voice notes. English or Chinese. |
| `/patient?mode=whatsapp` | Simulated WhatsApp reminders with reply buttons |
| `/family` | Today (escalation alerts, doses, activity), Roster, Medicines, Doctor visit |
| `/summary` | One-page doctor summary. Print or save as PDF. |
| `/demo` | Demo stage |

## How it works

- **Data**: `src/lib/types.ts`. Stored as one JSON file in `data/db.json` (gitignored) and served by `src/app/api/state/route.ts`. Delete the file or press *Reset demo* to reseed.
- **Logic**: `src/lib/logic.ts` is pure and derives everything from the logs: dose status, who is on duty, escalation (45 min without a reply alerts the on-duty person; "couldn't reach" passes it to the next sibling), adherence, refill estimates, and the rule-based patterns on the summary.
- **Demo clock**: the clock can be frozen and jumped (8:00pm WhatsApp → 8:15pm call → 8:50pm family alert) so the whole day plays out in 2 minutes.
- **Reminder channel** (set in Family → Medicines or on `/elder`): WhatsApp, voice call, or WhatsApp then a call after 15 min. Escalation to family happens at 45 min. Ringtone and speech use the browser's Web Audio and text-to-speech (tap the phone once to allow sound; add `?quiet=1` for silent mode).
- **Voice notes**: the browser's Web Speech API (Mandarin or English); typing is the fallback.
- **Sample data**: `src/lib/seed.ts` is deterministic, with 6 weeks of history.

## Not built yet

- Real WhatsApp sending (WhatsApp Business API via a provider) and push notifications
- Login and per-family accounts; hosted database (Supabase, Singapore region)
- Server-side transcription and English translation of Chinese voice notes, with a guarded "summarise only, never advise" prompt
- Background scheduler (escalation is currently computed whenever someone opens the app)
