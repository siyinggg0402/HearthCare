import type { ReminderChannel } from "./types";

export const CHANNELS: { key: ReminderChannel; label: string; desc: string }[] = [
  { key: "whatsapp_voice", label: "WhatsApp, then call", desc: "WhatsApp pop-up at dose time; voice call if no reply" },
  { key: "whatsapp", label: "WhatsApp only", desc: "Pop-up notification with reply buttons" },
  { key: "voice", label: "Voice call only", desc: "Phone rings and reads the reminder aloud" },
];
