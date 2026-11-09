"use client";

import { useState } from "react";
import { CardZoom } from "@/components/card-zoom";
import { CardView } from "@/components/card-view";
import { PageHeader } from "@/components/comic-parts";
import { useOpenEventRewards } from "@/components/event-banner";
import { balance } from "@/config/balance";
import type { AbilityInfo } from "@/lib/catalog";
import {
  EVENT_KINDS,
  describeTierReward,
  eventPhase,
  formatEventCountdown,
  formatRomeDateTime,
  tierProgress,
  unseenOpenings,
  type EventRewardCard,
  type GameEvent,
} from "@/lib/events";

/** An event as the player sees it: dates, progress, targets with their cards, and how points come. */
export function EventDetails({ event, now, abilities }: { event: GameEvent; now: number; abilities: AbilityInfo[] | null }) {
  const phase = eventPhase(event, now);
  const progress = tierProgress(event.my_points, event.tiers);
  const { open, opening } = useOpenEventRewards();
  const toOpen = unseenOpenings(event).length > 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <PageHeader backHref="/" backLabel="Home" title={event.title} />
      <main className="flex flex-col gap-5 px-4 pb-6">
        <section className="flex flex-col gap-1">
          {event.description && <p className="text-sm font-semibold">{event.description}</p>}
          <p className="text-xs font-medium text-muted">
            Dal {formatRomeDateTime(event.starts_at)} al {formatRomeDateTime(event.ends_at)} (ora italiana)
          </p>
          <p className="font-display text-xl uppercase text-comic-yellow">
            {phase === "upcoming"
              ? `Inizia tra ${formatEventCountdown(Date.parse(event.starts_at) - now)}`
              : phase === "running"
                ? `Finisce tra ${formatEventCountdown(Date.parse(event.ends_at) - now)}`
                : "Evento concluso"}
          </p>
        </section>

        {toOpen && (
          <button type="button" onClick={() => open(event)} disabled={opening} className="btn btn-primary">
            {opening ? "Apertura…" : "Apri il premio ottenuto"}
          </button>
        )}

        {phase !== "upcoming" && (
          <section className="flex flex-col gap-2 bg-panel px-4 py-3">
            <p className="flex items-baseline justify-between gap-2">
              <span className="font-display text-4xl leading-none text-comic-yellow">{event.my_points}</span>
              <span className="text-sm font-bold">
                {progress.next ? `punti · prossimo traguardo ${progress.next.points}` : "punti · tutti i traguardi raggiunti"}
              </span>
            </p>
            <div className="h-3 bg-black" aria-hidden>
              <div className="h-full bg-comic-yellow" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
            </div>
            {event.daily_cap !== null && (
              <p className="text-xs font-medium text-muted">
                Oggi {event.my_points_today} su {event.daily_cap} punti al massimo: il conto riparte a mezzanotte.
              </p>
            )}
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="section-title">Traguardi</h2>
          <ol className="flex flex-col gap-2">
            {event.tiers.map((tier) => (
              <li key={tier.tier} className={`flex flex-col gap-2 px-4 py-3 ${tier.reached ? "bg-comic-yellow text-black" : "bg-panel"}`}>
                <p className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-xl uppercase">{tier.points} punti</span>
                  <span className="text-xs font-extrabold uppercase">{tier.reached ? "Ottenuto" : ""}</span>
                </p>
                <p className="text-sm font-bold">{describeTierReward(tier)}</p>
                {tier.cards.length > 0 && <RewardCards cards={tier.cards} abilities={abilities} />}
              </li>
            ))}
          </ol>
          <p className="text-xs font-medium text-muted">I premi arrivano da soli appena raggiungi il traguardo.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="section-title">Come si fanno punti</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase text-muted">
                <th className="py-1 font-bold">Partita</th>
                <th className="py-1 text-right font-bold">Vittoria</th>
                <th className="py-1 text-right font-bold">Pareggio</th>
                <th className="py-1 text-right font-bold">Sconfitta</th>
              </tr>
            </thead>
            <tbody>
              {EVENT_KINDS.filter((kind) => kind.key !== "emergency").map((kind) => {
                const points = event.points[kind.key as Exclude<typeof kind.key, "emergency">];
                return (
                  <tr key={kind.key} className="border-t border-white/10 font-semibold">
                    <td className="py-1.5">{kind.label}</td>
                    <td className="py-1.5 text-right">{points.win}</td>
                    <td className="py-1.5 text-right">{points.draw}</td>
                    <td className="py-1.5 text-right">{points.loss}</td>
                  </tr>
                );
              })}
              <tr className="border-t border-white/10 font-semibold">
                <td className="py-1.5">Emergenza</td>
                <td colSpan={3} className="py-1.5 text-right">
                  {event.points.emergency.passed} per Minaccia superata
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs font-medium text-muted">
            Contano le partite iniziate e finite durante l&apos;evento. Le partite abbandonate non danno punti a nessuno
            dei due. Contro lo stesso giocatore danno punti al massimo {balance.events.sameOpponentMatches} partite ogni{" "}
            {balance.events.sameOpponentWindowHours} ore.
          </p>
        </section>
      </main>
    </div>
  );
}

function RewardCards({ cards, abilities }: { cards: EventRewardCard[]; abilities: AbilityInfo[] | null }) {
  const [zoomed, setZoomed] = useState<EventRewardCard | null>(null);
  return (
    <>
      <ul className="grid grid-cols-3 gap-2">
        {cards.map((card, index) => (
          <li key={`${card.code}-${index}`}>
            <button type="button" onClick={() => setZoomed(card)} aria-label={`Guarda ${card.name} per intero`} className="block w-full text-left">
              <CardView card={card} size="sm" thumbSizes="30vw" />
            </button>
          </li>
        ))}
      </ul>
      {zoomed && (
        <CardZoom
          card={zoomed}
          abilities={abilities}
          onClose={() => setZoomed(null)}
          backLabel="Torna all'evento"
          className="fixed inset-0 z-30 flex flex-col px-3 pb-4 pt-[calc(var(--safe-top)+16px)] text-foreground"
        />
      )}
    </>
  );
}
