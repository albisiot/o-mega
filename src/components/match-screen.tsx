"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { carriedBonusAfter, scorePlay, type AbilityFamilies, type Character } from "@o-mega/game-engine";
import { PlayerAvatar } from "@/components/player-avatar";
import { balance } from "@/config/balance";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import {
  claimVictory,
  DIFFICULTY_LABELS,
  fetchMatchState,
  forfeitMatch,
  playRound,
  resolvePvpRound,
  sendHeartbeat,
  submitChoice,
  subscribeToUpdates,
  type MatchCard,
  type MatchRound,
  type MatchView,
} from "@/lib/match";
import { useNow } from "@/lib/use-now";

type TeamCard = MatchView["my_team"][number];

const WINNER_STYLES = {
  me: "border-emerald-400 bg-emerald-400/20 text-emerald-200",
  opponent: "border-red-400 bg-red-400/20 text-red-200",
  none: "border-zinc-500 bg-zinc-500/20 text-zinc-300",
} as const;

function toCharacter(card: MatchCard, id: string): Character {
  return {
    id,
    definitionId: card.definition_id,
    stats: card.stats,
    power: card.power ? { code: card.power.code, params: card.power.params } : null,
  };
}

function lastResolvedRound(view: MatchView): number {
  return Math.max(0, ...view.rounds.filter((r) => r.resolved).map((r) => r.round));
}

/** A match (against a bot or a player) from the first threat to the final result. */
export function MatchScreen({ initial }: { initial: MatchView }) {
  const [view, setView] = useState(initial);
  // Server time minus device time: countdowns follow the server clock.
  const [offset, setOffset] = useState(() => Date.parse(initial.server_now) - Date.now());
  const [revealing, setRevealing] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>([]);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const now = useNow(250);

  useEffect(() => {
    fetchAbilities()
      .then(setAbilities)
      .catch((cause: unknown) => console.error("Abilities failed", cause));
  }, []);

  // Every newly resolved round is revealed, however we learned about it
  // (our own play, the opponent's broadcast, a refresh).
  const revealedUpTo = useRef(lastResolvedRound(initial));
  const apply = useCallback((next: MatchView) => {
    setView(next);
    setOffset(Date.parse(next.server_now) - Date.now());
    const newest = lastResolvedRound(next);
    if (newest > revealedUpTo.current) {
      revealedUpTo.current = newest;
      setRevealing(newest);
      setSelected(null);
    }
  }, []);

  const isBot = view.mode === "bot";
  const isActive = view.status === "active";
  const current = isActive ? view.rounds.find((r) => r.round === view.current_round && !r.resolved) : undefined;
  const deadline = current ? Date.parse(current.deadline_at) : null;

  const submit = useCallback(
    async (round: number, choice: string | null) => {
      setBusy(true);
      setError(null);
      try {
        if (view.mode === "bot") apply(await playRound(view.id, round, choice));
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
    [apply, view.id, view.mode],
  );

  // Against a player: follow the server's broadcasts (with a slow poll in case
  // one is missed) and tell the server we are still here.
  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      apply(await fetchMatchState(view.id));
    } catch {
      // The next broadcast or poll will try again.
    } finally {
      refreshing.current = false;
    }
  }, [apply, view.id]);

  useEffect(() => {
    if (isBot || !isActive) return;
    const unsubscribe = subscribeToUpdates(`match:${view.id}`, () => {
      refresh();
    });
    const poll = setInterval(refresh, 5000);
    const beat = () => sendHeartbeat(view.id).catch(() => {});
    beat();
    const heartbeat = setInterval(beat, 10_000);
    return () => {
      unsubscribe();
      clearInterval(poll);
      clearInterval(heartbeat);
    };
  }, [isBot, isActive, view.id, refresh]);

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

  // A round result stays on screen for the reveal pause, then the next threat.
  useEffect(() => {
    if (revealing === null || view.status !== "active") return;
    const timer = setTimeout(() => setRevealing(null), balance.match.revealPauseSeconds * 1000);
    return () => clearTimeout(timer);
  }, [revealing, view.status]);

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
  const absentMs =
    !isBot && isActive && view.opponent?.last_seen_at ? now + offset - Date.parse(view.opponent.last_seen_at) : 0;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {view.opponent && <PlayerAvatar username={view.opponent.username} avatarUrl={view.opponent.avatar_url} />}
          <div className="min-w-0">
            <p className="truncate text-xs text-zinc-400">
              {isBot ? `Bot ${DIFFICULTY_LABELS[view.bot_difficulty ?? "easy"]}` : `Amichevole · ${opponentName}`}
            </p>
            <p className="truncate text-lg font-black tabular-nums">
              Tu {view.rounds_won.me} – {view.rounds_won.opponent} {isBot ? "Bot" : opponentName}
            </p>
          </div>
        </div>
        {view.status === "active" ? (
          <button
            type="button"
            onClick={() => setConfirmForfeit(true)}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300"
          >
            Abbandona
          </button>
        ) : (
          <Link href="/" className="text-sm text-zinc-300">
            Home
          </Link>
        )}
      </header>

      <LevelTrack view={view} />

      {confirmForfeit && (
        <div className="mx-5 mt-3 flex flex-col gap-2 rounded-2xl border border-red-400/40 bg-red-400/10 p-3">
          <p className="text-sm">Abbandonare conta come sconfitta, senza monete.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={forfeit}
              disabled={busy}
              className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white"
            >
              Abbandona
            </button>
            <button type="button" onClick={() => setConfirmForfeit(false)} className="rounded-full border border-white/15 px-4 py-2 text-sm">
              Continua a giocare
            </button>
          </div>
        </div>
      )}
      {error && <p className="mx-5 mt-3 text-sm text-red-400">{error}</p>}
      {absentMs > 20_000 && (
        <div className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3">
          <p className="text-sm">{opponentName} non risponde. Allo scadere del tempo il server sceglie al posto suo.</p>
          {absentMs > balance.match.reconnectGraceSeconds * 1000 && (
            <button
              type="button"
              onClick={claim}
              disabled={busy}
              className="shrink-0 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-zinc-950"
            >
              Rivendica la vittoria
            </button>
          )}
        </div>
      )}

      {shownRound ? (
        <RoundReveal
          round={shownRound}
          team={view.my_team}
          opponentName={opponentName}
          onContinue={() => setRevealing(null)}
          finished={view.status === "finished"}
        />
      ) : view.status === "finished" ? (
        <MatchResult view={view} />
      ) : current ? (
        <ChoosePhase
          view={view}
          round={current}
          families={families}
          abilities={abilities}
          remainingMs={deadline === null ? 0 : deadline - (now + offset)}
          selected={selected ?? current.my_pending_instance_id}
          onSelect={setSelected}
          busy={busy}
          onPlay={(choice) => submit(current.round, choice)}
        />
      ) : null}
    </div>
  );
}

function LevelTrack({ view }: { view: MatchView }) {
  return (
    <ol className="flex gap-1.5 px-5" aria-label="Livelli delle Minacce">
      {view.threat_levels.map((level, i) => {
        const round = view.rounds.find((r) => r.round === i + 1);
        const isCurrent = view.status === "active" && view.current_round === i + 1;
        const style = round?.winner ? WINNER_STYLES[round.winner] : "border-white/10 bg-white/5 text-zinc-400";
        return (
          <li
            key={i}
            className={`flex h-10 flex-1 flex-col items-center justify-center rounded-lg border text-sm font-bold ${style} ${
              isCurrent ? "ring-2 ring-amber-400" : ""
            }`}
          >
            <span>{level}</span>
            <span className="text-[9px] font-normal opacity-70">liv.</span>
          </li>
        );
      })}
    </ol>
  );
}

function ChoosePhase({
  view,
  round,
  families,
  abilities,
  remainingMs,
  selected,
  onSelect,
  busy,
  onPlay,
}: {
  view: MatchView;
  round: MatchRound;
  families: AbilityFamilies;
  abilities: AbilityInfo[];
  remainingMs: number;
  selected: string | null;
  onSelect: (id: string) => void;
  busy: boolean;
  onPlay: (choice: string) => void;
}) {
  const isBot = view.mode === "bot";
  const opponentName = view.opponent?.username ?? "Il bot";
  const pending = round.my_pending_instance_id;
  const timer = balance.match.roundTimerSeconds;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const threat = { id: "current", level: round.level, abilities: round.threat.abilities };

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
      }),
    }))
    .sort((a, b) => b.score.total - a.score.total);
  const chosen = available.find((card) => card.instance_id === selected);
  const opponentPlayed = view.rounds.filter((r) => r.opponent_play).map((r) => ({ round: r.round, card: r.opponent_play! }));
  const abilityName = (code: string) => abilities.find((a) => a.code === code);

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pb-28 pt-4">
      <section className="rounded-2xl border border-amber-400/40 bg-linear-to-br from-amber-500/15 to-transparent p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-300">
          Round {round.round} · Livello {round.level}
        </p>
        <p className="mt-1 text-xl font-black">{round.threat.name}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {round.threat.abilities.map((code) => {
            const ability = abilityName(code);
            return (
              <span
                key={code}
                className="rounded-full border px-2 py-0.5 text-xs font-semibold"
                style={{ borderColor: ability?.family.color ?? "#71717a", color: ability?.family.color ?? "#d4d4d8" }}
              >
                {ability?.name ?? code}
              </span>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${seconds <= 10 ? "bg-red-400" : "bg-amber-400"}`}
              style={{ width: `${Math.min(100, (remainingMs / 1000 / timer) * 100)}%` }}
            />
          </div>
          <span className={`w-8 text-right text-sm font-bold tabular-nums ${seconds <= 10 ? "text-red-300" : ""}`}>
            {Math.min(seconds, timer)}
          </span>
        </div>
        {carried > 0 && <p className="mt-2 text-xs text-emerald-300">Riscossa: +{carried} al personaggio di questo round.</p>}
        {!isBot && (
          <p className={`mt-2 text-xs ${round.opponent_has_chosen ? "text-emerald-300" : "text-zinc-400"}`}>
            {round.opponent_has_chosen ? `${opponentName} ha scelto.` : `${opponentName} sta scegliendo…`}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">Scegli chi mandare</h2>
        {previews.map(({ card, score }) => {
          const isSelected = card.instance_id === selected;
          return (
            <button
              key={card.instance_id}
              type="button"
              onClick={() => onSelect(card.instance_id)}
              disabled={busy}
              className={`flex items-center justify-between gap-3 rounded-2xl border-2 bg-zinc-900 px-3 py-2.5 text-left ${
                isSelected ? "ring-2 ring-amber-400" : ""
              }`}
              style={{ borderColor: `${card.rarity.color}99` }}
              aria-pressed={isSelected}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{card.name}</p>
                <p className="text-xs text-zinc-400">
                  {round.threat.abilities.map((code) => `${code} ${card.stats[code] ?? 0}`).join(" · ")}
                </p>
                {card.power && (
                  <p className="truncate text-[11px]" style={{ color: card.rarity.color }}>
                    {card.power.name}: {card.power.text}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xl font-black tabular-nums">{score.total}</p>
                {score.bonus > 0 && <p className="text-[11px] text-emerald-300">+{score.bonus} bonus</p>}
              </div>
            </button>
          );
        })}
        <p className="text-[11px] text-zinc-500">Il punteggio è un&apos;anteprima: lo calcola il server quando giochi.</p>
      </section>

      {opponentPlayed.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500">{opponentName} ha già giocato</h2>
          <div className="flex flex-wrap gap-1.5">
            {opponentPlayed.map(({ round: r, card }) => (
              <span key={r} className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: `${card.rarity.color}99` }}>
                {card.name} <span className="text-zinc-500">· round {r}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-zinc-950/95 px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
        <button
          type="button"
          onClick={() => chosen && onPlay(chosen.instance_id)}
          disabled={!chosen || busy || chosen.instance_id === pending}
          className="w-full rounded-full bg-amber-400 px-5 py-3 font-bold text-zinc-950 disabled:bg-white/10 disabled:text-zinc-500"
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

function RoundReveal({
  round,
  team,
  opponentName,
  onContinue,
  finished,
}: {
  round: MatchRound;
  team: TeamCard[];
  opponentName: string;
  onContinue: () => void;
  finished: boolean;
}) {
  const mine = team.find((card) => card.instance_id === round.my_play?.instance_id);
  const theirs = round.opponent_play;
  const banner = { me: "Round vinto!", opponent: "Round perso", none: "Round nullo" }[round.winner ?? "none"];

  return (
    <main className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-5 px-5 py-6" onClick={onContinue}>
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
        Round {round.round} · {round.threat.name}
      </p>
      <p
        className={`animate-rare-title text-3xl font-black ${
          round.winner === "me" ? "text-emerald-300" : round.winner === "opponent" ? "text-red-300" : "text-zinc-300"
        }`}
      >
        {banner}
      </p>
      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        <PlayCard label="Tu" card={mine ?? null} play={round.my_play} abilities={round.threat.abilities} winner={round.winner === "me"} />
        <PlayCard label={opponentName} card={theirs} play={theirs} abilities={round.threat.abilities} winner={round.winner === "opponent"} />
      </div>
      {round.my_play?.auto_played && <p className="text-xs text-amber-300">Tempo scaduto: il server ha scelto per te.</p>}
      {theirs?.auto_played && <p className="text-xs text-zinc-400">{opponentName} non ha scelto in tempo.</p>}
      {round.winner === "none" && <p className="text-xs text-zinc-400">Stesso punteggio e stesso valore più alto.</p>}
      <button type="button" className="rounded-full border border-white/15 px-5 py-2 text-sm">
        {finished ? "Vedi il risultato" : "Continua"}
      </button>
    </main>
  );
}

function PlayCard({
  label,
  card,
  play,
  abilities,
  winner,
}: {
  label: string;
  card: MatchCard | null;
  play: { base: number; bonus: number; score: number } | null;
  abilities: string[];
  winner: boolean;
}) {
  return (
    <div
      className={`animate-card-reveal flex flex-col gap-1.5 rounded-2xl border-2 bg-zinc-900 p-3 ${winner ? "animate-rare-glow" : ""}`}
      style={{ borderColor: card ? `${card.rarity.color}99` : "#3f3f46", ["--glow-color" as string]: "#34d39988" }}
    >
      <p className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="truncate font-bold">{card?.name ?? "?"}</p>
      {card && (
        <p className="text-[11px] text-zinc-400">{abilities.map((code) => `${code} ${card.stats[code] ?? 0}`).join(" · ")}</p>
      )}
      {play && (
        <p className="text-sm">
          <span className="text-2xl font-black tabular-nums">{play.score}</span>
          {play.bonus > 0 && (
            <span className="text-xs text-emerald-300">
              {" "}
              ({play.base} +{play.bonus})
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function MatchResult({ view }: { view: MatchView }) {
  const title =
    view.end_reason === "forfeit"
      ? "Hai abbandonato"
      : { win: "Vittoria!", loss: "Sconfitta", draw: "Pareggio" }[view.result ?? "draw"];
  const coins = view.reward_coins ?? 0;
  const nameOf = (instanceId: string | null | undefined) => view.my_team.find((c) => c.instance_id === instanceId)?.name ?? "—";

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 py-6">
      <section className="flex flex-col items-center gap-2 text-center">
        <p
          className={`animate-rare-title text-4xl font-black ${
            view.result === "win" ? "text-emerald-300" : view.result === "loss" ? "text-red-300" : "text-zinc-200"
          }`}
        >
          {title}
        </p>
        <p className="text-sm text-zinc-400">
          Round {view.rounds_won.me} – {view.rounds_won.opponent} · punti {view.total_score.me} – {view.total_score.opponent}
        </p>
        <p className="rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-sm font-semibold text-amber-200">
          {coins > 0
            ? `+${coins} monete`
            : view.end_reason === "forfeit"
              ? "Nessuna moneta"
              : "Tetto giornaliero delle monete contro i bot raggiunto"}
        </p>
      </section>

      <ol className="flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/5">
        {view.rounds
          .filter((r) => r.resolved)
          .map((r) => (
            <li key={r.round} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="text-zinc-500">{r.round}. </span>
                {nameOf(r.my_play?.instance_id)} <span className="text-zinc-500">vs</span> {r.opponent_play?.name ?? "—"}
              </span>
              <span
                className={`shrink-0 font-bold tabular-nums ${
                  r.winner === "me" ? "text-emerald-300" : r.winner === "opponent" ? "text-red-300" : "text-zinc-400"
                }`}
              >
                {r.my_play?.score} – {r.opponent_play?.score}
              </span>
            </li>
          ))}
      </ol>

      <div className="flex flex-col gap-2">
        <Link
          href={view.mode === "bot" ? `/squadra/?difficulty=${view.bot_difficulty ?? "easy"}` : "/gioca"}
          className="rounded-full bg-amber-400 px-5 py-3 text-center font-bold text-zinc-950"
        >
          {view.mode === "bot" ? "Rivincita" : "Gioca ancora"}
        </Link>
        <Link href="/" className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-semibold">
          Torna alla home
        </Link>
      </div>
    </main>
  );
}
