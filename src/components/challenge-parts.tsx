"use client";

import Link from "next/link";
import type { BotDifficulty } from "@o-mega/game-engine";
import {
  challengeHref,
  describeChallengePoints,
  describeChallengeRules,
  missingForChallenge,
  playsLeft,
  type Challenge,
} from "@/lib/challenges";
import { formatEventCountdown } from "@/lib/events";
import { DIFFICULTY_LABELS, type MatchChallengeInfo } from "@/lib/match";

/**
 * The pieces of a Sfida a tema (SPEC §8.8) shared by Gioca, the team screen, the result and
 * the event page. The challenge's color comes from the editor's light swatches: text on it is black.
 */

/** The «★ A tema» tag on a mode's tile in Gioca, in line with what the mode needs: it never covers the name. */
export function ChallengeRibbon({ color }: { color: string }) {
  return (
    <span
      className="-rotate-2 border-2 border-black px-1 font-sfx text-[13px] leading-[14px] tracking-wide text-black"
      style={{ background: color }}
      aria-hidden
    >
      ★ A tema
    </span>
  );
}

/** The rules as chips: "Figli dell'Ultima", "Delta o Gamma", "★ Almeno 1 variante". */
export function ChallengeRuleChips({ challenge, className = "" }: { challenge: Pick<Challenge, "admitted" | "rules" | "color">; className?: string }) {
  return (
    <span className={`flex flex-wrap gap-1 ${className}`}>
      {describeChallengeRules(challenge).map((rule) => (
        <span
          key={rule}
          className="border-2 px-1.5 text-[11px] font-extrabold leading-4 text-foreground"
          style={{ borderColor: challenge.color }}
        >
          {rule}
        </span>
      ))}
    </span>
  );
}

/**
 * A challenge in its mode's sheet: rules, time left, the player's characters, the matches of
 * the day, the event points, and its bots. Without a squad to field, it says what is missing.
 */
export function ChallengeCard({ challenge, now, disabled }: { challenge: Challenge; now: number; disabled: boolean }) {
  const missing = missingForChallenge(challenge);
  const left = playsLeft(challenge);
  const closed = missing !== null || left === 0 || disabled;
  return (
    <article className="flex flex-col border-[3px] border-black bg-panel shadow-[3px_3px_0_#000]">
      <header className="flex items-baseline justify-between gap-2 border-b-[3px] border-black px-2.5 py-1 text-black" style={{ background: challenge.color }}>
        <h3 className="min-w-0 truncate font-display text-xl uppercase leading-6">{challenge.title}</h3>
        <span className="shrink-0 text-[11px] font-extrabold">Finisce tra {formatEventCountdown(Date.parse(challenge.ends_at) - now)}</span>
      </header>
      <div className="flex flex-col gap-1.5 px-2.5 py-2">
        {challenge.description && <p className="text-[13px] font-medium leading-4 text-muted">{challenge.description}</p>}
        <ChallengeRuleChips challenge={challenge} />
        <dl className="text-[12px] font-semibold leading-4">
          {challenge.my_characters !== null && (
            <div className="flex justify-between gap-2 border-b border-line/50 py-1">
              <dt className="text-muted">I tuoi personaggi adatti</dt>
              <dd className={`font-extrabold ${missing ? "text-comic-magenta" : "text-comic-cyan"}`}>
                {challenge.my_characters}
                {missing ? "" : " ✓"}
              </dd>
            </div>
          )}
          {challenge.daily_limit !== null && (
            <div className="flex justify-between gap-2 border-b border-line/50 py-1">
              <dt className="text-muted">Partite di oggi</dt>
              <dd className="font-extrabold">
                {challenge.plays_today} di {challenge.daily_limit}
              </dd>
            </div>
          )}
          {challenge.event && challenge.event_points && (
            <div className="flex justify-between gap-2 py-1">
              <dt className="min-w-0 truncate text-muted">Punti · {challenge.event.title}</dt>
              <dd className="shrink-0 font-extrabold">{describeChallengePoints(challenge.event_points)}</dd>
            </div>
          )}
        </dl>
        {missing ? (
          <div className="flex flex-col gap-1.5 border-[3px] border-comic-magenta bg-comic-magenta/15 px-2.5 py-1.5 text-[13px] leading-4">
            <p className="font-extrabold">{missing}</p>
            <p className="font-medium text-muted">Li trovi nei pacchetti: nell&apos;album vedi quali hai già.</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Link href="/collezione" className="btn btn-ghost min-h-10 text-sm">
                Album
              </Link>
              <Link href="/negozio" className="btn btn-ghost min-h-10 text-sm">
                Negozio
              </Link>
            </div>
          </div>
        ) : left === 0 ? (
          <p className="text-[13px] font-extrabold leading-4 text-comic-magenta">Hai giocato tutte le partite di oggi: torna dopo mezzanotte.</p>
        ) : (
          challenge.bot_follows_rules && (
            <p className="text-[11px] font-semibold leading-4 text-muted">Il bot gioca con le stesse regole.</p>
          )
        )}
        {/* Without a squad to field, the way to get one takes the bots' place. */}
        {!missing && <ChallengeBots challenge={challenge} closed={closed} />}
      </div>
    </article>
  );
}

/** The bots a challenge allows, each straight to the team screen. */
function ChallengeBots({ challenge, closed }: { challenge: Challenge; closed: boolean }) {
  const columns = challenge.bot_difficulties.length === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <div className={`grid gap-1.5 ${columns} ${closed ? "pointer-events-none opacity-40" : ""}`} aria-disabled={closed}>
      {challenge.bot_difficulties.map((difficulty: BotDifficulty) => (
        <Link
          key={difficulty}
          href={challengeHref(challenge, difficulty)}
          aria-label={`${challenge.title}: contro il bot ${DIFFICULTY_LABELS[difficulty]}`}
          className="flex min-h-11 items-center justify-center px-2 font-display text-lg uppercase leading-5 text-black"
          style={{ background: challenge.color }}
        >
          {DIFFICULTY_LABELS[difficulty]}
        </Link>
      ))}
    </div>
  );
}

/** On the result: the challenge, and the matches left today when there is a limit. */
export function ChallengeResultChip({ challenge, chip }: { challenge: MatchChallengeInfo | null | undefined; chip: string }) {
  if (!challenge) return null;
  return (
    <p className={`${chip} text-black`} style={{ background: challenge.color }}>
      ★ {challenge.title}
      {challenge.daily_limit !== null && ` · oggi ${Math.min(challenge.plays_today, challenge.daily_limit)}/${challenge.daily_limit}`}
    </p>
  );
}
