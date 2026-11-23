"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { BackLink } from "@/components/comic-parts";
import { COOP_QUEUE_HREF, coopRoomHref, fetchCoop, seenCoop, type CoopCatalog } from "@/lib/coop";
import { statusOf, useModeAvailability, type ModeStatus } from "@/lib/mode-availability";
import { fetchRaid, raidRoomHref, seenRaid, type RaidCatalog } from "@/lib/raid";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";

/**
 * «Insieme»: the two cooperative modes, live (SPEC §5.17, §5.18). The Operazioni, written by hand
 * like the Story, with more threats than players; the Caccia grossa, everyone against one Boss.
 * The room the player is in, of either mode, first.
 */
export default function TogetherPage() {
  const { session } = useRequireSignedIn();
  const [coop, setCoop] = useState<CoopCatalog | null>(() => seenCoop());
  const [raid, setRaid] = useState<RaidCatalog | null>(() => seenRaid());
  const modes = useModeAvailability(Boolean(session));
  const now = useNow(60_000);
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchCoop()
      .then((next) => {
        if (!cancelled) setCoop(next);
      })
      .catch((cause: unknown) => console.error("Operations failed", cause));
    fetchRaid()
      .then((next) => {
        if (!cancelled) setRaid(next);
      })
      .catch((cause: unknown) => console.error("Hunt failed", cause));
    return () => {
      cancelled = true;
    };
  }, [session]);

  const coopRoom = coop?.room ?? null;
  const queued = !coopRoom && Boolean(coop?.queue?.queued);
  const operations = coop?.chapters.flatMap((chapter) => chapter.operations) ?? [];
  const next = operations.find((operation) => operation.unlocked && !operation.completed);
  const raidRoom = raid?.room ?? null;
  const beaten = raid?.bosses.filter((b) => b.beaten).length ?? 0;

  return (
    <div className="game-shell">
      <header className="flex items-center gap-2.5 px-3 py-1">
        <BackLink href="/gioca" />
        <div className="min-w-0">
          <h1 className="font-display text-[22px] uppercase leading-6 text-comic-yellow">Insieme</h1>
          <p className="truncate text-[11px] font-bold text-muted">In squadra, dal vivo · da 2 a 4 giocatori</p>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        <ModeCard
          href={coopRoom ? coopRoomHref(coopRoom.id) : queued ? COOP_QUEUE_HREF : "/operazioni"}
          title="Operazioni"
          text="Più Minacce che giocatori in città: scegliete cosa fermare e cosa lasciare, prima del Boss. Si aprono una dopo l'altra."
          state={
            queued
              ? "Sei in coda"
              : coopRoom
                ? coopRoom.status === "active"
                  ? "Operazione in corso"
                  : `Stanza ${coopRoom.code}`
                : next
                  ? `${next.title} · ${next.ord}/${operations.length}`
                  : operations.length
                    ? "✓ Completate"
                    : null
          }
          className="bg-comic-cyan"
          status={coopRoom || queued ? null : statusOf(modes, "coop", now)}
        />
        <ModeCard
          href={raidRoom ? raidRoomHref(raidRoom.id) : "/caccia"}
          title="Caccia grossa"
          text="Un Boss, una Minaccia per round: tutti ci mettono una carta e i punteggi si sommano. Abbattetelo prima di perdere le Difese."
          state={
            raidRoom
              ? raidRoom.status === "active"
                ? "Caccia in corso"
                : `Stanza ${raidRoom.code}`
              : raid
                ? `${beaten}/${raid.bosses.length} Boss abbattuti`
                : null
          }
          className="bg-comic-orange"
          status={raidRoom ? null : statusOf(modes, "raid", now)}
        />
      </main>
    </div>
  );
}

function ModeCard({
  href,
  title,
  text,
  state,
  className,
  status,
}: {
  href: string;
  title: string;
  text: string;
  state: string | null;
  className: string;
  /** null: open whatever the EDITOR says (a room already started goes on). */
  status: ModeStatus | null;
}) {
  const open = !status || status.open;
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="font-display text-[26px] uppercase leading-7">{title}</span>
        {status?.label && <span className="shrink-0 -skew-x-8 bg-black px-1.5 text-[11px] font-extrabold uppercase text-comic-yellow">{status.label}</span>}
      </span>
      <span className="text-xs font-bold leading-4">{text}</span>
      {state && <span className="mt-auto self-start bg-black px-1.5 text-[12px] font-extrabold text-comic-yellow">{state}</span>}
    </>
  );
  const look = `tile flex min-h-0 flex-1 flex-col gap-1.5 px-3 py-2.5 text-black ${className}`;
  return open ? (
    <Link href={href} className={look}>
      {body}
    </Link>
  ) : (
    <div aria-disabled className={`${look} opacity-50 grayscale`}>
      {body}
    </div>
  );
}
