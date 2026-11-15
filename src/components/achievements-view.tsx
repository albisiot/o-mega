"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { describeServerError } from "@/lib/errors";
import {
  TIERS,
  TIER_COLORS,
  TIER_LABELS,
  availableTitles,
  claimAchievement,
  describeAchievementReward,
  fetchAchievements,
  hasReward,
  setPlayerTitle,
  tierCounts,
  type Achievement,
  type AchievementBoard,
  type CompletedAchievement,
} from "@/lib/achievements";
import { fetchLeaderboardTitles, type LeaderboardTitle } from "@/lib/leaderboards";
import { packRevealHref } from "@/lib/packs";

const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeZone: "Europe/Rome" });

/** The board of the Imprese: secret medals with their hint, the discovered ones in full. */
export function AchievementsView() {
  const router = useRouter();
  const { profile, setProfile } = useAuth();
  const [board, setBoard] = useState<AchievementBoard | null>(null);
  const [weeklyTitles, setWeeklyTitles] = useState<LeaderboardTitle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; failed: boolean } | null>(null);

  // The weekly titles of the Classifiche join the choice; without them the Imprese still show.
  useEffect(() => {
    let cancelled = false;
    fetchLeaderboardTitles()
      .then((next) => {
        if (!cancelled) setWeeklyTitles(next);
      })
      .catch((cause: unknown) => console.error("Weekly titles failed", cause));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAchievements()
      .then((next) => {
        if (!cancelled) setBoard(next);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(describeServerError(reason));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!board) return <p className="text-sm font-semibold text-muted">{error ?? "Caricamento delle imprese…"}</p>;

  const counts = tierCounts(board);
  const titles = availableTitles(board, weeklyTitles);

  const claim = (achievement: CompletedAchievement) => {
    setBusy(achievement.id);
    setMessage(null);
    claimAchievement(achievement.id)
      .then((result) => {
        if (result.opening_ids.length > 0) {
          router.push(packRevealHref(result.opening_ids));
          return;
        }
        setMessage({ id: achievement.id, text: `+${result.coins} monete!`, failed: false });
        return fetchAchievements().then(setBoard);
      })
      .catch((reason: unknown) => setMessage({ id: achievement.id, text: describeServerError(reason), failed: true }))
      .finally(() => setBusy(null));
  };

  const chooseTitle = (id: string | null) => {
    setBusy("title");
    setMessage(null);
    setPlayerTitle(id)
      .then((title) => {
        setBoard({ ...board, title });
        if (profile) setProfile({ ...profile, title });
      })
      .catch((reason: unknown) => setMessage({ id: "title", text: describeServerError(reason), failed: true }))
      .finally(() => setBusy(null));
  };

  return (
    <>
      <section className="flex shrink-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 font-display text-[26px] uppercase leading-7 text-comic-yellow">
            {board.discovered} / {board.total} <span className="text-lg">scoperte</span>
          </p>
          <div className="flex min-w-0 flex-wrap justify-end gap-1" aria-label="Scoperte per grado">
            {TIERS.map((tier) => (
              <span
                key={tier}
                className="-skew-x-8 px-1.5 py-0.5 text-[11px] font-extrabold uppercase leading-4 text-black"
                style={{ backgroundColor: TIER_COLORS[tier] }}
                title={TIER_LABELS[tier]}
              >
                {TIER_LABELS[tier].slice(0, 3)} {counts[tier].done}/{counts[tier].total}
              </span>
            ))}
          </div>
        </div>
        <div className="h-2 bg-black" aria-hidden>
          <div
            className="h-full bg-comic-magenta"
            style={{ width: `${board.total > 0 ? Math.round((board.discovered / board.total) * 100) : 0}%` }}
          />
        </div>
        {titles.length > 0 && (
          <label className="flex items-center gap-2 text-[13px] font-bold">
            <span className="shrink-0">Il tuo titolo</span>
            <select
              value={titles.find((t) => t.title === board.title)?.id ?? ""}
              disabled={busy !== null}
              onChange={(event) => chooseTitle(event.target.value || null)}
              className="min-h-11 min-w-0 flex-1 border-2 border-comic-yellow bg-black px-2 text-base font-semibold"
            >
              <option value="">Nessun titolo</option>
              {titles.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.weekly ? `${entry.title} (questa settimana)` : entry.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {message?.id === "title" && <p className="text-[13px] font-bold text-comic-magenta">{message.text}</p>}
      </section>

      <ol className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(2,minmax(0,1fr))] gap-2 overflow-y-auto overscroll-contain pb-1">
        {board.achievements.map((achievement) => (
          <Medal
            key={achievement.id}
            achievement={achievement}
            busy={busy === achievement.id}
            disabled={busy !== null}
            message={message?.id === achievement.id ? message : null}
            onClaim={claim}
          />
        ))}
        {board.achievements.length === 0 && (
          <li className="col-span-2 text-sm font-semibold text-muted">Nessuna impresa per ora: torna presto.</li>
        )}
      </ol>

      <p className="shrink-0 text-xs font-medium leading-4 text-muted">
        Le imprese restano segrete finché non le compi: a volte c&apos;è un indizio. Contano anche quello che hai fatto prima,
        ma non le partite abbandonate. I premi non scadono.{" "}
        <Link href="/obiettivi/" className="font-bold text-comic-cyan underline">
          Obiettivi del giorno
        </Link>
      </p>
    </>
  );
}

function Medal({
  achievement,
  busy,
  disabled,
  message,
  onClaim,
}: {
  achievement: Achievement;
  busy: boolean;
  disabled: boolean;
  message: { text: string; failed: boolean } | null;
  onClaim: (achievement: CompletedAchievement) => void;
}) {
  const color = TIER_COLORS[achievement.tier] ?? TIER_COLORS.bronze;
  const tierLabel = TIER_LABELS[achievement.tier] ?? "";

  if (!achievement.done) {
    return (
      <li className="flex min-w-0 flex-col items-center gap-1 bg-panel px-2 py-2.5 text-center">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full border-[3px] border-dashed bg-black font-display text-2xl text-muted"
          style={{ borderColor: color }}
        >
          ?
        </span>
        <p className="max-w-full font-display text-lg uppercase leading-5 text-muted">
          ???<span className="sr-only"> Impresa segreta, grado {tierLabel}</span>
        </p>
        <p className="text-[11px] font-extrabold uppercase leading-3" style={{ color }} aria-hidden>
          {tierLabel}
        </p>
        {achievement.hint && <p className="max-w-full text-xs font-semibold italic leading-4 text-muted [overflow-wrap:anywhere]">«{achievement.hint}»</p>}
      </li>
    );
  }

  const claimable = !achievement.claimed && hasReward(achievement);
  return (
    <li
      className={`relative flex min-w-0 flex-col items-center gap-1 px-2 py-2.5 text-center ${
        claimable ? "bg-comic-yellow text-black" : "bg-panel-raised"
      }`}
    >
      {/* Inside the tile, and only the medal turns: nothing may stick out of the list sideways. */}
      {achievement.new && (
        <span className="absolute right-1 top-1 -rotate-6 bg-comic-magenta px-1.5 text-[11px] font-extrabold uppercase leading-5 text-black">
          Nuova!
        </span>
      )}
      <span
        aria-hidden
        className={`flex size-14 items-center justify-center rounded-full border-[3px] border-black font-sfx text-2xl text-black shadow-[2px_2px_0_#000] ${
          achievement.new ? "animate-card-reveal" : ""
        }`}
        style={{ backgroundColor: color }}
      >
        ★
      </span>
      <p className="max-w-full font-display text-lg uppercase leading-5 [overflow-wrap:anywhere]">{achievement.name}</p>
      <p className="text-[11px] font-extrabold uppercase leading-3" style={claimable ? undefined : { color }}>
        {tierLabel} · {dateFormat.format(new Date(achievement.completed_at))}
      </p>
      <p className={`max-w-full text-xs font-semibold leading-4 [overflow-wrap:anywhere] ${claimable ? "" : "text-muted"}`}>{achievement.description}</p>
      <p className={`max-w-full text-xs font-extrabold leading-4 [overflow-wrap:anywhere] ${claimable ? "" : "text-comic-yellow"}`}>
        {describeAchievementReward(achievement)}
      </p>
      {achievement.retired && <p className="text-[11px] font-bold uppercase leading-4 text-comic-cyan">Non più ottenibile</p>}
      {message && (
        <p className={`text-xs font-bold leading-4 ${message.failed ? "text-comic-magenta" : ""}`} role="status">
          {message.text}
        </p>
      )}
      {claimable ? (
        <button
          type="button"
          onClick={() => onClaim(achievement)}
          disabled={disabled}
          className="btn btn-primary mt-auto min-h-11 w-full px-2 text-base"
        >
          {busy ? "Riscatto…" : "Riscatta"}
        </button>
      ) : achievement.claimed && achievement.opening_ids.length > 0 ? (
        <Link href={packRevealHref(achievement.opening_ids)} className="mt-auto min-h-11 py-3 text-xs font-extrabold uppercase underline">
          Rivedi le carte
        </Link>
      ) : null}
    </li>
  );
}
