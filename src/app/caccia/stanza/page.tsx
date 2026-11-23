"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/loading-screen";
import { RaidRoom } from "@/components/raid-room";
import { ReturnLink } from "@/components/return-link";

// /caccia/stanza/?id=<room id>: query string, see CLAUDE.md (static export).
export default function RaidRoomPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Apertura della stanza…" />}>
      <RaidRoomPageContent />
    </Suspense>
  );
}

function RaidRoomPageContent() {
  const { session } = useRequireSignedIn();
  const id = useSearchParams().get("id");
  if (!session) return <LoadingScreen label="Apertura della stanza…" />;
  if (!id) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-comic-magenta">Questa stanza non c&apos;è.</p>
        <ReturnLink href="/caccia" className="text-sm font-bold underline">
          Torna alla Caccia grossa
        </ReturnLink>
      </main>
    );
  }
  return <RaidRoom key={id} roomId={id} />;
}
