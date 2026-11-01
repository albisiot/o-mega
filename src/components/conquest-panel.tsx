"use client";

import { useEffect, useRef, useState } from "react";
import { CardView } from "@/components/card-view";
import { ComicBurst } from "@/components/comic-parts";
import { balance } from "@/config/balance";
import type { AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import { claimConquestCard, type ConquestState, type MatchView } from "@/lib/match";

type ConquestPanelProps = {
  matchId: string;
  conquest: ConquestState;
  opponentName: string;
  serverNow: number;
  onUpdate: (next: MatchView) => void;
  abilities: AbilityInfo[];
};

/** End of a Conquest match: the winner's pick, what the loser lost, or the bonus. */
export function ConquestPanel({ matchId, conquest, opponentName, serverNow, onUpdate, abilities }: ConquestPanelProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the moment of the conquest: reopening a finished match shows the card quietly.
  const [wasPending] = useState(!conquest.resolved);
  const celebrate = wasPending && conquest.resolved && conquest.role === "winner" && Boolean(conquest.chosen);
  const conquered = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The list of cards just disappeared: the new card may be off screen.
    if (celebrate) conquered.current?.scrollIntoView({ block: "center" });
  }, [celebrate]);

  // When the time is up, ask the server to assign a card at random.
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

  async function pick() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      onUpdate(await claimConquestCard(matchId, selected));
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

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

  if (conquest.role === "loser" || !conquest.offered) {
    return (
      <section className="flex flex-col items-center gap-2 bg-comic-magenta p-4 text-center text-black">
        <p className="font-display text-xl uppercase">{opponentName} sta scegliendo una delle tue carte…</p>
        <p className="font-display text-4xl">{seconds}</p>
      </section>
    );
  }

  const options = conquest.offered;
  const eligible = options.filter((card) => card.eligible);
  const chosen = eligible.find((card) => card.instance_id === selected);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-3xl uppercase">Scegli la tua conquista</p>
          <p className="mt-1 text-sm font-medium text-muted">
            Allo scadere il server ne assegna una a caso. Quelle spente sono starter o troppo rare per la tua squadra.
          </p>
        </div>
        <p
          role="timer"
          className={`flex h-14 w-14 shrink-0 rotate-3 items-center justify-center font-display text-3xl text-black ${
            seconds <= 10 ? "bg-comic-magenta" : "bg-comic-yellow"
          }`}
        >
          {seconds}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {options.map((card) => {
          const isSelected = card.instance_id === selected;
          return (
            <li key={card.instance_id}>
              <button
                type="button"
                disabled={!card.eligible || busy}
                onClick={() => setSelected(card.instance_id)}
                aria-pressed={isSelected}
                className={`w-full rounded-xl text-left disabled:opacity-35 ${
                  isSelected ? "-rotate-1 shadow-[0_0_0_3px_var(--comic-yellow),5px_5px_0_3px_var(--comic-magenta)]" : ""
                }`}
              >
                <CardView card={card} size="sm" />
              </button>
            </li>
          );
        })}
      </ul>
      {chosen && (
        <div className="flex justify-center">
          <CardView card={chosen} abilities={abilities} />
        </div>
      )}
      {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
      <button type="button" onClick={pick} disabled={!chosen || busy} className="btn btn-primary">
        {busy ? "Conquista…" : chosen ? `Prendi ${chosen.name}` : "Scegli una carta"}
      </button>
    </section>
  );
}
