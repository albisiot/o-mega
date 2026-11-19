"use client";

import { useEffect, useRef, useState } from "react";
import { balance } from "@/config/balance";
import { useOpenPackReveal } from "@/components/pack-reveal-link";
import { describeServerError } from "@/lib/errors";
import {
  claimRankedPrize,
  describeFamaChange,
  describeLeagueChange,
  describePrize,
  leagueInfo,
  leagueProgress,
  type RankedLeague,
  type RankedMatchInfo,
  type RankedPrize,
} from "@/lib/ranked";

/**
 * A Mandato's prize still to claim, on one line: coins on the ledger, packs opened at once.
 * After the claim the line says what came in.
 */
export function PrizeLine({ prize, onClaimed }: { prize: RankedPrize; onClaimed: () => void }) {
  const openReveal = useOpenPackReveal();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const claim = () => {
    setBusy(true);
    setMessage(null);
    claimRankedPrize(prize.season)
      .then((result) => {
        if (result.opening_ids.length > 0) {
          openReveal(result.opening_ids);
          return;
        }
        setMessage(`+${result.coins} monete: ora ne hai ${result.coin_balance}`);
        setTimeout(onClaimed, 2500);
      })
      .catch((cause: unknown) => setMessage(describeServerError(cause)))
      .finally(() => setBusy(false));
  };
  return (
    <div className="flex min-h-9 shrink-0 items-center justify-between gap-2 bg-comic-yellow py-1 pl-2.5 pr-1 text-black">
      <p className="min-w-0 truncate text-[12px] font-bold leading-4">
        {message ?? `Premio di ${prize.label} (${prize.place}°): ${describePrize(prize)}`}
      </p>
      {!message && (
        <button
          type="button"
          disabled={busy}
          onClick={claim}
          className="h-7 shrink-0 -skew-x-8 bg-black px-3 font-display text-sm uppercase text-comic-yellow"
        >
          Ritira
        </button>
      )}
    </div>
  );
}

/**
 * A league as a small slanted badge in its colour; `dark`: black with the colour in the
 * letters, for a coloured background.
 */
export function LeagueBadge({ league, className = "", dark = false }: { league: RankedLeague; className?: string; dark?: boolean }) {
  const info = leagueInfo(league);
  return (
    <span
      className={`inline-block -skew-x-8 px-1.5 py-0.5 text-[11px] font-extrabold uppercase leading-4 ${dark ? "bg-black" : "text-black"} ${className}`}
      style={dark ? { color: info.color } : { backgroundColor: info.color }}
    >
      {info.name}
    </span>
  );
}

/** Fama now, its league and the way to the next one. */
export function FamaProgress({
  fama,
  league,
  start,
  next,
}: {
  fama: number;
  league: RankedLeague;
  start: number;
  next: number | null;
}) {
  const share = leagueProgress(fama, start, next);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex items-baseline gap-2">
          <span className="font-display text-2xl leading-6 text-comic-yellow">{fama}</span>
          <span className="text-xs font-extrabold uppercase">Fama</span>
          <LeagueBadge league={league} />
        </p>
        <p className="text-[11px] font-bold text-muted">{next === null ? "La lega più alta" : `${next - fama} alla prossima lega`}</p>
      </div>
      <div className="h-1.5 bg-black" aria-hidden>
        <div className="h-full" style={{ width: `${Math.round(share * 100)}%`, backgroundColor: leagueInfo(league).color }} />
      </div>
    </div>
  );
}

/** The chips a finished Classificata adds to the result: the Fama moved and a league reached. */
export function RankedResultChips({ ranked, chip }: { ranked: RankedMatchInfo | null | undefined; chip: string }) {
  if (!ranked || ranked.delta === null) return null;
  const change = describeLeagueChange(ranked);
  return (
    <>
      <p className={`${chip} bg-foreground text-black`}>
        {describeFamaChange(ranked.delta)} · {ranked.fama + ranked.delta} Fama
      </p>
      {change && (
        <p className={`${chip} text-black`} style={{ backgroundColor: leagueInfo(ranked.league).color }}>
          {change}
        </p>
      )}
    </>
  );
}

/** How often the app asks the server whether the opponent has chosen, while waiting for it. */
const NUDGE_MS = balance.ranked.ghosts.nudgeSeconds * 1000;

/**
 * Where the opponent may be the server's (`opponentMayBeServer`: Classificata, Sfide a tema
 * online), while the player waits for it (their choice sent, or the opponent's move in
 * Quadrante), asks the server to resolve every few seconds: the opponent's choice may be
 * known only there, and the server plays it once its moment has come, always before the
 * deadline. Harmless otherwise: resolving answers with the state until the round is ready.
 */
export function useOpponentNudge(waiting: boolean, nudge: () => Promise<void>) {
  const latest = useRef(nudge);
  useEffect(() => {
    latest.current = nudge;
  });
  useEffect(() => {
    if (!waiting) return;
    let busy = false;
    const timer = setInterval(() => {
      if (busy) return;
      busy = true;
      latest
        .current()
        .catch(() => {})
        .finally(() => {
          busy = false;
        });
    }, NUDGE_MS);
    return () => clearInterval(timer);
  }, [waiting]);
}
