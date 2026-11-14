"use client";

import { useEffect, useState, type ReactNode } from "react";
import { abilityMalusOn, modifierPoints, type Threat } from "@o-mega/game-engine";
import { useCardDetail } from "@/components/card-detail";
import { RoundComic } from "@/components/round-comic";
import { balance } from "@/config/balance";
import { abilityChips, chipsTotal } from "@/lib/ability-marks";
import { FACTION_LABELS, type AbilityInfo } from "@/lib/catalog";
import { toCharacter, type MatchCard } from "@/lib/match";
import { decisiveNote, tieBreakReason, tieWonByRelentless, wasNullified, wasSilenced } from "@/lib/round-powers";
import { describeThreatModifier } from "@/lib/threat-modifiers";
import type { TripleContest, TripleRound, TripleView } from "@/lib/triple";
import { contestNotes } from "@/lib/triple-powers";

// An Allarme Triplo round told like a classic one: each threat is a comic page of its own
// (round-comic.tsx), with the same balloons, effects and verdict, one after the other. A page
// moves on once it is over and there was time to read it, or at a tap; then `summary`, the
// round's recap with its totals, closes the round. Nothing here decides anything.

const TITLES = { win: "Minaccia presa!", lose: "Minaccia persa", void: "Minaccia pari" };

/** One threat of a resolved round as a comic page. */
function ContestComic({
  view,
  round,
  contest,
  position,
  count,
  rival,
  abilities,
  onContinue,
  onDone,
}: {
  view: TripleView;
  round: TripleRound;
  contest: TripleContest;
  /** Which page of the round this is, from 0, and how many there are. */
  position: number;
  count: number;
  rival: string;
  abilities: AbilityInfo[];
  onContinue: () => void;
  onDone: () => void;
}) {
  const detail = useCardDetail();
  const threat = view.threats[contest.slot];
  const modifier = threat?.modifier ?? null;
  const mine = view.my_deck.find((card) => card.instance_id === contest.my_play?.instance_id) ?? null;
  const theirs = contest.opponent_play;
  const myPlay = contest.my_play;
  const ruleThreat: Threat = { id: `lane-${contest.slot}`, level: threat?.level ?? 0, abilities: threat?.abilities ?? [], modifier };

  // As the cards played: an Annullatore, or Silenzio della tomba, takes the power away.
  const powerless = (card: MatchCard, other: MatchCard | null) => wasNullified(card, other, modifier) || wasSilenced(card, modifier);
  const asPlayed = (card: MatchCard | null, other: MatchCard | null) => {
    if (!card) return null;
    const character = toCharacter(card, card.definition_id);
    return powerless(card, other) ? { ...character, power: null } : character;
  };
  const myCharacter = asPlayed(mine, theirs);
  const theirCharacter = asPlayed(theirs, mine);

  // Each card's abilities as chips: the rule's marks and what Sabotatore took.
  const mirror = modifier?.code === "mirror";
  const chipsOf = (card: MatchCard | null, other: MatchCard | null, malus: number) =>
    card && threat && !threat.hidden
      ? abilityChips(mirror && other ? other.stats : card.stats, ruleThreat, malus).map((chip) =>
          mirror ? { ...chip, mark: { text: "⇄", tone: "ok" as const } } : chip,
        )
      : undefined;
  const myChips = chipsOf(mine, theirs, myCharacter && theirCharacter ? abilityMalusOn(myCharacter, theirCharacter) : 0);
  const theirChips = chipsOf(theirs, mine, myCharacter && theirCharacter ? abilityMalusOn(theirCharacter, myCharacter) : 0);
  const struckPoints = (chips: typeof myChips, card: MatchCard | null, other: MatchCard | null) =>
    chips && card ? chipsTotal(chipsOf(card, other, 0) ?? []) - chipsTotal(chips) : 0;
  // The ribbon a rule drops on a card: its faction or its rarity.
  const flagOf = (card: MatchCard | null, character: ReturnType<typeof asPlayed>, parts: { modifier: number } | null | undefined) => {
    if (!card || !character || !modifier) return null;
    const points = parts ? parts.modifier : modifierPoints(character, ruleThreat);
    if (!points) return null;
    const who = modifier.code === "hostile_ground" ? (FACTION_LABELS[card.faction] ?? card.faction) : modifier.code === "long_count" ? "Chi è sotto" : card.rarity.name;
    return { text: `${who} ${points > 0 ? "+" : "−"}${Math.abs(points)}`, points };
  };

  const myNotes = contestNotes(view, round, contest, "me");
  const theirNotes = contestNotes(view, round, contest, "opponent");
  const winner = contest.winner ?? "none";
  const myScore = myPlay?.score ?? 0;
  const theirScore = theirs?.score ?? 0;
  const winnerCard = winner === "me" ? mine : winner === "opponent" ? theirs : null;
  const loserCard = winner === "me" ? theirs : winner === "opponent" ? mine : null;
  const winnerPlay = winner === "me" ? myPlay : winner === "opponent" ? theirs : null;
  const loserPlay = winner === "me" ? theirs : winner === "opponent" ? myPlay : null;
  const isTie = Boolean(myPlay && theirs && myPlay.score === theirs.score);
  const tieWonBy = isTie && winnerCard && tieWonByRelentless(winnerCard, loserCard, modifier) ? winnerCard.name : null;
  const decisive =
    winner === "none" || !winnerPlay || !loserPlay || !loserCard
      ? null
      : decisiveNote(winner, winner === "me" ? myNotes : theirNotes, winnerPlay, loserPlay, loserCard.name);
  // On equal totals the line says what settled it (SPEC §5.6), to both players.
  const resultLine =
    winner === "none"
      ? myPlay
        ? `Pari ${myScore} a ${theirScore} e ${tieBreakReason(null, myPlay, modifier)}.`
        : ""
      : !winnerCard || !loserCard || !winnerPlay || !loserPlay
        ? ""
        : isTie
          ? `Pari ${winnerPlay.score} a ${loserPlay.score}: ${tieBreakReason(winnerPlay, loserPlay, modifier, tieWonBy)}.`
          : `${winnerCard.name} batte ${loserCard.name} · ${winnerPlay.score} a ${loserPlay.score}.`;
  const notices = [
    ...(myPlay?.auto_played ? ["Tempo scaduto: il server ha piazzato la tua carta."] : []),
    ...(theirs?.auto_played ? [`${rival} non ha piazzato in tempo.`] : []),
  ];

  const nameOf = (code: string) => abilities.find((a) => a.code === code)?.name ?? code;
  const twist = modifier && threat ? describeThreatModifier(modifier, nameOf(threat.abilities[0]), nameOf) : null;
  const statsOf = (card: MatchCard | null) => (card && threat ? threat.abilities.map((code) => `${code} ${card.stats[code] ?? 0}`).join(" · ") : "");
  const spied = (view.spied_cards ?? []).filter((card) => card.round === round.round);
  const last = position === count - 1;

  return (
    <RoundComic
      round={round.round}
      level={threat?.level ?? 0}
      threatName={threat?.name ?? ""}
      abilities={threat?.abilities ?? []}
      caption={`R${round.round} · Minaccia ${position + 1}/${count} · Lv ${threat?.level ?? 0}`}
      titles={TITLES}
      twist={twist}
      rule={modifier}
      tierColor={threat?.rarity?.color ?? null}
      me={{
        label: "Tu",
        card: mine,
        stats: statsOf(mine),
        chips: myChips,
        score: myScore,
        notes: myNotes,
        flag: flagOf(mine, myCharacter, myPlay?.parts),
        struckPoints: struckPoints(myChips, mine, theirs),
        press: mine ? detail.press(mine) : undefined,
      }}
      opponent={{
        label: rival,
        card: theirs,
        stats: statsOf(theirs),
        chips: theirChips,
        score: theirScore,
        notes: theirNotes,
        flag: flagOf(theirs, theirCharacter, theirs?.parts),
        struckPoints: struckPoints(theirChips, theirs, mine),
        press: theirs ? detail.press(theirs) : undefined,
      }}
      winner={winner}
      decisive={decisive}
      revealed={spied.length > 0 ? { foreseen: [], spied } : null}
      resultLine={resultLine}
      notices={notices}
      onContinue={onContinue}
      onDone={onDone}
      hint={(complete) => (
        <span className="flex h-8 items-center px-3 text-xs font-extrabold uppercase tracking-wide text-black">
          {!complete ? "Tocca per saltare" : last ? "Tocca per il riepilogo" : "Tocca per la prossima Minaccia"}
        </span>
      )}
    />
  );
}

/**
 * The round's threats as comic pages, one after the other, then `summary`. Each page moves on
 * once its animation is over plus balance.triple.contestReadSeconds, or at a tap once it is over.
 */
export function TripleRoundComics({
  view,
  round,
  rival,
  abilities,
  summary,
}: {
  view: TripleView;
  round: TripleRound;
  rival: string;
  abilities: AbilityInfo[];
  summary: ReactNode;
}) {
  const contests = [...round.contests].sort((a, b) => a.slot - b.slot).filter((c) => c.my_play || c.opponent_play);
  const [step, setStep] = useState(0);
  const [doneStep, setDoneStep] = useState<number | null>(null);
  useEffect(() => {
    if (doneStep === null || doneStep !== step || step >= contests.length) return;
    const timer = setTimeout(() => setStep((s) => Math.max(s, doneStep + 1)), balance.triple.contestReadSeconds * 1000);
    return () => clearTimeout(timer);
  }, [doneStep, step, contests.length]);

  const contest = contests[step];
  if (!contest) return <>{summary}</>;
  return (
    <ContestComic
      key={`${round.round}-${contest.slot}`}
      view={view}
      round={round}
      contest={contest}
      position={step}
      count={contests.length}
      rival={rival}
      abilities={abilities}
      onContinue={() => setStep((s) => Math.max(s, step + 1))}
      onDone={() => setDoneStep(step)}
    />
  );
}
