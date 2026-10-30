"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CoinBadge } from "@/components/coin-badge";
import { PackPanel } from "@/components/pack-panel";
import { PlayerAvatar } from "@/components/player-avatar";
import { countOwnedCards, type Profile } from "@/lib/player";
import { usePackStatus } from "@/lib/use-pack-status";

const UPCOMING = [{ title: "Gioca", detail: "Sfide 1 contro 1 da 3 minuti" }];

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

        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">In arrivo</h2>
          {UPCOMING.map((item) => (
            <div
              key={item.title}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 opacity-60"
            >
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-zinc-400">{item.detail}</p>
              </div>
              <span className="text-xs text-zinc-500">Presto</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
