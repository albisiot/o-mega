"use client";

import { useState, type ReactNode } from "react";
import { CardZoom } from "@/components/card-zoom";
import { Silhouette } from "@/components/card-view";
import { BackLink, TabBar } from "@/components/comic-parts";
import { useOpenEventRewards } from "@/components/event-banner";
import { balance } from "@/config/balance";
import { thumbArtUrl } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
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
import { rarityFrame } from "@/lib/rarity-theme";
import { useLockedScreen } from "@/lib/use-locked-screen";

const TABS = [
  { key: "rewards", label: "Premi" },
  { key: "points", label: "Come si fanno punti" },
] as const;
type Tab = (typeof TABS)[number]["key"];

/** The screen of a page that fits the phone, with its one-row header. Also for "no event". */
export function EventShell({ title, children }: { title: string; children: ReactNode }) {
  // The page fits the screen and never scrolls (see .game-shell).
  useLockedScreen(true);
  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/" label="Torna alla home" />
        <h1 className="min-w-0 truncate font-display text-[32px] uppercase leading-10 text-comic-yellow">{title}</h1>
      </header>
      {/* What a very short window cannot fit scrolls inside, rather than being cut. */}
      <main className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        {children}
      </main>
    </div>
  );
}

/**
 * An event as the player sees it. The countdown, the progress and a reward to open stay on
 * top; the targets and the point table share the room left, one tab at a time.
 */
export function EventDetails({ event, now, abilities }: { event: GameEvent; now: number; abilities: AbilityInfo[] | null }) {
  const phase = eventPhase(event, now);
  const progress = tierProgress(event.my_points, event.tiers);
  const { open, opening } = useOpenEventRewards();
  const toOpen = unseenOpenings(event).length > 0;
  const [tab, setTab] = useState<Tab>("rewards");
  const [zoomed, setZoomed] = useState<EventRewardCard | null>(null);

  return (
    <EventShell title={event.title}>
      <section className="shrink-0">
        <p className="font-display text-xl uppercase leading-6 text-comic-yellow">
          {phase === "upcoming"
            ? `Inizia tra ${formatEventCountdown(Date.parse(event.starts_at) - now)}`
            : phase === "running"
              ? `Finisce tra ${formatEventCountdown(Date.parse(event.ends_at) - now)}`
              : "Evento concluso"}
        </p>
        <p className="text-xs font-medium leading-4 text-muted">
          Dal {formatRomeDateTime(event.starts_at)} al {formatRomeDateTime(event.ends_at)}, ora italiana
        </p>
      </section>

      {toOpen && (
        <button type="button" onClick={() => open(event)} disabled={opening} className="btn btn-primary shrink-0">
          {opening ? "Apertura…" : "Apri il premio ottenuto"}
        </button>
      )}

      {phase !== "upcoming" && (
        <section className="flex shrink-0 flex-col gap-1.5 bg-panel px-3.5 py-2">
          <p className="flex items-baseline justify-between gap-2">
            <span className="font-display text-[34px] leading-none text-comic-yellow">{event.my_points}</span>
            <span className="text-right text-[13px] font-bold leading-4">
              {progress.next ? `punti · prossimo traguardo ${progress.next.points}` : "punti · tutti i traguardi raggiunti"}
            </span>
          </p>
          <div className="h-2.5 bg-black" aria-hidden>
            <div className="h-full bg-comic-yellow" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
          </div>
          {event.daily_cap !== null && (
            <p className="text-xs font-medium leading-4 text-muted">
              Oggi {event.my_points_today} su {event.daily_cap} punti al massimo: si riparte a mezzanotte.
            </p>
          )}
        </section>
      )}

      <TabBar tabs={[...TABS]} current={tab} onPick={setTab} label="Evento" />

      <div role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
        {tab === "rewards" ? (
          <>
            <ol className="flex flex-col gap-1">
              {event.tiers.map((tier) => (
                <li
                  key={tier.tier}
                  className={`flex min-h-14 items-center gap-3 px-3 py-1 ${tier.reached ? "bg-comic-yellow text-black" : "bg-panel"}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl uppercase leading-6">
                      {tier.points} punti
                      {tier.reached && <span className="ml-2 font-sans text-[11px] font-extrabold">Ottenuto</span>}
                    </p>
                    <p className="text-[13px] font-bold leading-4">{describeTierReward(tier)}</p>
                  </div>
                  {tier.cards.length > 0 && (
                    <ul className="flex shrink-0 gap-1">
                      {tier.cards.slice(0, 3).map((card, index) => (
                        <li key={`${card.code}-${index}`}>
                          <RewardThumb card={card} onOpen={() => setZoomed(card)} />
                        </li>
                      ))}
                      {tier.cards.length > 3 && (
                        <li className="flex items-center text-xs font-extrabold">+{tier.cards.length - 3}</li>
                      )}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
            <p className="shrink-0 text-xs font-medium leading-4 text-muted">
              Il premio arriva da solo al traguardo. Tocca una carta per vederla intera.
            </p>
          </>
        ) : (
          <>
            {event.description && <p className="shrink-0 text-sm font-semibold leading-5">{event.description}</p>}
            <table className="w-full shrink-0 text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase text-muted">
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
            <p className="shrink-0 text-xs font-medium leading-4 text-muted">
              Contano le partite iniziate e finite durante l&apos;evento. Le partite abbandonate non danno punti a nessuno
              dei due. Contro lo stesso giocatore danno punti al massimo {balance.events.sameOpponentMatches} partite ogni{" "}
              {balance.events.sameOpponentWindowHours} ore.
            </p>
          </>
        )}
      </div>

      {zoomed && (
        <CardZoom
          card={zoomed}
          abilities={abilities}
          onClose={() => setZoomed(null)}
          backLabel="Torna all'evento"
          className="fixed inset-0 z-30 flex flex-col px-3 pb-4 pt-[calc(var(--safe-top)+16px)] text-foreground"
        />
      )}
    </EventShell>
  );
}

/** A reward card as a small framed drawing: a tap shows it whole. */
function RewardThumb({ card, onOpen }: { card: EventRewardCard; onOpen: () => void }) {
  const label = `${card.name}${card.variant ? ` · ${card.variant.name}` : ""}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Guarda ${label} per intero`}
      className="block h-[46px] w-[34px] rounded p-[2px]"
      style={{ background: rarityFrame(card.rarity) }}
    >
      <span className="relative block h-full w-full overflow-hidden rounded-[3px] bg-panel-raised">
        {card.art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={withBasePath(thumbArtUrl(card.art_url))}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        ) : (
          <Silhouette
            faction={card.faction}
            accent={card.rarity.color}
            className="absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2"
          />
        )}
      </span>
    </button>
  );
}
