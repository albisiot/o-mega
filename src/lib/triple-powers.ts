import { abilityMalusFrom, immuneToSabotage, type Threat } from "@o-mega/game-engine";
import { toCharacter, type MatchCard } from "@/lib/match";
import {
  carriedInto,
  outcomeOf,
  roundPowerNotes,
  tieWonByRelentless,
  wasNullified,
  type PowerNote,
} from "@/lib/round-powers";
import type { TripleContest, TripleRound, TripleView } from "@/lib/triple";

type Side = "me" | "opponent";

function cardOf(view: TripleView, contest: TripleContest | undefined, side: Side): MatchCard | null {
  if (!contest) return null;
  if (side === "opponent") return contest.opponent_play;
  return view.my_deck.find((card) => card.instance_id === contest.my_play?.instance_id) ?? null;
}

/**
 * What a card's power did on one threat of an Allarme Triplo round (SPEC §5.13), as on a
 * match page: each threat is a lane, so Riscossa and Slancio come from the side's card on
 * the same threat in the round before. Annotated with the power's family for the page.
 * Capobranco is left out: no card has it yet.
 */
export function contestNotes(view: TripleView, round: TripleRound, contest: TripleContest, side: Side): PowerNote[] {
  const other: Side = side === "me" ? "opponent" : "me";
  const card = cardOf(view, contest, side);
  const rival = cardOf(view, contest, other);
  const play = side === "me" ? contest.my_play : contest.opponent_play;
  const threat = view.threats[contest.slot];
  if (!card || !play || !threat) return [];

  const previousRound = view.rounds.find((r) => r.round === round.round - 1 && r.resolved);
  const previous = previousRound?.contests.find((c) => c.slot === contest.slot);
  const previousThreat: Threat = { id: "lane", level: threat.level, abilities: threat.abilities, modifier: threat.modifier };
  const carried = carriedInto(cardOf(view, previous, side), outcomeOf(previous?.winner, side), cardOf(view, previous, other), previousThreat);

  const rivalActing = rival && !wasNullified(rival, card, threat.modifier) ? toCharacter(rival, "opponent") : null;
  const tie = contest.my_play && contest.opponent_play && contest.my_play.score === contest.opponent_play.score;
  return roundPowerNotes(
    card,
    play,
    { level: threat.level, abilities: threat.abilities, modifier: threat.modifier },
    {
      carried: carried.points,
      carriedFrom: carried.from,
      carriedCode: carried.code,
      lost: contest.winner === other,
      won: contest.winner === side,
      wonTie: Boolean(tie) && contest.winner === side && tieWonByRelentless(card, rival, threat.modifier),
      nullified: wasNullified(card, rival, threat.modifier),
      opponentShielded: rivalActing !== null && immuneToSabotage(rivalActing),
      opponentSabotage: rivalActing ? abilityMalusFrom(rivalActing) : 0,
      opponentHasPower: Boolean(rival?.power),
    },
    true,
  );
}
