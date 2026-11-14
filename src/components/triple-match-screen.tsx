"use client";

import Link from "next/link";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties } from "react";
import type { AbilityFamilies } from "@o-mega/game-engine";
import { CardDetailProvider, useCardDetail } from "@/components/card-detail";
import { useEventPointsFor } from "@/components/event-banner";
import { Silhouette } from "@/components/card-view";
import { HandCard } from "@/components/hand-card";
import { InfoTip } from "@/components/info-tip";
import { PowerPill, prefersReducedMotion } from "@/components/comic-page";
import { contestNotes } from "@/lib/triple-powers";
import { Sheet } from "@/components/sheet";
import { balance } from "@/config/balance";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import { describeEventPoints } from "@/lib/events";
import {
  claimVictory,
  DIFFICULTY_LABELS,
  fetchMatchState,
  forfeitMatch,
  pingMatch,
  subscribeToUpdates,
  type MatchCard,
} from "@/lib/match";
import { RewardChips, useMatchReward } from "@/components/match-reward";
import { RareThreatAlert } from "@/components/rare-threat-alert";
import { tripleBeforeRound, useRevealHold } from "@/lib/reveal-hold";
import { tieBreakReason, tieWonByRelentless } from "@/lib/round-powers";
import { oddsText, rarityGlow, rarityTitle } from "@/lib/threat-rarity";
import { describeThreatModifier } from "@/lib/threat-modifiers";
import {
  playTripleRound,
  resolveTripleRound,
  roundPoints,
  submitTriplePlacement,
  triplePreviews,
  type TripleContest,
  type TripleRound,
  type TripleThreat,
  type TripleView,
} from "@/lib/triple";
import { artSrcSet } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import { useCardDrag } from "@/lib/use-card-drag";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow, useSecondsLeft } from "@/lib/use-now";

// Against a player: the same pace as the other matches (see match-screen.tsx).
const PING_MS = 6_000;
const OFFLINE_POLL_MS = 5_000;
const TUTORIAL_KEY = "o-mega.triple-tutorial-seen";

function seenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) !== null;
  } catch {
    // Without storage the rules stay one tap away, in the rules sheet.
    return true;
  }
}

function lastResolvedRound(view: TripleView): number {
  return Math.max(0, ...view.rounds.filter((r) => r.resolved).map((r) => r.round));
}

function rivalLabel(view: TripleView): string {
  return view.bot_difficulty ? `Bot ${DIFFICULTY_LABELS[view.bot_difficulty]}` : (view.opponent?.username ?? "Avversario");
}

/** An Allarme Triplo (against a bot or a player), from the first round to the result. */
export function TripleMatchScreen({ initial }: { initial: TripleView }) {
  return (
    <CardDetailProvider>
      <TripleSteps initial={initial} />
    </CardDetailProvider>
  );
}

function TripleSteps({ initial }: { initial: TripleView }) {
  const [view, setView] = useState(initial);
  // Server time minus device time: countdowns follow the server clock.
  const [offset, setOffset] = useState(() => Date.parse(initial.server_now) - Date.now());
  const [revealing, setRevealing] = useState<number | null>(null);
  // The strip at the top keeps the round's points until the result page tells them.
  const { held, settled, settle } = useRevealHold(revealing);
  // The card on each threat this round (instance ids); null until the player places one there.
  const [placement, setPlacement] = useState<(string | null)[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>([]);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  // The rules once, at the first Allarme Triplo on this device.
  const [tutorial, setTutorial] = useState(() => initial.status === "active" && !seenTutorial());
  const rulesRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    fetchAbilities()
      .then(setAbilities)
      .catch((cause: unknown) => console.error("Abilities failed", cause));
  }, []);

  const closeTutorial = () => {
    setTutorial(false);
    try {
      localStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      // Shown again next time: harmless.
    }
  };

  // Every newly resolved round is revealed, however we learned about it.
  const revealedUpTo = useRef(lastResolvedRound(initial));
  const apply = useCallback((next: TripleView) => {
    setView(next);
    setOffset(Date.parse(next.server_now) - Date.now());
    const newest = lastResolvedRound(next);
    if (newest > revealedUpTo.current) {
      revealedUpTo.current = newest;
      setRevealing(newest);
      setPlacement(null);
      setSelected(null);
    }
  }, []);
  const fetchTriple = useCallback(async (id: string) => (await fetchMatchState(id)) as unknown as TripleView, []);

  const isBot = view.bot_difficulty !== null;
  const isActive = view.status === "active";
  const current = isActive ? view.rounds.find((r) => r.round === view.current_round && !r.resolved) : undefined;
  const deadline = current ? Date.parse(current.deadline_at) : null;

  const submit = useCallback(
    async (round: number, cards: string[] | null) => {
      setBusy(true);
      setError(null);
      try {
        if (isBot) apply(await playTripleRound(view.id, round, cards));
        else apply(cards === null ? await resolveTripleRound(view.id) : await submitTriplePlacement(view.id, round, cards));
      } catch (cause) {
        // Someone (the timer, another tab) was faster: reload the state.
        if (cause instanceof Error && ["round_already_resolved", "match_not_active"].includes(cause.message)) {
          apply(await fetchTriple(view.id));
        } else {
          setError(describeServerError(cause));
        }
      } finally {
        setBusy(false);
      }
    },
    [apply, fetchTriple, view.id, isBot],
  );

  // Against a player: broadcasts, pings and a poll while broadcasts cannot arrive.
  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      apply(await fetchTriple(view.id));
    } catch {
      // The next broadcast, ping or poll will try again.
    } finally {
      refreshing.current = false;
    }
  }, [apply, fetchTriple, view.id]);

  const latest = useRef(view);
  useEffect(() => {
    latest.current = view;
  });

  useEffect(() => {
    if (isBot || !isActive) return;
    let live = false;
    const unsubscribe = subscribeToUpdates(
      `match:${view.id}`,
      () => {
        refresh();
      },
      (nowLive) => {
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
          const shown = latest.current;
          const round = shown.rounds.find((r) => r.round === shown.current_round);
          // The ping counts contests: the first of the round being played.
          const firstContest = (shown.current_round - 1) * shown.threats.length + 1;
          if (
            answer.status !== shown.status ||
            answer.current_round !== firstContest ||
            (answer.status === "active" && answer.opponent_has_chosen !== Boolean(round?.opponent_has_chosen))
          ) {
            refresh();
          }
        })
        .catch(() => {});
    ping();
    const pinger = setInterval(ping, PING_MS);
    return () => {
      unsubscribe();
      clearInterval(poll);
      clearInterval(pinger);
    };
  }, [isBot, isActive, view.id, refresh]);

  // When the time is up (plus the server's grace), let the server place for us.
  const round = current?.round;
  useEffect(() => {
    if (round === undefined || deadline === null) return;
    const delay = deadline + (balance.match.timeoutGraceSeconds + 0.5) * 1000 - (Date.now() + offset);
    const timer = setTimeout(() => submit(round, null), Math.max(0, delay));
    return () => clearTimeout(timer);
  }, [round, deadline, offset, submit]);

  // A round result stays on screen for the reveal pause; the last one waits for a tap.
  useEffect(() => {
    if (revealing === null || view.status !== "active") return;
    const timer = setTimeout(() => {
      settle(revealing);
      setRevealing(null);
    }, balance.match.revealMinSeconds * 1000);
    return () => clearTimeout(timer);
  }, [revealing, view.status, settle]);

  async function forfeit() {
    setBusy(true);
    try {
      apply((await forfeitMatch(view.id)) as unknown as TripleView);
      setRevealing(null);
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
      setConfirmForfeit(false);
    }
  }

  async function claim() {
    setBusy(true);
    try {
      apply((await claimVictory(view.id)) as unknown as TripleView);
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  const families: AbilityFamilies = useMemo(
    () => Object.fromEntries(abilities.map((a) => [a.code, a.family.code])),
    [abilities],
  );
  const shownRound = revealing === null ? null : (view.rounds.find((r) => r.round === revealing) ?? null);
  const rival = rivalLabel(view);
  // What the strip (and the threats sheet) shows: the match before the round on screen, until its totals are out.
  const strip = held && revealing !== null ? tripleBeforeRound(view, revealing) : view;
  useLockedScreen(true);

  // Until the player touches anything: the placement already submitted, or nothing.
  const shownPlacement = placement ?? current?.my_pending ?? view.threats.map(() => null);

  return (
    <div className="game-shell">
      <header className="relative flex items-center gap-1.5 px-3 py-1">
        <div className="min-w-0 max-w-[8rem] shrink-0 leading-none">
          <p className="truncate text-[10px] font-bold text-muted">
            {view.mode === "bot" ? `Allarme Triplo · ${rival}` : `Amichevole · ${rival}`}
          </p>
          <p className="mt-0.5 flex items-baseline gap-1 text-[11px] font-extrabold uppercase">
            Tu
            <span
              key={settled ?? 0}
              className={`shrink-0 font-display text-2xl leading-6 text-comic-yellow ${settled !== null ? "strip-bump" : ""}`}
            >
              {strip.points.me}–{strip.points.opponent}
            </span>
            <span className="truncate">{isBot ? "Bot" : rival}</span>
          </p>
        </div>
        <RoundTrack view={strip} settled={settled} />
        <button
          type="button"
          onClick={() => rulesRef.current?.showModal()}
          aria-label="Le Minacce e le regole"
          className="btn btn-ghost h-11 w-11 shrink-0 px-0 font-display text-xl"
        >
          ?
        </button>
        {strip.status === "active" ? (
          <button
            type="button"
            // While the last result plays the match is already over: nothing left to abandon.
            onClick={() => isActive && setConfirmForfeit(true)}
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
          <OpponentAbsent lastSeenAt={view.opponent.last_seen_at} offset={offset} name={rival} busy={busy} onClaim={claim} />
        )}
      </header>

      <Sheet sheetRef={rulesRef} title="Allarme Triplo">
        <ThreatList view={strip} abilities={abilities} />
        <button type="button" onClick={() => setTutorial(true)} className="row-link w-full text-left">
          <span className="font-display text-xl uppercase">Come si gioca</span>
          <span className="font-display text-2xl text-comic-yellow" aria-hidden>
            →
          </span>
        </button>
      </Sheet>

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
            <p className="text-sm font-bold">Abbandonare conta come sconfitta.</p>
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
      {tutorial && <TripleTutorial onClose={closeTutorial} />}
      {error && <p className="mx-3 mt-1 text-sm font-semibold text-comic-magenta">{error}</p>}

      {shownRound ? (
        <RoundReveal
          view={view}
          round={shownRound}
          rival={rival}
          finished={view.status === "finished"}
          onVerdict={() => settle(shownRound.round)}
          onContinue={() => {
            settle(shownRound.round);
            setRevealing(null);
          }}
        />
      ) : view.status === "finished" ? (
        <TripleResult view={view} rival={rival} />
      ) : current ? (
        <ChooseRound
          view={view}
          round={current}
          families={families}
          abilities={abilities}
          deadline={deadline!}
          offset={offset}
          placement={shownPlacement}
          selected={selected}
          busy={busy}
          rival={rival}
          onSelect={setSelected}
          onPlace={(next) => setPlacement(next)}
          onPlay={(cards) => submit(current.round, cards)}
        />
      ) : null}
    </div>
  );
}

/** The rounds: the points each side took in each, the current one highlighted. */
function RoundTrack({ view, settled }: { view: TripleView; settled: number | null }) {
  return (
    <ol className="flex min-w-0 flex-1 gap-1" aria-label="Round">
      {Array.from({ length: view.rounds_count }, (_, i) => {
        const round = view.rounds.find((r) => r.round === i + 1 && r.resolved);
        const isCurrent = view.status === "active" && view.current_round === i + 1;
        const points = round ? roundPoints(round) : null;
        const style = isCurrent
          ? "bg-comic-yellow text-black"
          : points
            ? points.me > points.opponent
              ? "bg-comic-cyan text-black"
              : points.opponent > points.me
                ? "bg-panel-raised text-muted"
                : "bg-panel-raised text-faint"
            : "border-2 border-line text-foreground";
        return (
          <li
            key={i}
            aria-label={points ? `Round ${i + 1}: tu ${points.me}, avversario ${points.opponent}` : `Round ${i + 1}`}
            className={`flex h-11 min-w-0 flex-1 -skew-x-8 items-center justify-center leading-none ${style} ${
              settled === i + 1 ? "strip-bump" : ""
            }`}
          >
            {points ? (
              <span className="font-display text-[17px]">
                {points.me}–{points.opponent}
              </span>
            ) : (
              <span className="font-display text-[19px]">{i + 1}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

const abilityName = (abilities: AbilityInfo[], code: string) => abilities.find((a) => a.code === code)?.name ?? code;

/** A threat's twist, if it has one, as one short line. */
function modifierText(threat: TripleThreat, abilities: AbilityInfo[]): string | null {
  if (!threat.modifier) return null;
  const { name, text } = describeThreatModifier(threat.modifier, abilityName(abilities, threat.abilities[0] ?? ""), (code) =>
    abilityName(abilities, code),
  );
  return `${name}: ${text}`;
}

/** Who won each threat in each resolved round: one mark per round. */
function ThreatRecord({ view, slot }: { view: TripleView; slot: number }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {Array.from({ length: view.rounds_count }, (_, i) => {
        const contest = view.rounds.find((r) => r.round === i + 1 && r.resolved)?.contests.find((c) => c.slot === slot);
        const tone =
          contest?.winner === "me"
            ? "bg-comic-cyan"
            : contest?.winner === "opponent"
              ? "bg-comic-orange"
              : contest
                ? "bg-faint"
                : "border border-line";
        return <span key={i} className={`h-2 w-2 ${tone}`} />;
      })}
    </span>
  );
}

function ChooseRound({
  view,
  round,
  families,
  abilities,
  deadline,
  offset,
  placement,
  selected,
  busy,
  rival,
  onSelect,
  onPlace,
  onPlay,
}: {
  view: TripleView;
  round: TripleRound;
  families: AbilityFamilies;
  abilities: AbilityInfo[];
  deadline: number;
  offset: number;
  placement: (string | null)[];
  selected: string | null;
  busy: boolean;
  rival: string;
  onSelect: (id: string | null) => void;
  onPlace: (placement: (string | null)[]) => void;
  onPlay: (cards: string[]) => void;
}) {
  const isBot = view.bot_difficulty !== null;
  const hand = round.hand ?? [];
  const previews = useMemo(() => triplePreviews(view, families), [view, families]);
  // The rarest of the rare threats on the table is announced once (SPEC §5.15).
  const rarest = view.threats
    .filter((threat) => threat.rarity)
    .sort((x, y) => (y.rarity?.rank ?? 0) - (x.rarity?.rank ?? 0))[0];
  const detail = useCardDetail();
  const cardOf = (id: string | null) => hand.find((card) => card.instance_id === id) ?? null;
  const slotOf = (id: string) => placement.indexOf(id);
  // A card dragged onto a threat goes there (swapping with the one there, which goes back
  // to the hand or to the dragged card's old threat); dropped on the hand it leaves its threat.
  const { drag, start, ghostRef } = useCardDrag((id, zone) => {
    if (zone === "hand") {
      onPlace(placement.map((placed) => (placed === id ? null : placed)));
      onSelect(null);
    } else if (zone !== null) {
      put(id, Number(zone));
    }
  }, busy);
  // The card being placed: the one dragged, the one tapped, or the first still in the hand.
  const active = drag?.id ?? selected ?? hand.find((card) => slotOf(card.instance_id) < 0)?.instance_id ?? null;
  const complete = placement.every((id) => id !== null);
  const isPending =
    complete && round.my_pending !== null && round.my_pending.every((id, slot) => id === placement[slot]);
  const previewNote =
    "Il punteggio di ogni carta su ogni Minaccia, prima di sapere chi metterà l'avversario: Sabotatore, Nemesi e gli altri poteri che guardano la carta avversaria si vedono solo dopo. Il server calcola tutto quando piazzi.";

  /** Puts a card on a threat; the card there goes where the moved one was (the hand, or its threat). */
  function put(id: string, slot: number) {
    const next = [...placement];
    const here = next[slot];
    const from = next.indexOf(id);
    if (from === slot) return;
    if (from >= 0) next[from] = here; // swap
    next[slot] = id;
    onPlace(next);
    onSelect(null);
  }

  function place(slot: number) {
    if (busy) return;
    const here = placement[slot];
    if (active === null || active === here) {
      // A tap on a placed card without a new one to put there takes it back to the hand.
      const next = [...placement];
      next[slot] = null;
      onPlace(next);
      onSelect(here);
      return;
    }
    put(active, slot);
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="cut-bottom relative mx-3 mt-1 flex shrink-0 flex-col overflow-hidden bg-comic-magenta px-3 pb-3 pt-1.5 text-black">
        <div aria-hidden className="halftone absolute inset-0 [mask-image:linear-gradient(135deg,transparent_45%,#000_100%)]" />
        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold">
              Round {round.round} di {view.rounds_count} · Allarme Triplo
            </p>
            <p className="font-display text-[22px] uppercase leading-6">Una carta per Minaccia</p>
            {!isBot && (
              <p className="mt-0.5 text-xs font-bold">
                {round.opponent_has_chosen ? `${rival} ha piazzato.` : `${rival} sta piazzando…`}
              </p>
            )}
          </div>
          <RoundTimer key={deadline} deadline={deadline} offset={offset} />
        </div>
      </section>

      <RareThreatAlert alertKey={`${view.id}:rare`} rarity={rarest?.rarity} name={rarest?.name ?? ""} />
      {/* The three threats, with the card placed on each and the preview of the card being placed. */}
      <div className="grid min-h-0 flex-1 grid-cols-3 gap-1.5 px-3 pt-2">
        {view.threats.map((threat) => {
          const placed = cardOf(placement[threat.slot]);
          const score = placed ? previews.get(placed.instance_id)?.[threat.slot] : undefined;
          const incoming = active && placement[threat.slot] !== active ? previews.get(active)?.[threat.slot] : undefined;
          const twist = modifierText(threat, abilities);
          const hovered = drag?.over === String(threat.slot);
          return (
            <button
              key={threat.slot}
              type="button"
              data-drop={threat.slot}
              onClick={() => place(threat.slot)}
              onPointerDown={placed ? start(placed.instance_id) : undefined}
              onDragStart={(event) => event.preventDefault()}
              disabled={busy}
              aria-label={`${threat.name}, livello ${threat.level}${placed ? `: ${placed.name}, ${score?.total ?? 0} punti` : ": libera"}${
                incoming && active ? `. ${cardOf(active)?.name} farebbe ${incoming.total}` : ""
              }`}
              className={`flex min-h-0 min-w-0 touch-none select-none flex-col border-[3px] px-1.5 pb-1.5 pt-1 text-left ${
                hovered
                  ? "border-comic-cyan bg-panel-raised shadow-[3px_3px_0_var(--comic-cyan)]"
                  : placed
                    ? "border-comic-yellow bg-panel"
                    : "border-dashed border-line bg-panel"
              } ${placed && drag?.id === placed.instance_id ? "opacity-50" : ""}`}
              style={rarityGlow(threat.rarity)}
            >
              {threat.rarity && (
                <span className="text-[9px] font-extrabold uppercase leading-3" style={{ color: threat.rarity.color }}>
                  {rarityTitle(threat.rarity)}
                </span>
              )}
              <span className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-extrabold text-muted">Lv {threat.level}</span>
                <ThreatRecord view={view} slot={threat.slot} />
              </span>
              <span className="line-clamp-2 break-words font-display text-[15px] uppercase leading-4 [hyphens:auto]" lang="it">
                {threat.name}
              </span>
              <span className="mt-0.5 line-clamp-2 text-[9.5px] font-bold leading-3 text-muted">
                {threat.hidden ? "Abilità nascoste" : threat.abilities.map((code) => abilityName(abilities, code)).join(" · ")}
              </span>
              {twist && (
                <span className="mt-0.5 line-clamp-2 bg-comic-magenta px-1 text-[9px] font-extrabold leading-3 text-black">{twist}</span>
              )}
              <span className="mt-auto flex flex-col gap-0.5 pt-1">
                {placed ? (
                  <>
                    <span className="truncate text-[11px] font-extrabold uppercase">{placed.name}</span>
                    <span className="-skew-x-8 bg-comic-yellow text-center font-display text-[22px] leading-7 text-black">
                      {score?.total ?? "–"}
                    </span>
                  </>
                ) : (
                  <span className="text-center text-[11px] font-extrabold text-faint">libera</span>
                )}
                {incoming && (
                  <span className="text-center text-[10px] font-extrabold text-comic-cyan">
                    {placed ? "scambia" : "metti"}: {incoming.total}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* The hand: the cards drawn this round. Drag one onto a threat, or tap it, then the threat. */}
      <div role="group" aria-label="Le carte pescate" data-drop="hand" className="flex justify-center gap-2 px-3 pb-1.5 pt-2.5">
        {hand.map((card) => {
          const slot = slotOf(card.instance_id);
          const scores = previews.get(card.instance_id) ?? [];
          const best = scores.length ? Math.max(...scores.map((s) => s.total)) : 0;
          const shown = slot >= 0 ? scores[slot] : undefined;
          return (
            <div
              key={card.instance_id}
              onPointerDown={start(card.instance_id)}
              onDragStart={(event) => event.preventDefault()}
              className={`w-[calc((100%-1rem)/3)] max-w-32 touch-none ${drag?.id === card.instance_id ? "opacity-50" : ""}`}
            >
              <HandCard
                card={card}
                score={shown?.total ?? best}
                bonus={shown?.bonus ?? 0}
                note={slot >= 0 ? `su ${view.threats[slot]?.name}` : undefined}
                short
                artSizes="calc((100vw - 56px) / 3)"
                selected={card.instance_id === active}
                disabled={busy}
                onSelect={() => onSelect(card.instance_id)}
                press={detail.press(card)}
              />
            </div>
          );
        })}
      </div>

      <div className="border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
          <span className="min-w-0 flex-1">
            {complete
              ? "Tutte le Minacce coperte. Puoi ancora spostare o scambiare le carte trascinandole."
              : "Trascina una carta sulla Minaccia, o toccala e poi tocca la Minaccia. Ogni Minaccia vinta vale un punto."}
          </span>
          <InfoTip text={previewNote} />
        </p>
        <button
          type="button"
          onClick={() => complete && onPlay(placement as string[])}
          disabled={!complete || busy || isPending}
          className="btn btn-primary w-full"
        >
          {busy
            ? isBot
              ? "Il bot sta piazzando…"
              : "Invio…"
            : isPending
              ? `In attesa di ${rival}`
              : complete
                ? round.my_pending
                  ? "Cambia e piazza"
                  : "Piazza le carte"
                : `Piazza ancora ${placement.filter((id) => id === null).length}`}
        </button>
      </div>
      {drag && <DragGhost ref={ghostRef} card={cardOf(drag.id)} />}
    </main>
  );
}

/** The card under the finger while it is dragged. */
function DragGhost({ ref, card }: { ref: (element: HTMLDivElement | null) => void; card: MatchCard | null }) {
  if (!card) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-50 w-24 border-[3px] border-comic-yellow bg-panel shadow-[5px_5px_0_var(--comic-magenta)]"
    >
      <span className="relative block aspect-[3/4] bg-panel-raised">
        {card.art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={withBasePath(card.art_url)}
            srcSet={artSrcSet(card.art_url)}
            sizes="96px"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        ) : (
          <Silhouette faction={card.faction} accent={card.rarity.color} className="absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2" />
        )}
      </span>
      <span className="block truncate px-0.5 py-0.5 text-center font-display text-xs uppercase leading-[15px]">{card.name}</span>
    </div>
  );
}

/** The round's seconds left. */
function RoundTimer({ deadline, offset }: { deadline: number; offset: number }) {
  const seconds = useSecondsLeft(deadline, offset);
  const shown = Math.min(seconds, balance.triple.roundTimerSeconds);
  return (
    <p
      role="timer"
      aria-label={`${shown} secondi rimasti`}
      className={`mb-0.5 flex h-11 w-11 shrink-0 rotate-3 items-center justify-center font-display text-[26px] ${
        seconds <= 10 ? "bg-comic-yellow text-black" : "bg-black text-comic-yellow"
      }`}
    >
      {shown}
    </p>
  );
}

function OpponentAbsent({
  lastSeenAt,
  offset,
  name,
  busy,
  onClaim,
}: {
  lastSeenAt: string;
  offset: number;
  name: string;
  busy: boolean;
  onClaim: () => void;
}) {
  const now = useNow(1000);
  const absentMs = now + offset - Date.parse(lastSeenAt);
  if (absentMs <= 20_000) return null;
  return (
    <div className="absolute inset-x-3 top-full z-20 mt-1 flex items-center justify-between gap-3 bg-comic-yellow p-2.5 text-black shadow-[4px_4px_0_#000]">
      <p className="text-xs font-semibold">{name} non risponde. Allo scadere del tempo il server piazza al posto suo.</p>
      {absentMs > balance.match.reconnectGraceSeconds * 1000 && (
        <button type="button" onClick={onClaim} disabled={busy} className="btn shrink-0 bg-black px-3 text-sm font-bold text-comic-yellow">
          Rivendica la vittoria
        </button>
      )}
    </div>
  );
}

const comicIn = (delay: number): CSSProperties => ({ animation: `comic-in 0.35s ease-out ${delay}s both` });
const comicStamp = (delay: number): CSSProperties => ({ animation: `comic-stamp 0.45s ease-out ${delay}s both` });

/** One threat of a resolved round: the two cards, their scores, who took the point. */
function ContestPanel({
  view,
  round,
  contest,
  rival,
  delay,
}: {
  view: TripleView;
  round: TripleRound;
  contest: TripleContest;
  rival: string;
  delay: number;
}) {
  const detail = useCardDetail();
  const threat = view.threats[contest.slot];
  const mine = view.my_deck.find((card) => card.instance_id === contest.my_play?.instance_id) ?? null;
  const theirs = contest.opponent_play;
  const won = contest.winner === "me";
  const lost = contest.winner === "opponent";
  // Equal totals: what settled the threat (SPEC §5.6), for both players.
  const myPlay = contest.my_play;
  const tie =
    myPlay && theirs && myPlay.score === theirs.score
      ? tieBreakReason(
          won ? myPlay : lost ? theirs : null,
          won ? theirs : myPlay,
          threat?.modifier,
          won && tieWonByRelentless(mine, theirs, threat?.modifier)
            ? (mine?.name ?? null)
            : lost && tieWonByRelentless(theirs, mine, threat?.modifier)
              ? theirs.name
              : null,
        )
      : null;
  // The powers of each card on this threat, in their family's colours (effect-families.ts).
  const notesOf = (tone: "me" | "opponent") => contestNotes(view, round, contest, tone);
  const side = (card: MatchCard | null, score: number, tone: "me" | "opponent", winner: boolean) => (
    <span
      {...(card ? detail.press(card) : {})}
      className={`flex min-w-0 flex-1 flex-col items-center px-1 py-1 ${tone === "opponent" ? "text-right" : "text-left"} ${
        winner ? (tone === "me" ? "bg-comic-cyan text-black" : "bg-comic-orange text-black") : "bg-panel text-muted"
      }`}
    >
      <span className="w-full truncate text-center text-[11px] font-extrabold uppercase">{card?.name ?? "—"}</span>
      <span className="font-display text-[28px] leading-8">{score}</span>
      <span className="flex max-w-full flex-col items-center gap-0.5">
        {notesOf(tone).map((note, index) => (
          <PowerPill key={index} note={note} delay={delay + 0.25 + index * 0.12} />
        ))}
      </span>
    </span>
  );
  return (
    <li className="relative flex flex-col gap-1 border-[3px] border-black bg-white px-1.5 pb-1.5 pt-1 text-black" style={comicIn(delay)}>
      {/* The level stays next to the name, clear of the sticker that says who took the point. */}
      <p className="flex items-baseline gap-2 pr-[124px]">
        <span className="truncate font-display text-[17px] uppercase leading-5">{threat?.name}</span>
        <span className="shrink-0 text-[10px] font-extrabold">Lv {threat?.level}</span>
      </p>
      <div className="flex items-stretch gap-1">
        {side(mine, contest.my_play?.score ?? 0, "me", won)}
        <span className="flex items-center font-display text-lg">vs</span>
        {side(theirs, theirs?.score ?? 0, "opponent", lost)}
      </div>
      {tie && <p className="text-center text-[11px] font-bold leading-[14px]">Pari: {tie}.</p>}
      <span
        className={`absolute -right-2 -top-3 max-w-[124px] -rotate-6 truncate px-1.5 font-display text-lg uppercase leading-6 ${
          won ? "bg-comic-cyan" : lost ? "bg-comic-orange" : "bg-black text-comic-yellow"
        }`}
        style={comicStamp(delay + 0.35)}
      >
        {won ? "+1 a te" : lost ? `+1 a ${rival}` : "Pari"}
      </span>
    </li>
  );
}

function RoundReveal({
  view,
  round,
  rival,
  finished,
  onContinue,
  onVerdict,
}: {
  view: TripleView;
  round: TripleRound;
  rival: string;
  finished: boolean;
  onContinue: () => void;
  /** The round's totals are on the page: the strip at the top may show them. */
  onVerdict: () => void;
}) {
  const contests = [...round.contests].sort((a, b) => a.slot - b.slot);
  const points = roundPoints(round);
  const upTo = view.rounds.filter((r) => r.resolved && r.round <= round.round).map(roundPoints);
  const totals = upTo.reduce((sum, p) => ({ me: sum.me + p.me, opponent: sum.opponent + p.opponent }), { me: 0, opponent: 0 });
  const auto = contests.some((c) => c.my_play?.auto_played);
  const theirAuto = contests.some((c) => c.opponent_play?.auto_played);
  const last = contests.length * 0.6;
  // The totals line lands last (at once with reduced motion): then the strip catches up.
  const announce = useEffectEvent(onVerdict);
  useEffect(() => {
    const timer = setTimeout(announce, prefersReducedMotion() ? 0 : (last + 0.3) * 1000);
    return () => clearTimeout(timer);
  }, [round.round, last]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onContinue}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onContinue();
      }}
      className="cut-bottom relative mx-3 mt-1 flex min-h-0 flex-1 cursor-pointer flex-col gap-2 overflow-y-auto bg-comic-yellow px-3 pb-6 pt-2 text-left text-black"
      aria-label={`Round ${round.round}: tu ${points.me}, ${rival} ${points.opponent}. Tocca per continuare`}
    >
      <div aria-hidden className="halftone absolute inset-0 opacity-40" />
      <p className="relative font-display text-3xl uppercase leading-8" style={comicIn(0)}>
        Round {round.round}
      </p>
      <ol className="relative flex flex-col gap-3 pr-2">
        {contests.map((contest, i) => (
          <ContestPanel key={contest.slot} view={view} round={round} contest={contest} rival={rival} delay={0.2 + i * 0.6} />
        ))}
      </ol>
      <div className="relative mt-auto flex flex-col items-center gap-1" style={comicIn(last + 0.3)}>
        <p className="-skew-x-8 bg-black px-3 py-1 font-display text-2xl uppercase text-comic-yellow">
          Round {points.me}–{points.opponent} · Totale {totals.me}–{totals.opponent}
        </p>
        {auto && <p className="text-xs font-extrabold">Tempo scaduto: il server ha piazzato le tue carte a caso.</p>}
        {theirAuto && <p className="text-xs font-extrabold">{rival} non ha piazzato in tempo.</p>}
        <p className="text-xs font-extrabold uppercase tracking-wide">{finished ? "Tocca per il risultato" : "Tocca per continuare"}</p>
      </div>
    </div>
  );
}

/** The three threats, whole, with their twists and who won each so far. */
function ThreatList({ view, abilities }: { view: TripleView; abilities: AbilityInfo[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">
        Le stesse tre Minacce per tutta la partita. Ogni round ci metti una carta su ognuna: chi fa più punti su una Minaccia
        prende un punto. A punti pari vince il valore più alto tra le abilità richieste; se è pari anche quello, nessuno.
      </p>
      <ul className="flex flex-col gap-1.5">
        {view.threats.map((threat) => {
          const twist = modifierText(threat, abilities);
          return (
            <li key={threat.slot} className="flex flex-col gap-0.5 bg-panel px-2.5 py-1.5">
              <p className="flex items-center justify-between gap-2">
                <span className="font-display text-lg uppercase leading-5">{threat.name}</span>
                <ThreatRecord view={view} slot={threat.slot} />
              </p>
              {threat.rarity && (
                <p className="text-xs font-extrabold uppercase" style={{ color: threat.rarity.color }}>
                  {rarityTitle(threat.rarity)} · {oddsText(threat.rarity.one_in)}
                </p>
              )}
              <p className="text-xs font-bold text-muted">
                Livello {threat.level} ·{" "}
                {threat.hidden ? "abilità nascoste" : threat.abilities.map((code) => abilityName(abilities, code)).join(" · ")}
              </p>
              {twist && <p className="text-xs font-bold text-comic-magenta">{twist}</p>}
              <p className="text-xs italic text-muted">{threat.flavor}</p>
            </li>
          );
        })}
      </ul>
      <p className="text-xs font-semibold text-muted">
        I quadratini sono i round: in azzurro le Minacce che hai vinto, in arancione quelle dell&apos;avversario.
      </p>
    </div>
  );
}

function TripleTutorial({ onClose }: { onClose: () => void }) {
  const { rounds, threats } = balance.triple;
  return (
    <>
      <button type="button" aria-label="Chiudi" onClick={onClose} className="fixed inset-0 z-40 bg-black/70" />
      <div
        role="dialog"
        aria-label="Come si gioca Allarme Triplo"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col gap-2 overflow-y-auto bg-comic-yellow px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 text-black"
      >
        <h2 className="font-display text-3xl uppercase">Allarme Triplo</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm font-semibold leading-5">
          <li>
            Escono {threats} Minacce a caso, di qualsiasi livello, e restano le stesse per tutta la partita.
          </li>
          <li>
            Ogni round peschi {threats} carte a caso dal tuo mazzo di {rounds * threats} e ne metti una su ogni Minaccia, in
            segreto. L&apos;avversario fa lo stesso.
          </li>
          <li>Su ogni Minaccia vince chi fa più punti, come in un round normale: ogni Minaccia vinta vale un punto.</li>
          <li>
            I poteri valgono come sempre. Quelli che passano un bonus alla carta dopo (Riscossa, Slancio…) lo passano alla
            carta che metterai sulla stessa Minaccia nel round dopo.
          </li>
          <li>
            Dopo {rounds} round hai usato tutte le carte: vince chi ha più punti, a parità la somma dei punteggi.
          </li>
        </ul>
        <button type="button" onClick={onClose} className="btn mt-1 bg-black font-display text-lg uppercase text-comic-yellow">
          Ho capito
        </button>
      </div>
    </>
  );
}

function TripleResult({ view, rival }: { view: TripleView; rival: string }) {
  const title =
    view.end_reason === "forfeit" && view.result === "loss"
      ? "Hai abbandonato"
      : { win: "Vittoria!", loss: "Sconfitta", draw: "Pareggio" }[view.result ?? "draw"];
  const reward = useMatchReward(view.id);
  const eventPoints = useEventPointsFor(view.id);
  const chip = "relative -skew-x-8 px-3 py-1 text-sm font-extrabold";

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
      <section
        className={`cut-bottom relative -mx-3 flex flex-[1_0_auto] flex-col items-center justify-center gap-2 overflow-hidden px-4 pb-8 pt-5 text-center ${
          view.result === "win" ? "rays-gold" : view.result === "loss" ? "halftone bg-comic-magenta" : "bg-panel-raised"
        }`}
      >
        <p className="relative text-sm font-extrabold uppercase">Allarme Triplo</p>
        <p
          className={`animate-rare-title text-sfx relative text-7xl uppercase ${view.result === "win" ? "text-comic-magenta" : "text-foreground"}`}
        >
          {title}
        </p>
        <p className={`${chip} bg-black text-comic-yellow`}>
          Minacce vinte {view.points.me} – {view.points.opponent}
          {view.points.me === view.points.opponent && ` · punteggi ${view.total_score.me} – ${view.total_score.opponent}`}
        </p>
        <div className="relative flex flex-wrap justify-center gap-2">
          <RewardChips reward={reward} chip={chip} />
          {eventPoints && <p className={`${chip} bg-comic-yellow text-black`}>{describeEventPoints(eventPoints)}</p>}
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
        </div>
      </section>

      <section className="flex shrink-0 flex-col gap-1.5">
        <h2 className="section-title text-base leading-5">Round per round</h2>
        <ol className="flex flex-col gap-1.5">
          {view.rounds
            .filter((r) => r.resolved)
            .map((r) => (
              <li key={r.round} className="flex flex-col gap-0.5 bg-panel px-2 py-1">
                <p className="font-display text-base uppercase text-comic-yellow">Round {r.round}</p>
                {[...r.contests]
                  .sort((a, b) => a.slot - b.slot)
                  .map((c) => {
                    const mine = view.my_deck.find((card) => card.instance_id === c.my_play?.instance_id);
                    return (
                      <p key={c.slot} className="flex items-center gap-2 text-xs font-semibold">
                        <span className="w-20 shrink-0 truncate text-muted">{view.threats[c.slot]?.name}</span>
                        <span className={`min-w-0 flex-1 truncate ${c.winner === "me" ? "text-comic-cyan" : ""}`}>
                          {mine?.name ?? "—"} {c.my_play?.score ?? 0}
                        </span>
                        <span className={`min-w-0 flex-1 truncate text-right ${c.winner === "opponent" ? "text-comic-orange" : "text-muted"}`}>
                          {c.opponent_play?.score ?? 0} {c.opponent_play?.name ?? "—"}
                        </span>
                      </p>
                    );
                  })}
              </li>
            ))}
        </ol>
        <p className="text-xs font-semibold text-muted">
          A sinistra tu, a destra {rival}: in colore chi ha vinto la Minaccia. A punti pari vince il valore più alto tra le abilità
          richieste.
        </p>
      </section>

      <div className="flex shrink-0 gap-2">
        <Link
          href={view.mode === "bot" ? `/squadra/?format=triple&difficulty=${view.bot_difficulty ?? "easy"}` : "/gioca"}
          className="btn btn-primary min-w-0 flex-1"
        >
          {view.mode === "bot" ? "Rivincita" : "Gioca ancora"}
        </Link>
        <Link href="/" className="btn btn-ghost shrink-0">
          Torna alla home
        </Link>
      </div>
    </main>
  );
}
