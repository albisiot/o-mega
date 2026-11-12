"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchMatchReward, fetchMatchRewards, type MatchReward, type MatchRewards } from "@/lib/match-rewards";
import { packRevealHref } from "@/lib/packs";

/** What the server paid this player for a finished match (XP, coins, packs). */
export function useMatchReward(matchId: string): MatchReward | null {
  const [reward, setReward] = useState<MatchReward | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchMatchReward(matchId)
      .then((next) => {
        if (!cancelled) setReward(next);
      })
      .catch((error: unknown) => console.error("Match reward failed", error));
    return () => {
      cancelled = true;
    };
  }, [matchId]);
  return reward;
}

/** The reward table, for the texts that quote it; null while loading or on error. */
export function useMatchRewards(): MatchRewards | null {
  const [rewards, setRewards] = useState<MatchRewards | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchMatchRewards()
      .then((next) => {
        if (!cancelled) setRewards(next);
      })
      .catch((error: unknown) => console.error("Match rewards failed", error));
    return () => {
      cancelled = true;
    };
  }, []);
  return rewards;
}

/** The end-of-match chips: XP, coins, and the packs with a link to see them. */
export function RewardChips({ reward, chip }: { reward: MatchReward | null; chip: string }) {
  if (!reward) return null;
  const packs = reward.opening_ids.length;
  return (
    <>
      {reward.xp > 0 && <p className={`${chip} bg-black text-foreground`}>+{reward.xp} XP</p>}
      {reward.coins > 0 && <p className={`${chip} bg-black text-comic-yellow`}>+{reward.coins} monete</p>}
      {packs > 0 && (
        <Link href={packRevealHref(reward.opening_ids)} className={`${chip} bg-comic-cyan text-black underline`}>
          +{packs === 1 ? "1 pacchetto" : `${packs} pacchetti`} · apri
        </Link>
      )}
    </>
  );
}

/** True when the reward has something to show. */
export const hasReward = (reward: MatchReward | null) =>
  Boolean(reward && (reward.xp > 0 || reward.coins > 0 || reward.opening_ids.length > 0));
