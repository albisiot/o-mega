"use client";

import { useEffect, useState } from "react";
import { PrizeCard } from "@/components/card-zoom";
import type { AbilityInfo } from "@/lib/catalog";
import { fetchStoryReward, type StoryReward } from "@/lib/story";

/** On the result of a story match: what the mission paid, if anything. Null while it loads. */
export function useStoryReward(matchId: string, story: boolean): StoryReward | null {
  const [reward, setReward] = useState<StoryReward | null>(null);

  useEffect(() => {
    if (!story) return;
    let cancelled = false;
    fetchStoryReward(matchId)
      .then((next) => {
        if (!cancelled) setReward(next);
      })
      .catch((error: unknown) => console.error("Story reward failed", error));
    return () => {
      cancelled = true;
    };
  }, [matchId, story]);

  return reward;
}

/** What the mission paid. A card reward takes the room the result leaves (see PrizeCard). */
export function StoryRewardPanel({ reward, abilities }: { reward: StoryReward; abilities: AbilityInfo[] }) {
  if (!reward.completed_now) {
    return (
      <section className="shrink-0 bg-panel px-4 py-3">
        <p className="font-display text-xl uppercase">{reward.title}</p>
        <p className="text-sm font-medium text-muted">
          {reward.completed_before
            ? "Missione già completata: le partite rigiocate non danno più il premio della missione."
            : "Missione non completata: vinci per ottenere il premio e aprire la prossima."}
        </p>
      </section>
    );
  }
  const paid = (
    <p className="font-bold">
      {reward.title}
      {reward.coins > 0 && ` · +${reward.coins} monete`}
    </p>
  );
  const last = reward.is_last && (
    <p className="font-semibold">Hai finito tutti i capitoli disponibili. Il prossimo arriva presto.</p>
  );
  if (!reward.card) {
    return (
      <section className="flex shrink-0 flex-col items-center gap-1 bg-comic-yellow px-4 py-3 text-center text-sm text-black">
        <p className="font-display text-3xl uppercase">Missione completata!</p>
        {paid}
        {last}
      </section>
    );
  }
  // The title runs across the panel: the text next to the card has the most room it can.
  return (
    <section className="flex flex-[1_1_0] flex-col gap-2 bg-comic-yellow p-3 text-black">
      <p className="font-display text-[28px] uppercase leading-8">Missione completata!</p>
      <PrizeCard card={reward.card} abilities={abilities} className="flex-[1_1_0]">
        <div className="flex flex-col gap-1 text-[13px] leading-4">
          {paid}
          <p className="font-bold">{reward.card.name} si unisce a te: la carta è nella tua collezione.</p>
          {last}
        </div>
      </PrizeCard>
    </section>
  );
}
