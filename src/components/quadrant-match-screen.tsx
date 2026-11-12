"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CardDetailProvider, useCardDetail } from "@/components/card-detail";
import { Silhouette } from "@/components/card-view";
import { useEventPointsFor } from "@/components/event-banner";
import { Sheet } from "@/components/sheet";
import { balance } from "@/config/balance";
import { artSrcSet } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import { describeServerError } from "@/lib/errors";
import { describeEventPoints } from "@/lib/events";
import { claimVictory, DIFFICULTY_LABELS, fetchMatchState, forfeitMatch, pingMatch, subscribeToUpdates, type MatchCard } from "@/lib/match";
import { matchXp } from "@/lib/progression";
import {
  cardValues,
  frozenAxes,
  legalCells,
  playQuadrantMove,
  previewQuadrantMove,
  QUADRANT_GRID_LABELS,
  quadrantWindow,
  resolveQuadrantMove,
  submitQuadrantMove,
  type QuadrantCellView,
  type QuadrantPlacementInput,
  type QuadrantView,
} from "@/lib/quadrant";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow, useSecondsLeft } from "@/lib/use-now";

// Against a player: the same pace as the other matches (see match-screen.tsx).
const PING_MS = 6_000;
const OFFLINE_POLL_MS = 5_000;
const TUTORIAL_KEY = "o-mega.quadrant-tutorial-seen";
/** Arrows for the four sides, in direction order: top, right, bottom, left. */
const ARROWS = ["▲", "▶", "▼", "◀"] as const;
const SIDE_NAMES = ["in alto", "a destra", "in basso", "a sinistra"] as const;

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
  const [view, setView] = useState(initial);
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

  const apply = useCallback((next: QuadrantView) => {
    setView((shown) => {
      if (next.move !== shown.move || next.status !== shown.status) setDraft(null);
      return next;
    });
    setOffset(Date.parse(next.server_now) - Date.now());
  }, []);
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
        if (isBot) apply(await playQuadrantMove(view.id, move, placement));
        else apply(placement === null ? await resolveQuadrantMove(view.id) : await submitQuadrantMove(view.id, move, placement));
      } catch (cause) {
        // Someone (the timer, another tab) was faster: reload the state.
        if (cause instanceof Error && ["round_already_resolved", "match_not_active", "not_your_turn"].includes(cause.message)) {
          apply(await fetchQuadrant(view.id));
        } else if (cause instanceof Error && cause.message === "invalid_placement") {
          setError("Mossa non valida: scegli una carta della mano e una casella libera accanto a una carta.");
        } else {
          setError(describeServerError(cause));
        }
      } finally {
        setBusy(false);
      }
    },
    [apply, fetchQuadrant, view.id, isBot],
  );

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
  useEffect(() => {
    if (!isActive || deadline === null) return;
    if (isBot && !myTurn) return;
    const delay = deadline + (balance.match.timeoutGraceSeconds + 0.5) * 1000 - (Date.now() + offset);
    const timer = setTimeout(() => send(move, null), Math.max(0, delay));
    return () => clearTimeout(timer);
  }, [isActive, isBot, myTurn, move, deadline, offset, send]);

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

  return (
    <div className="game-shell">
      <header className="relative flex items-center gap-1.5 px-3 py-1">
        <div className="min-w-0 flex-1 leading-none">
          <p className="truncate text-[10px] font-bold text-muted">
            Quadrante · {QUADRANT_GRID_LABELS[view.format]} · {view.mode === "bot" ? rival : `Amichevole · ${rival}`}
          </p>
          <p className="mt-0.5 flex items-baseline gap-1 text-[11px] font-extrabold uppercase">
            <span className="text-comic-cyan">Tu</span>
            <span className="shrink-0 font-display text-2xl leading-6 text-comic-yellow">
              {view.seals.me}–{view.seals.opponent}
            </span>
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
          busy={busy}
          deadline={deadline}
          offset={offset}
          onDraft={setDraft}
          onPlay={(placement) => send(view.move, placement)}
          onShowResult={() => setShowResult(true)}
        />
      )}
    </div>
  );
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
  busy: boolean;
  deadline: number | null;
  offset: number;
  onDraft: (draft: Draft | null) => void;
  onPlay: (placement: QuadrantPlacementInput) => void;
  onShowResult: () => void;
}) {
  const detail = useCardDetail();
  const isActive = view.status === "active";
  const myTurn = isActive && view.to_move === "me";
  const area = quadrantWindow(view);
  const legal = useMemo(() => (myTurn ? legalCells(view) : []), [view, myTurn]);
  const isLegal = (x: number, y: number) => legal.some((c) => c.x === x && c.y === y);
  const card = draft ? (view.my_hand.find((c) => c.instance_id === draft.instanceId) ?? null) : null;
  const placed = card && draft && draft.x !== null && draft.y !== null ? { x: draft.x, y: draft.y } : null;
  const preview = card && placed && draft ? previewQuadrantMove(view, card, placed.x, placed.y, draft.rotation) : null;
  const last = view.moves.at(-1) ?? null;
  const frozen = frozenAxes(view);

  // A cell the chosen card can go on: the gain for each turn of the card, the best one shown.
  const bestGain = (x: number, y: number) => {
    if (!card) return null;
    let top = -Infinity;
    for (let rotation = 0; rotation < 4; rotation++) {
      const p = previewQuadrantMove(view, card, x, y, rotation);
      top = Math.max(top, p.gained + p.removed);
    }
    return top;
  };

  function tapCell(x: number, y: number) {
    if (busy || !myTurn || !draft) return;
    if (placed && placed.x === x && placed.y === y) {
      onDraft({ ...draft, rotation: (draft.rotation + 1) % 4 });
      return;
    }
    if (!isLegal(x, y)) return;
    // The best turn here, to start from.
    let best = draft.rotation;
    let top = -Infinity;
    for (let rotation = 0; rotation < 4; rotation++) {
      const p = previewQuadrantMove(view, card!, x, y, rotation);
      if (p.gained + p.removed > top) {
        top = p.gained + p.removed;
        best = rotation;
      }
    }
    onDraft({ ...draft, x, y, rotation: best });
  }

  const cellsByKey = new Map(view.board.map((cell) => [`${cell.x},${cell.y}`, cell]));
  const status = !isActive
    ? "Partita finita"
    : myTurn
      ? draft === null
        ? "Tocca a te: scegli una carta"
        : placed === null
          ? "Ora tocca una casella libera"
          : "Ruota la carta o giocala"
      : busy && view.bot_difficulty
        ? `${rival} sta giocando…`
        : `Tocca a ${rival}`;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="cut-bottom relative mx-3 mt-1 flex shrink-0 flex-col overflow-hidden bg-comic-cyan px-3 pb-3 pt-1.5 text-black">
        <div aria-hidden className="halftone absolute inset-0 [mask-image:linear-gradient(135deg,transparent_45%,#000_100%)]" />
        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-extrabold">
              Mossa {Math.min(view.move, view.moves_count)} di {view.moves_count}
              {view.variant === "shifting" && ` · ${frozen.columns ? "colonne bloccate" : "colonne libere"}, ${frozen.rows ? "righe bloccate" : "righe libere"}`}
            </p>
            <p className="font-display text-[20px] uppercase leading-6">{status}</p>
            {last && (
              <p className="mt-0.5 truncate text-[11px] font-bold">
                {last.mine ? "Tu" : rival}: {last.name}
                {last.beaten > 0 ? `, batte ${last.beaten}` : ", nessuna battuta"}
                {last.removed > 0 ? `, toglie ${last.removed} sigill${last.removed === 1 ? "o" : "i"}` : ""}
                {last.auto_played ? " (tempo scaduto)" : ""}
              </p>
            )}
          </div>
          {deadline !== null && isActive && <MoveTimer key={deadline} deadline={deadline} offset={offset} mine={myTurn} />}
        </div>
      </section>

      <div className="px-3 pt-1.5">
        <AbilityLegend view={view} />
      </div>

      {/* The grid. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-1.5" style={{ containerType: "size" }}>
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${area.columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${area.rows}, minmax(0, 1fr))`,
            aspectRatio: `${area.columns} / ${area.rows}`,
            // As large as the room allows, keeping the cells square.
            width: `min(100cqw, 420px, 100cqh * ${area.columns} / ${area.rows})`,
          }}
          role="grid"
          aria-label="La griglia"
        >
          {Array.from({ length: area.rows }, (_, r) =>
            Array.from({ length: area.columns }, (_, c) => {
              const x = area.minX + c;
              const y = area.minY + r;
              const cell = cellsByKey.get(`${x},${y}`);
              if (cell) {
                const isLast = last !== null && last.x === x && last.y === y;
                return (
                  <BoardCard key={`${x},${y}`} cell={cell} highlight={isLast} press={detail.press(cell.card)} />
                );
              }
              const here = placed && placed.x === x && placed.y === y;
              if (here && card && draft) {
                return (
                  <button
                    key={`${x},${y}`}
                    type="button"
                    onClick={() => tapCell(x, y)}
                    aria-label={`${card.name} qui. Tocca per ruotarla`}
                    className="relative min-h-0 min-w-0"
                  >
                    <QuadCard card={card} values={cardValues(view, card, draft.rotation)} tone="draft" />
                  </button>
                );
              }
              const legalHere = myTurn && isLegal(x, y);
              const gain = legalHere && card ? bestGain(x, y) : null;
              return (
                <button
                  key={`${x},${y}`}
                  type="button"
                  onClick={() => tapCell(x, y)}
                  disabled={!legalHere || !card || busy}
                  aria-label={legalHere ? `Casella libera${gain !== null ? `: fino a ${gain} sigilli` : ""}` : "Casella"}
                  className={`flex min-h-0 min-w-0 items-center justify-center border-2 ${
                    legalHere ? (card ? "border-dashed border-comic-yellow bg-panel" : "border-dashed border-line bg-panel") : "border-transparent bg-panel/40"
                  }`}
                >
                  {gain !== null && gain > 0 && <span className="font-display text-lg text-comic-yellow">+{gain}</span>}
                </button>
              );
            }),
          )}
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
          {/* The hand. */}
          <div role="group" aria-label="La tua mano" className="flex justify-center gap-2 px-3 pb-1.5 pt-1">
            {view.my_hand.map((handCard) => {
              const selected = draft?.instanceId === handCard.instance_id;
              return (
                <button
                  key={handCard.instance_id}
                  type="button"
                  {...detail.press(handCard)}
                  onClick={() =>
                    myTurn && !busy && onDraft(selected ? null : { instanceId: handCard.instance_id, x: null, y: null, rotation: 0 })
                  }
                  disabled={!myTurn || busy}
                  aria-pressed={selected}
                  aria-label={`${handCard.name}: ${cardValues(view, handCard, 0)
                    .map((v, d) => `${SIDE_NAMES[d]} ${v}`)
                    .join(", ")}`}
                  className={`w-[calc((100%-1rem)/3)] max-w-[104px] ${selected ? "-translate-y-1.5" : ""} ${!myTurn ? "opacity-70" : ""}`}
                >
                  <QuadCard card={handCard} values={cardValues(view, handCard, selected && draft ? draft.rotation : 0)} tone={selected ? "draft" : "hand"} />
                </button>
              );
            })}
          </div>
          <p className="px-3 text-center text-[10px] font-semibold text-muted">
            Mazzo: {view.my_deck_left} · {rival}: {view.opponent_hand_count} in mano, {view.opponent_deck_left} nel mazzo
          </p>

          <div className="border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
            {preview && (
              <p className="mb-1.5 text-center text-xs font-bold text-muted">
                {preview.beaten > 0 ? `Batte ${preview.beaten} cart${preview.beaten === 1 ? "a" : "e"}: +${preview.gained} sigilli` : preview.gained > 0 ? `+${preview.gained} sigilli` : "Non batte nessuna carta"}
                {preview.removed > 0 && `, ne toglie ${preview.removed} a ${rival}`}
              </p>
            )}
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
                {busy ? (view.bot_difficulty ? "Il bot risponde…" : "Invio…") : myTurn ? "Gioca la carta" : `Turno di ${rival}`}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
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

/** A square card: the face, and the four numbers on its sides. */
function QuadCard({
  card,
  values,
  tone,
  seals,
}: {
  card: MatchCard;
  values: readonly number[];
  tone: "mine" | "opponent" | "hand" | "draft";
  seals?: { me: number; opponent: number };
}) {
  const frame =
    tone === "mine"
      ? "border-comic-cyan"
      : tone === "opponent"
        ? "border-comic-orange"
        : tone === "draft"
          ? "border-comic-yellow shadow-[3px_3px_0_var(--comic-magenta)]"
          : "border-panel-raised";
  const number = "absolute z-[3] flex h-[18px] min-w-[18px] items-center justify-center bg-black px-0.5 font-display text-[14px] leading-none text-comic-yellow";
  return (
    <span className={`relative block aspect-square w-full overflow-hidden border-[3px] bg-panel-raised ${frame}`}>
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
      <span className={`${number} left-1/2 top-0 -translate-x-1/2`}>{values[0]}</span>
      <span className={`${number} right-0 top-1/2 -translate-y-1/2`}>{values[1]}</span>
      <span className={`${number} bottom-0 left-1/2 -translate-x-1/2`}>{values[2]}</span>
      <span className={`${number} left-0 top-1/2 -translate-y-1/2`}>{values[3]}</span>
      {seals && <Seals me={seals.me} opponent={seals.opponent} />}
    </span>
  );
}

const flash: CSSProperties = { animation: "comic-in 0.5s ease-out both" };

function BoardCard({
  cell,
  highlight,
  press,
}: {
  cell: QuadrantCellView;
  highlight: boolean;
  press: ReturnType<ReturnType<typeof useCardDetail>["press"]>;
}) {
  return (
    <span
      {...press}
      role="gridcell"
      aria-label={`${cell.card.name}, ${cell.mine ? "tua" : "avversaria"}: ${cell.values
        .map((v, d) => `${SIDE_NAMES[d]} ${v}`)
        .join(", ")}. Sigilli: tuoi ${cell.seals.me}, avversari ${cell.seals.opponent}`}
      className={`relative min-h-0 min-w-0 ${highlight ? "outline outline-2 outline-offset-1 outline-comic-yellow" : ""}`}
      style={highlight ? flash : undefined}
    >
      <QuadCard card={cell.card} values={cell.values} tone={cell.mine ? "mine" : "opponent"} seals={cell.seals} />
    </span>
  );
}

/** The move's seconds left. */
function MoveTimer({ deadline, offset, mine }: { deadline: number; offset: number; mine: boolean }) {
  const seconds = useSecondsLeft(deadline, offset);
  const shown = Math.min(seconds, balance.quadrant.moveTimerSeconds);
  return (
    <p
      role="timer"
      aria-label={`${shown} secondi rimasti${mine ? "" : " all'avversario"}`}
      className={`mb-0.5 flex h-11 w-11 shrink-0 rotate-3 items-center justify-center font-display text-[26px] ${
        mine && seconds <= 5 ? "bg-comic-yellow text-black" : "bg-black text-comic-yellow"
      } ${mine ? "" : "opacity-60"}`}
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
        Ognuno ha {view.seals_per_side} Sigilli; chi apre ne riceve {view.first_player_seals} sulla prima carta. Dopo{" "}
        {view.cards_per_side} carte a testa vince chi ha più Sigilli sulla griglia, poi chi controlla più carte, poi chi ha giocato
        per secondo.
      </p>
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
  const xp = matchXp(view);
  const eventPoints = useEventPointsFor(view.id);
  const chip = "relative -skew-x-8 px-3 py-1 text-sm font-extrabold";
  const tied = view.seals.me === view.seals.opponent;
  const tieBreak = !tied
    ? null
    : view.controlled.me !== view.controlled.opponent
      ? `Pari sui Sigilli: decidono le carte controllate, ${view.controlled.me} – ${view.controlled.opponent}.`
      : `Pari su tutto: vince chi ha giocato per secondo${view.i_open ? `, ${rival}` : ", cioè tu"}.`;
  const again = view.mode === "bot" ? `/squadra/?format=${view.format}&difficulty=${view.bot_difficulty ?? "easy"}` : "/gioca";

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
        {tieBreak && view.end_reason === "completed" && <p className={`${chip} max-w-xs bg-white text-xs text-black`}>{tieBreak}</p>}
        <div className="relative flex flex-wrap justify-center gap-2">
          {xp > 0 && <p className={`${chip} bg-black text-foreground`}>+{xp} XP</p>}
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
        <Link href={again} className="btn btn-primary min-w-0 flex-1">
          {view.mode === "bot" ? "Rivincita" : "Gioca ancora"}
        </Link>
        <Link href="/" className="btn btn-ghost shrink-0">
          Torna alla home
        </Link>
      </div>
    </main>
  );
}
