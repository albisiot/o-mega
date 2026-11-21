"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { CoopRoom } from "@/components/coop-room";
import { LoadingScreen } from "@/components/loading-screen";
import { ReturnLink } from "@/components/return-link";

// /operazioni/stanza/?id=<room id>: query string, see CLAUDE.md (static export).
export default function CoopRoomPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Apertura della stanza…" />}>
      <CoopRoomPageContent />
    </Suspense>
  );
}

function CoopRoomPageContent() {
  const { session } = useRequireSignedIn();
  const id = useSearchParams().get("id");
  if (!session) return <LoadingScreen label="Apertura della stanza…" />;
  if (!id) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">Questa stanza non c&apos;è.</p>
        <ReturnLink href="/operazioni" className="text-sm font-bold underline">
          Torna alle Operazioni
        </ReturnLink>
      </main>
    );
  }
  return <CoopRoom key={id} roomId={id} />;
}
