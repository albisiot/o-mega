"use client";

import { useEffect, useRef, useState } from "react";
import { BackLink } from "@/components/comic-parts";
import { PlayerAvatar } from "@/components/player-avatar";
import { RankedBoardPanel, type RankedBoardPreview } from "@/components/ranked-board";
import { balance } from "@/config/balance";
import { describeServerError } from "@/lib/errors";
import {
  BOARDS,
  boardInfo,
  emptyLine,
  entryNumbers,
  fetchLeaderboard,
  isMatchBoard,
  PERIOD_LABELS,
  periodFor,
  playersLine,
  pointsRule,
  type Leaderboard,
  type LeaderboardBoard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "@/lib/leaderboards";
import { useLockedScreen } from "@/lib/use-locked-screen";

/** The weekly title of each board (the server gives it; here only to tell the player). */
const WEEKLY_TITLES: Partial<Record<LeaderboardBoard, string>> = {
  general: "Campione della settimana",
  emergency: "Campione dell'Emergenza",
  emergency_week: "Eroe della settimana",
  classic: "Campione della Classica",
  boss: "Campione di Grande Minaccia",
  triple: "Campione di Allarme Triplo",
  quadrant: "Campione di Quadrante",
  conquest: "Campione di Conquista",
};

/**
 * The Classifiche (SPEC §8.6): a tab per board, the periods it has, the first players and the
 * player's own place. The page fits the screen: the tabs scroll sideways inside their row, the
 * list scrolls inside the room left. The first tab is the Albo dei Reggenti of the
 * Classificata (SPEC §8.7), with a panel of its own.
 */
export function LeaderboardView({
  initialBoard,
  initialPeriod,
  initialAlbo = false,
  rankedPreview,
}: {
  initialBoard: LeaderboardBoard;
  initialPeriod: LeaderboardPeriod | null;
  initialAlbo?: boolean;
  /** Development scenes: the Albo with fixed data. */
  rankedPreview?: RankedBoardPreview;
}) {
  useLockedScreen(true);
  const [albo, setAlbo] = useState(initialAlbo);
  const [board, setBoard] = useState(initialBoard);
  const [period, setPeriod] = useState(() => periodFor(initialBoard, initialPeriod));
  const [result, setResult] = useState<{ key: string; data: Leaderboard | null; error: string | null } | null>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const key = `${board}:${period}`;

  useEffect(() => {
    if (albo) return;
    let cancelled = false;
    fetchLeaderboard(board, period)
      .then((data) => {
        if (!cancelled) setResult({ key: `${board}:${period}`, data, error: null });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setResult({ key: `${board}:${period}`, data: null, error: describeServerError(cause) });
      });
    return () => {
      cancelled = true;
    };
  }, [albo, board, period]);

  // The chosen tab in view, also when it opens on one far to the right.
  useEffect(() => {
    const chosen = tabs.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    chosen?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [albo, board]);

  const info = boardInfo(board);
  const shown = result?.key === key ? result : null;
  const rule = isMatchBoard(board) ? pointsRule(balance.leaderboards.points) : info.rule;
  const title = WEEKLY_TITLES[board];

  const pickBoard = (next: LeaderboardBoard) => {
    setAlbo(false);
    setBoard(next);
    // The same period when the new board has it: Settimana stays Settimana.
    setPeriod((current) => periodFor(next, current));
  };

  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        {/* Back where it was opened from (home, Gioca, profile, a banner), the home otherwise. */}
        <BackLink href="/" />
        <h1 className="min-w-0 truncate font-display text-[32px] uppercase leading-10 text-comic-yellow">Classifiche</h1>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <div
          ref={tabs}
          role="tablist"
          aria-label="Modalità"
          className="-mx-3 flex shrink-0 gap-1.5 overflow-x-auto overscroll-x-contain px-3 pb-0.5 [scrollbar-width:none]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={albo}
            onClick={() => setAlbo(true)}
            className={`min-h-11 shrink-0 -skew-x-8 whitespace-nowrap px-3 font-display text-[17px] uppercase ${
              albo ? "bg-comic-magenta text-black" : "bg-foreground text-black"
            }`}
          >
            Albo
          </button>
          {BOARDS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={!albo && entry.key === board}
              onClick={() => pickBoard(entry.key)}
              className={`min-h-11 shrink-0 -skew-x-8 whitespace-nowrap px-3 font-display text-[17px] uppercase ${
                !albo && entry.key === board ? "bg-comic-magenta text-black" : "bg-panel text-muted"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {albo && <RankedBoardPanel preview={rankedPreview} />}

        {!albo && info.periods.length > 1 && (
          <div role="tablist" aria-label="Periodo" className="flex shrink-0 gap-1.5">
            {info.periods.map((entry) => (
              <button
                key={entry}
                type="button"
                role="tab"
                aria-selected={entry === period}
                onClick={() => setPeriod(entry)}
                className={`min-h-10 min-w-0 flex-1 border-2 px-1 font-display text-base uppercase ${
                  entry === period ? "border-comic-yellow bg-comic-yellow text-black" : "border-panel text-muted"
                }`}
              >
                {PERIOD_LABELS[entry]}
              </button>
            ))}
          </div>
        )}

        <p className={albo ? "hidden" : "shrink-0 text-xs font-medium leading-4 text-muted"}>
          {rule}
          {title && period !== "all" && ` Il primo della settimana riceve il titolo «${title}» fino alla domenica dopo.`}
        </p>

        <section aria-live="polite" className={albo ? "hidden" : "flex min-h-0 flex-1 flex-col gap-1"}>
          {!shown && <p className="text-sm font-semibold text-muted">Caricamento della classifica…</p>}
          {shown?.error && <p className="text-sm font-semibold text-comic-magenta">{shown.error}</p>}
          {shown?.data && shown.data.top.length === 0 && (
            <p className="text-sm font-medium text-muted">{emptyLine(board, period)}</p>
          )}
          {shown?.data && shown.data.top.length > 0 && (
            <>
              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain">
                <Ranking board={shown.data} />
              </div>
              <p className="shrink-0 text-center text-xs font-semibold text-muted">
                {playersLine(shown.data.players, shown.data.period)}
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

/** The first players and, when lower down, the player's own place under them. */
function Ranking({ board }: { board: Leaderboard }) {
  const me = board.me ?? board.top.find((entry) => entry.is_me) ?? null;
  const meBelow = me && !board.top.some((entry) => entry.is_me) ? me : null;
  return (
    <>
      <ol className="flex flex-col gap-0.5">
        {board.top.map((entry) => (
          <Row key={entry.rank} board={board} entry={entry} />
        ))}
      </ol>
      {meBelow && (
        <>
          {meBelow.rank > board.top.length + 1 && (
            <p aria-hidden className="text-center font-display leading-4 tracking-[0.4em] text-faint">
              ···
            </p>
          )}
          <ol start={meBelow.rank} aria-label="La tua posizione">
            <Row board={board} entry={meBelow} />
          </ol>
        </>
      )}
    </>
  );
}

const MEDALS = ["bg-comic-yellow", "bg-[#c9d1d9]", "bg-[#d08b4f]"];

/** A place: rank, avatar, name and title, then the numbers. Never teams or cards. */
function Row({ board, entry }: { board: Leaderboard; entry: LeaderboardEntry }) {
  const numbers = entryNumbers(board.board, board.period, entry, board.min_matches_for_rate);
  const medal = entry.rank <= 3 && !entry.is_me ? MEDALS[entry.rank - 1] : null;
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
          {entry.rank}
        </span>
        <PlayerAvatar username={entry.username} avatarUrl={entry.avatar_url} size="xs" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate leading-4">{entry.username}</span>
          {entry.title && (
            <span className={`truncate text-[10px] font-extrabold uppercase leading-3 ${entry.is_me ? "text-black/70" : "text-muted"}`}>
              «{entry.title}»
            </span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="font-display text-lg leading-5">
          {numbers.value}
          {numbers.unit && <span className="ml-1 font-sans text-[11px] font-bold">{numbers.unit}</span>}
        </span>
        {numbers.note && (
          <span className={`text-[11px] font-semibold leading-3 ${entry.is_me ? "text-black/70" : "text-muted"}`}>{numbers.note}</span>
        )}
      </span>
    </li>
  );
}
