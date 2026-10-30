"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CoinBadge } from "@/components/coin-badge";
import { PackPanel } from "@/components/pack-panel";
import { PlayerAvatar } from "@/components/player-avatar";
import { countOwnedCards, type Profile } from "@/lib/player";
import { usePackStatus } from "@/lib/use-pack-status";


export function HomeScreen({ profile }: { profile: Profile }) {
  const [cardCount, setCardCount] = useState<number | null>(null);
  const packs = usePackStatus();

  useEffect(() => {
    let cancelled = false;
    countOwnedCards()
      .then((count) => {
        if (!cancelled) setCardCount(count);
      })
      .catch((error: unknown) => console.error("Card count failed", error));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <span className="bg-linear-to-b from-amber-200 to-orange-500 bg-clip-text text-xl font-black tracking-tight text-transparent">
          O-MEGA
        </span>
        <div className="flex items-center gap-3">
          <CoinBadge balance={packs.status?.coin_balance ?? null} />
          <Link href="/profilo" aria-label="Profilo">
            <PlayerAvatar username={profile.username} avatarUrl={profile.avatar_url} />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-5 pb-8">
        <p className="text-sm text-zinc-400">Ciao, {profile.username}!</p>

        <Link
          href="/gioca"
          className="flex items-center justify-between rounded-3xl bg-linear-to-r from-amber-400 to-orange-500 px-5 py-4 text-zinc-950 shadow-lg shadow-orange-600/30"
        >
          <div>
            <p className="text-xl font-black">Gioca</p>
            <p className="text-xs font-semibold opacity-80">Sfide 1 contro 1 da 3 minuti</p>
          </div>
          <span className="text-2xl font-black" aria-hidden>
            →
          </span>
        </Link>

        <PackPanel status={packs.status} now={packs.now} resetsAt={packs.resetsAt} onFailed={packs.refresh} />
        {packs.error && <p className="text-sm text-red-400">{packs.error}</p>}

        <Link
          href="/collezione"
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
        >
          <div>
            <p className="font-semibold">Collezione</p>
            <p className="text-xs text-zinc-400">
              {cardCount === null ? "…" : cardCount} {cardCount === 1 ? "carta" : "carte"} · album e doppioni
            </p>
          </div>
          <span className="text-zinc-500" aria-hidden>
            →
          </span>
        </Link>
      </main>
    </div>
  );
}
