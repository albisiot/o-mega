"use client";

import { useEffect, useState } from "react";
import { useOpenPackReveal } from "@/components/pack-reveal-link";
import { PlayerAvatar } from "@/components/player-avatar";
import { FamaProgress, LeagueBadge } from "@/components/ranked-parts";
import { describeServerError } from "@/lib/errors";
import {
  claimRankedPrize,
  describePrize,
  fetchMyRanked,
  fetchRankedBoard,
  fetchRankedHall,
  RANKED_BOARD_FORMATS,
  type MyRanked,
  type RankedBoard,
  type RankedBoardEntry,
  type RankedBoardFormat,
  type RankedHallEntry,
} from "@/lib/ranked";

type View = "mandato" | "oro";

/**
 * The Albo dei Reggenti (SPEC §8.7), the tab of the Classifiche for the Classificata: the
 * player's Fama, the prizes of past Mandati to claim, the Mandato in course for all the
 * modes or one, and the podiums of the past ones (Albo d'oro).
 */
export function RankedBoardPanel() {
  const [view, setView] = useState<View>("mandato");
  const [format, setFormat] = useState<RankedBoardFormat | null>(null);
  const [mine, setMine] = useState<MyRanked | null>(null);
  const [board, setBoard] = useState<{ key: string; data: RankedBoard | null; error: string | null } | null>(null);
  const [hall, setHall] = useState<RankedHallEntry[] | null>(null);
  const key = `${view}:${format ?? "all"}`;

  useEffect(() => {
    let cancelled = false;
    fetchMyRanked()
      .then((next) => {
        if (!cancelled) setMine(next);
      })
      .catch((cause: unknown) => console.error("Ranked failed", cause));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (view === "oro") {
      fetchRankedHall()
        .then((next) => {
          if (!cancelled) setHall(next);
        })
        .catch((cause: unknown) => {
          if (!cancelled) setBoard({ key, data: null, error: describeServerError(cause) });
        });
    } else {
      fetchRankedBoard(format)
        .then((data) => {
          if (!cancelled) setBoard({ key, data, error: null });
        })
        .catch((cause: unknown) => {
          if (!cancelled) setBoard({ key, data: null, error: describeServerError(cause) });
        });
    }
    return () => {
      cancelled = true;
    };
  }, [view, format, key]);

  const shown = board?.key === key ? board : null;

  return (
    <>
      {mine && (
        <section className="flex shrink-0 flex-col gap-1.5 bg-panel px-2.5 py-2">
          <FamaProgress fama={mine.fama} league={mine.league} start={mine.league_start} next={mine.next_league_at} />
          <p className="text-[11px] font-semibold leading-4 text-muted">
            Mandato di {mine.season_label}
            {mine.place ? ` · sei ${mine.place}°` : ""} · {mine.season_matches} classificate
            {mine.season_matches < mine.min_matches ? ` (per il premio ne servono ${mine.min_matches})` : ""}
          </p>
          {mine.prizes.map((prize) => (
            <PrizeRow key={prize.season} prize={prize} onClaimed={() => setMine({ ...mine, prizes: mine.prizes.filter((p) => p !== prize) })} />
          ))}
        </section>
      )}

      <div role="tablist" aria-label="Periodo" className="flex shrink-0 gap-1.5">
        {(
          [
            ["mandato", "Mandato"],
            ["oro", "Albo d'oro"],
          ] as const
        ).map(([entry, label]) => (
          <button
            key={entry}
            type="button"
            role="tab"
            aria-selected={entry === view}
            onClick={() => setView(entry)}
            className={`min-h-10 min-w-0 flex-1 border-2 px-1 font-display text-base uppercase ${
              entry === view ? "border-comic-yellow bg-comic-yellow text-black" : "border-panel text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "mandato" ? (
        <>
          <div role="tablist" aria-label="Modalità della Classificata" className="-mx-3 flex shrink-0 gap-1 overflow-x-auto px-3 [scrollbar-width:none]">
            {RANKED_BOARD_FORMATS.map((entry) => (
              <button
                key={entry.label}
                type="button"
                role="tab"
                aria-selected={entry.key === format}
                onClick={() => setFormat(entry.key)}
                className={`min-h-9 shrink-0 whitespace-nowrap px-2.5 text-[13px] font-extrabold uppercase ${
                  entry.key === format ? "bg-foreground text-black" : "bg-panel text-muted"
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <p className="shrink-0 text-xs font-medium leading-4 text-muted">
            {format === null
              ? "La Fama di ogni Reggente: la guadagnano le partite classificate di tutte le modalità."
              : "La Fama guadagnata in questa modalità nel Mandato, vittorie meno sconfitte."}{" "}
            A fine mese il Mandato si chiude con un premio per lega.
          </p>
          <section aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-1">
            {!shown && <p className="text-sm font-semibold text-muted">Caricamento dell&apos;Albo…</p>}
            {shown?.error && <p className="text-sm font-semibold text-comic-magenta">{shown.error}</p>}
            {shown?.data && shown.data.top.length === 0 && (
              <p className="text-sm font-medium text-muted">Ancora nessuno in questo Mandato: puoi essere il primo.</p>
            )}
            {shown?.data && shown.data.top.length > 0 && (
              <>
                <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain">
                  <Ranking board={shown.data} />
                </div>
                <p className="shrink-0 text-center text-xs font-semibold text-muted">
                  {shown.data.players === 1 ? "1 Reggente" : `${shown.data.players} Reggenti`} in questo Mandato
                </p>
              </>
            )}
          </section>
        </>
      ) : (
        <section aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain">
          {hall === null && !shown?.error && <p className="text-sm font-semibold text-muted">Caricamento dell&apos;Albo d&apos;oro…</p>}
          {shown?.error && <p className="text-sm font-semibold text-comic-magenta">{shown.error}</p>}
          {hall?.length === 0 && (
            <p className="text-sm font-medium text-muted">Il primo Mandato si chiude a fine mese: qui resteranno i suoi primi tre.</p>
          )}
          {hall?.map((entry) => (
            <div key={entry.season} className="flex flex-col gap-0.5">
              <h2 className="font-display text-lg uppercase leading-5 text-comic-yellow">Mandato di {entry.label}</h2>
              <ol className="flex flex-col gap-0.5">
                {entry.podium.map((row) => (
                  <Row key={row.place} entry={row} unit="Fama" />
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

/** A Mandato's prize still to claim: coins on the ledger, packs opened at once. */
function PrizeRow({ prize, onClaimed }: { prize: MyRanked["prizes"][number]; onClaimed: () => void }) {
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
        setMessage(`+${result.coins} monete · ora ne hai ${result.coin_balance}`);
        onClaimed();
      })
      .catch((cause: unknown) => setMessage(describeServerError(cause)))
      .finally(() => setBusy(false));
  };
  return (
    <div className="flex items-center justify-between gap-2 bg-comic-yellow px-2.5 py-1.5 text-black">
      <p className="min-w-0 text-[13px] font-bold leading-4">
        Mandato di {prize.label}: {prize.place}° posto, <LeagueBadge league={prize.league} />. Premio: {describePrize(prize)}.
        {message && <span className="block">{message}</span>}
      </p>
      <button type="button" disabled={busy} onClick={claim} className="btn shrink-0 bg-black px-3 font-display text-base uppercase text-comic-yellow">
        Ritira
      </button>
    </div>
  );
}

/** The first Reggenti and, when lower down, the player's own place under them. */
function Ranking({ board }: { board: RankedBoard }) {
  const me = board.me ?? board.top.find((entry) => entry.is_me) ?? null;
  const meBelow = me && !board.top.some((entry) => entry.is_me) ? me : null;
  const unit = board.format === null ? "Fama" : "Fama qui";
  return (
    <>
      <ol className="flex flex-col gap-0.5">
        {board.top.map((entry) => (
          <Row key={entry.place} entry={entry} unit={unit} />
        ))}
      </ol>
      {meBelow && (
        <>
          {meBelow.place > board.top.length + 1 && (
            <p aria-hidden className="text-center font-display leading-4 tracking-[0.4em] text-faint">
              ···
            </p>
          )}
          <ol start={meBelow.place} aria-label="La tua posizione">
            <Row entry={meBelow} unit={unit} />
          </ol>
        </>
      )}
    </>
  );
}

const MEDALS = ["bg-comic-yellow", "bg-[#c9d1d9]", "bg-[#d08b4f]"];

/** A place: rank, avatar, name, title and league, then the Fama and the wins. */
function Row({ entry, unit }: { entry: RankedBoardEntry; unit: string }) {
  const medal = entry.place <= 3 && !entry.is_me ? MEDALS[entry.place - 1] : null;
  return (
    <li
      className={`flex min-h-11 shrink-0 items-center justify-between gap-2 px-2.5 py-1 text-sm font-semibold ${
        entry.is_me ? "bg-comic-yellow text-black" : "bg-panel"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={`flex h-6 min-w-6 shrink-0 items-center justify-center px-0.5 font-display text-lg leading-none ${
            medal ? `${medal} -skew-x-8 text-black` : ""
          }`}
        >
          {entry.place}
        </span>
        <PlayerAvatar username={entry.username} avatarUrl={entry.avatar_url} size="xs" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate leading-4">{entry.username}</span>
          <span className="flex min-w-0 items-center gap-1">
            <LeagueBadge league={entry.league} className="!px-1 !py-0 !text-[9px] !leading-3" />
            {entry.title && (
              <span className={`truncate text-[10px] font-extrabold uppercase leading-3 ${entry.is_me ? "text-black/70" : "text-muted"}`}>
                «{entry.title}»
              </span>
            )}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="font-display text-lg leading-5">
          {entry.value}
          <span className="ml-1 font-sans text-[11px] font-bold">{unit}</span>
        </span>
        <span className={`text-[11px] font-semibold leading-3 ${entry.is_me ? "text-black/70" : "text-muted"}`}>
          {entry.wins} vinte su {entry.matches}
        </span>
      </span>
    </li>
  );
}
