"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CardDetailProvider, useCardDetail } from "@/components/card-detail";
import { CardLookLayers, CardLooksProvider, useCardLooks } from "@/components/card-looks";
import { Silhouette } from "@/components/card-view";
import { useEventPointsFor } from "@/components/event-banner";
import { PlayerAvatar } from "@/components/player-avatar";
import {
  artMotion,
  ClashBurst,
  ClashFlash,
  ClashTrace,
  ClashWord,
  familyStyle,
  FX_COLOR,
  fxWord,
  hitMotion,
  numberVars,
  type FxStyle,
} from "@/components/quadrant-fx";
import { Sheet } from "@/components/sheet";
import { balance } from "@/config/balance";
import { artSrcSet } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import { useOpponentTitle } from "@/lib/achievements";
import type { CardCosmetics } from "@/lib/cosmetics";
import { describeServerError } from "@/lib/errors";
import { describeEventPoints } from "@/lib/events";
import {
  claimVictory,
  DIFFICULTY_LABELS,
  fetchMatchState,
  forfeitMatch,
  opponentMayBeServer,
  pingMatch,
  subscribeToUpdates,
  type MatchCard,
} from "@/lib/match";
import { RewardChips, useMatchReward } from "@/components/match-reward";
import { RankedResultChips, useOpponentNudge } from "@/components/ranked-parts";
import { ReturnLink } from "@/components/return-link";
import {
  bestRotation,
  borderClashesAt,
  borderValues,
  cardValues,
  frozenAxes,
  legalCells,
  playQuadrantMove,
  previewQuadrantMove,
  QUADRANT_GRID_LABELS,
  quadrantWindow,
  resolveQuadrantMove,
  CLASH_SECONDS,
  clashTier,
  quadrantMoveStory,
  RIPPLE_SECONDS,
  sealDeltas,
  sideAbilities,
  storySeconds,
  submitQuadrantMove,
  type ClashTier,
  type QuadrantBorderThreatView,
  type QuadrantCellView,
  type QuadrantMoveStory,
  type QuadrantPlacementInput,
  type QuadrantView,
  type SealDelta,
} from "@/lib/quadrant";
import { useCardDrag } from "@/lib/use-card-drag";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useExpiry, useNow, useSecondsLeft } from "@/lib/use-now";

// Against a player: the same pace as the other matches (see match-screen.tsx).
const PING_MS = 6_000;
const OFFLINE_POLL_MS = 5_000;
const TUTORIAL_KEY = "o-mega.quadrant-tutorial-seen";
/** Arrows for the four sides, in direction order: top, right, bottom, left. */
const ARROWS = ["▲", "▶", "▼", "◀"] as const;
const SIDE_NAMES = ["in alto", "a destra", "in basso", "a sinistra"] as const;
/** Fixed grid: the thickness of the border threats' bands around the grid, and their gap. */
const BAND = 22;
const BAND_GAP = 3;
/** Against a bot: how long the player's move stays alone on the grid before the bot's, at least. */
const BOT_THINK_MS = 1_600;
/** The bot "thinks" this long once the effects of the move before have ended. */
const BOT_AFTER_EFFECTS_MS = 2_000;
/**
 * And at most, however long the effects: with the bot's own effects (3 seconds or so) it stays
 * within the pause before the player's timer (quadrant.movePauseSeconds, 10 seconds).
 */
const BOT_THINK_MAX_MS = 6_500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** What the last move changed: who played it, and the seals on each cell. */
type MoveChanges = { move: number; mine: boolean; deltas: SealDelta[]; story: QuadrantMoveStory | null };

/** "1 Sigillo", "3 Sigilli". */
const seals = (n: number) => `${n} Sigill${n === 1 ? "o" : "i"}`;

function seenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) !== null;
  } catch {
    // Without storage the rules stay one tap away, in the rules sheet.
    return true;
  }
}

function rivalLabel(view: QuadrantView): string {
  return view.bot_difficulty ? `Bot ${DIFFICULTY_LABELS[view.bot_difficulty]}` : (view.opponent?.username ?? "Avversario");
}

/** A Quadrante (against a bot or a player), from the first card to the result. */
export function QuadrantMatchScreen({ initial }: { initial: QuadrantView }) {
  return (
    <CardDetailProvider>
      <QuadrantSteps initial={initial} />
    </CardDetailProvider>
  );
}

type Draft = { instanceId: string; x: number | null; y: number | null; rotation: number };

function QuadrantSteps({ initial }: { initial: QuadrantView }) {
  // Against a bot that opens, the empty grid first, then its card (see the effect below).
  const [view, setView] = useState(() => initial.previous?.[0] ?? initial);
  const [changes, setChanges] = useState<MoveChanges | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  // Server time minus device time: countdowns follow the server clock.
  const [offset, setOffset] = useState(() => Date.parse(initial.server_now) - Date.now());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const [showResult, setShowResult] = useState(initial.status === "finished");
  // The rules once, at the first Quadrante on this device.
  const [tutorial, setTutorial] = useState(() => initial.status === "active" && !seenTutorial());
  const rulesRef = useRef<HTMLDialogElement>(null);
  useLockedScreen(true);

  const closeTutorial = () => {
    setTutorial(false);
    try {
      localStorage.setItem(TUTORIAL_KEY, "1");
    } catch {
      // Shown again next time: harmless.
    }
  };

  // The state on screen, to tell what each new state changed.
  const shown = useRef<QuadrantView>(initial.previous?.[0] ?? initial);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Shows a state; answers how long the effects of its new move last, in seconds. */
  const showState = useCallback((next: QuadrantView): number => {
    const before = shown.current;
    let seconds = 0;
    if (next.moves.length > before.moves.length) {
      const last = next.moves.at(-1)!;
      // Seal by seal, with its effects, only when exactly one move is new; otherwise just who moved.
      const single = next.moves.length === before.moves.length + 1;
      const story = single
        ? quadrantMoveStory(before.board, next.board, last, { size: next.size, borderThreats: borderValues(next) })
        : null;
      setChanges({ move: last.move, mine: last.mine, deltas: single ? sealDeltas(before.board, next.board) : [], story });
      seconds = storySeconds(story);
    }
    if (next.move !== before.move || next.status !== before.status) setDraft(null);
    shown.current = next;
    setView(next);
    return seconds;
  }, []);

  /**
   * Shows a new state. Against a bot an answer brings the states in between (the player's
   * move, then each bot move): one at a time, the bot "thinking" before each of its moves.
   */
  const apply = useCallback(
    async (next: QuadrantView, delayFirst = false) => {
      // The server clock as the answer arrives: read after the bot's "thinking" pauses, it ran
      // seconds late, and so did the countdown and the move at random.
      setOffset(Date.parse(next.server_now) - Date.now());
      const steps = [...(next.previous ?? []), next];
      // The bot waits for the effects of the move before it, then "thinks" a moment.
      let wait = BOT_THINK_MS;
      for (const [i, step] of steps.entries()) {
        if (i > 0 || delayFirst) {
          setBotThinking(true);
          await sleep(wait);
          if (!mounted.current) return;
        }
        const seconds = showState({ ...step, previous: undefined });
        wait = Math.min(BOT_THINK_MAX_MS, Math.max(BOT_THINK_MS, seconds * 1000 + BOT_AFTER_EFFECTS_MS));
      }
      setBotThinking(false);
    },
    [showState],
  );

  // A bot that opens plays its first card a moment after the grid appears.
  const opening = useRef(initial.previous && initial.previous.length > 0 ? initial : null);
  useEffect(() => {
    const pending = opening.current;
    if (!pending) return;
    opening.current = null;
    apply({ ...pending, previous: pending.previous!.slice(1) }, true);
  }, [apply]);

  const fetchQuadrant = useCallback(async (id: string) => (await fetchMatchState(id)) as unknown as QuadrantView, []);

  const isBot = view.bot_difficulty !== null;
  const isActive = view.status === "active";
  const myTurn = isActive && view.to_move === "me";
  const deadline = isActive && view.deadline_at ? Date.parse(view.deadline_at) : null;

  const send = useCallback(
    async (move: number, placement: QuadrantPlacementInput | null) => {
      setBusy(true);
      setError(null);
      try {
        if (isBot) await apply(await playQuadrantMove(view.id, move, placement));
        else await apply(placement === null ? await resolveQuadrantMove(view.id) : await submitQuadrantMove(view.id, move, placement));
      } catch (cause) {
        // Someone (the timer, another tab) was faster: reload the state.
        if (cause instanceof Error && ["round_already_resolved", "match_not_active", "not_your_turn"].includes(cause.message)) {
          await apply(await fetchQuadrant(view.id));
        } else if (cause instanceof Error && cause.message === "invalid_placement") {
          setError("Mossa non valida: scegli una carta della mano e una casella libera accanto a una carta.");
        } else if (!(placement === null && cause instanceof Error && cause.message === "round_not_expired")) {
          // (Time not up yet by the server's clock: the timer asks again in a moment.)
          setError(describeServerError(cause));
        }
      } finally {
        setBusy(false);
      }
    },
    [apply, fetchQuadrant, view.id, isBot],
  );

  // Where the opponent may be the server's: on its turn, ask now and then whether its move has come.
  useOpponentNudge(opponentMayBeServer(view) && isActive && view.to_move === "opponent", async () => {
    await apply(await resolveQuadrantMove(view.id));
  });

  // Against a player: broadcasts, pings and a poll while broadcasts cannot arrive.
  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      apply(await fetchQuadrant(view.id));
    } catch {
      // The next broadcast, ping or poll will try again.
    } finally {
      refreshing.current = false;
    }
  }, [apply, fetchQuadrant, view.id]);

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
          if (answer.status !== shown.status || answer.current_round !== shown.move) refresh();
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

  // When the time is up (plus the server's grace), let the server play the move: ours at
  // random, or the opponent's when it does not answer.
  const move = view.move;
  useExpiry(isActive && (myTurn || !isBot) ? move : undefined, deadline, offset, () => send(move, null));

  // The result appears after a moment on the full grid, or at once with a tap.
  useEffect(() => {
    if (view.status !== "finished" || showResult) return;
    const timer = setTimeout(() => setShowResult(true), 2500);
    return () => clearTimeout(timer);
  }, [view.status, showResult]);

  async function forfeit() {
    setBusy(true);
    try {
      apply((await forfeitMatch(view.id)) as unknown as QuadrantView);
      setShowResult(true);
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
      apply((await claimVictory(view.id)) as unknown as QuadrantView);
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  const rival = rivalLabel(view);
  // The opponent's title (Imprese, SPEC §8.5): the name is already on the line below.
  const rivalTitle = useOpponentTitle(view.id, !isBot && Boolean(view.opponent));

  const screen = (
    <div className="game-shell">
      <header className="relative flex items-center gap-1.5 px-3 py-1">
        <div className="min-w-0 flex-1 leading-none">
          <p className="truncate text-[10px] font-bold text-muted">
            Quadrante · {QUADRANT_GRID_LABELS[view.format]} ·{" "}
            {view.mode === "bot"
              ? rival
              : `${view.mode === "ranked" ? "Classificata" : "Amichevole"} · ${rivalTitle ? `«${rivalTitle}»` : rival}`}
          </p>
          <p className="mt-0.5 flex items-baseline gap-1 text-[11px] font-extrabold uppercase">
            <span className="text-comic-cyan">Tu</span>
            <span className="shrink-0 font-display text-2xl leading-6 text-comic-yellow">
              {view.seals.me}–{view.seals.opponent}
            </span>
            {!isBot && view.opponent && (
              <PlayerAvatar username={view.opponent.username} avatarUrl={view.opponent.avatar_url} size="2xs" className="self-center" />
            )}
            <span className="truncate text-comic-orange">{isBot ? "Bot" : rival}</span>
            <span className="ml-1 shrink-0 text-[10px] font-bold normal-case text-muted">Sigilli</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => rulesRef.current?.showModal()}
          aria-label="Le regole"
          className="btn btn-ghost h-11 w-11 shrink-0 px-0 font-display text-xl"
        >
          ?
        </button>
        {isActive ? (
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
          <ReturnLink href="/" label="Home" className="btn btn-ghost h-11 w-11 shrink-0 px-0">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
              <path d="M2 10 10 3l8 7M5 8v9h4v-5h2v5h4V8" strokeLinejoin="round" />
            </svg>
          </ReturnLink>
        )}
        {!isBot && isActive && view.opponent?.last_seen_at && (
          <OpponentAbsent lastSeenAt={view.opponent.last_seen_at} offset={offset} name={rival} busy={busy} onClaim={claim} />
        )}
      </header>

      <Sheet sheetRef={rulesRef} title="Quadrante">
        <RulesText view={view} />
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
      {tutorial && <QuadrantTutorial view={view} onClose={closeTutorial} />}
      {error && <p className="mx-3 mt-1 text-sm font-semibold text-comic-magenta">{error}</p>}

      {view.status === "finished" && showResult ? (
        <QuadrantResult view={view} rival={rival} />
      ) : (
        <PlayArea
          view={view}
          rival={rival}
          draft={draft}
          changes={changes}
          botThinking={botThinking}
          busy={busy || botThinking}
          deadline={deadline}
          offset={offset}
          onDraft={setDraft}
          onPlay={(placement) => send(view.move, placement)}
          onShowResult={() => setShowResult(true)}
        />
      )}
    </div>
  );
  return <CardLooksProvider opponent={view.opponent_looks}>{screen}</CardLooksProvider>;
}

/** The four abilities as the sides of an unturned card. */
function AbilityLegend({ view }: { view: QuadrantView }) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] font-extrabold" aria-label="I lati delle carte">
      {view.abilities.map((ability, d) => (
        <span key={ability.code} className="flex items-center gap-0.5 whitespace-nowrap">
          <span className="text-comic-yellow" aria-hidden>
            {ARROWS[d]}
          </span>
          {ability.name}
        </span>
      ))}
    </p>
  );
}

function PlayArea({
  view,
  rival,
  draft,
  changes,
  botThinking,
  busy,
  deadline,
  offset,
  onDraft,
  onPlay,
  onShowResult,
}: {
  view: QuadrantView;
  rival: string;
  draft: Draft | null;
  changes: MoveChanges | null;
  botThinking: boolean;
  busy: boolean;
  deadline: number | null;
  offset: number;
  onDraft: (draft: Draft | null) => void;
  onPlay: (placement: QuadrantPlacementInput) => void;
  onShowResult: () => void;
}) {
  const detail = useCardDetail();
  const looks = useCardLooks();
  const isActive = view.status === "active";
  const myTurn = isActive && view.to_move === "me";
  const canPlay = myTurn && !busy;
  const area = quadrantWindow(view);
  const legal = useMemo(() => (myTurn ? legalCells(view) : []), [view, myTurn]);
  const isLegal = (x: number, y: number) => legal.some((c) => c.x === x && c.y === y);
  const handCard = (id: string | null | undefined) => view.my_hand.find((c) => c.instance_id === id) ?? null;

  /** Puts a card on a free cell, turned the way that gains the most there. */
  function put(instanceId: string, x: number, y: number) {
    const card = handCard(instanceId);
    if (!card || !canPlay || !isLegal(x, y)) return;
    onDraft({ instanceId, x, y, rotation: bestRotation(view, card, x, y).rotation });
  }

  // Drag a card of the hand (or the one already on the grid) onto a free cell.
  const { drag, start, ghostRef } = useCardDrag((id, zone) => {
    if (zone === null || zone === "hand") {
      // Back to the hand, or dropped nowhere: the card stays chosen, off the grid.
      if (draft?.instanceId === id || zone === "hand") onDraft({ instanceId: id, x: null, y: null, rotation: 0 });
      return;
    }
    const [x, y] = zone.split(",").map(Number);
    put(id, x, y);
  }, !canPlay);

  // The card being placed: the one in the finger, else the one chosen.
  const card = handCard(drag?.id ?? draft?.instanceId);
  const placed = !drag && draft && draft.x !== null && draft.y !== null ? { x: draft.x, y: draft.y } : null;
  const hovered = drag?.over && drag.over !== "hand" ? drag.over.split(",").map(Number) : null;
  // What the move would do: the card placed, or the card dragged over a free cell (best turn).
  const preview = (() => {
    if (!card) return null;
    if (placed && draft) return previewQuadrantMove(view, card, placed.x, placed.y, draft.rotation);
    if (hovered && isLegal(hovered[0], hovered[1])) {
      const { rotation } = bestRotation(view, card, hovered[0], hovered[1]);
      return previewQuadrantMove(view, card, hovered[0], hovered[1], rotation);
    }
    return null;
  })();
  // On the grid: the preview of the move being prepared, else what the last move did.
  const shownDeltas = preview ? preview.deltas : (changes?.deltas ?? []);
  const deltaAt = (x: number, y: number) => shownDeltas.find((d) => d.x === x && d.y === y) ?? null;
  // The last move's effects, cell by cell, while no new move is being prepared.
  const moveEffects = useMemo(() => {
    const story = changes?.story;
    if (!story) return null;
    const codes = view.abilities.map((a) => a.code);
    // The ability on a side of a card: the card just played was turned as the move says.
    const abilityAt = (x: number, y: number, side: number) => {
      const cell = view.board.find((c) => c.x === x && c.y === y);
      const rotation = x === story.x && y === story.y ? view.moves.find((m) => m.move === changes.move)?.rotation : undefined;
      const ability = view.abilities[cell ? sideAbilities(codes, cell.card, cell.values, rotation)[side] : side];
      return { code: ability?.code ?? "", style: familyStyle(ability?.family) };
    };
    return effectsOf(story, abilityAt);
  }, [changes, view]);
  // Once the player starts preparing a move, the last move's effects are over: they do not
  // play again when the card goes back to the hand.
  const [settledMove, setSettledMove] = useState<number | null>(null);
  if (preview && changes && settledMove !== changes.move) setSettledMove(changes.move);
  const liveEffects = !preview && changes && settledMove !== changes.move ? moveEffects : null;
  const effects = liveEffects?.cells ?? new Map<string, CellEffects>();
  const last = view.moves.at(-1) ?? null;
  const frozen = frozenAxes(view);
  // Fixed grid: the four border threats around it, and what the last move did against them.
  const threats = view.border_threats?.length === 4 ? view.border_threats : null;
  const frame = threats ? 2 * (BAND + BAND_GAP) : 0;
  const borderEffects = liveEffects?.borders ?? new Map<number, BorderEffect>();
  // A crushing gap jolts the whole grid; two keyframe names, so the next move starts it again.
  const jolts = liveEffects?.jolts ?? [];
  const jolt = jolts.length
    ? { animation: jolts.map((delay) => `quad-jolt-${(changes?.move ?? 0) % 2 ? "a" : "b"} 0.34s ease-out ${delay}s`).join(", ") }
    : undefined;
  const stampKey = preview ? "preview" : String(changes?.move ?? 0);
  // The borders the card being placed would meet.
  const edgeHighlight = new Set(
    threats && card && (placed ?? hovered)
      ? borderClashesAt(
          view,
          placed && draft ? cardValues(view, card, draft.rotation) : [0, 0, 0, 0],
          placed ? placed.x : hovered![0],
          placed ? placed.y : hovered![1],
        ).map((c) => c.direction)
      : [],
  );

  function tapCell(x: number, y: number) {
    if (!canPlay || !draft) return;
    if (placed && placed.x === x && placed.y === y) {
      onDraft({ ...draft, rotation: (draft.rotation + 1) % 4 });
      return;
    }
    put(draft.instanceId, x, y);
  }

  const cellsByKey = new Map(view.board.map((cell) => [`${cell.x},${cell.y}`, cell]));
  const status = !isActive
    ? "Partita finita"
    : botThinking
      ? `${rival} sta pensando…`
      : myTurn
        ? draft === null
          ? "Tocca a te: trascina una carta"
          : placed === null
            ? "Portala su una casella libera"
            : "Ruota la carta o giocala"
        : `Tocca a ${rival}`;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="cut-bottom relative mx-3 mt-1 flex shrink-0 flex-col overflow-hidden bg-comic-cyan px-3 pb-3 pt-1.5 text-black">
        <div aria-hidden className="halftone absolute inset-0 [mask-image:linear-gradient(135deg,transparent_45%,#000_100%)]" />
        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold">
              Mossa {Math.min(view.move, view.moves_count)} di {view.moves_count}
              {view.seal_target && ` · traguardo ${view.seal_target}`}
              {view.variant === "shifting" && ` · ${frozen.columns ? "colonne bloccate" : "colonne libere"}, ${frozen.rows ? "righe bloccate" : "righe libere"}`}
            </p>
            <p className="font-display text-[20px] uppercase leading-6">{status}</p>
          </div>
          {deadline !== null && isActive && !botThinking && <MoveTimer key={deadline} deadline={deadline} offset={offset} mine={myTurn} />}
        </div>
      </section>

      {last && !preview && <LastMove view={view} rival={rival} key={last.move} />}
      {preview && <MovePreviewLine preview={preview} rival={rival} />}

      <div className="px-3 pt-1">
        <AbilityLegend view={view} />
      </div>

      {/* The grid, framed by the border threats on a fixed grid with them. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-1.5" style={{ containerType: "size" }}>
        <div
          className={`grid ${jolt ? "quad-jolt" : ""}`}
          style={{
            ...(threats
              ? { gridTemplateColumns: `${BAND}px auto ${BAND}px`, gridTemplateRows: `${BAND}px auto ${BAND}px`, gap: BAND_GAP }
              : undefined),
            ...jolt,
          }}
        >
          {threats && <span aria-hidden />}
          {threats && <BorderThreat key={`0-${borderEffects.has(0) ? stampKey : "idle"}`} threat={threats[0]} direction={0} effect={borderEffects.get(0)} stampKey={stampKey} highlight={edgeHighlight.has(0)} />}
          {threats && <span aria-hidden />}
          {threats && <BorderThreat key={`3-${borderEffects.has(3) ? stampKey : "idle"}`} threat={threats[3]} direction={3} effect={borderEffects.get(3)} stampKey={stampKey} highlight={edgeHighlight.has(3)} />}
          <div
            className="relative grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${area.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${area.rows}, minmax(0, 1fr))`,
              aspectRatio: `${area.columns} / ${area.rows}`,
              // As large as the room allows, keeping the cells square.
              width: `min(100cqw - ${frame}px, 420px, (100cqh - ${frame}px) * ${area.columns} / ${area.rows})`,
            }}
            role="grid"
            aria-label="La griglia"
          >
            {Array.from({ length: area.rows }, (_, r) =>
              Array.from({ length: area.columns }, (_, c) => {
                const x = area.minX + c;
                const y = area.minY + r;
                const key = `${x},${y}`;
                const delta = deltaAt(x, y);
                const cell = cellsByKey.get(key);
                if (cell) {
                  const isLast = !preview && last !== null && last.x === x && last.y === y;
                  return (
                    <BoardCard
                      key={key}
                      cell={cell}
                      highlight={isLast}
                      effects={effects.get(key)}
                      delta={delta}
                      tentative={Boolean(preview)}
                      stampKey={preview ? "preview" : String(changes?.move ?? 0)}
                      look={looks(cell.card.definition_id, cell.mine ? "me" : "opponent")}
                      press={detail.press(cell.card, looks(cell.card.definition_id, cell.mine ? "me" : "opponent"))}
                    />
                  );
                }
                const here = placed && placed.x === x && placed.y === y;
                if (here && card && draft) {
                  return (
                    <button
                      key={key}
                      type="button"
                      data-drop={key}
                      onClick={() => tapCell(x, y)}
                      onPointerDown={start(draft.instanceId)}
                      onDragStart={(event) => event.preventDefault()}
                      aria-label={`${card.name} qui. Tocca per ruotarla, trascinala per spostarla`}
                      className="relative min-h-0 min-w-0 touch-none select-none"
                    >
                      <QuadCard
                        card={card}
                        values={cardValues(view, card, draft.rotation)}
                        tone="draft"
                        look={looks(card.definition_id, "me")}
                      />
                      {delta && <DeltaBadges delta={delta} tentative stampKey="preview" />}
                    </button>
                  );
                }
                const legalHere = myTurn && isLegal(x, y);
                const gain = legalHere && card ? bestRotation(view, card, x, y).gain : null;
                const isHovered = hovered !== null && hovered[0] === x && hovered[1] === y;
                return (
                  <button
                    key={key}
                    type="button"
                    data-drop={legalHere ? key : undefined}
                    onClick={() => tapCell(x, y)}
                    disabled={!legalHere || !card || busy}
                    aria-label={legalHere ? `Casella libera${gain !== null ? `: fino a ${seals(gain)}` : ""}` : "Casella"}
                    className={`relative flex min-h-0 min-w-0 items-center justify-center border-2 ${
                      isHovered && legalHere
                        ? "border-comic-yellow bg-panel-raised shadow-[3px_3px_0_var(--comic-cyan)]"
                        : legalHere
                          ? card
                            ? "border-dashed border-comic-yellow bg-panel"
                            : "border-dashed border-line bg-panel"
                          : "border-transparent bg-panel/40"
                    }`}
                  >
                    {isHovered && card && preview ? (
                      <span className="font-display text-xl text-comic-cyan">+{preview.gained}</span>
                    ) : (
                      gain !== null && gain > 0 && <span className="font-display text-lg text-comic-yellow">+{gain}</span>
                    )}
                  </button>
                );
              }),
            )}
            {liveEffects && <ClashLayer effects={liveEffects} area={area} stampKey={stampKey} />}
          </div>
          {threats && <BorderThreat key={`1-${borderEffects.has(1) ? stampKey : "idle"}`} threat={threats[1]} direction={1} effect={borderEffects.get(1)} stampKey={stampKey} highlight={edgeHighlight.has(1)} />}
          {threats && <span aria-hidden />}
          {threats && <BorderThreat key={`2-${borderEffects.has(2) ? stampKey : "idle"}`} threat={threats[2]} direction={2} effect={borderEffects.get(2)} stampKey={stampKey} highlight={edgeHighlight.has(2)} />}
          {threats && <span aria-hidden />}
        </div>
      </div>

      {view.status === "finished" ? (
        <div className="border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
          <button type="button" onClick={onShowResult} className="btn btn-primary w-full">
            Vedi il risultato
          </button>
        </div>
      ) : (
        <>
          {/* The hand: drag a card onto a free cell, or tap it and then the cell. */}
          <div role="group" aria-label="La tua mano" data-drop="hand" className="flex justify-center gap-2 px-3 pb-1.5 pt-1">
            {view.my_hand.map((inHand) => {
              const selected = draft?.instanceId === inHand.instance_id;
              const onGrid = selected && placed !== null;
              return (
                <div
                  key={inHand.instance_id}
                  onPointerDown={canPlay ? start(inHand.instance_id) : undefined}
                  onDragStart={(event) => event.preventDefault()}
                  className={`w-[calc((100%-1rem)/3)] max-w-[104px] touch-none select-none ${drag?.id === inHand.instance_id || onGrid ? "opacity-40" : ""}`}
                >
                  <button
                    type="button"
                    {...detail.press(inHand, looks(inHand.definition_id, "me"))}
                    onClick={() => canPlay && onDraft(selected ? null : { instanceId: inHand.instance_id, x: null, y: null, rotation: 0 })}
                    disabled={!canPlay}
                    aria-pressed={selected}
                    aria-label={`${inHand.name}: ${cardValues(view, inHand, 0)
                      .map((v, d) => `${SIDE_NAMES[d]} ${v}`)
                      .join(", ")}`}
                    className={`block w-full ${selected && !onGrid ? "-translate-y-1.5" : ""} ${!myTurn ? "opacity-70" : ""}`}
                  >
                    <QuadCard
                      card={inHand}
                      values={cardValues(view, inHand, 0)}
                      tone={selected && !onGrid ? "draft" : "hand"}
                      look={looks(inHand.definition_id, "me")}
                    />
                  </button>
                </div>
              );
            })}
          </div>
          <p className="px-3 text-center text-[10px] font-semibold text-muted">
            Mazzo: {view.my_deck_left} · {rival}: {view.opponent_hand_count} in mano, {view.opponent_deck_left} nel mazzo
          </p>

          <div className="border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => draft && placed && onDraft({ ...draft, rotation: (draft.rotation + 1) % 4 })}
                disabled={!placed || busy}
                aria-label="Ruota la carta"
                className="btn btn-ghost shrink-0 px-4 font-display text-2xl"
              >
                ↻
              </button>
              <button
                type="button"
                onClick={() =>
                  draft && placed && onPlay({ card_instance_id: draft.instanceId, x: placed.x, y: placed.y, rotation: draft.rotation })
                }
                disabled={!placed || busy || !myTurn}
                className="btn btn-primary min-w-0 flex-1"
              >
                {botThinking
                  ? `${rival} sta pensando…`
                  : busy
                    ? "Invio…"
                    : myTurn
                      ? "Gioca la carta"
                      : `Turno di ${rival}`}
              </button>
            </div>
          </div>
        </>
      )}
      {drag && card && (
        <div ref={ghostRef} aria-hidden className="pointer-events-none fixed left-0 top-0 z-50 w-20">
          <QuadCard card={card} values={cardValues(view, card, 0)} tone="draft" look={looks(card.definition_id, "me")} />
        </div>
      )}
    </main>
  );
}

/** The last move in words, from the player's side: what it placed and took, and from whom. */
function LastMove({ view, rival }: { view: QuadrantView; rival: string }) {
  const last = view.moves.at(-1)!;
  const who = last.mine ? "Tu" : rival;
  const whose = last.mine ? rival : "tuoi";
  const played = view.board.find((cell) => cell.x === last.x && cell.y === last.y);
  const borders = played ? borderClashesAt(view, played.values, last.x, last.y) : [];
  const parts = [
    last.beaten > 0 ? `batte ${last.beaten} cart${last.beaten === 1 ? "a" : "e"}` : "non batte nessuna carta",
    threatsText(borders.filter((b) => b.outcome === "win").length, borders.filter((b) => b.outcome === "lose").length),
    last.placed > 0 ? `+${seals(last.placed)} ${last.mine ? "tuoi" : "suoi"}` : null,
    last.removed > 0 ? `−${seals(last.removed)} ${last.mine ? `a ${whose}` : whose}` : null,
  ].filter(Boolean);
  return (
    <p
      className={`mx-3 mt-1 line-clamp-2 px-2 py-0.5 text-[12px] font-extrabold leading-4 ${last.mine ? "bg-comic-cyan/20 text-comic-cyan" : "bg-comic-orange/20 text-comic-orange"}`}
      style={flash}
    >
      {who}: {last.name} · {parts.join(", ")}
      {last.auto_played ? " (tempo scaduto)" : ""}
    </p>
  );
}

/** What the move being prepared would do, before playing it. */
function MovePreviewLine({
  preview,
  rival,
}: {
  preview: { gained: number; removed: number; beaten: number; threatsBeaten: number; threatsLost: number };
  rival: string;
}) {
  const parts = [
    preview.beaten > 0 ? `batte ${preview.beaten} cart${preview.beaten === 1 ? "a" : "e"}` : null,
    threatsText(preview.threatsBeaten, preview.threatsLost),
    preview.gained > 0 ? `+${seals(preview.gained)}` : "nessun Sigillo",
    preview.removed > 0 ? `−${seals(preview.removed)} a ${rival}` : null,
  ].filter(Boolean);
  return (
    <p className="mx-3 mt-1 line-clamp-2 bg-comic-yellow/15 px-2 py-0.5 text-[12px] font-extrabold leading-4 text-comic-yellow">
      Se la giochi qui: {parts.join(", ")}
    </p>
  );
}

/** "batte 1 Minaccia, perde con 2 Minacce": the border threats a card met; null when none counted. */
function threatsText(beaten: number, lost: number): string | null {
  const threats = (n: number) => (n === 1 ? "1 Minaccia" : `${n} Minacce`);
  const parts = [beaten > 0 ? `batte ${threats(beaten)}` : null, lost > 0 ? `perde con ${threats(lost)}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** A number of a card in a comparison: who won it, and when (seconds after the move appears). */
type Tone = "win-me" | "win-opponent" | "win-threat" | "lose" | "tie";

/** How a number of a comparison moves: the winner swells in its colour, the loser shakes, a tie pushes. */
type NumberEffect = { tone: Tone; tier: ClashTier; delay: number };

/** A blow a card takes: the winner's style, how hard, and the edge it was hit on (0 top … 3 left). */
type Hit = { style: FxStyle; tier: ClashTier; entry: number; delay: number };

/** What a card on the grid shows while the last move is explained. */
type CellEffects = {
  /** By side, 0 top … 3 left. */
  numbers: Map<number, NumberEffect>;
  hits: Hit[];
  /** A ring when a ripple takes one of this card's seals. */
  ring: { delay: number; mine: boolean } | null;
  /** When the seal badges stamp in. */
  badgeDelay: number;
};

/** A burst on an edge of the card on (x, y), with its comic word; `toward` is the side of the loser. */
type Burst = {
  x: number;
  y: number;
  side: number;
  style: FxStyle;
  tier: ClashTier;
  code: string | null;
  word: string | null;
  toward: number | null;
  delay: number;
};

/** How the card just played met a border threat. */
type BorderEffect = { outcome: "win" | "tie" | "lose"; tier: ClashTier; style: FxStyle; delay: number };

type MoveEffects = { cells: Map<string, CellEffects>; bursts: Burst[]; borders: Map<number, BorderEffect>; jolts: number[] };

/** The marks land a moment after the numbers meet. */
const HIT_DELAY = 0.06;

/**
 * The timeline of a move: each comparison in turn (the two numbers clash, the higher one
 * swells in the colour of its side, a burst in the winning family's style, as large as the
 * gap), the seals landing on the beaten card and on the card played, then each ripple (the
 * beaten card's number against its neighbour, a ring, a seal off).
 */
function effectsOf(story: QuadrantMoveStory, abilityAt: (x: number, y: number, side: number) => { code: string; style: FxStyle }): MoveEffects {
  const cells = new Map<string, CellEffects>();
  const of = (x: number, y: number) => {
    const key = `${x},${y}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = { numbers: new Map(), hits: [], ring: null, badgeDelay: 0.3 };
      cells.set(key, cell);
    }
    return cell;
  };
  const bursts: Burst[] = [];
  const borders = new Map<number, BorderEffect>();
  const jolts: number[] = [];
  const win: Tone = story.mine ? "win-me" : "win-opponent";
  const lose: Tone = story.mine ? "win-opponent" : "win-me";
  const played = of(story.x, story.y);
  const blow = (burst: Omit<Burst, "x" | "y" | "word">) => {
    bursts.push({ ...burst, x: story.x, y: story.y, word: fxWord(burst.style, burst.tier) });
    if (burst.tier === 2) jolts.push(burst.delay + HIT_DELAY);
  };
  const tie = (side: number, delay: number) => blow({ side, style: "tie", tier: 1, code: null, toward: null, delay });

  story.clashes.forEach((clash, i) => {
    const delay = 0.3 + i * CLASH_SECONDS;
    const tier = clashTier(clash.value, clash.against);
    const back = (clash.side + 2) % 4;
    const other = of(clash.x, clash.y);
    other.badgeDelay = delay + 0.35;
    if (clash.outcome === "tie") {
      played.numbers.set(clash.side, { tone: "tie", tier, delay });
      other.numbers.set(back, { tone: "tie", tier, delay });
      tie(clash.side, delay);
      return;
    }
    const won = clash.outcome === "win";
    const ability = won ? abilityAt(story.x, story.y, clash.side) : abilityAt(clash.x, clash.y, back);
    played.numbers.set(clash.side, { tone: won ? win : "lose", tier, delay });
    other.numbers.set(back, { tone: won ? "lose" : lose, tier, delay });
    (won ? other : played).hits.push({ style: ability.style, tier, entry: won ? back : clash.side, delay: delay + HIT_DELAY });
    blow({ side: clash.side, style: ability.style, tier, code: ability.code, toward: won ? clash.side : back, delay });
  });
  story.borders.forEach((border, i) => {
    const delay = 0.3 + (story.clashes.length + i) * CLASH_SECONDS;
    const tier = clashTier(border.value, border.against);
    if (border.outcome === "tie") {
      played.numbers.set(border.side, { tone: "tie", tier, delay });
      borders.set(border.side, { outcome: "tie", tier, style: "tie", delay });
      tie(border.side, delay);
      return;
    }
    const won = border.outcome === "win";
    // The threat has its own look; the card that beats it, its family's.
    const ability = won ? abilityAt(story.x, story.y, border.side) : { code: "!", style: "threat" as const };
    played.numbers.set(border.side, { tone: won ? win : "lose", tier, delay });
    borders.set(border.side, { outcome: border.outcome, tier, style: ability.style, delay });
    if (!won) played.hits.push({ style: "threat", tier, entry: border.side, delay: delay + HIT_DELAY });
    blow({ side: border.side, style: ability.style, tier, code: ability.code, toward: won ? border.side : (border.side + 2) % 4, delay });
  });
  const clashesEnd = 0.3 + (story.clashes.length + story.borders.length) * CLASH_SECONDS;
  played.badgeDelay = clashesEnd;
  story.ripples.forEach((ripple, i) => {
    const delay = clashesEnd + 0.15 + i * RIPPLE_SECONDS;
    const tier = clashTier(ripple.value, ripple.against);
    const back = (ripple.side + 2) % 4;
    const ability = abilityAt(ripple.from.x, ripple.from.y, ripple.side);
    of(ripple.from.x, ripple.from.y).numbers.set(ripple.side, { tone: win, tier, delay });
    const to = of(ripple.to.x, ripple.to.y);
    to.numbers.set(back, { tone: "lose", tier, delay });
    to.hits.push({ style: ability.style, tier, entry: back, delay: delay + HIT_DELAY });
    to.ring = { delay: delay + 0.15, mine: story.mine };
    to.badgeDelay = Math.max(to.badgeDelay, delay + 0.4);
    // A ripple: the burst and the mark, without a word.
    bursts.push({ x: ripple.from.x, y: ripple.from.y, side: ripple.side, style: ability.style, tier, code: ability.code, word: null, toward: ripple.side, delay });
  });
  return { cells, bursts, borders, jolts };
}

const TONE_COLOR: Record<Tone, string> = {
  "win-me": "var(--comic-cyan)",
  "win-opponent": "var(--comic-orange)",
  "win-threat": "var(--comic-magenta)",
  lose: "#fff",
  tie: "#fff",
};

/** The animation of a number in a comparison; a tie pushes it towards `pushSide`. */
function numberMotion(effect: NumberEffect, pushSide: number): CSSProperties {
  const name = effect.tone === "lose" ? "quad-num-lose" : effect.tone === "tie" ? "quad-num-tie" : "quad-num-win";
  return {
    ...numberVars(effect.tier, TONE_COLOR[effect.tone], effect.tone === "tie" ? pushSide : null),
    animation: `${name} ${[0.65, 0.72, 0.82][effect.tier]}s ease-out ${effect.delay}s both`,
    // The winner over the loser facing it, when it swells across the gap.
    zIndex: effect.tone === "lose" ? undefined : 4,
  };
}

const STEP_XY = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/**
 * The bursts and comic words of a move, over the grid: each on the edge where two numbers met.
 * Placed in the grid's own terms (cells of equal size, 4px gaps), so it follows any window.
 */
function ClashLayer({
  effects,
  area,
  stampKey,
}: {
  effects: MoveEffects;
  area: { minX: number; minY: number; columns: number; rows: number };
  stampKey: string;
}) {
  // `cells` cells and `gaps` gaps from the start, plus px, along an axis of n cells.
  const along = (cells: number, gaps: number, px: number, n: number) => `calc((100% - ${(n - 1) * 4}px) * ${cells / n} + ${gaps * 4 + px}px)`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {effects.bursts.map((burst, i) => {
        const c = burst.x - area.minX;
        const r = burst.y - area.minY;
        const [cx, px] = ([[c + 0.5, 0], [c + 1, 2], [c + 0.5, 0], [c, -2]] as const)[burst.side];
        const [cy, py] = ([[r, -2], [r + 0.5, 0], [r + 1, 2], [r + 0.5, 0]] as const)[burst.side];
        const left = along(cx, c, px, area.columns);
        const top = along(cy, r, py, area.rows);
        const toward = burst.toward === null ? [0, 0] : STEP_XY[burst.toward];
        // The word over the loser's side of the edge (above it, on a side-by-side comparison).
        const lift = burst.side % 2 === 1 || burst.toward === null ? -16 : toward[1] * 20;
        const share = cx / area.columns;
        return (
          <Fragment key={`${stampKey}-${i}`}>
            <ClashBurst style={burst.style} tier={burst.tier} code={burst.code} delay={burst.delay} left={left} top={top} />
            {burst.word && (
              <ClashWord
                text={burst.word}
                style={burst.style}
                tier={burst.tier}
                delay={burst.delay + HIT_DELAY}
                left={`calc(${left} + ${toward[0] * 20}px)`}
                top={`calc(${top} + ${lift}px)`}
                anchor={share < 0.3 ? "-25%" : share > 0.7 ? "-75%" : "-50%"}
                tilt={i % 2 ? 6 : -7}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/**
 * A threat on a border of the fixed grid: its name and its value, along the border. When
 * the last move met it, its value swells in magenta if it won, shakes if it lost (and the
 * border flashes in the winning family's colour), pushes back on a tie.
 */
function BorderThreat({
  threat,
  direction,
  effect,
  stampKey,
  highlight,
}: {
  threat: QuadrantBorderThreatView;
  direction: number;
  effect?: BorderEffect;
  stampKey: string;
  highlight: boolean;
}) {
  const vertical = direction === 1 || direction === 3;
  // From the threat's side of the comparison: the card's "win" is the threat's loss.
  const number: NumberEffect | null = effect
    ? { tone: effect.outcome === "win" ? "lose" : effect.outcome === "tie" ? "tie" : "win-threat", tier: effect.tier, delay: effect.delay }
    : null;
  // Beaten, the border is pushed outwards: it was hit on its edge towards the grid.
  const motion = effect?.outcome === "win" ? hitMotion(effect.tier, (direction + 2) % 4, effect.delay + HIT_DELAY) : null;
  return (
    <div
      className={`quad-border relative flex min-h-0 min-w-0 items-center justify-center gap-1 overflow-hidden ${vertical ? "flex-col" : ""} ${
        highlight ? "outline outline-2 -outline-offset-2 outline-comic-yellow" : ""
      } ${motion ? "quad-fx" : ""}`}
      style={motion ? { animation: motion } : undefined}
      aria-label={`Minaccia ${SIDE_NAMES[direction]}: ${threat.name}, ${threat.value}`}
      role="note"
    >
      {effect?.outcome === "win" && <ClashFlash delay={effect.delay + HIT_DELAY} color={FX_COLOR[effect.style]} peak={0.55} />}
      <span
        className="relative z-[3] min-w-0 truncate text-[10px] font-extrabold uppercase leading-none tracking-wide text-comic-yellow"
        style={vertical ? { writingMode: "vertical-rl", rotate: direction === 3 ? "180deg" : undefined } : undefined}
      >
        {threat.name}
      </span>
      <span
        key={stampKey}
        className={`relative z-[3] flex h-[18px] min-w-[20px] shrink-0 items-center justify-center border-2 border-comic-magenta bg-black px-0.5 font-display text-[14px] leading-none text-comic-magenta ${number ? "quad-fx" : ""}`}
        style={number ? numberMotion(number, (direction + 2) % 4) : undefined}
      >
        {threat.value}
      </span>
    </div>
  );
}

/**
 * How the seals on a cell change: "+1" or "−1" in the colour of the side whose seals they
 * are (cyan the player, orange the opponent). Tentative while the move is a preview.
 */
function DeltaBadges({
  delta,
  tentative = false,
  stampKey,
  delay = 0.15,
}: {
  delta: SealDelta;
  tentative?: boolean;
  stampKey: string;
  delay?: number;
}) {
  const badge = (n: number, tone: "me" | "opponent") => (
    <span
      key={`${tone}-${stampKey}`}
      className={`flex h-[18px] min-w-[24px] items-center justify-center border-2 border-black px-0.5 font-display text-[13px] leading-none text-black ${
        tone === "me" ? "bg-comic-cyan" : "bg-comic-orange"
      } ${tentative ? "opacity-90" : ""}`}
      style={tentative ? undefined : stamp(delay)}
    >
      {n > 0 ? `+${n}` : `−${-n}`}
    </span>
  );
  return (
    <span className="pointer-events-none absolute -right-1.5 -top-1.5 z-[4] flex flex-col items-end gap-px" aria-hidden>
      {delta.me !== 0 && badge(delta.me, "me")}
      {delta.opponent !== 0 && badge(delta.opponent, "opponent")}
    </span>
  );
}

/** Seals as small round tokens: the player's in cyan, the opponent's in orange. */
function Seals({ me, opponent }: { me: number; opponent: number }) {
  if (me === 0 && opponent === 0) return null;
  return (
    <span className="absolute inset-x-0 bottom-[22%] z-[2] flex justify-center gap-0.5" aria-hidden>
      {me > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-black bg-comic-cyan px-0.5 font-display text-[12px] leading-none text-black">
          {me}
        </span>
      )}
      {opponent > 0 && (
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-black bg-comic-orange px-0.5 font-display text-[12px] leading-none text-black">
          {opponent}
        </span>
      )}
    </span>
  );
}

const NUMBER_POSITION = [
  "left-1/2 top-0 -translate-x-1/2",
  "right-0 top-1/2 -translate-y-1/2",
  "bottom-0 left-1/2 -translate-x-1/2",
  "left-0 top-1/2 -translate-y-1/2",
] as const;

/**
 * A square card: the face (art, the marks of the blows it takes, the seals) and the four
 * numbers on its sides, outside the face so a number that swells is not cut by its edge.
 */
function QuadCard({
  card,
  values,
  tone,
  seals,
  numbers,
  hits = [],
  entering = false,
  stampKey = "",
  look = null,
}: {
  card: MatchCard;
  values: readonly number[];
  tone: "mine" | "opponent" | "neutral" | "hand" | "draft";
  seals?: { me: number; opponent: number };
  numbers?: Map<number, NumberEffect>;
  hits?: Hit[];
  /** The card just played: it flashes in. */
  entering?: boolean;
  stampKey?: string;
  /** The frame and the effect its owner applied (SPEC §4.8). */
  look?: CardCosmetics | null;
}) {
  const frame =
    tone === "mine"
      ? "border-comic-cyan"
      : tone === "opponent"
        ? "border-comic-orange"
        : tone === "neutral"
          ? "border-white/50"
          : tone === "draft"
            ? "border-comic-yellow shadow-[3px_3px_0_var(--comic-magenta)]"
            : "border-panel-raised";
  const number = "absolute z-[3] flex h-[18px] min-w-[18px] items-center justify-center bg-black px-0.5 font-display text-[14px] leading-none text-comic-yellow";
  // A blow pushes or shakes the card, numbers too; Mente and Potere also cloud or light up the art.
  const moves = hits.map((hit) => hitMotion(hit.tier, hit.entry, hit.delay)).filter((m) => m !== null);
  const faceMotion = [...(entering ? ["comic-in 0.5s ease-out both"] : []), ...moves];
  const artMotions = hits.map((hit) => artMotion(hit.style, hit.tier, hit.delay)).filter((m) => m !== null);
  return (
    <span className="relative block aspect-square w-full">
      <span
        className={`@container absolute inset-0 overflow-hidden border-[3px] bg-panel-raised ${frame} ${moves.length ? "quad-fx" : ""}`}
        style={faceMotion.length ? { animation: faceMotion.join(", ") } : undefined}
      >
        {card.art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={withBasePath(card.art_url)}
            srcSet={artSrcSet(card.art_url)}
            sizes="96px"
            alt=""
            className={`absolute inset-0 h-full w-full object-cover object-top ${artMotions.length ? "quad-fx" : ""}`}
            style={artMotions.length ? { animation: artMotions.join(", ") } : undefined}
          />
        ) : (
          <Silhouette faction={card.faction} accent={card.rarity.color} className="absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2" />
        )}
        <CardLookLayers look={look} card={card} />
        {hits.map((hit, i) => (
          <Fragment key={`${stampKey}-${i}`}>
            <ClashTrace style={hit.style} tier={hit.tier} entry={hit.entry} delay={hit.delay} />
            {hit.tier === 2 && <ClashFlash delay={hit.delay} />}
          </Fragment>
        ))}
        {seals && <Seals me={seals.me} opponent={seals.opponent} />}
      </span>
      <span
        className={`pointer-events-none absolute inset-[3px] ${moves.length ? "quad-fx" : ""}`}
        style={moves.length ? { animation: moves.join(", ") } : undefined}
      >
        {NUMBER_POSITION.map((position, side) => {
          const effect = numbers?.get(side);
          return (
            <span
              key={`${side}-${effect ? stampKey : ""}`}
              className={`${number} ${position} ${effect ? "quad-fx" : ""}`}
              style={effect ? numberMotion(effect, side) : undefined}
            >
              {values[side]}
            </span>
          );
        })}
      </span>
    </span>
  );
}

const flash: CSSProperties = { animation: "comic-in 0.5s ease-out both" };
const stamp = (delay: number): CSSProperties => ({ animation: `comic-stamp 0.45s ease-out ${delay}s both` });

/** Whose colour a card on the grid wears: the side with more seals on it; nobody's on a tie. */
function controllerOf(cell: QuadrantCellView): "mine" | "opponent" | "neutral" {
  if (cell.seals.me > cell.seals.opponent) return "mine";
  if (cell.seals.opponent > cell.seals.me) return "opponent";
  return "neutral";
}

const CONTROL_NAMES = { mine: "la controlli tu", opponent: "la controlla l'avversario", neutral: "non la controlla nessuno" } as const;

function BoardCard({
  cell,
  highlight,
  effects,
  delta,
  tentative,
  stampKey,
  look,
  press,
}: {
  cell: QuadrantCellView;
  highlight: boolean;
  effects?: CellEffects;
  delta: SealDelta | null;
  tentative: boolean;
  stampKey: string;
  look: CardCosmetics | null;
  press: ReturnType<ReturnType<typeof useCardDetail>["press"]>;
}) {
  const control = controllerOf(cell);
  return (
    <span
      {...press}
      role="gridcell"
      aria-label={`${cell.card.name}, giocata ${cell.mine ? "da te" : "dall'avversario"}, ${CONTROL_NAMES[control]}: ${cell.values
        .map((v, d) => `${SIDE_NAMES[d]} ${v}`)
        .join(", ")}. Sigilli: tuoi ${cell.seals.me}, avversari ${cell.seals.opponent}`}
      className={`relative min-h-0 min-w-0 ${highlight ? "outline outline-2 outline-offset-1 outline-comic-yellow" : ""}`}
    >
      <QuadCard
        // A card that takes a blow starts again, so the same blow two moves in a row shows twice.
        key={effects?.hits.length ? stampKey : "still"}
        card={cell.card}
        values={cell.values}
        tone={control}
        seals={cell.seals}
        numbers={effects?.numbers}
        hits={effects?.hits}
        entering={highlight}
        stampKey={stampKey}
        look={look}
      />
      {effects?.ring && (
        <span
          aria-hidden
          className={`quad-fx pointer-events-none absolute inset-0 z-[5] border-4 ${effects.ring.mine ? "border-comic-cyan" : "border-comic-orange"}`}
          style={{ animation: `quad-ring 0.7s ease-out ${effects.ring.delay}s both` }}
        />
      )}
      {delta && <DeltaBadges delta={delta} tentative={tentative} stampKey={stampKey} delay={effects?.badgeDelay} />}
    </span>
  );
}

/**
 * The move's seconds left, all of them: the pause to see the move before (the server waits
 * quadrant.movePauseSeconds before the move's own seconds) counts down too.
 */
function MoveTimer({ deadline, offset, mine }: { deadline: number; offset: number; mine: boolean }) {
  const seconds = useSecondsLeft(deadline, offset);
  return (
    <p
      role="timer"
      aria-label={`${seconds} secondi rimasti${mine ? "" : " all'avversario"}`}
      className={`mb-0.5 flex h-11 w-11 shrink-0 rotate-3 items-center justify-center font-display text-[26px] ${
        mine && seconds <= 5 ? "bg-comic-yellow text-black" : "bg-black text-comic-yellow"
      } ${mine ? "" : "opacity-60"}`}
    >
      {seconds}
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
      <p className="text-xs font-semibold">{name} non risponde. Allo scadere del tempo il server gioca al posto suo.</p>
      {absentMs > balance.match.reconnectGraceSeconds * 1000 && (
        <button type="button" onClick={onClaim} disabled={busy} className="btn shrink-0 bg-black px-3 text-sm font-bold text-comic-yellow">
          Rivendica la vittoria
        </button>
      )}
    </div>
  );
}

function RulesText({ view }: { view: QuadrantView }) {
  return (
    <div className="flex flex-col gap-2 text-sm font-medium text-muted">
      <p>
        I lati di ogni carta, in questa partita:{" "}
        {view.abilities.map((a, d) => `${a.name} ${SIDE_NAMES[d]}`).join(", ")}. Il numero su ogni lato è il valore del
        personaggio in quell&apos;abilità; ruotando la carta i numeri girano con lei.
      </p>
      <p>
        Quando posi una carta, ogni suo lato che supera il lato della carta vicina mette un Sigillo tuo sulla carta battuta e uno
        sulla tua. Se la carta battuta a sua volta batte una sua vicina, a quella vicina togli un Sigillo avversario.
      </p>
      <p>
        {view.variant === "fixed"
          ? "Griglia fissa: i bordi del 4×4 ci sono dall'inizio."
          : "Griglia mobile: la griglia si sposta finché le carte non occupano 4 colonne (si bloccano destra e sinistra) o 4 righe (si bloccano alto e basso)."}{" "}
        I Sigilli non finiscono mai; chi apre ne riceve {view.first_player_seals} sulla prima carta. Dopo{" "}
        {view.cards_per_side} carte a testa vince chi ha più Sigilli sulla griglia, poi chi controlla più carte, poi chi ha giocato
        per secondo.
      </p>
      {view.seal_target && (
        <p>
          Regola dell&apos;evento: traguardo {view.seal_target} Sigilli. Alla fine di ogni giro, quando avete giocato lo stesso
          numero di carte, se qualcuno ha almeno {view.seal_target} Sigilli sulla griglia la partita finisce e vince chi ne ha di
          più, anche prima dell&apos;ultima carta.
        </p>
      )}
      {view.border_threats?.length === 4 && (
        <p>
          Su ogni bordo c&apos;è una Minaccia:{" "}
          {view.border_threats.map((t, d) => `${t.name} ${SIDE_NAMES[d]} (${t.value})`).join(", ")}. Ogni lato di una carta rivolto
          verso un bordo si confronta con la sua Minaccia: se è più alto mette un Sigillo in più sulla carta; se è più basso la carta
          riceve {view.border_bite === 1 ? "un Sigillo" : `${view.border_bite ?? 0} Sigilli`} in meno per quella mossa (mai sotto
          zero); a parità niente.
        </p>
      )}
    </div>
  );
}

function QuadrantTutorial({ view, onClose }: { view: QuadrantView; onClose: () => void }) {
  return (
    <>
      <button type="button" aria-label="Chiudi" onClick={onClose} className="fixed inset-0 z-40 bg-black/70" />
      <div
        role="dialog"
        aria-label="Come si gioca Quadrante"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col gap-2 overflow-y-auto bg-comic-yellow px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 text-black"
      >
        <h2 className="font-display text-3xl uppercase">Quadrante</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm font-semibold leading-5">
          <li>
            In ogni partita escono 4 abilità, una per lato della carta. Il numero su un lato è il valore del personaggio in
            quell&apos;abilità: oggi {view.abilities.map((a, d) => `${ARROWS[d]} ${a.name}`).join(", ")}.
          </li>
          <li>Hai sempre 3 carte in mano: ogni volta che ne giochi una, ne peschi un&apos;altra dal tuo mazzo di 10.</li>
          <li>
            A turno, metti una carta accanto a una già in gioco. Prima di giocarla puoi ruotarla: toccala sulla griglia.
          </li>
          <li>
            Ogni lato che supera il lato della carta vicina vale 2 Sigilli tuoi: uno sulla carta battuta, uno sulla tua. A parità
            niente.
          </li>
          <li>
            Onda d&apos;urto: se la carta che batti a sua volta batte una sua vicina, a quella vicina togli un Sigillo avversario.
          </li>
          {view.seal_target && (
            <li>
              Regola dell&apos;evento: quando avete giocato lo stesso numero di carte, se qualcuno ha {view.seal_target} Sigilli o più
              la partita finisce e vince chi ne ha di più.
            </li>
          )}
          {view.border_threats?.length === 4 && (
            <li>
              Sui 4 bordi ci sono 4 Minacce, ognuna col suo numero. Un lato rivolto verso un bordo che supera la Minaccia vale un
              Sigillo in più sulla tua carta; se la Minaccia è più alta, la carta ne riceve uno in meno.
            </li>
          )}
          <li>
            Dopo {view.cards_per_side} carte a testa vince chi ha più Sigilli. Chi apre parte con {view.first_player_seals} Sigilli
            in regalo, perché la sua prima carta non ha vicine.
          </li>
        </ul>
        <button type="button" onClick={onClose} className="btn mt-1 bg-black font-display text-lg uppercase text-comic-yellow">
          Ho capito
        </button>
      </div>
    </>
  );
}

function QuadrantResult({ view, rival }: { view: QuadrantView; rival: string }) {
  const title =
    view.end_reason === "forfeit" && view.result === "loss"
      ? "Hai abbandonato"
      : { win: "Vittoria!", loss: "Sconfitta", draw: "Pareggio" }[view.result ?? "draw"];
  const reward = useMatchReward(view.id);
  const eventPoints = useEventPointsFor(view.id);
  const chip = "relative -skew-x-8 px-3 py-1 text-sm font-extrabold";
  const tied = view.seals.me === view.seals.opponent;
  // An event's seal target, reached at the end of a round.
  const reachedTarget =
    view.end_reason === "completed" && view.seal_target && Math.max(view.seals.me, view.seals.opponent) >= view.seal_target
      ? `Traguardo dell'evento raggiunto (${view.seal_target} Sigilli): vince chi ne aveva di più a fine giro.`
      : null;
  const tieBreak = !tied
    ? null
    : view.controlled.me !== view.controlled.opponent
      ? `Pari sui Sigilli: decidono le carte controllate, ${view.controlled.me} – ${view.controlled.opponent}.`
      : `Pari su tutto: vince chi ha giocato per secondo${view.i_open ? `, ${rival}` : ", cioè tu"}.`;
  const again =
    view.mode === "bot"
      ? `/squadra/?format=${view.format}&difficulty=${view.bot_difficulty ?? "easy"}`
      : view.mode === "ranked"
        ? `/squadra/?mode=ranked&format=${view.format}`
        : "/gioca";

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
      <section
        className={`cut-bottom relative -mx-3 flex flex-[1_0_auto] flex-col items-center justify-center gap-2 overflow-hidden px-4 pb-8 pt-5 text-center ${
          view.result === "win" ? "rays-gold" : view.result === "loss" ? "halftone bg-comic-magenta" : "bg-panel-raised"
        }`}
      >
        <p className="relative text-sm font-extrabold uppercase">Quadrante · {QUADRANT_GRID_LABELS[view.format]}</p>
        <p
          className={`animate-rare-title text-sfx relative text-7xl uppercase ${view.result === "win" ? "text-comic-magenta" : "text-foreground"}`}
        >
          {title}
        </p>
        <p className={`${chip} bg-black text-comic-yellow`}>
          Sigilli {view.seals.me} – {view.seals.opponent}
        </p>
        {reachedTarget && <p className={`${chip} max-w-xs bg-white text-xs text-black`}>{reachedTarget}</p>}
        {tieBreak && view.end_reason === "completed" && (
          <p className={`${chip} max-w-xs bg-white text-xs text-black`}>{tieBreak}</p>
        )}
        <div className="relative flex flex-wrap justify-center gap-2">
          <RankedResultChips ranked={view.ranked} chip={chip} />
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
        <h2 className="section-title text-base leading-5">Mossa per mossa</h2>
        <ol className="flex flex-col gap-0.5">
          {view.moves.map((m) => (
            <li key={m.move} className="flex items-center gap-2 bg-panel px-2 py-1 text-xs font-semibold">
              <span className="w-5 shrink-0 text-right text-muted">{m.move}</span>
              <span className={`min-w-0 flex-1 truncate ${m.mine ? "text-comic-cyan" : "text-comic-orange"}`}>
                {m.mine ? "Tu" : rival}: {m.name}
              </span>
              <span className="shrink-0 text-muted">
                +{m.placed}
                {m.removed > 0 ? ` · −${m.removed}` : ""}
                {m.auto_played ? " · a caso" : ""}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-xs font-semibold text-muted">+ i Sigilli messi, − quelli tolti all&apos;avversario.</p>
      </section>

      <div className="flex shrink-0 gap-2">
        <ReturnLink href={again} onward className="btn btn-primary min-w-0 flex-1">
          {view.mode === "bot" ? "Rivincita" : "Gioca ancora"}
        </ReturnLink>
        <ReturnLink href="/" className="btn btn-ghost shrink-0">
          Torna alla home
        </ReturnLink>
      </div>
    </main>
  );
}
