"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { carriedBonusAfter, scorePlay, type AbilityFamilies, type ThreatModifier } from "@o-mega/game-engine";
import { Silhouette } from "@/components/card-view";
import { ComicBurst } from "@/components/comic-parts";
import { ConquestPanel, ConquestPick, SecondsLeft } from "@/components/conquest-panel";
import { HandCard } from "@/components/hand-card";
import { InfoTip } from "@/components/info-tip";
import { StoryRewardPanel, useStoryReward } from "@/components/story-reward";
import { ThreatDiorama } from "@/components/threat-diorama";
import { prefetchWinnerNames, WinnerName } from "@/components/winner-name";
import { balance } from "@/config/balance";
import { artSrcSet, thumbArtUrl } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import {
  claimVictory,
  DIFFICULTY_LABELS,
  fetchMatchState,
  forfeitMatch,
  pingMatch,
  pingShowsChange,
  playRound,
  resolvePvpRound,
  submitChoice,
  subscribeToUpdates,
  toCharacter,
  type MatchCard,
  type MatchRound,
  type MatchView,
} from "@/lib/match";
import { matchXp } from "@/lib/progression";
import { rarityFrame, rarityLetter } from "@/lib/rarity-theme";
import { carriedInto, roundPowerNotes, type PowerNote } from "@/lib/round-powers";
import { describeThreatModifier, modifierLine } from "@/lib/threat-modifiers";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow, useSecondsLeft } from "@/lib/use-now";

type TeamCard = MatchView["my_team"][number];

const WINNER_STYLES = {
  me: "bg-comic-cyan text-black",
  opponent: "bg-panel-raised text-muted",
  none: "bg-panel-raised text-faint",
} as const;

// The round result builds up: the two plays slide in, their scores climb from SCORES_SECONDS,
// SBAM! bursts next to the winning score once they stop (see .animate-burst-pop), then the
// winner's 3D name flies in at NAME_SECONDS. SBAM! tells who won: no verdict banner.
const SCORES_SECONDS = 0.4;
const NAME_SECONDS = 1.5;
// When the 3D names start downloading after the match opens (see prefetchWinnerNames).
const NAMES_PREFETCH_SECONDS = 2;
// Against a player, a ping marks us present at this pace and brings the opponent's last sign
// of life: we look absent at most twice this late, so even after a lost ping (three times)
// still before the 20 s absence notice.
const PING_MS = 6_000;
// While broadcasts cannot arrive, the whole state is read at this pace instead.
const OFFLINE_POLL_MS = 5_000;

/** Who the player faced, as the end of a match names them. */
function rivalName(view: MatchView): string {
  return view.bot_difficulty ? `Bot ${DIFFICULTY_LABELS[view.bot_difficulty]}` : (view.opponent?.username ?? "L'avversario");
}

function lastResolvedRound(view: MatchView): number {
  return Math.max(0, ...view.rounds.filter((r) => r.resolved).map((r) => r.round));
}

/** A match (against a bot or a player) from the first threat to the final result. */
export function MatchScreen({ initial, story = false }: { initial: MatchView; story?: boolean }) {
  const [view, setView] = useState(initial);
  // Server time minus device time: countdowns follow the server clock.
  const [offset, setOffset] = useState(() => Date.parse(initial.server_now) - Date.now());
  const [revealing, setRevealing] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>([]);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  // Whether the conquest pick was still open on this screen: only then the conquered card celebrates.
  const [conquestLive, setConquestLive] = useState(() => Boolean(initial.conquest && !initial.conquest.resolved));
  // The countdowns tick in small components of their own (RoundTimer, TimerBar, SecondsLeft,
  // OpponentAbsent): the rest of the screen does not re-render with the clock.

  useEffect(() => {
    fetchAbilities()
      .then(setAbilities)
      .catch((cause: unknown) => console.error("Abilities failed", cause));
  }, []);

  // While the first choice is made, get what the 3D name of a won round needs: it then
  // arrives on time even on a slow network. The first screen's own downloads go first.
  useEffect(() => {
    if (initial.status !== "active") return;
    const timer = setTimeout(() => prefetchWinnerNames(initial.my_team), NAMES_PREFETCH_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [initial]);

  // Every newly resolved round is revealed, however we learned about it
  // (our own play, the opponent's broadcast, a refresh).
  const revealedUpTo = useRef(lastResolvedRound(initial));
  const apply = useCallback((next: MatchView) => {
    setView(next);
    setOffset(Date.parse(next.server_now) - Date.now());
    if (next.conquest && !next.conquest.resolved) setConquestLive(true);
    const newest = lastResolvedRound(next);
    if (newest > revealedUpTo.current) {
      revealedUpTo.current = newest;
      setRevealing(newest);
      setSelected(null);
    }
  }, []);

  const isBot = view.bot_difficulty !== null;
  const isActive = view.status === "active";
  const conquestOpen = Boolean(view.conquest && !view.conquest.resolved);
  // The winner of a Conquest picks a card on a timer that starts when the match ends.
  const pickOpen =
    view.status === "finished" &&
    Boolean(view.conquest && !view.conquest.resolved && view.conquest.role === "winner" && view.conquest.offered);
  const current = isActive ? view.rounds.find((r) => r.round === view.current_round && !r.resolved) : undefined;
  const deadline = current ? Date.parse(current.deadline_at) : null;

  const submit = useCallback(
    async (round: number, choice: string | null) => {
      setBusy(true);
      setError(null);
      try {
        if (isBot) apply(await playRound(view.id, round, choice));
        else apply(choice === null ? await resolvePvpRound(view.id) : await submitChoice(view.id, round, choice));
      } catch (cause) {
        // Someone (the timer, another tab) was faster: reload the state.
        if (cause instanceof Error && ["round_already_resolved", "match_not_active"].includes(cause.message)) {
          apply(await fetchMatchState(view.id));
        } else {
          setError(describeServerError(cause));
        }
      } finally {
        setBusy(false);
      }
    },
    [apply, view.id, isBot],
  );

  // Against a player: follow the server's broadcasts and ping it. The ping tells
  // the server we are still here, and shows a change a missed broadcast hid;
  // the whole state is read only then, on a broadcast, or while none can arrive.
  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      apply(await fetchMatchState(view.id));
    } catch {
      // The next broadcast, ping or poll will try again.
    } finally {
      refreshing.current = false;
    }
  }, [apply, view.id]);

  const latest = useRef(view);
  useEffect(() => {
    latest.current = view;
  });

  useEffect(() => {
    if (isBot || !(isActive || conquestOpen)) return;
    let live = false;
    const unsubscribe = subscribeToUpdates(
      `match:${view.id}`,
      () => {
        refresh();
      },
      (nowLive) => {
        // Listening (again): catch up on what may have changed meanwhile.
        if (nowLive && !live) refresh();
        live = nowLive;
      },
    );
    const poll = setInterval(() => {
      if (!live) refresh();
    }, OFFLINE_POLL_MS);
    const ping = () =>
      pingMatch(view.id)
        .then((answer) => {
          setView((shown) =>
            shown.opponent ? { ...shown, opponent: { ...shown.opponent, last_seen_at: answer.opponent_last_seen_at } } : shown,
          );
          if (pingShowsChange(latest.current, answer)) refresh();
        })
        .catch(() => {});
    ping();
    const pinger = setInterval(ping, PING_MS);
    return () => {
      unsubscribe();
      clearInterval(poll);
      clearInterval(pinger);
    };
  }, [isBot, isActive, conquestOpen, view.id, refresh]);

  async function claim() {
    setBusy(true);
    try {
      apply(await claimVictory(view.id));
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  // When the time is up (plus the server's grace), let the server play for us.
  const round = current?.round;
  useEffect(() => {
    if (round === undefined || deadline === null) return;
    const delay = deadline + (balance.match.timeoutGraceSeconds + 0.5) * 1000 - (Date.now() + offset);
    const timer = setTimeout(() => submit(round, null), Math.max(0, delay));
    return () => clearTimeout(timer);
  }, [round, deadline, offset, submit]);

  // A round result stays on screen for the reveal pause, then the next threat. The last one
  // waits for a tap, unless the conquest pick follows: its timer is already running.
  useEffect(() => {
    if (revealing === null || (view.status !== "active" && !pickOpen)) return;
    const timer = setTimeout(() => setRevealing(null), balance.match.revealPauseSeconds * 1000);
    return () => clearTimeout(timer);
  }, [revealing, view.status, pickOpen]);

  async function forfeit() {
    setBusy(true);
    try {
      apply(await forfeitMatch(view.id));
      setRevealing(null);
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
      setConfirmForfeit(false);
    }
  }

  const families: AbilityFamilies = useMemo(
    () => Object.fromEntries(abilities.map((a) => [a.code, a.family.code])),
    [abilities],
  );
  const shownRound = revealing === null ? null : view.rounds.find((r) => r.round === revealing) ?? null;
  const opponentName = view.opponent?.username ?? "Bot";
  // Every step fits the screen and nothing scrolls: the choice, the round result, the conquest
  // pick and the final result, with or without a conquered card or a story reward.
  const choosing = !shownRound && view.status !== "finished" && Boolean(current);
  const picking = !shownRound && pickOpen;
  const pickDeadline = pickOpen && view.conquest ? Date.parse(view.conquest.deadline_at) : null;
  const fitted = choosing || Boolean(shownRound) || picking || view.status === "finished";
  useLockedScreen(fitted);

  return (
    <div className={fitted ? "game-shell" : "flex flex-1 flex-col"}>
      {/* One strip: the score, the threat levels (with what each round revealed) and the way out.
          The conquest pick has a header of its own. */}
      <header className={picking ? "hidden" : "relative flex items-center gap-1.5 px-3 py-1"}>
        <div className="min-w-0 max-w-[6.5rem] shrink-0 leading-none">
          <p className="truncate text-[10px] font-bold text-muted">
            {view.mode === "bot"
              ? `Bot ${DIFFICULTY_LABELS[view.bot_difficulty ?? "easy"]}`
              : `${view.mode === "conquest" ? "Conquista" : "Amichevole"} · ${
                  isBot ? `Bot ${DIFFICULTY_LABELS[view.bot_difficulty ?? "easy"]}` : opponentName
                }`}
          </p>
          <p className="mt-0.5 flex items-baseline gap-1 text-[11px] font-extrabold uppercase">
            Tu
            <span className="shrink-0 font-display text-2xl leading-6 text-comic-yellow">
              {view.rounds_won.me}–{view.rounds_won.opponent}
            </span>
            <span className="truncate">{isBot ? "Bot" : opponentName}</span>
          </p>
        </div>
        <LevelTrack view={view} opponentName={opponentName} abilities={abilities} />
        {view.status === "active" ? (
          <button
            type="button"
            onClick={() => setConfirmForfeit(true)}
            aria-label="Abbandona"
            className="btn btn-ghost h-11 w-11 shrink-0 px-0"
          >
            <svg viewBox="0 0 18 20" className="h-5 w-[18px]" aria-hidden>
              <path d="M2 1v18" stroke="currentColor" strokeWidth={2.5} />
              <path d="M3 2h12l-3 4 3 4H3z" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <Link href="/" aria-label="Home" className="btn btn-ghost h-11 w-11 shrink-0 px-0">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
              <path d="M2 10 10 3l8 7M5 8v9h4v-5h2v5h4V8" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
        {!isBot && isActive && view.opponent?.last_seen_at && (
          <OpponentAbsent
            lastSeenAt={view.opponent.last_seen_at}
            offset={offset}
            opponentName={opponentName}
            busy={busy}
            onClaim={claim}
          />
        )}
      </header>

      {confirmForfeit && (
        <>
          <button
            type="button"
            aria-label="Continua a giocare"
            onClick={() => setConfirmForfeit(false)}
            className="fixed inset-0 z-30 bg-black/60"
          />
          <div
            role="alertdialog"
            aria-label="Abbandonare la partita?"
            className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 bg-comic-magenta px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 text-black"
          >
            <p className="text-sm font-bold">Abbandonare conta come sconfitta, senza monete.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={forfeit}
                disabled={busy}
                className="btn flex-1 bg-black font-display text-lg uppercase tracking-wide text-comic-yellow"
              >
                Abbandona
              </button>
              <button type="button" onClick={() => setConfirmForfeit(false)} className="btn btn-ghost">
                Continua a giocare
              </button>
            </div>
          </div>
        </>
      )}
      {error && <p className="mx-3 mt-1 text-sm font-semibold text-comic-magenta">{error}</p>}

      {shownRound ? (
        <RoundReveal
          round={shownRound}
          previous={view.rounds.find((r) => r.round === shownRound.round - 1) ?? null}
          team={view.my_team}
          abilities={abilities}
          opponentName={opponentName}
          onContinue={() => setRevealing(null)}
          finished={view.status === "finished"}
          pickDeadline={pickDeadline}
          offset={offset}
        />
      ) : picking && view.conquest ? (
        <ConquestPick
          matchId={view.id}
          conquest={view.conquest}
          opponentName={rivalName(view)}
          roundsWon={view.rounds_won}
          offset={offset}
          onUpdate={apply}
          abilities={abilities}
        />
      ) : view.status === "finished" ? (
        <MatchResult
          view={view}
          offset={offset}
          onUpdate={apply}
          abilities={abilities}
          story={story}
          conquestLive={conquestLive}
        />
      ) : current ? (
        <ChoosePhase
          view={view}
          round={current}
          families={families}
          abilities={abilities}
          deadline={deadline!}
          offset={offset}
          selected={selected ?? current.my_pending_instance_id}
          onSelect={setSelected}
          busy={busy}
          onPlay={(choice) => submit(current.round, choice)}
        />
      ) : null}
    </div>
  );
}

/**
 * The five levels. A cell also carries what its round revealed: the card the opponent
 * played (a thumbnail) or the threat a power lets the player foresee (an eye). A tap shows it.
 */
function LevelTrack({ view, opponentName, abilities }: { view: MatchView; opponentName: string; abilities: AbilityInfo[] }) {
  // An open cell closes by itself when the match moves on (a round resolves, the match ends).
  const phase = `${view.status}:${view.current_round}`;
  const [opened, setOpened] = useState<{ cell: number; phase: string } | null>(null);
  const open = opened?.phase === phase ? opened.cell : null;
  const setOpen = (cell: number | null) => setOpened(cell === null ? null : { cell, phase });
  const abilityName = (code: string) => abilities.find((a) => a.code === code)?.name ?? code;
  const openRound = open === null ? null : open + 1;
  const openPlay = openRound === null ? null : view.rounds.find((r) => r.round === openRound)?.opponent_play ?? null;
  const openThreat = openRound === null ? null : view.foreseen_threats?.find((t) => t.round === openRound) ?? null;

  return (
    <>
      <ol className="flex min-w-0 flex-1 gap-1" aria-label="Livelli delle Minacce">
        {view.threat_levels.map((level, i) => {
          const round = view.rounds.find((r) => r.round === i + 1);
          const played = round?.opponent_play ?? null;
          const foreseen = view.foreseen_threats?.find((t) => t.round === i + 1) ?? null;
          const isCurrent = view.status === "active" && view.current_round === i + 1;
          const style = isCurrent
            ? "bg-comic-yellow text-black"
            : round?.winner
              ? WINNER_STYLES[round.winner]
              : "border-2 border-line text-foreground";
          const label = `Livello ${level}${played ? `, ${opponentName} ha giocato ${played.name}` : ""}${
            foreseen ? `, Minaccia prevista: ${foreseen.name}` : ""
          }`;
          const cell = `relative flex h-11 w-full -skew-x-8 items-center justify-center font-display text-[21px] ${style}`;
          const marks = (
            <>
              {level}
              {played?.art_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={withBasePath(thumbArtUrl(played.art_url))}
                  alt=""
                  decoding="async"
                  className="absolute -bottom-[3px] -right-[3px] h-[22px] w-[17px] border-2 border-black object-cover object-top"
                />
              )}
              {foreseen && (
                <svg viewBox="0 0 16 10" className="absolute right-0.5 top-0.5 h-2.5 w-4" aria-hidden>
                  <path d="M1 5c2-3 4.5-4 7-4s5 1 7 4c-2 3-4.5 4-7 4S3 8 1 5z" fill="currentColor" />
                  <circle cx="8" cy="5" r="2" fill="var(--background)" />
                </svg>
              )}
            </>
          );
          return (
            <li key={i} className="min-w-0 flex-1">
              {played || foreseen ? (
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  aria-label={label}
                  className={cell}
                >
                  {marks}
                </button>
              ) : (
                <span aria-label={label} className={cell}>
                  {marks}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {/* Positioned against the header strip. */}
      {openRound !== null && (openPlay || openThreat) && (
        <>
          <button type="button" aria-label="Chiudi" onClick={() => setOpen(null)} className="fixed inset-0 z-20 cursor-default" />
          <div
            role="status"
            className="absolute right-3 top-full z-30 mt-1 w-60 bg-foreground px-3 py-2 text-xs font-semibold text-black shadow-[4px_4px_0_#000]"
          >
            {openPlay && (
              <p className="border-l-4 pl-2" style={{ borderColor: openPlay.rarity.color }}>
                <span className="block text-[11px] font-extrabold text-black/60">
                  Round {openRound} · {opponentName} ha già giocato
                </span>
                <span className="font-display text-base uppercase">{openPlay.name}</span>
              </p>
            )}
            {openThreat && (
              <p className={openPlay ? "mt-2" : ""}>
                <span className="block text-[11px] font-extrabold text-black/60">
                  Round {openThreat.round} · Livello {openThreat.level} · Minaccia prevista
                </span>
                <span className="block font-display text-base uppercase">{openThreat.name}</span>
                {openThreat.abilities.map(abilityName).join(" · ")}
                {openThreat.modifier && (
                  <span className="mt-0.5 block font-bold">
                    {modifierLine(openThreat.modifier, abilityName(openThreat.abilities[0]))}
                  </span>
                )}
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}

function ChoosePhase({
  view,
  round,
  families,
  abilities,
  deadline,
  offset,
  selected,
  onSelect,
  busy,
  onPlay,
}: {
  view: MatchView;
  round: MatchRound;
  families: AbilityFamilies;
  abilities: AbilityInfo[];
  /** When the round's time is up, in server time (ms). */
  deadline: number;
  /** Server time minus device time. */
  offset: number;
  selected: string | null;
  onSelect: (id: string) => void;
  busy: boolean;
  onPlay: (choice: string) => void;
}) {
  const isBot = view.bot_difficulty !== null;
  const opponentName = view.opponent?.username ?? "Il bot";
  const pending = round.my_pending_instance_id;
  const threat = { id: "current", level: round.level, abilities: round.threat.abilities, modifier: round.modifier };

  // Riscossa: bonus earned by losing the previous round with a comeback character.
  const previous = view.rounds.find((r) => r.round === round.round - 1);
  const previousCard = previous?.my_play && view.my_team.find((c) => c.instance_id === previous.my_play?.instance_id);
  const carried = previousCard
    ? carriedBonusAfter(toCharacter(previousCard, previousCard.instance_id), previous?.winner === "opponent")
    : 0;

  const available = view.my_team.filter((card) => card.played_round === null);
  const previews = available
    .map((card) => ({
      card,
      score: scorePlay(toCharacter(card, card.instance_id), threat, {
        families,
        roundsWon: view.rounds_won.me,
        opponentRoundsWon: view.rounds_won.opponent,
        carriedBonus: carried,
        round: round.round,
        team: view.my_team.map((member) => toCharacter(member, member.instance_id)),
      }),
    }))
    .sort((a, b) => b.score.total - a.score.total);
  const chosen = available.find((card) => card.instance_id === selected);
  const chosenScore = previews.find(({ card }) => card === chosen)?.score;
  const abilityName = (code: string) => abilities.find((a) => a.code === code);
  const previewNote = "Il punteggio è un'anteprima: lo calcola il server quando giochi.";

  // Spia: the revealed characters the opponent still holds.
  const opponentPlayedIds = new Set(view.rounds.map((r) => r.opponent_play?.definition_id).filter(Boolean));
  const spiedLeft = (view.spied_cards ?? []).filter((card) => !opponentPlayedIds.has(card.definition_id));

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="cut-bottom relative mx-3 mt-1 flex min-h-0 flex-1 flex-col overflow-hidden bg-comic-magenta px-4 pb-5 text-black">
        <div aria-hidden className="halftone absolute inset-0 [mask-image:linear-gradient(135deg,transparent_45%,#000_100%)]" />
        {/* The diorama gets the room the screen has left, above the threat's name. */}
        <div className="relative -mx-4 min-h-9 flex-1">
          <ThreatDiorama key={round.round} name={round.threat.name} level={round.level} fill />
        </div>
        <div className="relative">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold">
                Round {round.round} · Livello {round.level}
              </p>
              <p className="font-display text-[30px] uppercase leading-8">{round.threat.name}</p>
            </div>
            <RoundTimer key={deadline} deadline={deadline} offset={offset} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {round.threat.abilities.map((code, index) => {
              const ability = abilityName(code);
              return (
                <span
                  key={code}
                  className="bg-black px-1.5 py-0.5 text-xs font-extrabold"
                  style={{ color: ability?.family.color ?? "#d8d3c5" }}
                >
                  {ability?.name ?? code}
                  {round.modifier?.code === "focus" && index === 0 && " ×2"}
                </span>
              );
            })}
          </div>
          {round.modifier && <ModifierBanner modifier={round.modifier} firstAbility={abilityName(round.threat.abilities[0])?.name ?? round.threat.abilities[0]} />}
          <TimerBar key={deadline} deadline={deadline} offset={offset} />
          {carried > 0 && <p className="mt-1.5 text-xs font-bold">Riscossa: +{carried} al personaggio di questo round.</p>}
          {spiedLeft.length > 0 && (
            <p className="mt-1.5 text-xs font-bold">
              Spia: {opponentName} ha ancora {spiedLeft.map((card) => card.name).join(" e ")}.
            </p>
          )}
          {!isBot && (
            <p className="mt-1.5 text-xs font-bold">
              {round.opponent_has_chosen ? `${opponentName} ha scelto.` : `${opponentName} sta scegliendo…`}
            </p>
          )}
        </div>
      </section>

      {/* The hand: the best predicted score first, as before. */}
      <div role="group" aria-label="Scegli chi mandare" className="flex justify-center gap-1.5 px-3 pb-1.5 pt-3">
        {previews.map(({ card, score }) => (
          <div key={card.instance_id} className="w-[calc((100%-1.5rem)/5)]">
            <HandCard
              card={card}
              score={score.total}
              bonus={score.bonus}
              // Five to a row inside the page padding and the gaps, minus each card's 3px frame.
              artSizes="calc((100vw - 78px) / 5)"
              selected={card.instance_id === selected}
              disabled={busy}
              onSelect={() => onSelect(card.instance_id)}
            />
          </div>
        ))}
      </div>

      {/* The chosen card's details stay above the button, at a fixed height. */}
      <div className="border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        <div className="mb-2 min-h-[74px]">
          {chosen && chosenScore ? (
            <>
              <p className="flex items-center gap-1.5">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center text-xs font-black text-black"
                  style={{ background: rarityFrame(chosen.rarity) }}
                >
                  {rarityLetter(chosen.rarity)}
                </span>
                <span className="truncate font-display text-xl uppercase leading-6">{chosen.name}</span>
                <span className="ml-auto shrink-0 text-xs font-bold text-muted">
                  <span className="font-display text-xl text-comic-yellow">{chosenScore.total}</span> punti
                  {chosenScore.bonus > 0 && <span className="text-comic-cyan"> · +{chosenScore.bonus} bonus</span>}
                  {chosenScore.bonus < 0 && <span className="text-comic-magenta"> · {chosenScore.bonus} malus</span>}
                </span>
                <InfoTip text={previewNote} />
              </p>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {round.threat.abilities.map((code) => `${code} ${chosen.stats[code] ?? 0}`).join(" · ")}
              </p>
              {chosen.power && (
                <p className="line-clamp-2 text-xs font-semibold leading-[15px]" style={{ color: chosen.rarity.color }}>
                  {chosen.power.name}: {chosen.power.text}
                </p>
              )}
            </>
          ) : (
            <p className="flex items-center justify-between gap-2 pt-1 text-sm font-semibold text-muted">
              Tocca una carta per vederne abilità e potere.
              <InfoTip text={previewNote} />
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => chosen && onPlay(chosen.instance_id)}
          disabled={!chosen || busy || chosen.instance_id === pending}
          className="btn btn-primary w-full"
        >
          {busy
            ? isBot
              ? "Il bot sta scegliendo…"
              : "Invio…"
            : chosen && chosen.instance_id === pending
              ? `Hai scelto ${chosen.name}: in attesa di ${opponentName}`
              : chosen
                ? `${pending ? "Cambia: gioca" : "Gioca"} ${chosen.name}`
                : "Scegli un personaggio"}
        </button>
      </div>
    </main>
  );
}

/** The round's seconds left, the only part of the choice that re-renders as they tick. */
function RoundTimer({ deadline, offset }: { deadline: number; offset: number }) {
  const seconds = useSecondsLeft(deadline, offset);
  const shown = Math.min(seconds, balance.match.roundTimerSeconds);
  return (
    <p
      role="timer"
      aria-label={`${shown} secondi rimasti`}
      className={`mb-0.5 flex h-12 w-12 shrink-0 rotate-3 items-center justify-center font-display text-[28px] ${
        seconds <= 10 ? "bg-comic-yellow text-black" : "bg-black text-comic-yellow"
      }`}
    >
      {shown}
    </p>
  );
}

/**
 * The round's time as a bar that empties over its last roundTimerSeconds: one animation
 * of the time left, so the bar moves without re-rendering. Only its colour waits on the clock.
 */
function TimerBar({ deadline, offset }: { deadline: number; offset: number }) {
  const bar = useRef<HTMLDivElement>(null);
  const low = useSecondsLeft(deadline, offset) <= 10;
  useLayoutEffect(() => {
    const total = balance.match.roundTimerSeconds * 1000;
    const left = Math.max(0, deadline - (Date.now() + offset));
    const animation = bar.current?.animate(
      [{ transform: `scaleX(${Math.min(1, left / total)})` }, { transform: "scaleX(0)" }],
      { duration: Math.min(left, total), delay: Math.max(0, left - total), easing: "linear", fill: "both" },
    );
    return () => animation?.cancel();
  }, [deadline, offset]);
  return (
    <div className="mt-2 h-1.5 bg-black" aria-hidden>
      <div ref={bar} className={`h-full origin-left ${low ? "bg-foreground" : "bg-comic-yellow"}`} />
    </div>
  );
}

/** Against a player: says when the opponent has not been seen for 20 s, and lets the player claim the win past the reconnect grace. */
function OpponentAbsent({
  lastSeenAt,
  offset,
  opponentName,
  busy,
  onClaim,
}: {
  lastSeenAt: string;
  offset: number;
  opponentName: string;
  busy: boolean;
  onClaim: () => void;
}) {
  const now = useNow(1000);
  const absentMs = now + offset - Date.parse(lastSeenAt);
  if (absentMs <= 20_000) return null;
  return (
    <div className="absolute inset-x-3 top-full z-20 mt-1 flex items-center justify-between gap-3 bg-comic-yellow p-2.5 text-black shadow-[4px_4px_0_#000]">
      <p className="text-xs font-semibold">
        {opponentName} non risponde. Allo scadere del tempo il server sceglie al posto suo.
      </p>
      {absentMs > balance.match.reconnectGraceSeconds * 1000 && (
        <button
          type="button"
          onClick={onClaim}
          disabled={busy}
          className="btn shrink-0 bg-black px-3 text-sm font-bold text-comic-yellow"
        >
          Rivendica la vittoria
        </button>
      )}
    </div>
  );
}

function ModifierBanner({ modifier, firstAbility }: { modifier: ThreatModifier; firstAbility: string }) {
  const { name, text } = describeThreatModifier(modifier, firstAbility);
  return (
    <p className="mt-1.5 -skew-x-3 bg-comic-yellow px-2.5 py-1 text-[13px] font-bold leading-4 text-black">
      <span className="font-display uppercase">{name}:</span> {text}
    </p>
  );
}

function RoundReveal({
  round,
  previous,
  team,
  abilities,
  opponentName,
  onContinue,
  finished,
  pickDeadline,
  offset,
}: {
  round: MatchRound;
  /** The round before, for the Riscossa a card received from it. */
  previous: MatchRound | null;
  abilities: AbilityInfo[];
  team: TeamCard[];
  opponentName: string;
  onContinue: () => void;
  finished: boolean;
  /** After the last round of a won Conquest: when the time to pick a card is up (server time, ms). */
  pickDeadline: number | null;
  /** Server time minus device time. */
  offset: number;
}) {
  const mine = team.find((card) => card.instance_id === round.my_play?.instance_id);
  const theirs = round.opponent_play;
  // Read out to screen readers: on screen, SBAM! next to a score says who won.
  const banner = { me: "Round vinto!", opponent: "Round perso", none: "Round nullo" }[round.winner ?? "none"];
  const winnerCard = round.winner === "me" ? mine : round.winner === "opponent" ? theirs : null;
  const isTie = round.my_play && theirs && round.my_play.score === theirs.score;
  // With Implacabile on both sides the tie is settled as usual, by the highest value.
  const tieWonBy =
    isTie && winnerCard?.power?.code === "relentless" && mine?.power?.code !== theirs?.power?.code ? winnerCard.name : null;

  // Each card's power is told next to that card, in its own half of the screen.
  const threat = { level: round.level, abilities: round.threat.abilities, modifier: round.modifier };
  const previousMine = team.find((card) => card.instance_id === previous?.my_play?.instance_id);
  const myNotes =
    mine && round.my_play
      ? roundPowerNotes(mine, round.my_play, threat, {
          carried: carriedInto(previousMine, previous?.winner === "opponent"),
          lost: round.winner === "opponent",
          wonTie: Boolean(tieWonBy) && round.winner === "me",
          opponentShielded: theirs?.power?.code === "shielded",
        })
      : [];
  const theirNotes = theirs
    ? roundPowerNotes(theirs, theirs, threat, {
        carried: carriedInto(previous?.opponent_play, previous?.winner === "me"),
        lost: round.winner === "me",
        wonTie: Boolean(tieWonBy) && round.winner === "opponent",
        opponentShielded: mine?.power?.code === "shielded",
      })
    : [];

  // The halves never shrink below their content: on a screen too short for an unusual
  // round (several notes at once), the result scrolls inside instead of being cut.
  return (
    <main className="relative mt-1 flex min-h-0 flex-1 cursor-pointer flex-col overflow-y-auto" onClick={onContinue}>
      <section
        aria-label="La tua giocata"
        className="animate-play-in-top relative flex flex-[1_0_auto] flex-col overflow-hidden bg-comic-cyan px-4 pb-2 pt-2.5 text-black [clip-path:polygon(0_0,100%_0,100%_calc(100%-52px),0_100%)]"
      >
        <p className="text-[13px] font-extrabold leading-4">
          Round {round.round} · {round.threat.name}
        </p>
        <PlaySide
          label="Tu"
          card={mine ?? null}
          play={round.my_play}
          abilities={round.threat.abilities}
          side="left"
          won={round.winner === "me"}
          notes={myNotes}
        />
      </section>

      {/* The winner's name sits on the seam between the two plays, tilted with it. It arrives
          last: first the plays, then their scores, then SBAM! on the winning one. */}
      <section
        aria-label={winnerCard ? `${banner} ${winnerCard.name}` : banner}
        className="relative z-10 -my-[52px] overflow-hidden py-[26px] [clip-path:polygon(0_52px,100%_0,100%_calc(100%-52px),0_100%)]"
      >
        <div
          aria-hidden
          className="rays-dark animate-rays-spin absolute left-1/2 top-1/2 h-[200vmax] w-[200vmax] -translate-x-1/2 -translate-y-1/2"
        />
        <div className="relative -rotate-[7.5deg]">
          {winnerCard ? (
            <WinnerName key={`${round.round}-${winnerCard.code}`} card={winnerCard} delay={NAME_SECONDS} />
          ) : (
            <div className="animate-burst-pop relative h-[120px]">
              <ComicBurst
                fill="#ffd60a"
                className="absolute left-1/2 top-2 h-[104px] w-[104px] -translate-x-1/2 rotate-[8deg]"
                textClassName="text-[30px] tracking-wide"
              >
                PARI!
              </ComicBurst>
            </div>
          )}
        </div>
      </section>

      <section
        aria-label={`La giocata di ${opponentName}`}
        className="animate-play-in-bottom halftone relative flex flex-[1_0_auto] flex-col justify-end overflow-hidden bg-comic-magenta px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-9 text-black [clip-path:polygon(0_52px,100%_0,100%_100%,0_100%)]"
      >
        <PlaySide
          label={opponentName}
          card={theirs}
          play={theirs}
          abilities={round.threat.abilities}
          side="right"
          won={round.winner === "opponent"}
          notes={theirNotes}
        />
        <div className="relative mt-2 flex flex-col gap-1.5">
          {round.modifier && (
            <p className="bg-black px-3 py-1 text-center text-xs font-semibold leading-4 text-foreground">
              {modifierLine(
                round.modifier,
                abilities.find((a) => a.code === round.threat.abilities[0])?.name ?? round.threat.abilities[0],
              )}
            </p>
          )}
          {round.my_play?.auto_played && (
            <p className="bg-black px-3 py-1 text-center text-xs font-semibold leading-4 text-foreground">
              Tempo scaduto: il server ha scelto per te.
            </p>
          )}
          {theirs?.auto_played && (
            <p className="bg-black px-3 py-1 text-center text-xs font-semibold leading-4 text-foreground">
              {opponentName} non ha scelto in tempo.
            </p>
          )}
          {round.winner === "none" && (
            <p className="bg-black px-3 py-1 text-center text-xs font-semibold leading-4 text-foreground">
              Stesso punteggio e stesso valore più alto.
            </p>
          )}
          {/* The whole screen continues; this stays as the hint and the keyboard's way on. */}
          <button
            type="button"
            className={`mx-auto flex h-8 items-center gap-1.5 px-3 text-xs font-extrabold uppercase ${
              pickDeadline === null ? "tracking-wide" : "-skew-x-8 bg-black text-comic-yellow"
            }`}
          >
            <svg viewBox="0 0 14 16" className="h-4 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
              <path
                d="M5 9V2.5c0-.8 1.8-.8 1.8 0V9m0-1.5c0-.8 1.8-.8 1.8 0V9m0-1c0-.8 1.8-.8 1.8 0v3.5c0 2.5-1.6 3.8-3.8 3.8S3.2 14 2.2 12L1 9.6c-.4-.8.6-1.4 1.2-.8L5 11"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {pickDeadline !== null ? (
              <>
                Tocca per scegliere la conquista
                <span className="normal-case">
                  · <SecondsLeft key={pickDeadline} deadline={pickDeadline} offset={offset} /> s
                </span>
              </>
            ) : finished ? (
              "Tocca per vedere il risultato"
            ) : (
              "Tocca per continuare"
            )}
          </button>
        </div>
      </section>
    </main>
  );
}

/** The score climbs to its value when a round is revealed, once the cards are in. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now() + (reduced ? 0 : SCORES_SECONDS * 1000);
    let frame = 0;
    const step = (time: number) => {
      const progress = reduced ? 1 : Math.min(1, Math.max(0, (time - start) / 600));
      setShown(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="font-display text-[58px] leading-[60px]">{shown}</span>;
}

function PlaySide({
  label,
  card,
  play,
  abilities,
  side,
  won,
  notes,
}: {
  label: string;
  card: MatchCard | null;
  play: { score: number } | null;
  abilities: string[];
  side: "left" | "right";
  /** SBAM! bursts next to the winning score. */
  won: boolean;
  /** What the card's power did this round (dimmed when it did nothing). */
  notes: PowerNote[];
}) {
  const isLeft = side === "left";
  return (
    <div className={`relative flex ${isLeft ? "justify-start" : "justify-end text-right"}`}>
      {/* The art grows with the screen: 23% of its height, at most the old 176 px. Even then the
          drawing is at most 128 px wide, so the thumbnail the hand already loaded does. */}
      {card && (
        <div className={`absolute bottom-0 aspect-[32/44] h-[clamp(108px,23dvh,176px)] ${isLeft ? "right-0" : "left-0"}`}>
          {card.art_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={withBasePath(thumbArtUrl(card.art_url))}
              alt=""
              decoding="async"
              className="h-full w-full border-[3px] border-black object-cover object-top"
            />
          ) : (
            <Silhouette
              faction={card.faction}
              accent={card.rarity.color}
              className="absolute bottom-0 left-1/2 h-full -translate-x-1/2"
            />
          )}
        </div>
      )}
      <div className="relative max-w-[64%]">
        <p className="truncate text-xs font-extrabold leading-4">{label}</p>
        <p className="truncate font-display text-[28px] uppercase leading-8">{card?.name ?? "?"}</p>
        {card && (
          <p className="text-xs font-bold leading-4">{abilities.map((code) => `${code} ${card.stats[code] ?? 0}`).join(" · ")}</p>
        )}
        {notes.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isLeft ? "" : "justify-end"}`}>
            {notes.map((note, index) => (
              <span
                key={index}
                className={`-skew-x-8 bg-black px-1.5 py-px text-[11px] font-bold leading-4 ${
                  note.active ? "text-comic-yellow" : "text-faint"
                }`}
              >
                <span className="font-extrabold uppercase">{note.name}</span>
                {note.effect && ` ${note.effect}`}
              </span>
            ))}
          </div>
        )}
        {play && (
          <div className={`flex items-center gap-1 ${isLeft ? "" : "flex-row-reverse"}`}>
            <CountUp value={play.score} />
            {won && (
              <ComicBurst
                fill="#ffd60a"
                className={`animate-burst-pop relative h-[60px] w-[60px] shrink-0 ${isLeft ? "rotate-[10deg]" : "-rotate-[10deg]"}`}
                textClassName="text-[17px] tracking-wide"
              >
                SBAM!
              </ComicBurst>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchResult({
  view,
  offset,
  onUpdate,
  abilities,
  story,
  conquestLive,
}: {
  view: MatchView;
  /** Server time minus device time. */
  offset: number;
  onUpdate: (next: MatchView) => void;
  abilities: AbilityInfo[];
  story: boolean;
  conquestLive: boolean;
}) {
  const title =
    view.end_reason === "forfeit" && view.result === "loss"
      ? "Hai abbandonato"
      : { win: "Vittoria!", loss: "Sconfitta", draw: "Pareggio" }[view.result ?? "draw"];
  const coins = view.reward_coins ?? 0;
  const xp = matchXp(view);
  const cardOf = (instanceId: string | null | undefined) => view.my_team.find((c) => c.instance_id === instanceId);
  const storyReward = useStoryReward(view.id, story);
  const conquest = view.conquest;

  // A Conquest or a mission has more to tell: the banner gets compact, its rows on one line.
  // A card won or lost then takes the room left; otherwise the banner does.
  const compact = Boolean(conquest) || story;
  const prizeCard =
    Boolean(conquest?.resolved && conquest.bonus_coins === 0 && conquest.chosen) ||
    Boolean(storyReward?.completed_now && storyReward.card);
  const chip = `relative -skew-x-8 py-1 font-extrabold ${compact ? "px-2 text-xs" : "px-3 text-sm"}`;
  const score = (
    <p className={`${chip} bg-black text-comic-yellow`}>
      Round {view.rounds_won.me} – {view.rounds_won.opponent} · punti {view.total_score.me} – {view.total_score.opponent}
    </p>
  );
  const gains = (
    <>
      {xp > 0 && <p className={`${chip} bg-black text-foreground`}>+{xp} XP</p>}
      {coins > 0 && <p className={`${chip} bg-black text-comic-yellow`}>+{coins} monete</p>}
    </>
  );
  const levels = (
    <>
      {view.level_rewards.map((reward) => (
        <p key={reward.level} className={`${chip} bg-comic-cyan text-black`}>
          Livello {reward.level}! +{reward.coins} monete
        </p>
      ))}
      {view.level_unlocks?.map((unlock) => (
        <p key={unlock.name} className={`${chip} bg-comic-yellow text-black`}>
          Sbloccato: {unlock.name}!
        </p>
      ))}
    </>
  );

  // What a very short window cannot fit scrolls inside, rather than being cut.
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
      <section
        className={`cut-bottom relative -mx-3 flex flex-col items-center justify-center overflow-hidden px-4 text-center ${
          prizeCard ? "shrink-0" : "flex-[1_0_auto]"
        } ${compact ? "gap-1.5 pb-5 pt-2.5" : "gap-2 pb-8 pt-5"} ${
          view.result === "win" ? "rays-gold" : view.result === "loss" ? "halftone bg-comic-magenta" : "bg-panel-raised"
        }`}
      >
        {view.result === "win" && (
          <span
            aria-hidden
            className={`animate-rare-burst pointer-events-none absolute left-1/2 -ml-12 h-24 w-24 rounded-full bg-comic-magenta/40 [animation-iteration-count:2] ${
              compact ? "top-1" : "top-4"
            }`}
          />
        )}
        <p
          className={`animate-rare-title text-sfx relative uppercase ${compact ? "text-[52px] leading-[52px]" : "text-7xl"} ${
            view.result === "win" ? "text-comic-magenta" : "text-foreground"
          }`}
        >
          {title}
        </p>
        {compact ? (
          <div className="relative flex flex-wrap justify-center gap-1.5">
            {score}
            {gains}
            {levels}
          </div>
        ) : (
          <>
            {score}
            {(xp > 0 || coins > 0) && <div className="relative flex gap-2">{gains}</div>}
            {levels}
          </>
        )}
      </section>

      {storyReward && <StoryRewardPanel reward={storyReward} abilities={abilities} />}

      {conquest && (
        <ConquestPanel
          matchId={view.id}
          conquest={conquest}
          opponentName={rivalName(view)}
          offset={offset}
          onUpdate={onUpdate}
          abilities={abilities}
          live={conquestLive}
        />
      )}

      {/* One tile per round: your card, the score and who it faced. */}
      <section className="flex shrink-0 flex-col gap-1.5">
        <h2 className="section-title text-base leading-5">Round per round</h2>
        <ol className="grid grid-cols-5 gap-1.5">
          {view.rounds
            .filter((r) => r.resolved)
            .map((r) => {
              const mine = cardOf(r.my_play?.instance_id);
              const tone =
                r.winner === "me" ? "text-comic-cyan" : r.winner === "opponent" ? "text-comic-magenta" : "text-muted";
              const frame =
                r.winner === "me" ? "border-comic-cyan" : r.winner === "opponent" ? "border-comic-magenta" : "border-line";
              return (
                <li
                  key={r.round}
                  aria-label={`Round ${r.round}: ${mine?.name ?? "—"} contro ${r.opponent_play?.name ?? "—"}, ${
                    r.my_play?.score ?? "—"
                  } a ${r.opponent_play?.score ?? "—"}`}
                  className="flex min-w-0 flex-col text-center"
                >
                  <span aria-hidden className={`relative block aspect-square overflow-hidden border-[3px] bg-panel-raised ${frame}`}>
                    {mine?.art_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={withBasePath(mine.art_url)}
                        srcSet={artSrcSet(mine.art_url)}
                        // Five tiles per row inside the page padding and the gaps, minus each tile's 3px frame.
                        sizes="calc((100vw - 78px) / 5)"
                        alt=""
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover object-top"
                      />
                    ) : (
                      mine && (
                        <Silhouette
                          faction={mine.faction}
                          accent={mine.rarity.color}
                          className="absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2"
                        />
                      )
                    )}
                    <span className="absolute left-0.5 top-0.5 -skew-x-8 bg-black px-1 font-display text-[13px] leading-4 text-foreground">
                      {r.round}
                    </span>
                  </span>
                  <span aria-hidden className="mt-0.5 truncate font-display text-[11px] uppercase leading-[14px]">
                    {mine?.name ?? "—"}
                  </span>
                  <span aria-hidden className={`font-display text-lg leading-5 ${tone}`}>
                    {r.my_play?.score}–{r.opponent_play?.score}
                  </span>
                  <span aria-hidden className="truncate text-[10.5px] font-bold text-muted">
                    vs {r.opponent_play?.name ?? "—"}
                  </span>
                </li>
              );
            })}
        </ol>
      </section>

      {/* Side by side: the room above goes to the result. */}
      <div className="flex shrink-0 gap-2">
        {story ? (
          <Link href="/storia" className="btn btn-primary min-w-0 flex-1">
            Torna alla Storia
          </Link>
        ) : (
          <Link
            href={view.mode === "bot" ? `/squadra/?difficulty=${view.bot_difficulty ?? "easy"}` : "/gioca"}
            className="btn btn-primary min-w-0 flex-1"
          >
            {view.mode === "bot" ? "Rivincita" : "Gioca ancora"}
          </Link>
        )}
        <Link href="/" className="btn btn-ghost shrink-0">
          Torna alla home
        </Link>
      </div>
    </main>
  );
}
