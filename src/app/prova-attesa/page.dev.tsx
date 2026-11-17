"use client";

// Fixed scenes of the waiting page (/attesa) without a server. A development-only page:
// next.config.ts serves *.dev.tsx pages in `next dev` only. Numbers are placeholders.
//   /prova-attesa/?s=coda        friendly classic queue, a few seconds in
//   /prova-attesa/?s=lunga       friendly Quadrante queue after a minute: the bot suggestion and an error
//   /prova-attesa/?s=classificata ranked queue on Quadrante, the longest title
//   /prova-attesa/?s=conquista   Conquista queue, with its bot rule
//   /prova-attesa/?s=codice      a friend code for Allarme Triplo

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LobbyWaitView, QueueWaitView, WaitingShell } from "@/components/waiting-views";
import { useLockedScreen } from "@/lib/use-locked-screen";

function Scenes() {
  const scene = useSearchParams().get("s") ?? "coda";
  useLockedScreen(true);
  if (scene === "codice") {
    return (
      <WaitingShell lobby ranked={false}>
        <LobbyWaitView
          lobby={{ code: "K7QX2M", expires_at: "2026-11-17T20:00:00Z", format: "triple" }}
          remaining={9 * 60_000 + 32_000}
          notice="Link copiato."
          onShare={() => {}}
          onCancel={() => {}}
        />
      </WaitingShell>
    );
  }
  const queue =
    scene === "lunga"
      ? { queueMode: "friendly" as const, format: "quadrant_shifting" as const, waited: 64, error: "Connessione lenta: riprovo…" }
      : scene === "classificata"
        ? { queueMode: "ranked" as const, format: "quadrant_shifting" as const, waited: 23, error: null }
        : scene === "conquista"
          ? { queueMode: "conquest" as const, format: "classic" as const, waited: 12, error: null }
          : { queueMode: "friendly" as const, format: "classic" as const, waited: 5, error: null };
  return (
    <WaitingShell lobby={false} ranked={queue.queueMode === "ranked"}>
      <QueueWaitView {...queue} />
    </WaitingShell>
  );
}

export default function WaitingScenesPage() {
  return (
    <Suspense>
      <Scenes />
    </Suspense>
  );
}
