"use client";

import { useEffect, useState } from "react";
import { PrizeCard } from "@/components/card-zoom";
import { EarnedStars } from "@/components/story-stars";
import type { AbilityInfo } from "@/lib/catalog";
import { fetchStoryReward, type StoryReward } from "@/lib/story";
import { STORY_STARS, starShort } from "@/lib/story-stars";

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

/**
 * The mission's stars on the result: those earned now land one after the other, those
 * earned before stay full. Then the coins of the new stars and what is still missing.
 */
function StarsOfMatch({ reward, small = false }: { reward: StoryReward; small?: boolean }) {
  const missing = STORY_STARS.filter((star) => !reward.stars_now.includes(star) && !reward.stars_had.includes(star));
  return (
    <div className={`flex flex-col items-center text-center ${small ? "gap-1" : "gap-1.5"}`}>
      <EarnedStars now={reward.stars_now} had={reward.stars_had} small={small} />
      {reward.star_coins > 0 && (
        <p className="text-[13px] font-extrabold leading-4">
          {reward.stars_now.length === 1 ? "Nuova stella" : `${reward.stars_now.length} stelle nuove`}: +{reward.star_coins} monete
        </p>
      )}
      {missing.length > 0 && (
        <p className="text-[11px] font-semibold leading-[14px] opacity-80">
          {missing.length === 1 ? "Ti manca" : "Ti mancano"}: {missing.map((star) => starShort(star, reward)).join(" · ")}
        </p>
      )}
    </div>
  );
}

/** What the mission paid. A card reward takes the room the result leaves (see PrizeCard). */
export function StoryRewardPanel({ reward, abilities }: { reward: StoryReward; abilities: AbilityInfo[] }) {
  // Before the stars reach the database the mission has no star rules: no stars to show.
  const stars = reward.star_rarities.length > 0;
  if (!reward.completed_now) {
    const newStars = stars && reward.stars_now.length > 0;
    return (
      <section className={`flex shrink-0 flex-col gap-2 px-4 py-3 ${newStars ? "bg-comic-yellow text-black" : "bg-panel"}`}>
        <div>
          <p className="font-display text-xl uppercase">
            {newStars ? (reward.stars_now.length === 1 ? "Nuova stella!" : "Nuove stelle!") : reward.title}
          </p>
          <p className={`text-sm ${newStars ? "font-bold" : "font-medium text-muted"}`}>
            {newStars
              ? reward.title
              : reward.completed_before
                ? stars
                  ? "Missione già completata: il premio della missione non si ripete, le stelle che ti mancano sì."
                  : "Missione già completata: le partite rigiocate non danno più il premio della missione."
                : "Missione non completata: vinci per ottenere il premio e aprire la prossima."}
          </p>
        </div>
        {stars && <StarsOfMatch reward={reward} />}
      </section>
    );
  }
  const paid = (
    <p className="font-bold">
      {reward.title}
      {reward.coins > 0 && ` · +${reward.coins} monete`}
    </p>
  );
  // The last mission of a season: how the season ends, from the database.
  const last = reward.season_ending && <p className="font-semibold">{reward.season_ending}</p>;
  if (!reward.card) {
    return (
      <section className="flex shrink-0 flex-col items-center gap-1.5 bg-comic-yellow px-4 py-3 text-center text-sm text-black">
        <p className="font-display text-3xl uppercase">Missione completata!</p>
        {paid}
        {stars && <StarsOfMatch reward={reward} />}
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
          {stars && <StarsOfMatch reward={reward} small />}
          {last}
        </div>
      </PrizeCard>
    </section>
  );
}
