import {
  abilityMalusFrom,
  asPlayedAgainst,
  bossBoard,
  bossContext,
  bossPlayedIn,
  immuneToSabotage,
  otherSide,
  packBonus,
  type BossState,
  type Character,
  type Side,
} from "@o-mega/game-engine";
import { knownBossState, type BossRound, type BossView } from "@/lib/boss";
import type { MatchCard } from "@/lib/match";
import { roundPowerNotes, type PowerNote } from "@/lib/round-powers";

export type BossSide = "me" | "opponent";

/** The character a side's entry met on its front. */
export type BossFacing = {
  card: MatchCard | null;
  score: number;
  highest: number;
  /** The turn it arrived in; the current one when both arrived together. */
  since: number;
  together: boolean;
};

/** One entry of a turn: who arrived where, against whom, what its powers did, who holds the front now. */
export type BossEntry = {
  side: BossSide;
  card: MatchCard | null;
  front: number;
  score: number;
  highest: number;
  notes: PowerNote[];
  facing: BossFacing | null;
  /** Who holds this front after the turn; null: a tie nobody settled. */
  holder: BossSide | null;
};

const toSide = (side: BossSide): Side => (side === "me" ? "a" : "b");
const fromSide = (side: Side | null | undefined): BossSide | null => (side === "a" ? "me" : side === "b" ? "opponent" : null);

/** The card behind an engine character of the known state (knownBossState ids). */
function cardOf(view: BossView, side: Side, characterId: string): MatchCard | null {
  if (side === "a") return view.my_team.find((card) => card.instance_id === characterId) ?? null;
  const round = Number(characterId.replace("opponent-", ""));
  return view.rounds.find((r) => r.round === round)?.opponent_play ?? null;
}

function characterOf(state: BossState, side: Side, id: string): Character | undefined {
  return state.teams[side].find((character) => character.id === id);
}

/**
 * The two entries of a resolved turn, with the power notes of each as the engine
 * counts them in a Grande Minaccia (SPEC §5.12): the turn is the round, fronts held
 * so far are rounds won, Riscossa and Slancio come from the side's previous character.
 */
export function bossTurnEntries(
  view: BossView,
  round: BossRound,
  /** Adds each note's power code and source, for the page's visual families (round-powers.ts). */
  annotate = false,
): Record<BossSide, BossEntry> | null {
  if (!round.resolved || !round.my_play || !round.opponent_play) return null;
  const state = knownBossState(view);
  const record = state.turns.find((turn) => turn.turn === round.round);
  if (!record) return null;
  const before: BossState = { ...state, turns: state.turns.filter((turn) => turn.turn < round.round) };
  const sameFront = record.plays.a.front === record.plays.b.front;

  const entry = (bossSide: BossSide): BossEntry => {
    const side = toSide(bossSide);
    const other = otherSide(side);
    const play = record.plays[side];
    const card = cardOf(view, side, play.characterId);
    const own = characterOf(state, side, play.characterId);
    const threat = state.fronts[play.front];

    // Who it met: the one arriving with it, or the one already on the front.
    const occupant = bossBoard(before, other)[play.front];
    const facingId = sameFront ? record.plays[other].characterId : occupant?.characterId;
    const facingCharacter = facingId ? characterOf(state, other, facingId) : undefined;
    const facingScore = sameFront ? record.plays[other] : occupant?.score;
    const facing: BossFacing | null =
      facingId && facingScore
        ? {
            card: cardOf(view, other, facingId),
            score: facingScore.total,
            highest: facingScore.highest,
            since: sameFront ? round.round : (occupant?.turn ?? round.round),
            together: sameFront,
          }
        : null;

    const acting = own ? bossPlayedIn(state, record, side) : undefined;
    const opposing = facingCharacter && own ? asPlayedAgainst(facingCharacter, own, threat) : undefined;
    const context = bossContext(before, side, {});
    const last = before.turns.at(-1);
    const lastCard = last ? cardOf(view, side, last.plays[side].characterId) : null;
    const holder = fromSide(record.holders[play.front]);
    const nullified = Boolean(card?.power) && acting !== undefined && acting.power === null;
    // The server's parts, when it sent them, say exactly what came from where.
    const parts = (bossSide === "me" ? round.my_play : round.opponent_play)?.parts ?? null;

    const notes =
      card && acting
        ? roundPowerNotes(
            card,
            { bonus: play.bonus },
            { level: threat.level, abilities: threat.abilities, modifier: null },
            {
              carried: parts?.carried ?? context.carriedBonus ?? 0,
              carriedFrom: context.carriedBonus ? lastCard?.power?.name : undefined,
              carriedCode: context.carriedBonus ? lastCard?.power?.code : undefined,
              lost: holder !== null && holder !== bossSide,
              won: holder === bossSide,
              wonTie:
                holder === bossSide &&
                facing !== null &&
                facing.score === play.total &&
                acting.power?.code === "relentless" &&
                opposing?.power?.code !== "relentless",
              nullified,
              opponentHasPower: Boolean(opposing?.power ?? facingCharacter?.power),
              opponentShielded: opposing !== undefined && immuneToSabotage(opposing),
              opponentSabotage: opposing ? abilityMalusFrom(opposing) : 0,
              pack: parts?.pack ?? packBonus(acting, context.played ?? []),
              parts,
              standing: { roundsWon: context.roundsWon ?? 0, opponentRoundsWon: context.opponentRoundsWon ?? 0 },
            },
            annotate,
          )
        : [];

    return { side: bossSide, card, front: play.front, score: play.total, highest: play.highest, notes, facing, holder };
  };

  return { me: entry("me"), opponent: entry("opponent") };
}

/** Who held each front before this turn: the previous turn's holders. */
export function holdersBefore(view: BossView, round: BossRound): (BossSide | null)[] {
  const previous = view.rounds.find((r) => r.round === round.round - 1 && r.resolved);
  return previous?.holders ?? view.fronts.map(() => null);
}
