"use client";

// EDITOR → Modalità di gioco with fixed data, to look at it without a server. A development-only
// page: next.config.ts serves *.dev.tsx pages in `next dev` only. Saving needs an admin session.
//   /prova-modalita/

import { ModeAdmin } from "@/components/mode-admin";
import type { AdminModes, ModeAvailability } from "@/lib/mode-availability";

const row = (key: ModeAvailability["key"], patch: Partial<ModeAvailability> = {}): ModeAvailability => ({
  key,
  state: "on",
  starts_at: null,
  ends_at: null,
  label: null,
  ...patch,
});

const DATA: AdminModes = {
  server_now: new Date().toISOString(),
  modes: [
    row("classic"),
    row("boss", { state: "window", starts_at: "2026-12-03T17:00:00Z", ends_at: "2026-12-10T22:59:00Z" }),
    row("triple", { state: "off", label: "Prossimamente" }),
    row("quadrant", { label: "Nuova" }),
    row("quadrant_shifting", { state: "off" }),
    row("ranked"),
    row("conquest"),
    row("story", { state: "off", label: "In pausa" }),
    row("emergency"),
    row("emergency_week", { state: "window", starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-11-15T00:00:00Z" }),
    row("coop"),
  ],
};

export default function ModeAdminScenePage() {
  return <ModeAdmin initial={DATA} />;
}
