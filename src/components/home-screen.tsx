"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PackPanel } from "@/components/pack-panel";
import { PlayerAvatar } from "@/components/player-avatar";
import { countOwnedCards, type Profile } from "@/lib/player";

const UPCOMING = [
  { title: "Collezione", detail: "Album e dettaglio delle carte" },
  { title: "Gioca", detail: "Sfide 1 contro 1 da 3 minuti" },
];

export function HomeScreen({ profile }: { profile: Profile }) {
  const [cardCount, setCardCount] = useState<number | null>(null);

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
        <Link href="/profilo" aria-label="Profilo" className="flex items-center gap-2">
          <span className="text-sm text-zinc-300">{profile.username}</span>
          <PlayerAvatar username={profile.username} avatarUrl={profile.avatar_url} />
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-5 pb-8">
        <section>
          <p className="text-sm text-zinc-400">Ciao, {profile.username}!</p>
          <p className="text-lg font-semibold">
            {cardCount === null ? "…" : cardCount} {cardCount === 1 ? "carta" : "carte"} nella tua
            collezione
          </p>
        </section>

        <PackPanel />

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
