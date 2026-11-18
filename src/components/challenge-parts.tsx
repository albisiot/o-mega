"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { BotDifficulty } from "@o-mega/game-engine";
import { useCardDetail } from "@/components/card-detail";
import { CardView } from "@/components/card-view";
import { TrophyIcon } from "@/components/leaderboard-places";
import { useOpenPackReveal } from "@/components/pack-reveal-link";
import {
  challengeEmergencyHref,
  challengeHref,
  challengeLeaderboardHref,
  challengeOnlineHref,
  describeChallengePoints,
  describeChallengeRules,
  describeMatchRules,
  describeMatchRulesChip,
  hasSuppliedTeam,
  describeChallengeTierReward,
  markChallengeRewardsSeen,
  missingForChallenge,
  playsLeft,
  unseenChallengeOpenings,
  type Challenge,
} from "@/lib/challenges";
import { formatEventCountdown } from "@/lib/events";
import { DIFFICULTY_LABELS, type MatchChallengeInfo } from "@/lib/match";
import { LONG_PRESS_CLASS } from "@/lib/use-long-press";

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

/**
 * The rules as chips: "Figli dell'Ultima", "Delta o Gamma", "★ Almeno 1 variante", "Senza
 * starter", the composition, then the match rules ("Ogni round: Colpo mirato", "Minacce di Giza").
 */
export function ChallengeRuleChips({
  challenge,
  className = "",
}: {
  challenge: Pick<
    Challenge,
    "admitted" | "rules" | "color" | "banned_names" | "only_names" | "variant_style_names" | "rarity_max_info" | "supplied_team" | "match_rules"
  >;
  className?: string;
}) {
  return (
    <span className={`flex flex-wrap gap-1 ${className}`}>
      {[...describeChallengeRules(challenge), describeMatchRulesChip(challenge)].filter((rule): rule is string => rule !== null).map((rule) => (
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
 * the day, the prize, the event points, then how to play it (bots, online). Without a squad to
 * field (or the level), it says what is missing.
 */
export function ChallengeCard({ challenge, now, disabled }: { challenge: Challenge; now: number; disabled: boolean }) {
  const missing = missingForChallenge(challenge);
  const left = playsLeft(challenge);
  const closed = missing !== null || left === 0 || disabled;
  const isQuadrant = challenge.format === "quadrant" || challenge.format === "quadrant_shifting";
  const isEmergency = challenge.format === "emergency";
  const supplied = hasSuppliedTeam(challenge);
  return (
    <article className="flex flex-col border-[3px] border-black bg-panel shadow-[3px_3px_0_#000]">
      <header className="flex items-center justify-between gap-2 border-b-[3px] border-black px-2.5 py-1 text-black" style={{ background: challenge.color }}>
        <h3 className="min-w-0 truncate font-display text-xl uppercase leading-6">{challenge.title}</h3>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="text-[11px] font-extrabold">Finisce tra {formatEventCountdown(Date.parse(challenge.ends_at) - now)}</span>
          {challenge.leaderboard && (
            <Link
              href={challengeLeaderboardHref(challenge)}
              aria-label={`Classifica della sfida ${challenge.title}`}
              className="-my-1 flex h-8 w-8 items-center justify-center border-2 border-black bg-black/10"
            >
              <TrophyIcon className="h-4 w-4" />
            </Link>
          )}
        </span>
      </header>
      <div className="flex flex-col gap-1.5 px-2.5 py-2">
        {challenge.description && <p className="text-[13px] font-medium leading-4 text-muted">{challenge.description}</p>}
        <ChallengeRuleChips challenge={challenge} />
        <dl className="text-[12px] font-semibold leading-4">
          {isEmergency && challenge.emergency_threats != null && (
            <Row label="Minacce · un tentativo">{challenge.emergency_threats}</Row>
          )}
          {challenge.my_characters !== null && !supplied && (
            <Row label="I tuoi personaggi adatti">
              <span className={missing ? "text-comic-magenta" : "text-comic-cyan"}>
                {challenge.my_characters}
                {missing ? "" : " ✓"}
              </span>
            </Row>
          )}
          {challenge.daily_limit !== null && (
            <Row label="Partite di oggi">
              {challenge.plays_today} di {challenge.daily_limit}
            </Row>
          )}
          {challenge.min_level != null && <Row label="Dal livello">{challenge.min_level}</Row>}
          {isQuadrant && challenge.quadrant_seal_target != null && (
            <Row label="Traguardo di Sigilli">{challenge.quadrant_seal_target}</Row>
          )}
          {challenge.event && challenge.event_points && (
            <Row label={`Punti · ${challenge.event.title}`}>{describeChallengePoints(challenge.event_points)}</Row>
          )}
        </dl>
        <ChallengePrize challenge={challenge} />
        {missing ? (
          <div className="flex flex-col gap-1.5 border-[3px] border-comic-magenta bg-comic-magenta/15 px-2.5 py-1.5 text-[13px] leading-4">
            <p className="font-extrabold">{missing}</p>
            {challenge.min_level == null || challenge.my_level == null || challenge.my_level >= challenge.min_level ? (
              <>
                <p className="font-medium text-muted">Li trovi nei pacchetti: nell&apos;album vedi quali hai già.</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <Link href="/collezione" className="btn btn-ghost min-h-10 text-sm">
                    Album
                  </Link>
                  <Link href="/negozio" className="btn btn-ghost min-h-10 text-sm">
                    Negozio
                  </Link>
                </div>
              </>
            ) : (
              <p className="font-medium text-muted">Ogni partita ti dà esperienza: torna quando sei salito.</p>
            )}
          </div>
        ) : left === 0 ? (
          <p className="text-[13px] font-extrabold leading-4 text-comic-magenta">Hai giocato tutte le partite di oggi: torna dopo mezzanotte.</p>
        ) : null}
        {/* Without a squad to field, the way to get one takes the bots' place. */}
        {!missing && isEmergency && <ChallengeEmergencyButton challenge={challenge} closed={missing !== null || disabled} />}
        {!missing && !isEmergency && (
          <>
            {challenge.bot_difficulties.length > 0 && <ChallengeBots challenge={challenge} closed={closed} />}
            {challenge.online && <ChallengeOnline challenge={challenge} closed={closed} />}
          </>
        )}
      </div>
    </article>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-2 border-b border-line/50 py-0.5 last:border-b-0">
      <dt className="min-w-0 truncate text-muted">{label}</dt>
      <dd className="shrink-0 font-extrabold">{children}</dd>
    </div>
  );
}

/**
 * The prize of the challenge: its targets of wins, those reached ticked, and the button that
 * reveals what it paid when there is something not seen yet.
 */
export function ChallengePrize({ challenge }: { challenge: Challenge }) {
  const openReveal = useOpenPackReveal();
  const [opening, setOpening] = useState(false);
  const tiers = challenge.tiers ?? [];
  if (tiers.length === 0) return null;
  const toOpen = unseenChallengeOpenings(challenge);
  const wins = challenge.my_wins ?? 0;
  // An Emergenza counts the threats passed in the run.
  const unit = (count: number) =>
    challenge.format === "emergency" ? (count === 1 ? "Minaccia superata" : "Minacce superate") : count === 1 ? "vittoria" : "vittorie";
  return (
    <section aria-label="Premio della sfida" className="flex flex-col gap-0.5 border-2 border-dashed px-2 py-1" style={{ borderColor: challenge.color }}>
      <div className="flex min-h-7 items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted">
          Premio della sfida · {wins} {unit(wins)}
        </p>
        {toOpen.length > 0 && (
          <button
            type="button"
            disabled={opening}
            onClick={() => {
              setOpening(true);
              markChallengeRewardsSeen(challenge.id)
                .catch((cause: unknown) => console.error("Marking challenge rewards failed", cause))
                .finally(() => openReveal(toOpen));
            }}
            className="shrink-0 bg-comic-yellow px-2 py-1 font-display text-sm uppercase leading-4 text-black"
          >
            {opening ? "Apertura…" : "Apri il premio"}
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-0.5 text-[12px] font-bold leading-4">
        {tiers.map((tier) => (
          <li key={tier.tier} className={`flex justify-between gap-2 ${tier.reached ? "text-comic-cyan" : ""}`}>
            <span className="shrink-0">
              {tier.reached ? "✓ " : ""}
              {tier.wins} {unit(tier.wins)}
            </span>
            <span className="min-w-0 truncate text-right">{describeChallengeTierReward(tier)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One row per number of bots: the bots of a challenge always stay on one line. */
const BOT_COLUMNS = ["grid-cols-1", "grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"];

/** The bots a challenge allows, on one row, each straight to the team screen. */
function ChallengeBots({ challenge, closed }: { challenge: Challenge; closed: boolean }) {
  const count = challenge.bot_difficulties.length;
  return (
    <div className={`grid gap-1.5 ${BOT_COLUMNS[count] ?? "grid-cols-4"} ${closed ? "pointer-events-none opacity-40" : ""}`} aria-disabled={closed}>
      {challenge.bot_difficulties.map((difficulty: BotDifficulty) => (
        <Link
          key={difficulty}
          href={challengeHref(challenge, difficulty)}
          aria-label={`${challenge.title}: contro il bot ${DIFFICULTY_LABELS[difficulty]}${challenge.bot_follows_rules ? ", che gioca con le stesse regole" : ""}`}
          className={`flex min-h-11 items-center justify-center px-1 text-center font-display uppercase leading-4 text-black ${count >= 4 ? "text-sm" : "text-base"}`}
          style={{ background: challenge.color }}
        >
          {DIFFICULTY_LABELS[difficulty]}
        </Link>
      ))}
    </div>
  );
}

/** An Emergenza a tema: one run, started, resumed or seen at its end on the Emergenza page. */
function ChallengeEmergencyButton({ challenge, closed }: { challenge: Challenge; closed: boolean }) {
  const run = challenge.my_run;
  const label = !run ? "Gioca l'Emergenza" : run.status === "active" ? "Continua la corsa" : `Corsa finita · ${run.passed} superate`;
  return (
    <Link
      href={challengeEmergencyHref(challenge)}
      aria-disabled={closed}
      className={`flex min-h-11 items-center justify-center px-2 text-center font-display text-lg uppercase leading-5 text-black ${
        closed ? "pointer-events-none opacity-40" : ""
      }`}
      style={{ background: challenge.color }}
    >
      {label}
    </Link>
  );
}

/** Friendly online play in the challenge: a random player of the challenge, or a code for a friend. */
function ChallengeOnline({ challenge, closed }: { challenge: Challenge; closed: boolean }) {
  return (
    <div className={`grid grid-cols-2 gap-1.5 ${closed ? "pointer-events-none opacity-40" : ""}`} aria-disabled={closed}>
      <Link
        href={challengeOnlineHref(challenge, "queue")}
        aria-label={`${challenge.title}: online, contro un giocatore della sfida`}
        className="flex min-h-11 items-center justify-center border-[3px] px-1 text-center font-display text-base uppercase leading-5"
        style={{ borderColor: challenge.color }}
      >
        Avversario casuale
      </Link>
      <Link
        href={challengeOnlineHref(challenge, "lobby")}
        aria-label={`${challenge.title}: crea un codice da mandare a un amico`}
        className="flex min-h-11 items-center justify-center border-[3px] px-1 text-center font-display text-base uppercase leading-5"
        style={{ borderColor: challenge.color }}
      >
        Codice amico
      </Link>
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

/**
 * The team screen of a challenge that gives its squad (SPEC §8.8): everyone plays these
 * characters, owned or not, and nothing of the player's is at stake. A long press shows a card whole.
 */
export function SuppliedTeam({
  challenge,
  startLabel,
  starting,
  onStart,
}: {
  challenge: Challenge;
  startLabel: string;
  starting: boolean;
  onStart: () => void;
}) {
  const detail = useCardDetail();
  const team = challenge.supplied_team ?? [];
  const matchRules = describeMatchRules(challenge);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-xs font-medium leading-4 text-muted">
        In questa sfida tutti giocano con la stessa squadra: conta solo come la usi. Le carte non sono tue e non rischi
        niente. Tieni premuta una carta per vederla intera.
      </p>
      {matchRules.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {matchRules.map((rule) => (
            <span key={rule} className="border-2 px-1.5 text-[11px] font-extrabold leading-4" style={{ borderColor: challenge.color }}>
              {rule}
            </span>
          ))}
        </span>
      )}
      <ul className="grid grid-cols-3 gap-1.5" aria-label="La squadra della sfida">
        {team.map((card) => (
          <li key={card.definition_id} {...detail.press(card)} className={LONG_PRESS_CLASS}>
            <CardView card={card} size="sm" thumbSizes="33vw" />
          </li>
        ))}
      </ul>
      <div className="mt-auto pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        <button type="button" className="btn btn-primary w-full" disabled={starting} onClick={onStart}>
          {starting ? "Si comincia…" : startLabel}
        </button>
      </div>
    </div>
  );
}
