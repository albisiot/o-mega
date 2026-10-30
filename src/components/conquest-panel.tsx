"use client";

import { useEffect, useState } from "react";
import { CardView } from "@/components/card-view";
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
        <section className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-center">
          <p className="font-semibold">Nessuna carta conquistabile</p>
          <p className="mt-1 text-sm text-zinc-300">
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
        <p className={`text-lg font-black ${won ? "text-emerald-300" : "text-red-300"}`}>
          {won ? "Carta conquistata!" : "Carta persa"}
        </p>
        <CardView card={conquest.chosen} abilities={abilities} glow={won} />
        <p className="text-xs text-zinc-400">
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
      <section className="flex flex-col items-center gap-2 rounded-2xl border border-red-400/40 bg-red-400/10 p-4 text-center">
        <p className="font-semibold">{opponentName} sta scegliendo una delle tue carte…</p>
        <p className="text-2xl font-black tabular-nums">{seconds}</p>
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
          <p className="text-lg font-black">Scegli la tua conquista</p>
          <p className="text-xs text-zinc-400">
            Allo scadere il server ne assegna una a caso. Quelle spente sono starter o troppo rare per la tua squadra.
          </p>
        </div>
        <p className={`text-2xl font-black tabular-nums ${seconds <= 10 ? "text-red-300" : ""}`}>{seconds}</p>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {options.map((card) => {
          const isSelected = card.instance_id === selected;
          return (
            <li key={card.instance_id}>
              <button
                type="button"
                disabled={!card.eligible || busy}
                onClick={() => setSelected(card.instance_id)}
                aria-pressed={isSelected}
                className={`w-full rounded-2xl text-left disabled:opacity-35 ${isSelected ? "ring-2 ring-amber-400" : ""}`}
              >
                <CardView card={card} size="sm" />
              </button>
            </li>
          );
        })}
      </ul>
      {chosen && <CardView card={chosen} abilities={abilities} />}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={pick}
        disabled={!chosen || busy}
        className="rounded-full bg-amber-400 px-5 py-3 font-bold text-zinc-950 disabled:bg-white/10 disabled:text-zinc-500"
      >
        {busy ? "Conquista…" : chosen ? `Prendi ${chosen.name}` : "Scegli una carta"}
      </button>
    </section>
  );
}
