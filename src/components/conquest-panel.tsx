"use client";

import { useEffect, useRef, useState } from "react";
import { CardView } from "@/components/card-view";
import { ComicBurst } from "@/components/comic-parts";
import { balance } from "@/config/balance";
import { FACTION_LABELS, type AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import { claimConquestCard, type ConquestState, type MatchView } from "@/lib/match";

type ConquestProps = {
  matchId: string;
  conquest: ConquestState;
  opponentName: string;
  serverNow: number;
  onUpdate: (next: MatchView) => void;
  abilities: AbilityInfo[];
};

/** When the time is up, asks the server to assign a card at random. Returns the deadline. */
function useConquestDeadline(
  matchId: string,
  conquest: ConquestState,
  serverNow: number,
  onUpdate: (next: MatchView) => void,
): number {
  const deadline = Date.parse(conquest.deadline_at);
  const resolved = conquest.resolved;
  useEffect(() => {
    if (resolved) return;
    const delay = deadline + (balance.match.timeoutGraceSeconds + 0.5) * 1000 - serverNow;
    const timer = setTimeout(() => {
      claimConquestCard(matchId, null)
        .then(onUpdate)
        .catch((cause: unknown) => console.error("Settling the pick failed", cause));
    }, Math.max(0, delay));
    return () => clearTimeout(timer);
    // serverNow ticks constantly: the deadline alone decides when to run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, deadline, matchId, onUpdate]);
  return deadline;
}

/**
 * End of a Conquest match: what the winner took, what the loser lost, the bonus, or the loser's wait.
 * `live` says the pick was still open on this screen: only that moment celebrates the conquered card.
 */
export function ConquestPanel({ matchId, conquest, opponentName, serverNow, onUpdate, abilities, live }: ConquestProps & { live: boolean }) {
  const celebrate = live && conquest.resolved && conquest.role === "winner" && Boolean(conquest.chosen);
  const conquered = useRef<HTMLDivElement>(null);
  const deadline = useConquestDeadline(matchId, conquest, serverNow, onUpdate);

  useEffect(() => {
    // The page opens at the top: the new card may be off screen.
    if (celebrate) conquered.current?.scrollIntoView({ block: "center" });
  }, [celebrate]);

  if (conquest.resolved) {
    if (conquest.bonus_coins > 0) {
      return (
        <section className="bg-panel p-4 text-center">
          <p className="font-display text-xl uppercase text-comic-yellow">Nessuna carta conquistabile</p>
          <p className="mt-1 text-sm font-medium text-muted">
            {conquest.role === "winner"
              ? `Le carte di ${opponentName} erano protette o troppo rare per la tua squadra: +${conquest.bonus_coins} monete.`
              : "Nessuna delle tue carte poteva essere conquistata."}
          </p>
        </section>
      );
    }
    if (!conquest.chosen) return null;
    const won = conquest.role === "winner";
    return (
      <section className="flex flex-col items-center gap-3 text-center">
        <p className={`font-display text-3xl uppercase ${won ? "text-comic-cyan" : "text-comic-magenta"}`}>
          {won ? "Carta conquistata!" : "Carta persa"}
        </p>
        <div ref={conquered} className={`relative ${celebrate ? "animate-card-slam" : ""}`}>
          <CardView card={conquest.chosen} abilities={abilities} glow={won} />
          {celebrate && (
            <ComicBurst
              fill="#ffd60a"
              className="animate-bam absolute left-1/2 top-1/2 z-20 h-48 w-48 -translate-x-1/2 -translate-y-1/2 -rotate-[8deg]"
              textClassName="text-[64px] tracking-wide"
            >
              BAM!
            </ComicBurst>
          )}
        </div>
        <p className="text-sm font-medium text-muted">
          {conquest.auto_assigned ? "Tempo scaduto: l'ha assegnata il server. " : ""}
          {won
            ? `Non potrai schierarla in Conquista per ${balance.conquest.conqueredCardLockHours} ore.`
            : `L'ha presa ${opponentName}.`}
        </p>
      </section>
    );
  }

  const seconds = Math.max(0, Math.ceil((deadline - serverNow) / 1000));
  return (
    <section className="flex flex-col items-center gap-2 bg-comic-magenta p-4 text-center text-black">
      <p className="font-display text-xl uppercase">{opponentName} sta scegliendo una delle tue carte…</p>
      <p className="font-display text-4xl">{seconds}</p>
    </section>
  );
}

const MAGNIFIER = (
  <svg viewBox="0 0 13 13" className="h-full w-full" fill="none" stroke="currentColor" aria-hidden>
    <circle cx="5.5" cy="5.5" r="4" strokeWidth={2} />
    <path d="m8.5 8.5 3.5 3.5" strokeWidth={2.2} />
  </svg>
);

/**
 * The winner's pick, a screen of its own that fits the phone: the loser's cards in a grid,
 * a tap enlarges one over it, and the timer and the button stay put.
 */
export function ConquestPick({
  matchId,
  conquest,
  opponentName,
  serverNow,
  onUpdate,
  abilities,
  roundsWon,
}: ConquestProps & { roundsWon: MatchView["rounds_won"] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deadline = useConquestDeadline(matchId, conquest, serverNow, onUpdate);
  const seconds = Math.max(0, Math.ceil((deadline - serverNow) / 1000));

  const options = conquest.offered ?? [];
  const chosen = options.find((card) => card.eligible && card.instance_id === selected);

  async function pick() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      onUpdate(await claimConquestCard(matchId, chosen.instance_id));
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="flex items-center gap-2.5 px-3 pb-1 pt-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold text-muted">
            Conquista · {opponentName} ·{" "}
            <span className="text-comic-yellow">
              Vittoria {roundsWon.me}–{roundsWon.opponent}
            </span>
          </p>
          <h1 className="font-display text-[25px] uppercase leading-[29px]">Scegli la tua conquista</h1>
        </div>
        <p
          role="timer"
          aria-label={`${seconds} secondi`}
          className={`flex h-[52px] w-[52px] shrink-0 rotate-3 items-center justify-center font-display text-[29px] text-black ${
            seconds <= 10 ? "bg-comic-magenta" : "bg-comic-yellow"
          }`}
        >
          {seconds}
        </p>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col px-3">
        <p className="text-xs font-semibold leading-4 text-muted">
          Tocca una carta per vederla grande. Allo scadere il server ne assegna una a caso. Quelle spente sono starter o
          troppo rare per la tua squadra.
        </p>
        <ul className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-x-2 gap-y-2.5 py-2.5">
          {options.map((card) => {
            const isSelected = card.instance_id === selected;
            return (
              <li key={card.instance_id} className="min-h-0">
                <button
                  type="button"
                  disabled={!card.eligible || busy}
                  onClick={() => {
                    setSelected(card.instance_id);
                    setZoomed(true);
                  }}
                  aria-pressed={isSelected}
                  aria-label={card.eligible ? card.name : `${card.name}, non conquistabile`}
                  className={`relative h-full w-full rounded-xl text-left disabled:opacity-35 ${
                    isSelected ? "-rotate-1 shadow-[0_0_0_3px_var(--comic-yellow),5px_5px_0_3px_var(--comic-magenta)]" : ""
                  }`}
                >
                  <CardView card={card} size="sm" fill />
                  {card.eligible && (
                    <span className="absolute bottom-2 right-2 z-[3] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/70 p-[5px] text-foreground">
                      {MAGNIFIER}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {options.length % 3 !== 0 && (
            <li
              aria-hidden
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line p-2 text-center text-[11.5px] font-bold leading-[14px] text-faint"
            >
              <span className="h-[22px] w-[22px]">{MAGNIFIER}</span>
              Tocca per ingrandire, poi conferma qui sotto
            </li>
          )}
        </ul>

        {zoomed && chosen && (
          <div className="absolute inset-0 z-10 overflow-y-auto bg-background/90 px-3 pb-3 pt-4">
            <button type="button" aria-label="Torna alle carte" onClick={() => setZoomed(false)} className="absolute inset-0 cursor-default" />
            <div className="relative mx-auto w-fit">
              <CardView card={chosen} abilities={abilities} />
              <button
                type="button"
                onClick={() => setZoomed(false)}
                aria-label="Chiudi la carta"
                className="absolute -right-2.5 -top-3.5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-black shadow-[3px_3px_0_#000]"
              >
                <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth={2.6} aria-hidden>
                  <path d="M1 1l12 12M13 1 1 13" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* The chosen card and the button never move, with or without the enlarged card. */}
      <div className="border-t-[3px] border-foreground bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        {error ? (
          <p className="mb-1.5 text-sm font-semibold leading-6 text-comic-magenta">{error}</p>
        ) : (
          <p className="mb-1.5 truncate text-xs font-bold leading-6 text-muted">
            {chosen ? (
              <>
                <span className="font-display text-lg uppercase text-foreground">{chosen.name}</span> · {chosen.rarity.name} ·{" "}
                {FACTION_LABELS[chosen.faction] ?? chosen.faction}
                {chosen.power && ` · ${chosen.power.name}`}
              </>
            ) : (
              `Scegli una delle carte di ${opponentName}`
            )}
          </p>
        )}
        <button type="button" onClick={pick} disabled={!chosen || busy} className="btn btn-primary w-full">
          {busy ? "Conquista…" : chosen ? `Prendi ${chosen.name}` : "Scegli una carta"}
        </button>
      </div>
    </>
  );
}
