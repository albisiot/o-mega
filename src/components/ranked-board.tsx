"use client";

import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/player-avatar";
import { LeagueBadge, PrizeLine } from "@/components/ranked-parts";
import { describeServerError } from "@/lib/errors";
import {
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

/** Fixed data in place of the server's, for the development scenes (/prova-classificata). */
export type RankedBoardPreview = { mine: MyRanked; board: RankedBoard; hall: RankedHallEntry[] };

/**
 * The Albo dei Reggenti (SPEC §8.7), the tab of the Classifiche for the Classificata: the
 * Mandato in course for all the modes or one, and the podium of each past one (Albo d'oro).
 * Like the other boards it fits the screen with its first 10 and the player's own row, on
 * a short phone too: compact rows, filters that fit one line, one past Mandato at a time.
 */
export function RankedBoardPanel({ preview }: { preview?: RankedBoardPreview }) {
  const [view, setView] = useState<View>("mandato");
  const [format, setFormat] = useState<RankedBoardFormat | null>(null);
  const [mine, setMine] = useState<MyRanked | null>(preview?.mine ?? null);
  const [board, setBoard] = useState<{ key: string; data: RankedBoard | null; error: string | null } | null>(
    preview ? { key: "all", data: preview.board, error: null } : null,
  );
  const [hall, setHall] = useState<RankedHallEntry[] | null>(preview?.hall ?? null);
  const [hallIndex, setHallIndex] = useState(0);
  const [hallError, setHallError] = useState<string | null>(null);
  const key = format ?? "all";

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    fetchMyRanked()
      .then((next) => {
        if (!cancelled) setMine(next);
      })
      .catch((cause: unknown) => console.error("Ranked failed", cause));
    return () => {
      cancelled = true;
    };
  }, [preview]);

  useEffect(() => {
    if (view !== "mandato" || preview) return;
    let cancelled = false;
    fetchRankedBoard(format)
      .then((data) => {
        if (!cancelled) setBoard({ key: format ?? "all", data, error: null });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setBoard({ key: format ?? "all", data: null, error: describeServerError(cause) });
      });
    return () => {
      cancelled = true;
    };
  }, [view, format, preview]);

  useEffect(() => {
    if (view !== "oro" || hall !== null) return;
    let cancelled = false;
    fetchRankedHall()
      .then((next) => {
        if (!cancelled) setHall(next);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setHallError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [view, hall]);

  const shown = board?.key === key ? board : null;
  const prize = mine?.prizes[0] ?? null;
  const past = hall?.[hallIndex] ?? null;

  return (
    <>
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
          <div role="tablist" aria-label="Modalità della Classificata" className="flex shrink-0 gap-1">
            {RANKED_BOARD_FORMATS.map((entry) => (
              <button
                key={entry.label}
                type="button"
                role="tab"
                aria-selected={entry.key === format}
                aria-label={entry.label}
                onClick={() => setFormat(entry.key)}
                className={`min-h-8 min-w-0 flex-auto px-1 text-[12px] font-extrabold uppercase ${
                  entry.key === format ? "bg-foreground text-black" : "bg-panel text-muted"
                }`}
              >
                {entry.short}
              </button>
            ))}
          </div>
          {prize && view === "mandato" ? (
            <PrizeLine prize={prize} onClaimed={() => setMine(mine && { ...mine, prizes: mine.prizes.slice(1) })} />
          ) : (
            <p className="shrink-0 truncate text-xs font-medium leading-4 text-muted">
              {format === null ? "La Fama" : `La Fama guadagnata in ${RANKED_BOARD_FORMATS.find((f) => f.key === format)?.label}`} nel Mandato di{" "}
              {shown?.data?.label ?? mine?.season_label ?? "questo mese"}
              {shown?.data ? ` · ${shown.data.players === 1 ? "1 Reggente" : `${shown.data.players} Reggenti`}` : ""}
            </p>
          )}
          <section aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-1">
            {!shown && <p className="text-sm font-semibold text-muted">Caricamento dell&apos;Albo…</p>}
            {shown?.error && <p className="text-sm font-semibold text-comic-magenta">{shown.error}</p>}
            {shown?.data && shown.data.top.length === 0 && (
              <p className="text-sm font-medium text-muted">Ancora nessuno in questo Mandato: puoi essere il primo.</p>
            )}
            {shown?.data && shown.data.top.length > 0 && <Ranking board={shown.data} />}
          </section>
        </>
      ) : (
        <section aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-1">
          {hall === null && !hallError && <p className="text-sm font-semibold text-muted">Caricamento dell&apos;Albo d&apos;oro…</p>}
          {hallError && <p className="text-sm font-semibold text-comic-magenta">{hallError}</p>}
          {hall?.length === 0 && (
            <p className="text-sm font-medium text-muted">Il primo Mandato si chiude a fine mese: qui resteranno i suoi primi tre.</p>
          )}
          {past && hall && (
            <>
              <div className="flex shrink-0 items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="Mandato più recente"
                  disabled={hallIndex === 0}
                  onClick={() => setHallIndex((i) => Math.max(0, i - 1))}
                  className="btn btn-ghost h-9 w-9 shrink-0 px-0 disabled:opacity-30"
                >
                  ‹
                </button>
                <h2 className="min-w-0 truncate font-display text-lg uppercase leading-5 text-comic-yellow">Mandato di {past.label}</h2>
                <button
                  type="button"
                  aria-label="Mandato precedente"
                  disabled={hallIndex >= hall.length - 1}
                  onClick={() => setHallIndex((i) => Math.min(hall.length - 1, i + 1))}
                  className="btn btn-ghost h-9 w-9 shrink-0 px-0 disabled:opacity-30"
                >
                  ›
                </button>
              </div>
              <ol className="flex flex-col gap-px">
                {past.podium.map((row) => (
                  <Row key={row.place} entry={row} unit="Fama" />
                ))}
              </ol>
            </>
          )}
        </section>
      )}
    </>
  );
}

/** The first Reggenti and, when lower down, the player's own place under them. */
function Ranking({ board }: { board: RankedBoard }) {
  const me = board.me ?? board.top.find((entry) => entry.is_me) ?? null;
  const meBelow = me && !board.top.some((entry) => entry.is_me) ? me : null;
  const unit = board.format === null ? "Fama" : "Fama qui";
  return (
    <>
      <ol className="flex flex-col gap-px">
        {board.top.map((entry) => (
          <Row key={entry.place} entry={entry} unit={unit} />
        ))}
      </ol>
      {meBelow && (
        <>
          {meBelow.place > board.top.length + 1 && (
            <p aria-hidden className="text-center font-display text-xs leading-3 tracking-[0.4em] text-faint">
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

/** A place on one compact line: rank, avatar, name with league and title, Fama and wins. */
function Row({ entry, unit }: { entry: RankedBoardEntry; unit: string }) {
  const medal = entry.place <= 3 && !entry.is_me ? MEDALS[entry.place - 1] : null;
  const faint = entry.is_me ? "text-black/70" : "text-muted";
  return (
    <li
      className={`flex h-[34px] shrink-0 items-center justify-between gap-2 px-2 text-sm font-semibold ${
        entry.is_me ? "bg-comic-yellow text-black" : "bg-panel"
      }`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className={`flex h-[22px] min-w-[22px] shrink-0 items-center justify-center px-0.5 font-display text-base leading-none ${
            medal ? `${medal} -skew-x-8 text-black` : ""
          }`}
        >
          {entry.place}
        </span>
        <PlayerAvatar username={entry.username} avatarUrl={entry.avatar_url} size="xs" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] leading-4">{entry.username}</span>
          <span className="flex min-w-0 items-center gap-1">
            <LeagueBadge league={entry.league} className="!px-1 !py-0 !text-[9px] !leading-3" />
            {entry.title && <span className={`truncate text-[9px] font-extrabold uppercase leading-3 ${faint}`}>«{entry.title}»</span>}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="font-display text-base leading-4">
          {entry.value}
          <span className="ml-1 font-sans text-[10px] font-bold">{unit}</span>
        </span>
        <span className={`text-[10px] font-semibold leading-3 ${faint}`}>
          {entry.wins} vinte su {entry.matches}
        </span>
      </span>
    </li>
  );
}
