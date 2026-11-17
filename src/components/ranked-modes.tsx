"use client";

import Link from "next/link";
import { TrophyIcon } from "@/components/leaderboard-places";
import { FamaProgress, LeagueBadge } from "@/components/ranked-parts";
import { balance } from "@/config/balance";
import type { ActiveMatch, MatchFormat } from "@/lib/match";
import { RANKED_RULES, seasonPrizes, type MyRanked } from "@/lib/ranked";

/** The modes of the Classificata, each with its own queue (both Quadrante grids too). */
const RANKED_MODES: { format: MatchFormat; label: string; detail: string; color: string }[] = [
  {
    format: "classic",
    label: "Classica",
    detail: `${balance.match.teamSize} personaggi contro ${balance.match.teamSize} Minacce`,
    color: "bg-comic-magenta",
  },
  { format: "boss", label: "Grande Minaccia", detail: "Un Boss, cinque fronti", color: "bg-comic-orange" },
  {
    format: "triple",
    label: "Allarme Triplo",
    detail: `Tre Minacce, ${balance.triple.rounds * balance.triple.threats} carte`,
    color: "bg-comic-yellow",
  },
  { format: "quadrant", label: "Quadrante · fissa", detail: "Griglia 4×4 con 4 Minacce sui bordi", color: "bg-comic-cyan" },
  { format: "quadrant_shifting", label: "Quadrante · mobile", detail: "La griglia si sposta finché non arriva a 4", color: "bg-comic-cyan" },
];

/** Where a mode's Classificata starts: the team choice, then the queue. */
export function rankedHref(format: MatchFormat): string {
  return `/squadra/?mode=ranked${format === "classic" ? "" : `&format=${format}`}`;
}

/**
 * The Classificata page (SPEC §8.7), from the home: the player's Fama and Mandato, then a
 * row per mode straight to its team choice, the rules and the prizes of the Mandato.
 */
export function RankedModesView({
  ranked,
  active,
  error,
}: {
  ranked: MyRanked | null;
  /** A match in progress blocks the modes, as in Gioca; undefined while loading. */
  active: ActiveMatch | null | undefined;
  error: string | null;
}) {
  const blocked = Boolean(active) || (active === undefined && !error);
  return (
    <div className="home-shell">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-2">
        <h1 className="font-display text-4xl uppercase text-comic-yellow">Classificata</h1>
        <Link href="/classifiche/?scheda=albo" aria-label="Albo dei Reggenti" className="btn btn-outline h-11 w-11 shrink-0 px-0">
          <TrophyIcon />
        </Link>
      </header>

      {/* What a short window cannot fit scrolls inside, rather than being cut. */}
      <main data-keep-scroll="main" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 pt-1">
        {error && <p className="shrink-0 text-sm font-semibold text-comic-magenta">{error}</p>}
        {active && (
          <Link
            href={`/partita/?id=${active.id}`}
            className="flex min-h-12 shrink-0 items-center justify-between gap-3 bg-comic-cyan px-3.5 py-1 text-black"
          >
            <span className="font-display text-[17px] uppercase leading-5">Hai una partita in corso</span>
            <span className="whitespace-nowrap text-[13px] font-extrabold">riprendi →</span>
          </Link>
        )}

        <section className="flex shrink-0 flex-col gap-1.5 bg-panel px-2.5 py-2">
          {ranked ? (
            <>
              <FamaProgress fama={ranked.fama} league={ranked.league} start={ranked.league_start} next={ranked.next_league_at} />
              <p className="text-[11px] font-semibold leading-4 text-muted">
                Mandato di {ranked.season_label}
                {ranked.place ? ` · sei ${ranked.place}°` : ""} · {ranked.season_matches}{" "}
                {ranked.season_matches === 1 ? "classificata" : "classificate"}
                {ranked.season_matches < ranked.min_matches ? ` (per il premio ne servono ${ranked.min_matches})` : ""}
              </p>
              {ranked.prizes.length > 0 && (
                <Link href="/classifiche/?scheda=albo" className="bg-comic-yellow px-2.5 py-1.5 text-[13px] font-extrabold text-black">
                  Hai un premio di fine Mandato da ritirare nell&apos;Albo →
                </Link>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold text-muted">Carico la tua Fama…</p>
          )}
        </section>

        <h2 className="pt-1 font-display text-lg uppercase leading-5 text-comic-yellow">Scegli la modalità</h2>
        <div className={`flex flex-col gap-1.5 ${blocked ? "pointer-events-none opacity-40" : ""}`}>
          {RANKED_MODES.map((mode) => (
            <Link
              key={mode.format}
              href={rankedHref(mode.format)}
              aria-disabled={blocked}
              className={`cut-both flex min-h-14 items-center justify-between gap-3 px-4 py-1.5 text-black ${mode.color}`}
            >
              <div className="min-w-0">
                <p className="-skew-x-8 font-display text-[22px] uppercase leading-6">{mode.label}</p>
                <p className="text-[13px] font-bold leading-4">{mode.detail}</p>
              </div>
              <span className="font-display text-2xl" aria-hidden>
                →
              </span>
            </Link>
          ))}
        </div>

        <p className="text-[13px] font-medium leading-4 text-muted">{RANKED_RULES}</p>

        <h2 className="pt-1 font-display text-lg uppercase leading-5 text-comic-yellow">Premi di fine Mandato</h2>
        <p className="text-[13px] font-medium leading-4 text-muted">
          Ogni mese, a chi ha giocato almeno {balance.ranked.season.minMatches} classificate, secondo la lega in cui finisce:
        </p>
        <ul className="grid grid-cols-2 gap-1">
          {seasonPrizes().map((prize) => (
            <li key={prize.league} className="flex min-w-0 flex-col items-start gap-0.5 bg-panel px-2 py-1.5">
              <LeagueBadge league={prize.league} />
              <span className="text-xs font-bold leading-4">{prize.text}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
