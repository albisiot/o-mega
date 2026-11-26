"use client";

// Classifiche → Scontro (SPEC §5.19, docs/COMBAT.md, stage 6b): the board of the Scontro a squadre
// challenges, season by season (a calendar month, as the Mandato of the Classificata): the first ten
// by Gloria with their league, the challenges and the wins, the player's own place below when lower,
// and the past seasons to choose. The server ranks and closes the seasons; this only shows them.

import { useEffect, useState } from "react";
import { PlayerAvatar } from "@/components/player-avatar";
import { LeagueBadge } from "@/components/ranked-parts";
import { balance } from "@/config/balance";
import { fetchCombatArenaBoard, type CombatArenaBoard, type CombatArenaBoardEntry } from "@/lib/combat";
import { describeServerError } from "@/lib/errors";

const MEDALS = ["bg-comic-yellow", "bg-[#c9d1d9]", "bg-[#d08b4f]"];

export function CombatArenaBoardPanel({ preview }: { preview?: CombatArenaBoard }) {
  // null: the season in course.
  const [season, setSeason] = useState<string | null>(null);
  const [board, setBoard] = useState<{ key: string; data: CombatArenaBoard | null; error: string | null } | null>(
    preview ? { key: "", data: preview, error: null } : null,
  );
  const [seasons, setSeasons] = useState<CombatArenaBoard["seasons"]>(preview?.seasons ?? []);
  const key = season ?? "";

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    fetchCombatArenaBoard(season)
      .then((data) => {
        if (cancelled) return;
        setBoard({ key: season ?? "", data, error: null });
        if (data.current) setSeasons(data.seasons);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setBoard({ key: season ?? "", data: null, error: describeServerError(cause) });
      });
    return () => {
      cancelled = true;
    };
  }, [season, preview]);

  const shown = board?.key === key ? board : null;
  const data = shown?.data ?? null;
  const me = data ? (data.me ?? data.top.find((entry) => entry.is_me) ?? null) : null;
  const meBelow = data && me && !data.top.some((entry) => entry.is_me) ? me : null;

  return (
    <section aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-1.5">
      <p className="shrink-0 text-xs font-medium leading-4 text-muted">
        La Gloria delle sfide dello Scontro a squadre, stagione per stagione (un mese): a fine stagione ognuno riceve il premio della sua lega, se ha fatto almeno{" "}
        {balance.combatArena.season.minChallenges} sfide.
      </p>
      {seasons.length > 0 && (
        <select
          value={season ?? ""}
          onChange={(e) => setSeason(e.target.value || null)}
          aria-label="Stagione"
          className="min-h-10 shrink-0 rounded-md border-2 border-black bg-panel px-2 text-[13px] font-bold"
        >
          <option value="">Stagione in corso</option>
          {seasons.map((s) => (
            <option key={s.season} value={s.season}>
              {s.label}
            </option>
          ))}
        </select>
      )}
      {!shown && <p className="text-sm font-semibold text-muted">Caricamento della classifica…</p>}
      {shown?.error && <p className="text-sm font-semibold text-comic-magenta">{shown.error}</p>}
      {data && data.top.length === 0 && (
        <p className="text-sm font-medium text-muted">
          {data.current ? "Nessuna sfida ancora in questa stagione: sfida qualcuno dallo Scontro a squadre." : `Nessuna sfida a ${data.label}.`}
        </p>
      )}
      {data && data.top.length > 0 && (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain">
            <ol className="flex flex-col gap-0.5">
              {data.top.map((entry) => (
                <Row key={entry.place} entry={entry} />
              ))}
            </ol>
            {meBelow && (
              <>
                {meBelow.place > data.top.length + 1 && (
                  <p aria-hidden className="text-center font-display leading-4 tracking-[0.4em] text-faint">
                    ···
                  </p>
                )}
                <ol start={meBelow.place} aria-label="La tua posizione">
                  <Row entry={meBelow} />
                </ol>
              </>
            )}
          </div>
          <p className="shrink-0 text-center text-xs font-semibold text-muted">
            {data.players === 1 ? "1 giocatore" : `${data.players} giocatori`} · {data.current ? `stagione di ${data.label}` : data.label}
          </p>
        </>
      )}
    </section>
  );
}

function Row({ entry }: { entry: CombatArenaBoardEntry }) {
  const medal = entry.place <= 3 && !entry.is_me ? MEDALS[entry.place - 1] : null;
  return (
    <li
      className={`flex min-h-11 shrink-0 items-center justify-between gap-2 px-2.5 py-1 text-sm font-semibold ${
        entry.is_me ? "bg-comic-yellow text-black" : "bg-panel"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={`flex h-6 min-w-6 shrink-0 items-center justify-center px-0.5 font-display text-lg leading-none ${medal ? `${medal} -skew-x-8 text-black` : ""}`}
        >
          {entry.place}
        </span>
        <PlayerAvatar username={entry.username} avatarUrl={entry.avatar_url} size="xs" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate leading-4">{entry.username}</span>
          <span className="mt-0.5">
            <LeagueBadge league={entry.league} dark={!entry.is_me} />
          </span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="font-display text-lg leading-5">
          {entry.points}
          <span className="ml-1 font-sans text-[11px] font-bold">Gloria</span>
        </span>
        <span className={`text-[11px] font-semibold leading-3 ${entry.is_me ? "text-black/70" : "text-muted"}`}>
          {entry.challenges === 1 ? "1 sfida" : `${entry.challenges} sfide`} · {entry.wins} vinte
        </span>
      </span>
    </li>
  );
}
