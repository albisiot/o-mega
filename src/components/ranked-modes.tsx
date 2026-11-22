"use client";

import Link from "next/link";
import { TrophyIcon } from "@/components/leaderboard-places";
import { GateLink, useModeNotice } from "@/components/mode-gate";
import { FamaProgress, LeagueBadge, PrizeLine } from "@/components/ranked-parts";
import { balance } from "@/config/balance";
import type { ActiveMatch, MatchFormat } from "@/lib/match";
import { combinedStatus, startKeys, type ModeAvailabilityMap } from "@/lib/mode-availability";
import { seasonPrizes, type MyRanked } from "@/lib/ranked";

/** The modes of the Classificata, each with its own queue (both Quadrante grids too). */
const RANKED_MODES: { format: MatchFormat; label: string; detail: string; color: string; wide?: boolean }[] = [
  {
    format: "classic",
    label: "Classica",
    detail: `${balance.match.teamSize} personaggi contro ${balance.match.teamSize} Minacce: vince chi fa ${balance.match.roundsToWin} round`,
    color: "bg-comic-magenta",
    wide: true,
  },
  { format: "boss", label: "Grande Minaccia", detail: "Un Boss, cinque fronti", color: "bg-comic-orange" },
  {
    format: "triple",
    label: "Allarme Triplo",
    detail: `3 Minacce, ${balance.triple.rounds * balance.triple.threats} carte`,
    color: "bg-comic-yellow",
  },
  { format: "quadrant", label: "Quadrante", detail: "Griglia fissa", color: "bg-comic-cyan" },
  { format: "quadrant_shifting", label: "Quadrante", detail: "Griglia mobile", color: "bg-comic-cyan" },
];

/** Where a mode's Classificata starts: the team choice, then the queue. */
export function rankedHref(format: MatchFormat): string {
  return `/squadra/?mode=ranked${format === "classic" ? "" : `&format=${format}`}`;
}

/** The rules in short: what the Fama does, and that the opponent may be the system's. */
const SHORT_RULES =
  "Vinci e guadagni Fama, di più contro chi ne ha di più; perdi e ne perdi un po'. Se nessuno è libero, dopo qualche secondo affronti un Reggente gestito dal sistema, del tuo livello.";

/**
 * The Classificata page (SPEC §8.7), from the home: the player's Fama and Mandato, a tile per
 * mode straight to its team choice, the rules and the prizes of the Mandato. It fits the
 * screen of a phone, a short one too, without scrolling.
 */
export function RankedModesView({
  ranked,
  active,
  error,
  onPrizeClaimed,
  modes = null,
  now = 0,
}: {
  ranked: MyRanked | null;
  /** A match in progress blocks the modes, as in Gioca; undefined while loading. */
  active: ActiveMatch | null | undefined;
  error: string | null;
  onPrizeClaimed: () => void;
  /** When each mode is open (EDITOR → Modalità di gioco); null: all open. */
  modes?: ModeAvailabilityMap | null;
  now?: number;
}) {
  const blocked = Boolean(active) || (active === undefined && !error);
  const { notice, show } = useModeNotice();
  const prize = ranked?.prizes[0] ?? null;
  return (
    <div className="home-shell">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-2">
        <h1 className="font-display text-4xl uppercase text-comic-yellow">Classificata</h1>
        <Link href="/classifiche/?scheda=albo" aria-label="Albo dei Reggenti" className="btn btn-outline h-11 w-11 shrink-0 px-0">
          <TrophyIcon />
        </Link>
      </header>

      {/* A window shorter than a phone's scrolls inside, rather than being cut. */}
      <main data-keep-scroll="main" className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-2 pt-1">
        {error && <p className="shrink-0 text-sm font-semibold text-comic-magenta">{error}</p>}
        {active && (
          <Link
            href={`/partita/?id=${active.id}`}
            className="tile flex min-h-11 shrink-0 items-center justify-between gap-3 bg-comic-cyan px-3.5 py-1 text-black"
          >
            <span className="font-display text-[17px] uppercase leading-5">Hai una partita in corso</span>
            <span className="whitespace-nowrap text-[13px] font-extrabold">riprendi →</span>
          </Link>
        )}

        <section className="flex shrink-0 flex-col gap-1 bg-panel px-2.5 py-1.5">
          {ranked ? (
            <>
              <FamaProgress fama={ranked.fama} league={ranked.league} start={ranked.league_start} next={ranked.next_league_at} />
              <p className="truncate text-[11px] font-semibold leading-4 text-muted">
                Mandato di {ranked.season_label}
                {ranked.place ? ` · sei ${ranked.place}°` : ""} · {ranked.season_matches}/{ranked.min_matches} classificate per il
                premio
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold leading-[54px] text-muted">Carico la tua Fama…</p>
          )}
        </section>
        {prize && <PrizeLine prize={prize} onClaimed={onPrizeClaimed} />}

        {/* The tiles take the room a taller phone leaves; on a short one they keep their height. */}
        <div className={`grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-1.5 ${blocked ? "pointer-events-none opacity-40" : ""}`}>
          {RANKED_MODES.map((mode) => (
            <GateLink
              key={mode.format}
              href={rankedHref(mode.format)}
              status={combinedStatus(modes, startKeys(mode.format, "ranked"), now)}
              onClosed={show}
              label={`Classificata: ${mode.label}, ${mode.detail}`}
              className={`cut-both flex min-h-[52px] min-w-0 items-center justify-between gap-2 px-3 py-1 text-black ${mode.color} ${
                mode.wide ? "col-span-2" : ""
              }`}
            >
              <span className="min-w-0">
                <span
                  className={`block -skew-x-8 truncate font-display uppercase leading-6 ${mode.wide ? "text-xl" : "text-[17px]"}`}
                >
                  {mode.label}
                </span>
                <span className="block truncate text-[12px] font-bold leading-4">{mode.detail}</span>
              </span>
              {/* The half tiles need all their width for the name: the whole tile is the link. */}
              {mode.wide && (
                <span className="shrink-0 font-display text-xl" aria-hidden>
                  →
                </span>
              )}
            </GateLink>
          ))}
        </div>

        <p className="shrink-0 text-[12px] font-medium leading-4 text-muted">{SHORT_RULES}</p>

        <section className="flex shrink-0 flex-col gap-1">
          <h2 className="font-display text-base uppercase leading-5 text-comic-yellow">
            Premi di fine Mandato <span className="font-sans text-[11px] font-bold normal-case text-muted">· con almeno {balance.ranked.season.minMatches} classificate</span>
          </h2>
          <ul className="grid grid-cols-3 gap-1">
            {seasonPrizes().map((entry) => (
              <li key={entry.league} className="flex min-w-0 flex-col items-start gap-0.5 bg-panel px-1.5 py-1">
                <LeagueBadge league={entry.league} className="!text-[10px] !leading-[14px]" />
                <span className="text-[11px] font-bold leading-[13px]">{entry.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      {notice}
    </div>
  );
}
