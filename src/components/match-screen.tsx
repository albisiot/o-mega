"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { carriedBonusAfter, scorePlay, type AbilityFamilies, type Character } from "@o-mega/game-engine";
import { Silhouette } from "@/components/card-view";
import { ComicBurst } from "@/components/comic-parts";
import { ConquestPanel } from "@/components/conquest-panel";
import { PlayerAvatar } from "@/components/player-avatar";
import { ThreatDiorama } from "@/components/threat-diorama";
import { balance } from "@/config/balance";
import { withBasePath } from "@/lib/base-path";
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
import { matchXp } from "@/lib/progression";
import { rarityFrame, rarityLetter } from "@/lib/rarity-theme";
import { useNow } from "@/lib/use-now";

type TeamCard = MatchView["my_team"][number];

const WINNER_STYLES = {
  me: "bg-comic-cyan text-black",
  opponent: "bg-panel-raised text-muted",
  none: "bg-panel-raised text-faint",
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
  const conquestOpen = Boolean(view.conquest && !view.conquest.resolved);
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
    if (isBot || !(isActive || conquestOpen)) return;
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
      <header className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {view.opponent && <PlayerAvatar username={view.opponent.username} avatarUrl={view.opponent.avatar_url} />}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-muted">
              {isBot
                ? `Bot ${DIFFICULTY_LABELS[view.bot_difficulty ?? "easy"]}`
                : `${view.mode === "conquest" ? "Conquista" : "Amichevole"} · ${opponentName}`}
            </p>
            <p className="flex items-baseline gap-1.5 text-sm font-bold">
              Tu
              <span className="shrink-0 font-display text-2xl text-comic-yellow">
                {view.rounds_won.me} – {view.rounds_won.opponent}
              </span>
              <span className="truncate">{isBot ? "Bot" : opponentName}</span>
            </p>
          </div>
        </div>
        {view.status === "active" ? (
          <button type="button" onClick={() => setConfirmForfeit(true)} className="btn btn-ghost shrink-0 px-3">
            Abbandona
          </button>
        ) : (
          <Link href="/" className="flex min-h-11 items-center text-sm font-bold">
            Home
          </Link>
        )}
      </header>

      <LevelTrack view={view} />

      {confirmForfeit && (
        <div className="mx-3 mt-3 flex flex-col gap-2 bg-comic-magenta p-3 text-black">
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
      )}
      {error && <p className="mx-3 mt-3 text-sm font-semibold text-comic-magenta">{error}</p>}
      {absentMs > 20_000 && (
        <div className="mx-3 mt-3 flex items-center justify-between gap-3 bg-comic-yellow p-3 text-black">
          <p className="text-sm font-semibold">
            {opponentName} non risponde. Allo scadere del tempo il server sceglie al posto suo.
          </p>
          {absentMs > balance.match.reconnectGraceSeconds * 1000 && (
            <button
              type="button"
              onClick={claim}
              disabled={busy}
              className="btn shrink-0 bg-black px-3 text-sm font-bold text-comic-yellow"
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
        <MatchResult view={view} serverNow={now + offset} onUpdate={apply} abilities={abilities} />
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
    <ol className="flex gap-1.5 px-3" aria-label="Livelli delle Minacce">
      {view.threat_levels.map((level, i) => {
        const round = view.rounds.find((r) => r.round === i + 1);
        const isCurrent = view.status === "active" && view.current_round === i + 1;
        const style = isCurrent
          ? "bg-comic-yellow text-black"
          : round?.winner
            ? WINNER_STYLES[round.winner]
            : "border-2 border-line text-foreground";
        return (
          <li
            key={i}
            aria-label={`Livello ${level}`}
            className={`flex h-10 flex-1 -skew-x-8 items-center justify-center font-display text-[22px] ${style}`}
          >
            {level}
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
    <main className="flex flex-1 flex-col gap-3 px-3 pb-28 pt-3">
      <section className="cut-bottom relative overflow-hidden bg-comic-magenta px-4 pb-6 pt-3 text-black">
        <div aria-hidden className="halftone absolute inset-0 [mask-image:linear-gradient(135deg,transparent_45%,#000_100%)]" />
        <div className="relative">
          <ThreatDiorama key={round.round} name={round.threat.name} level={round.level} />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-extrabold">
                Round {round.round} · Livello {round.level}
              </p>
              <p className="mt-0.5 font-display text-[34px] uppercase leading-10">{round.threat.name}</p>
            </div>
            <p
              role="timer"
              aria-label={`${Math.min(seconds, timer)} secondi rimasti`}
              className={`flex h-14 w-14 shrink-0 rotate-3 items-center justify-center font-display text-3xl ${
                seconds <= 10 ? "bg-comic-yellow text-black" : "bg-black text-comic-yellow"
              }`}
            >
              {Math.min(seconds, timer)}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {round.threat.abilities.map((code) => {
              const ability = abilityName(code);
              return (
                <span
                  key={code}
                  className="bg-black px-2 py-1 text-[13px] font-extrabold"
                  style={{ color: ability?.family.color ?? "#d8d3c5" }}
                >
                  {ability?.name ?? code}
                </span>
              );
            })}
          </div>
          <div className="mt-2.5 h-2 bg-black" aria-hidden>
            <div
              className={`h-full transition-[width] duration-200 ${seconds <= 10 ? "bg-foreground" : "bg-comic-yellow"}`}
              style={{ width: `${Math.min(100, (remainingMs / 1000 / timer) * 100)}%` }}
            />
          </div>
          {carried > 0 && <p className="mt-2 text-sm font-bold">Riscossa: +{carried} al personaggio di questo round.</p>}
          {!isBot && (
            <p className="mt-2 text-sm font-bold">
              {round.opponent_has_chosen ? `${opponentName} ha scelto.` : `${opponentName} sta scegliendo…`}
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="section-title">Scegli chi mandare</h2>
        {previews.map(({ card, score }) => {
          const isSelected = card.instance_id === selected;
          return (
            <button
              key={card.instance_id}
              type="button"
              onClick={() => onSelect(card.instance_id)}
              disabled={busy}
              className={`flex items-center justify-between gap-3 border-[3px] bg-panel px-3 py-2 text-left ${
                isSelected ? "border-comic-yellow shadow-[4px_4px_0_var(--comic-magenta)]" : "border-panel-raised"
              }`}
              aria-pressed={isSelected}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5">
                  <span
                    className="flex h-[22px] w-[22px] shrink-0 items-center justify-center text-sm font-black text-black"
                    style={{ background: rarityFrame(card.rarity) }}
                  >
                    {rarityLetter(card.rarity)}
                  </span>
                  <span className="truncate font-display text-xl uppercase">{card.name}</span>
                </p>
                <p className="text-xs font-semibold text-muted">
                  {round.threat.abilities.map((code) => `${code} ${card.stats[code] ?? 0}`).join(" · ")}
                </p>
                {card.power && (
                  <p className="truncate text-xs font-semibold" style={{ color: card.rarity.color }}>
                    {card.power.name}: {card.power.text}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-display text-4xl ${isSelected ? "text-comic-yellow" : ""}`}>{score.total}</p>
                {score.bonus > 0 && <p className="text-xs font-bold text-comic-cyan">+{score.bonus} bonus</p>}
              </div>
            </button>
          );
        })}
        <p className="text-xs font-medium text-faint">Il punteggio è un&apos;anteprima: lo calcola il server quando giochi.</p>
      </section>

      {opponentPlayed.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="section-title">{opponentName} ha già giocato</h2>
          <div className="flex flex-wrap gap-1.5">
            {opponentPlayed.map(({ round: r, card }) => (
              <span key={r} className="border-2 bg-panel px-2.5 py-1 text-xs font-bold" style={{ borderColor: card.rarity.color }}>
                {card.name} <span className="font-medium text-muted">· round {r}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
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
    <main className="relative mt-3 flex flex-1 cursor-pointer flex-col" onClick={onContinue}>
      <section
        aria-label="La tua giocata"
        className="relative min-h-[290px] flex-1 overflow-hidden bg-comic-cyan px-4 pt-3 text-black [clip-path:polygon(0_0,100%_0,100%_calc(100%-52px),0_100%)]"
      >
        <p className="text-sm font-extrabold">
          Round {round.round} · {round.threat.name}
        </p>
        <p
          className={`animate-rare-title text-sfx mt-1 text-[56px] uppercase leading-[60px] ${
            round.winner === "me" ? "text-comic-yellow" : "text-foreground"
          }`}
        >
          {banner}
        </p>
        <PlaySide label="Tu" card={mine ?? null} play={round.my_play} abilities={round.threat.abilities} side="left" />
      </section>

      <section
        aria-label={`La giocata di ${opponentName}`}
        className="halftone relative -mt-[42px] flex min-h-[340px] flex-1 flex-col justify-end overflow-hidden bg-comic-magenta px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-16 text-black [clip-path:polygon(0_52px,100%_0,100%_100%,0_100%)]"
      >
        <PlaySide label={opponentName} card={theirs} play={theirs} abilities={round.threat.abilities} side="right" />
        <div className="relative mt-3 flex flex-col gap-2">
          {round.my_play?.auto_played && (
            <p className="bg-black px-3 py-1.5 text-center text-sm font-semibold text-foreground">
              Tempo scaduto: il server ha scelto per te.
            </p>
          )}
          {theirs?.auto_played && (
            <p className="bg-black px-3 py-1.5 text-center text-sm font-semibold text-foreground">
              {opponentName} non ha scelto in tempo.
            </p>
          )}
          {round.winner === "none" && (
            <p className="bg-black px-3 py-1.5 text-center text-sm font-semibold text-foreground">
              Stesso punteggio e stesso valore più alto.
            </p>
          )}
          <button
            type="button"
            className="btn min-h-14 bg-comic-yellow font-display text-[22px] uppercase tracking-wide text-black shadow-[4px_4px_0_#000]"
          >
            {finished ? "Vedi il risultato" : "Continua"}
          </button>
        </div>
      </section>

      <ComicBurst
        fill="#ffd60a"
        className="absolute left-1/2 top-[calc(50%-92px)] h-32 w-32 -translate-x-1/2 -rotate-[8deg]"
        textClassName="text-[34px] tracking-wide"
      >
        {round.winner === "none" ? "PARI!" : "SBAM!"}
      </ComicBurst>
    </main>
  );
}

/** The score climbs to its value when a round is revealed. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;
    const step = (time: number) => {
      const progress = reduced ? 1 : Math.min(1, (time - start) / 600);
      setShown(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="font-display text-[80px] leading-[88px]">{shown}</span>;
}

function PlaySide({
  label,
  card,
  play,
  abilities,
  side,
}: {
  label: string;
  card: MatchCard | null;
  play: { base: number; bonus: number; score: number } | null;
  abilities: string[];
  side: "left" | "right";
}) {
  const isLeft = side === "left";
  return (
    <div className={`relative flex ${isLeft ? "justify-start" : "justify-end text-right"}`}>
      {card?.art_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={withBasePath(card.art_url)}
          alt=""
          className={`absolute bottom-0 h-44 w-32 border-[3px] border-black object-cover object-top ${isLeft ? "right-0" : "left-0"}`}
        />
      ) : (
        card && (
          <Silhouette
            faction={card.faction}
            accent={card.rarity.color}
            className={`absolute bottom-0 h-44 ${isLeft ? "-right-3" : "-left-3"}`}
          />
        )
      )}
      <div className="relative max-w-[62%]">
        <p className="truncate text-sm font-extrabold">{label}</p>
        <p className="truncate font-display text-3xl uppercase">{card?.name ?? "?"}</p>
        {card && (
          <p className="text-[13px] font-bold">{abilities.map((code) => `${code} ${card.stats[code] ?? 0}`).join(" · ")}</p>
        )}
        {play && (
          <p>
            <CountUp value={play.score} />
            {play.bonus > 0 && (
              <span className="text-sm font-extrabold">
                {" "}
                ({play.base} +{play.bonus})
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function MatchResult({
  view,
  serverNow,
  onUpdate,
  abilities,
}: {
  view: MatchView;
  serverNow: number;
  onUpdate: (next: MatchView) => void;
  abilities: AbilityInfo[];
}) {
  const title =
    view.end_reason === "forfeit" && view.result === "loss"
      ? "Hai abbandonato"
      : { win: "Vittoria!", loss: "Sconfitta", draw: "Pareggio" }[view.result ?? "draw"];
  const coins = view.reward_coins ?? 0;
  const xp = matchXp(view);
  const nameOf = (instanceId: string | null | undefined) => view.my_team.find((c) => c.instance_id === instanceId)?.name ?? "—";

  return (
    <main className="flex flex-1 flex-col gap-5 px-3 pb-6 pt-3">
      <section
        className={`cut-bottom relative -mx-3 flex flex-col items-center gap-2 overflow-hidden px-4 pb-8 pt-5 text-center ${
          view.result === "win" ? "rays-gold" : view.result === "loss" ? "halftone bg-comic-magenta" : "bg-panel-raised"
        }`}
      >
        {view.result === "win" && (
          <span
            aria-hidden
            className="animate-rare-burst pointer-events-none absolute left-1/2 top-4 -ml-12 h-24 w-24 rounded-full bg-comic-magenta/40 [animation-iteration-count:2]"
          />
        )}
        <p
          className={`animate-rare-title text-sfx relative text-7xl uppercase ${
            view.result === "win" ? "text-comic-magenta" : "text-foreground"
          }`}
        >
          {title}
        </p>
        <p className="relative -skew-x-8 bg-black px-3 py-1 text-sm font-extrabold text-comic-yellow">
          Round {view.rounds_won.me} – {view.rounds_won.opponent} · punti {view.total_score.me} – {view.total_score.opponent}
        </p>
        {(xp > 0 || coins > 0) && (
          <div className="relative flex gap-2">
            {xp > 0 && <p className="-skew-x-8 bg-black px-3 py-1 text-sm font-extrabold text-foreground">+{xp} XP</p>}
            {coins > 0 && (
              <p className="-skew-x-8 bg-black px-3 py-1 text-sm font-extrabold text-comic-yellow">+{coins} monete</p>
            )}
          </div>
        )}
        {view.level_rewards.map((reward) => (
          <p key={reward.level} className="relative -skew-x-8 bg-comic-cyan px-3 py-1 text-sm font-extrabold text-black">
            Livello {reward.level}! +{reward.coins} monete
          </p>
        ))}
      </section>

      {view.conquest && (
        <ConquestPanel
          matchId={view.id}
          conquest={view.conquest}
          opponentName={view.opponent?.username ?? "L'avversario"}
          serverNow={serverNow}
          onUpdate={onUpdate}
          abilities={abilities}
        />
      )}

      <ol className="flex flex-col gap-0.5">
        {view.rounds
          .filter((r) => r.resolved)
          .map((r) => (
            <li key={r.round} className="flex items-center justify-between gap-2 bg-panel px-3 py-2 text-sm font-semibold">
              <span className="min-w-0">
                <span className="text-muted">{r.round}. </span>
                {nameOf(r.my_play?.instance_id)} <span className="text-muted">vs</span> {r.opponent_play?.name ?? "—"}
              </span>
              <span
                className={`shrink-0 font-display text-lg ${
                  r.winner === "me" ? "text-comic-cyan" : r.winner === "opponent" ? "text-comic-magenta" : "text-muted"
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
          className="btn btn-primary"
        >
          {view.mode === "bot" ? "Rivincita" : "Gioca ancora"}
        </Link>
        <Link href="/" className="btn btn-ghost">
          Torna alla home
        </Link>
      </div>
    </main>
  );
}
