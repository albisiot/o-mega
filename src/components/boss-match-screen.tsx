"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AbilityFamilies } from "@o-mega/game-engine";
import { BossComic } from "@/components/boss-comic";
import { BossDiorama } from "@/components/boss-diorama";
import { CardDetailProvider, useCardDetail } from "@/components/card-detail";
import { useEventPointsFor } from "@/components/event-banner";
import { HandCard } from "@/components/hand-card";
import { InfoTip } from "@/components/info-tip";
import { Sheet } from "@/components/sheet";
import { balance } from "@/config/balance";
import {
  bossBoards,
  bossPreviews,
  carriedIntoTurn,
  currentHolders,
  playBossTurn,
  resolveBossTurn,
  submitBossChoice,
  type BossRound,
  type BossView,
} from "@/lib/boss";
import { describeEventPoints } from "@/lib/events";
import { bossTurnEntries, holdersBefore, type BossEntry } from "@/lib/boss-powers";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import {
  claimVictory,
  DIFFICULTY_LABELS,
  fetchMatchState,
  forfeitMatch,
  pingMatch,
  subscribeToUpdates,
} from "@/lib/match";
import { matchXp } from "@/lib/progression";
import { rarityFrame, rarityLetter } from "@/lib/rarity-theme";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow, useSecondsLeft } from "@/lib/use-now";

// Against a player: the same pace as a classic match (see match-screen.tsx).
const PING_MS = 6_000;
const OFFLINE_POLL_MS = 5_000;
const TUTORIAL_KEY = "o-mega.boss-tutorial-seen";

function seenBossTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) !== null;
  } catch {
    // Without storage the rules stay one tap away, in the table sheet.
    return true;
  }
}

function lastResolvedTurn(view: BossView): number {
  return Math.max(0, ...view.rounds.filter((r) => r.resolved).map((r) => r.round));
}

function rivalLabel(view: BossView): string {
  return view.bot_difficulty ? `Bot ${DIFFICULTY_LABELS[view.bot_difficulty]}` : (view.opponent?.username ?? "Avversario");
}

/** The player's free front worth the most this turn, the first among equals: where the screen starts. */
function hottestFront(view: BossView): number {
  const row = view.values[view.current_round - 1] ?? view.values[0];
  const taken = bossBoards(view).mine;
  const free = row.map((value, f) => (taken[f] ? -1 : value));
  return free.indexOf(Math.max(...free));
}

/** A Grande Minaccia (against a bot or a player), from the first turn to the result. */
export function BossMatchScreen({ initial }: { initial: BossView }) {
  return (
    <CardDetailProvider>
      <BossSteps initial={initial} />
    </CardDetailProvider>
  );
}

function BossSteps({ initial }: { initial: BossView }) {
  const [view, setView] = useState(initial);
  // Server time minus device time: countdowns follow the server clock.
  const [offset, setOffset] = useState(() => Date.parse(initial.server_now) - Date.now());
  const [revealing, setRevealing] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // The front the player tapped this turn; until then, the one already submitted or the hottest.
  const [front, setFront] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>([]);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  // The rules once, at the first Grande Minaccia on this device.
  const [tutorial, setTutorial] = useState(() => initial.status === "active" && !seenBossTutorial());
  const tableRef = useRef<HTMLDialogElement>(null);

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

  // Every newly resolved turn is revealed, however we learned about it.
  const revealedUpTo = useRef(lastResolvedTurn(initial));
  const apply = useCallback((next: BossView) => {
    setView(next);
    setOffset(Date.parse(next.server_now) - Date.now());
    const newest = lastResolvedTurn(next);
    if (newest > revealedUpTo.current) {
      revealedUpTo.current = newest;
      setRevealing(newest);
      setSelected(null);
      setFront(null);
    }
  }, []);
  const fetchBoss = useCallback(async (id: string) => (await fetchMatchState(id)) as unknown as BossView, []);

  const isBot = view.bot_difficulty !== null;
  const isActive = view.status === "active";
  const current = isActive ? view.rounds.find((r) => r.round === view.current_round && !r.resolved) : undefined;
  const deadline = current ? Date.parse(current.deadline_at) : null;

  const submit = useCallback(
    async (round: number, choice: { instanceId: string; front: number } | null) => {
      setBusy(true);
      setError(null);
      try {
        if (isBot) apply(await playBossTurn(view.id, round, choice));
        else apply(choice === null ? await resolveBossTurn(view.id) : await submitBossChoice(view.id, round, choice.instanceId, choice.front));
      } catch (cause) {
        // Someone (the timer, another tab) was faster: reload the state.
        if (cause instanceof Error && ["round_already_resolved", "match_not_active"].includes(cause.message)) {
          apply(await fetchBoss(view.id));
        } else {
          setError(describeServerError(cause));
        }
      } finally {
        setBusy(false);
      }
    },
    [apply, fetchBoss, view.id, isBot],
  );

  // Against a player: broadcasts, pings and a poll while broadcasts cannot arrive.
  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      apply(await fetchBoss(view.id));
    } catch {
      // The next broadcast, ping or poll will try again.
    } finally {
      refreshing.current = false;
    }
  }, [apply, fetchBoss, view.id]);

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
          const turn = shown.rounds.find((r) => r.round === shown.current_round);
          if (
            answer.status !== shown.status ||
            answer.current_round !== shown.current_round ||
            (answer.status === "active" && answer.opponent_has_chosen !== Boolean(turn?.opponent_has_chosen))
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

  // When the time is up (plus the server's grace), let the server play for us.
  const round = current?.round;
  useEffect(() => {
    if (round === undefined || deadline === null) return;
    const delay = deadline + (balance.match.timeoutGraceSeconds + 0.5) * 1000 - (Date.now() + offset);
    const timer = setTimeout(() => submit(round, null), Math.max(0, delay));
    return () => clearTimeout(timer);
  }, [round, deadline, offset, submit]);

  // A turn result stays on screen for the reveal pause; the last one waits for a tap.
  useEffect(() => {
    if (revealing === null || view.status !== "active") return;
    const timer = setTimeout(() => setRevealing(null), balance.match.revealPauseSeconds * 1000);
    return () => clearTimeout(timer);
  }, [revealing, view.status]);

  async function forfeit() {
    setBusy(true);
    try {
      apply((await forfeitMatch(view.id)) as unknown as BossView);
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
      apply((await claimVictory(view.id)) as unknown as BossView);
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
  useLockedScreen(true);

  return (
    <div className="game-shell">
      <header className="relative flex items-center gap-1.5 px-3 py-1">
        <div className="min-w-0 max-w-[7.5rem] shrink-0 leading-none">
          <p className="truncate text-[10px] font-bold text-muted">
            {view.mode === "bot" ? `Grande Minaccia · ${rival}` : `Amichevole · ${rival}`}
          </p>
          <p className="mt-0.5 flex items-baseline gap-1 text-[11px] font-extrabold uppercase">
            Tu
            <span className="shrink-0 font-display text-2xl leading-6 text-comic-yellow">
              {view.points.me}–{view.points.opponent}
            </span>
            <span className="truncate">{isBot ? "Bot" : rival}</span>
          </p>
        </div>
        <TurnTrack view={view} />
        <button
          type="button"
          onClick={() => tableRef.current?.showModal()}
          aria-label="Tabella dei punti"
          className="btn btn-ghost h-11 w-11 shrink-0 px-0"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
            <path d="M2 3h16v14H2zM2 8h16M2 12.5h16M7.5 3v14M13 3v14" />
          </svg>
        </button>
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
          <OpponentAbsent lastSeenAt={view.opponent.last_seen_at} offset={offset} name={rival} busy={busy} onClaim={claim} />
        )}
      </header>

      <Sheet sheetRef={tableRef} title="Tabella dei punti">
        <BossTable view={view} />
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
      {tutorial && <BossTutorial onClose={closeTutorial} />}
      {error && <p className="mx-3 mt-1 text-sm font-semibold text-comic-magenta">{error}</p>}

      {shownRound ? (
        <TurnReveal
          view={view}
          round={shownRound}
          rival={rival}
          onContinue={() => setRevealing(null)}
          finished={view.status === "finished"}
        />
      ) : view.status === "finished" ? (
        <BossResult view={view} rival={rival} />
      ) : current ? (
        <ChooseTurn
          view={view}
          round={current}
          families={families}
          abilities={abilities}
          deadline={deadline!}
          offset={offset}
          selected={selected ?? current.my_pending?.instance_id ?? null}
          front={front ?? current.my_pending?.front ?? hottestFront(view)}
          onSelect={setSelected}
          onFront={setFront}
          busy={busy}
          rival={rival}
          onPlay={(choice) => submit(current.round, choice)}
        />
      ) : null}
    </div>
  );
}

/** The five turns: what each side took in each, the current one highlighted. */
function TurnTrack({ view }: { view: BossView }) {
  return (
    <ol className="flex min-w-0 flex-1 gap-1" aria-label="Turni">
      {Array.from({ length: view.turns }, (_, i) => {
        const round = view.rounds.find((r) => r.round === i + 1 && r.resolved);
        const isCurrent = view.status === "active" && view.current_round === i + 1;
        const mine = round?.my_play?.points ?? 0;
        const theirs = round?.opponent_play?.points ?? 0;
        const style = isCurrent
          ? "bg-comic-yellow text-black"
          : round
            ? mine > theirs
              ? "bg-comic-cyan text-black"
              : theirs > mine
                ? "bg-panel-raised text-muted"
                : "bg-panel-raised text-faint"
            : "border-2 border-line text-foreground";
        return (
          <li
            key={i}
            aria-label={round ? `Turno ${i + 1}: tu ${mine}, avversario ${theirs}` : `Turno ${i + 1}`}
            className={`flex h-11 min-w-0 flex-1 -skew-x-8 flex-col items-center justify-center leading-none ${style}`}
          >
            {round ? (
              <>
                <span className="font-display text-[15px]">+{mine}</span>
                <span className="text-[10px] font-extrabold">+{theirs}</span>
              </>
            ) : (
              <span className="font-display text-[19px]">{i + 1}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function abilityLabel(abilities: AbilityInfo[], code: string) {
  return abilities.find((a) => a.code === code);
}

function ChooseTurn({
  view,
  round,
  families,
  abilities,
  deadline,
  offset,
  selected,
  front,
  onSelect,
  onFront,
  busy,
  rival,
  onPlay,
}: {
  view: BossView;
  round: BossRound;
  families: AbilityFamilies;
  abilities: AbilityInfo[];
  deadline: number;
  offset: number;
  selected: string | null;
  front: number;
  onSelect: (id: string) => void;
  onFront: (front: number) => void;
  busy: boolean;
  rival: string;
  onPlay: (choice: { instanceId: string; front: number }) => void;
}) {
  const isBot = view.bot_difficulty !== null;
  const turn = round.round;
  const row = view.values[turn - 1];
  const previews = useMemo(() => bossPreviews(view, families), [view, families]);
  const carried = useMemo(() => carriedIntoTurn(view, families), [view, families]);
  const { mine, theirs } = useMemo(() => bossBoards(view), [view]);
  const holders = currentHolders(view);
  const available = view.my_team.filter((card) => card.played_round === null);
  const chosen = available.find((card) => card.instance_id === selected) ?? null;
  const target = view.fronts[front];
  const chosenPreview = chosen ? previews.get(chosen.instance_id)?.[front] : undefined;
  const pending = round.my_pending;
  const isPending = Boolean(chosen && pending && pending.instance_id === chosen.instance_id && pending.front === front);
  const turnsLeft = view.turns - turn + 1;
  const worthToEnd = view.values.slice(turn - 1).reduce((sum, r) => sum + r[front], 0);
  const detail = useCardDetail();
  const previewNote =
    "Anteprima contro il personaggio avversario già sul fronte: se ne arriva uno in questo turno o nei prossimi, conta chi fa più punti. Il punteggio resta quello con cui la carta entra. Il server calcola tutto quando giochi.";

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="cut-bottom relative mx-3 mt-1 flex min-h-0 flex-1 flex-col overflow-hidden bg-comic-magenta px-3 pb-4 text-black">
        <div aria-hidden className="halftone absolute inset-0 [mask-image:linear-gradient(135deg,transparent_45%,#000_100%)]" />
        <div className="relative -mx-3 min-h-8 flex-1">
          <BossDiorama view={view} fill />
        </div>
        <div className="relative">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold">
                Turno {turn} di {view.turns} · Grande Minaccia
              </p>
              <p className="truncate font-display text-[26px] uppercase leading-7">{view.boss.name}</p>
            </div>
            <RoundTimer key={deadline} deadline={deadline} offset={offset} />
          </div>
          {carried > 0 && <p className="mt-1 text-xs font-bold">Bonus dal turno prima: +{carried} al personaggio di questo turno.</p>}
          {!isBot && (
            <p className="mt-1 text-xs font-bold">{round.opponent_has_chosen ? `${rival} ha scelto.` : `${rival} sta scegliendo…`}</p>
          )}
        </div>
      </section>

      {/* The five fronts: this turn's value, who stands there, the preview of the chosen card. */}
      <div role="radiogroup" aria-label="Scegli il fronte" className="flex gap-1 px-3 pt-2">
        {view.fronts.map((f) => {
          const own = mine[f.front];
          const their = theirs[f.front];
          const preview = chosen && !own ? previews.get(chosen.instance_id)?.[f.front] : undefined;
          const on = !own && f.front === front;
          const holder = holders[f.front];
          const frame = on
            ? "border-comic-yellow bg-comic-yellow text-black"
            : own
              ? "border-panel-raised bg-panel-raised text-muted"
              : "border-panel-raised bg-panel text-foreground";
          return (
            <button
              key={f.front}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onFront(f.front)}
              disabled={busy || Boolean(own)}
              aria-label={`${f.name}, livello ${f.level}, vale ${row[f.front]} punti in questo turno${
                own ? `, c'è già il tuo ${own.card.name} con ${own.score}` : ""
              }${their ? `, avversario ${their.card.name} con ${their.score}` : ""}${
                preview ? `, ${chosen?.name} farebbe ${preview.score.total}` : ""
              }`}
              className={`relative flex min-w-0 flex-1 flex-col items-stretch border-[3px] px-1 pb-1 pt-0.5 text-left ${frame}`}
            >
              {holder && (
                <span
                  aria-hidden
                  className={`absolute -right-[3px] -top-[3px] h-2.5 w-2.5 ${holder === "me" ? "bg-comic-cyan" : "bg-comic-orange"}`}
                />
              )}
              <span className="flex items-baseline justify-between gap-0.5">
                <span className={`text-[10px] font-extrabold ${on ? "text-black/70" : "text-muted"}`}>Lv {f.level}</span>
                <span className="font-display text-[22px] leading-6">+{row[f.front]}</span>
              </span>
              <span className="line-clamp-3 min-h-[33px] break-words text-[9.5px] font-extrabold leading-[11px] [hyphens:auto]" lang="it">
                {f.name}
              </span>
              {/* Who stands there: you above, the opponent below. The score never gets cut off by a long name. */}
              {own ? (
                <FrontOccupant name={own.card.name} score={own.score} tone="mine" />
              ) : (
                <span className={`mt-0.5 truncate text-[9.5px] font-extrabold leading-4 ${on ? "text-black/60" : "text-faint"}`}>libero</span>
              )}
              {their ? (
                <FrontOccupant name={their.card.name} score={their.score} tone="theirs" onYellow={on} />
              ) : (
                <span className={`mt-0.5 truncate text-[9.5px] font-extrabold leading-4 ${on ? "text-black/50" : "text-faint"}`}>—</span>
              )}
              {preview && (
                <span
                  className={`mt-0.5 -skew-x-8 px-1 text-center font-display text-[15px] leading-5 ${
                    preview.holds ? "bg-comic-cyan text-black" : on ? "bg-black/15" : "bg-panel-raised text-faint"
                  }`}
                >
                  {preview.score.total}
                  {preview.against !== null && `/${preview.against}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* The hand: each card's score arriving on the chosen front, cyan when it would hold it. */}
      <div role="group" aria-label="Scegli chi mandare" className="flex justify-center gap-1.5 px-3 pb-1.5 pt-2.5">
        {available.map((card) => {
          const preview = previews.get(card.instance_id)?.[front];
          return (
            <div key={card.instance_id} className="w-[calc((100%-1.5rem)/5)]">
              <HandCard
                card={card}
                score={preview?.score.total ?? 0}
                bonus={preview?.score.bonus ?? 0}
                tone={preview ? (preview.holds ? "pass" : "fail") : undefined}
                short
                artSizes="calc((100vw - 78px) / 5)"
                selected={card.instance_id === selected}
                disabled={busy}
                onSelect={() => onSelect(card.instance_id)}
                press={detail.press(card)}
              />
            </div>
          );
        })}
      </div>

      <div className="border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        <div className="mb-2 min-h-[62px]">
          <p className="flex items-center gap-1.5">
            <span className="min-w-0 truncate font-display text-lg uppercase leading-6 text-comic-yellow">{target.name}</span>
            <span className="ml-auto shrink-0 text-xs font-bold text-muted">
              ora <span className="font-display text-lg text-foreground">{row[front]}</span> · fino alla fine{" "}
              <span className="font-display text-lg text-foreground">{worthToEnd}</span>
            </span>
            <InfoTip text={previewNote} />
          </p>
          <p className="text-xs font-semibold text-muted">
            {target.abilities.map((code) => abilityLabel(abilities, code)?.name ?? code).join(" · ")} ·{" "}
            {theirs[front]
              ? `contro ${theirs[front]!.card.name} (${theirs[front]!.score})`
              : `nessun avversario, per ora: paga ${turnsLeft === 1 ? "questo turno" : `ognuno dei ${turnsLeft} turni`} a chi lo tiene`}
          </p>
          {chosen && chosenPreview ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center text-[10px] font-black text-black"
                style={{ background: rarityFrame(chosen.rarity) }}
              >
                {rarityLetter(chosen.rarity)}
              </span>
              <span className="truncate">
                {chosen.name}: {chosenPreview.score.total} punti
                {chosenPreview.score.bonus !== 0 &&
                  ` (${chosenPreview.score.bonus > 0 ? "+" : ""}${chosenPreview.score.bonus} ${chosenPreview.score.bonus > 0 ? "bonus" : "malus"})`}
              </span>
              <span className={`ml-auto shrink-0 font-bold ${chosenPreview.holds ? "text-comic-cyan" : "text-faint"}`}>
                {chosenPreview.holds ? (chosenPreview.against === null ? "lo tieni" : "lo prendi") : "non basta"}
              </span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs font-semibold text-muted">Tocca un fronte libero e una carta: resterà lì fino alla fine.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => chosen && onPlay({ instanceId: chosen.instance_id, front })}
          disabled={!chosen || busy || isPending || Boolean(mine[front])}
          className="btn btn-primary w-full"
        >
          {busy
            ? isBot
              ? "Il bot sta scegliendo…"
              : "Invio…"
            : isPending && chosen
              ? `${chosen.name} su ${target.name}: in attesa di ${rival}`
              : chosen
                ? `${pending ? "Cambia: " : ""}${chosen.name} su ${target.name}`
                : "Scegli un personaggio"}
        </button>
      </div>
    </main>
  );
}

/** A character standing on a front: its score in a coloured badge, then the name in what room is left. */
function FrontOccupant({ name, score, tone, onYellow = false }: { name: string; score: number; tone: "mine" | "theirs"; onYellow?: boolean }) {
  return (
    <span className="mt-0.5 flex min-w-0 items-center gap-0.5">
      <span
        className={`shrink-0 px-0.5 font-display text-[13px] leading-4 ${onYellow ? "bg-black text-comic-orange" : tone === "mine" ? "bg-comic-cyan text-black" : "bg-comic-orange text-black"}`}
      >
        {score}
      </span>
      <span className={`min-w-0 truncate text-[9px] font-extrabold ${onYellow ? "text-black" : tone === "mine" ? "text-comic-cyan" : "text-comic-orange"}`}>
        {name}
      </span>
    </span>
  );
}

/** The turn's seconds left. */
function RoundTimer({ deadline, offset }: { deadline: number; offset: number }) {
  const seconds = useSecondsLeft(deadline, offset);
  const shown = Math.min(seconds, balance.match.roundTimerSeconds);
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
      <p className="text-xs font-semibold">{name} non risponde. Allo scadere del tempo il server sceglie al posto suo.</p>
      {absentMs > balance.match.reconnectGraceSeconds * 1000 && (
        <button type="button" onClick={onClaim} disabled={busy} className="btn shrink-0 bg-black px-3 text-sm font-bold text-comic-yellow">
          Rivendica la vittoria
        </button>
      )}
    </div>
  );
}

function TurnReveal({
  view,
  round,
  rival,
  onContinue,
  finished,
}: {
  view: BossView;
  round: BossRound;
  rival: string;
  onContinue: () => void;
  finished: boolean;
}) {
  const detail = useCardDetail();
  const entries = useMemo(() => bossTurnEntries(view, round), [view, round]);
  if (!entries || !round.my_play || !round.opponent_play) return null;
  const statsOf = (entry: BossEntry) => {
    const abilities = view.fronts[entry.front]?.abilities ?? [];
    return entry.card ? abilities.map((code) => `${code} ${entry.card!.stats[code] ?? 0}`).join(" · ") : "";
  };
  // The totals as they stood after this turn.
  const upTo = view.rounds.filter((r) => r.resolved && r.round <= round.round);
  const totals = {
    me: upTo.reduce((sum, r) => sum + (r.my_play?.points ?? 0), 0),
    opponent: upTo.reduce((sum, r) => sum + (r.opponent_play?.points ?? 0), 0),
  };
  const notices = [
    ...(round.my_play.auto_played ? ["Tempo scaduto: il server ha scelto per te."] : []),
    ...(round.opponent_play.auto_played ? [`${rival} non ha scelto in tempo.`] : []),
  ];

  return (
    <BossComic
      key={round.round}
      turn={round.round}
      turns={view.turns}
      bossName={view.boss.name}
      fronts={view.fronts.map((front) => ({ name: front.name, level: front.level }))}
      values={view.values[round.round - 1] ?? view.fronts.map(() => 0)}
      holdersBefore={holdersBefore(view, round)}
      holdersAfter={round.holders ?? view.fronts.map(() => null)}
      rivalName={rival}
      entries={entries}
      stats={{ me: statsOf(entries.me), opponent: statsOf(entries.opponent) }}
      press={{
        me: entries.me.card ? detail.press(entries.me.card) : undefined,
        opponent: entries.opponent.card ? detail.press(entries.opponent.card) : undefined,
      }}
      points={{ me: round.my_play.points, opponent: round.opponent_play.points }}
      totals={totals}
      notices={notices}
      onContinue={onContinue}
      hint={(complete) => (
        <p className="py-1 text-center text-xs font-extrabold uppercase tracking-wide text-black">
          {!complete ? "Tocca per saltare" : finished ? "Tocca per il risultato" : "Tocca per continuare"}
        </p>
      )}
    />
  );
}

/** The whole points table, visible from the start, coloured by who held each front in each turn. */
function BossTable({ view }: { view: BossView }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold">
        <span className="font-display text-lg uppercase text-comic-yellow">{view.boss.name}.</span>{" "}
        <span className="italic">{view.boss.flavor}</span>
      </p>
      <p className="text-sm font-medium text-muted">
        Ogni turno alcuni fronti sono caldi e valgono di più, mai gli stessi del turno prima; gli altri valgono poco. A
        ogni turno ogni fronte occupato paga il suo valore: a chi è da solo, o a chi ha il punteggio più alto.
      </p>
      <table className="w-full table-fixed border-collapse text-center text-sm">
        <thead>
          <tr>
            <th className="w-12 text-left text-[11px] font-extrabold text-muted">Turno</th>
            {view.fronts.map((f) => (
              <th key={f.front} className="px-0.5 pb-1 align-bottom text-[10px] font-extrabold leading-3">
                <span className="line-clamp-3 break-words [hyphens:auto]" lang="it">
                  {f.name}
                </span>
                <span className="block text-muted">Lv {f.level}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.values.map((row, t) => {
            const round = view.rounds.find((r) => r.round === t + 1 && r.resolved);
            const isCurrent = view.status === "active" && view.current_round === t + 1;
            return (
              <tr key={t} className={isCurrent ? "outline outline-[3px] outline-comic-yellow" : ""}>
                <td className="py-1 text-left font-display text-lg">{t + 1}</td>
                {row.map((value, f) => {
                  const holder = round?.holders?.[f];
                  const placed = round?.my_play?.front === f || round?.opponent_play?.front === f;
                  return (
                    <td
                      key={f}
                      className={`border border-line py-1 font-display text-lg ${
                        holder === "me" ? "bg-comic-cyan text-black" : holder === "opponent" ? "bg-comic-orange text-black" : ""
                      } ${placed ? "underline" : ""}`}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs font-semibold text-muted">
        In azzurro i fronti che hai tenuto, in arancione quelli dell&apos;avversario; sottolineato dove è entrata una carta in
        quel turno.
      </p>
    </div>
  );
}

function BossTutorial({ onClose }: { onClose: () => void }) {
  return (
    <>
      <button type="button" aria-label="Chiudi" onClick={onClose} className="fixed inset-0 z-40 bg-black/70" />
      <div
        role="dialog"
        aria-label="Come si gioca la Grande Minaccia"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col gap-2 overflow-y-auto bg-comic-yellow px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 text-black"
      >
        <h2 className="font-display text-3xl uppercase">Grande Minaccia</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm font-semibold leading-5">
          <li>
            Il Boss ha 5 fronti, tutti visibili. La tabella dice quanti punti vale ogni fronte in ogni turno: ogni turno due
            fronti sono caldi e valgono di più (2, poi 3, 4…), mai gli stessi del turno prima; gli altri valgono 1.
          </li>
          <li>Ogni turno metti in segreto un personaggio su uno dei tuoi fronti liberi. L&apos;avversario fa lo stesso sui suoi.</li>
          <li>Il personaggio resta lì fino alla fine, con il punteggio che ha fatto entrando, e quel fronte non è più libero per te.</li>
          <li>
            A ogni turno ogni fronte occupato paga il suo valore: a chi è da solo, o a chi ha il punteggio più alto se ci
            siete tutti e due. Chi entra presto incassa più turni.
          </li>
          <li>Dopo 5 turni vince chi ha più punti.</li>
        </ul>
        <button type="button" onClick={onClose} className="btn mt-1 bg-black font-display text-lg uppercase text-comic-yellow">
          Ho capito
        </button>
      </div>
    </>
  );
}

function BossResult({ view, rival }: { view: BossView; rival: string }) {
  const title =
    view.end_reason === "forfeit" && view.result === "loss"
      ? "Hai abbandonato"
      : { win: "Vittoria!", loss: "Sconfitta", draw: "Pareggio" }[view.result ?? "draw"];
  const xp = matchXp(view);
  const eventPoints = useEventPointsFor(view.id);
  const chip = "relative -skew-x-8 px-3 py-1 text-sm font-extrabold";

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
      <section
        className={`cut-bottom relative -mx-3 flex flex-[1_0_auto] flex-col items-center justify-center gap-2 overflow-hidden px-4 pb-8 pt-5 text-center ${
          view.result === "win" ? "rays-gold" : view.result === "loss" ? "halftone bg-comic-magenta" : "bg-panel-raised"
        }`}
      >
        <p className="relative text-sm font-extrabold uppercase">{view.boss.name}</p>
        <p
          className={`animate-rare-title text-sfx relative text-7xl uppercase ${view.result === "win" ? "text-comic-magenta" : "text-foreground"}`}
        >
          {title}
        </p>
        <p className={`${chip} bg-black text-comic-yellow`}>
          Punti {view.points.me} – {view.points.opponent} · fronti {view.fronts_taken.me} – {view.fronts_taken.opponent}
        </p>
        <div className="relative flex flex-wrap justify-center gap-2">
          {xp > 0 && <p className={`${chip} bg-black text-foreground`}>+{xp} XP</p>}
          {eventPoints && (
            <p className={`${chip} bg-comic-yellow text-black`}>
              {describeEventPoints(eventPoints)}
            </p>
          )}
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
        <h2 className="section-title text-base leading-5">Turno per turno</h2>
        <ol className="flex flex-col gap-1">
          {view.rounds
            .filter((r) => r.resolved && r.my_play && r.opponent_play)
            .map((r) => {
              const mine = view.my_team.find((card) => card.instance_id === r.my_play?.instance_id);
              return (
                <li key={r.round} className="flex items-center gap-2 bg-panel px-2 py-1 text-xs font-semibold">
                  <span className="w-5 font-display text-lg text-comic-yellow">{r.round}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {mine?.name ?? "—"} su {view.fronts[r.my_play!.front].name} ({r.my_play!.score})
                  </span>
                  <span className={`font-display text-lg ${r.my_play!.points > 0 ? "text-comic-cyan" : "text-faint"}`}>
                    +{r.my_play!.points}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right text-muted">
                    {r.opponent_play!.name} su {view.fronts[r.opponent_play!.front].name} ({r.opponent_play!.score})
                  </span>
                  <span className={`font-display text-lg ${r.opponent_play!.points > 0 ? "text-comic-orange" : "text-faint"}`}>
                    +{r.opponent_play!.points}
                  </span>
                </li>
              );
            })}
        </ol>
        <p className="text-xs font-semibold text-muted">
          A sinistra tu, a destra {rival}: chi è entrato dove, con quale punteggio, e i punti di ogni turno da tutti i fronti.
        </p>
      </section>

      <div className="flex shrink-0 gap-2">
        <Link
          href={view.mode === "bot" ? `/squadra/?format=boss&difficulty=${view.bot_difficulty ?? "easy"}` : "/gioca"}
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
