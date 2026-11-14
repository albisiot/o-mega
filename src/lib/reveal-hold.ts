// While a round result plays out, the strip at the top of a match still shows the match as it
// stood before that round: it must not tell who won before the animation does (SBAM!).
// These build that earlier state from what the server sent; nothing here decides anything.

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { balance } from "@/config/balance";
import type { BossView } from "@/lib/boss";
import type { EmergencyView } from "@/lib/emergency";
import type { MatchView } from "@/lib/match";
import { roundPoints, type TripleView } from "@/lib/triple";

const wonBy = (side: "me" | "opponent", winners: (string | null)[]) => winners.filter((w) => w === side).length;

/** A classic match (bot, friendly, Conquest, Story) as it stood while `round` was being played. */
export function matchBeforeRound(view: MatchView, round: number): MatchView {
  const hidden = view.rounds.filter((r) => r.round >= round && r.resolved).map((r) => r.winner);
  return {
    ...view,
    status: "active",
    current_round: round,
    rounds_won: {
      me: view.rounds_won.me - wonBy("me", hidden),
      opponent: view.rounds_won.opponent - wonBy("opponent", hidden),
    },
    rounds: view.rounds.map((r) => (r.round >= round ? { ...r, resolved: false, winner: null, opponent_play: null } : r)),
  };
}

/** An Allarme Triplo match as it stood while `round` was being played. */
export function tripleBeforeRound(view: TripleView, round: number): TripleView {
  const hidden = view.rounds.filter((r) => r.round >= round && r.resolved).map(roundPoints);
  return {
    ...view,
    status: "active",
    current_round: round,
    points: {
      me: view.points.me - hidden.reduce((sum, p) => sum + p.me, 0),
      opponent: view.points.opponent - hidden.reduce((sum, p) => sum + p.opponent, 0),
    },
    rounds: view.rounds.map((r) =>
      r.round >= round
        ? { ...r, resolved: false, contests: r.contests.map((c) => ({ ...c, winner: null, opponent_play: null })) }
        : r,
    ),
  };
}

/** A Grande Minaccia as it stood while turn `round` was being played. */
export function bossBeforeTurn(view: BossView, round: number): BossView {
  const hidden = view.rounds.filter((r) => r.round >= round && r.resolved);
  const taken = (side: "me" | "opponent") => hidden.reduce((sum, r) => sum + (r.holders?.filter((h) => h === side).length ?? 0), 0);
  return {
    ...view,
    status: "active",
    current_round: round,
    points: {
      me: view.points.me - hidden.reduce((sum, r) => sum + (r.my_play?.points ?? 0), 0),
      opponent: view.points.opponent - hidden.reduce((sum, r) => sum + (r.opponent_play?.points ?? 0), 0),
    },
    fronts_taken: { me: view.fronts_taken.me - taken("me"), opponent: view.fronts_taken.opponent - taken("opponent") },
    rounds: view.rounds.map((r) => (r.round >= round ? { ...r, resolved: false, holders: null, opponent_play: null } : r)),
  };
}

/** Today's Emergenza as it stood while threat `round` was being faced. */
export function emergencyBeforePlay(view: EmergencyView, round: number): EmergencyView {
  const run = view.run;
  if (!run) return view;
  const hidden = run.plays.filter((p) => p.round >= round);
  return {
    ...view,
    run: {
      ...run,
      status: "active",
      current_round: round,
      passed: run.passed - hidden.filter((p) => p.passed).length,
      failed: run.failed - hidden.filter((p) => !p.passed).length,
      plays: run.plays.filter((p) => p.round < round),
    },
  };
}

/**
 * Which round's outcome the strip may show. While `revealing` is on screen the strip holds the
 * earlier state, until the animation reaches its verdict (or the player skips or moves on):
 * `settle` it then. `settled` is the round last let through, for a small pop where it lands.
 */
/**
 * When a round result shown at `begun` (ms) leaves: once its animation, over at `finished`
 * (null while it plays), leaves the time to read it again; never before revealMinSeconds,
 * never after `maxSeconds`.
 */
export function revealEnd(begun: number, finished: number | null, maxSeconds: number = balance.match.revealPauseSeconds): number {
  const { revealMinSeconds, revealReadSeconds } = balance.match;
  const latest = begun + Math.max(maxSeconds, revealMinSeconds) * 1000;
  if (finished === null) return latest;
  return Math.min(latest, Math.max(begun + revealMinSeconds * 1000, finished + revealReadSeconds * 1000));
}

/**
 * How long a round result stays before the next choice: until its animation is over (the page
 * calls the returned `onDone`), plus the time to read it again, never less than
 * revealMinSeconds, never more than `maxSeconds` (the server keeps the next timer waiting that
 * long; leaving earlier only adds to the time to choose). `advance` moves on, while `running`.
 */
export function useRevealPause(
  revealing: number | null,
  running: boolean,
  advance: (round: number) => void,
  maxSeconds: number = balance.match.revealPauseSeconds,
) {
  const started = useRef<{ round: number; at: number } | null>(null);
  const [doneAt, setDoneAt] = useState<{ round: number; at: number } | null>(null);
  const go = useEffectEvent(advance);
  useEffect(() => {
    if (revealing !== null && started.current?.round !== revealing) started.current = { round: revealing, at: Date.now() };
  }, [revealing]);
  useEffect(() => {
    if (revealing === null || !running) return;
    const begun = started.current?.round === revealing ? started.current.at : Date.now();
    const end = revealEnd(begun, doneAt?.round === revealing ? doneAt.at : null, maxSeconds);
    const timer = setTimeout(() => go(revealing), Math.max(0, end - Date.now()));
    return () => clearTimeout(timer);
  }, [revealing, running, doneAt, maxSeconds]);
  return useCallback(() => {
    if (revealing !== null) setDoneAt({ round: revealing, at: Date.now() });
  }, [revealing]);
}

export function useRevealHold(revealing: number | null) {
  const [settled, setSettled] = useState<number | null>(null);
  const held = revealing !== null && settled !== revealing;
  const settle = useCallback((round: number) => setSettled(round), []);
  return { held, settled, settle };
}
