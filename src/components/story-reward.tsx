"use client";

import { useEffect, useState } from "react";
import { CardView } from "@/components/card-view";
import { fetchStoryReward, type StoryReward } from "@/lib/story";

/** On the result of a story match: what the mission paid, if anything. */
export function StoryRewardPanel({ matchId }: { matchId: string }) {
  const [reward, setReward] = useState<StoryReward | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchStoryReward(matchId)
      .then((next) => {
        if (!cancelled) setReward(next);
      })
      .catch((error: unknown) => console.error("Story reward failed", error));
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (!reward) return null;
  if (!reward.completed_now) {
    return (
      <section className="bg-panel px-4 py-3">
        <p className="font-display text-xl uppercase">{reward.title}</p>
        <p className="text-sm font-medium text-muted">
          {reward.completed_before
            ? "Missione già completata: le partite rigiocate non danno premi."
            : "Missione non completata: vinci per ottenere il premio e aprire la prossima."}
        </p>
      </section>
    );
  }
  return (
    <section className="flex flex-col items-center gap-3 bg-comic-yellow px-4 py-4 text-center text-black">
      <p className="font-display text-3xl uppercase">Missione completata!</p>
      <p className="text-sm font-bold">
        {reward.title}
        {reward.coins > 0 && ` · +${reward.coins} monete`}
      </p>
      {reward.card && (
        <>
          <p className="text-sm font-bold">{reward.card.name} si unisce a te: la carta è nella tua collezione.</p>
          <div className="w-40">
            <CardView card={reward.card} size="sm" />
          </div>
        </>
      )}
      {reward.is_last && <p className="text-sm font-semibold">Hai finito tutti i capitoli disponibili. Il prossimo arriva presto.</p>}
    </section>
  );
}
