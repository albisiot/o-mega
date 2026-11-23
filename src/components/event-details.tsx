"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CardZoom } from "@/components/card-zoom";
import { Silhouette } from "@/components/card-view";
import Link from "next/link";
import { BackLink, TabBar } from "@/components/comic-parts";
import { useOpenEventRewards } from "@/components/event-banner";
import { EventLeaderboardList, useEventLeaderboard, type EventLeaderboardState } from "@/components/event-leaderboard";
import { balance } from "@/config/balance";
import { thumbArtUrl } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import type { AbilityInfo } from "@/lib/catalog";
import { completionLine, completionPlace, isEventCompleted, lockedLine, type EventLeaderboard } from "@/lib/event-leaderboard";
import {
  EVENT_KINDS,
  coopEventPoints,
  describeTierReward,
  raidEventPoints,
  eventPhase,
  formatEventCountdown,
  formatRomeDateTime,
  tierProgress,
  unseenOpenings,
  type EventRewardCard,
  type GameEvent,
} from "@/lib/events";
import type { Challenge } from "@/lib/challenges";
import { useRememberedState } from "@/lib/place-memory";
import { rarityFrame } from "@/lib/rarity-theme";
import { describeAdmitted } from "@/lib/traits";
import { useLockedScreen } from "@/lib/use-locked-screen";

const TABS = [
  { key: "rewards", label: "Premi" },
  { key: "points", label: "Punti" },
  { key: "leaderboard", label: "Classifica" },
] as const;
type Tab = (typeof TABS)[number]["key"];

/** The screen of a page that fits the phone, with its one-row header. Also for "no event". */
export function EventShell({ title, children }: { title: string; children: ReactNode }) {
  // The page fits the screen and never scrolls (see .game-shell).
  useLockedScreen(true);
  return (
    <div className="game-shell">
      <header className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pt-2">
        <BackLink href="/" />
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
export function EventDetails({
  event,
  now,
  abilities,
  fixedLeaderboard,
  challenges = [],
}: {
  event: GameEvent;
  now: number;
  abilities: AbilityInfo[] | null;
  /** The Sfide a tema of the event (SPEC §8.8): their own points, played from Gioca. */
  challenges?: Challenge[];
  /** A leaderboard given as it is, not asked to the server (the test page /prova-evento). */
  fixedLeaderboard?: EventLeaderboardState;
}) {
  const phase = eventPhase(event, now);
  const progress = tierProgress(event.my_points, event.tiers);
  const { open, opening } = useOpenEventRewards();
  const toOpen = unseenOpenings(event).length > 0;
  // Back from the rewards opened here, the same tab.
  const [tab, setTab] = useRememberedState<Tab>("tab", "rewards");
  const [zoomed, setZoomed] = useState<EventRewardCard | null>(null);
  const completed = isEventCompleted(event);
  const coop = coopEventPoints(event.points);
  const raid = raidEventPoints(event.points);
  // Before the start: the final leaderboard of the event before, if the player unlocked it.
  // Otherwise this event's, asked for once completed (the place) or when its tab opens.
  const asked = useEventLeaderboard(
    phase === "upcoming" ? null : event.id,
    !fixedLeaderboard && (tab === "leaderboard" || (completed && phase !== "upcoming")),
  );
  const leaderboard = fixedLeaderboard ?? asked;
  const lastTier = event.tiers.at(-1)?.points ?? null;

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
        {(event.admitted ?? []).length > 0 && (
          <p className="mt-1 border-l-4 border-comic-cyan bg-panel px-2.5 py-1 text-[13px] font-bold leading-4">
            Solo personaggi {describeAdmitted(event.admitted ?? [])}: fai punti solo se tutta la squadra lo è.
          </p>
        )}
        {event.quadrant_seal_target ? (
          <p className="mt-1 border-l-4 border-comic-magenta bg-panel px-2.5 py-1 text-[13px] font-bold leading-4">
            Quadrante: traguardo {event.quadrant_seal_target} Sigilli. A fine giro, se qualcuno ce li ha sulla griglia, vince chi ne ha
            di più, anche prima dell&apos;ultima carta.
          </p>
        ) : null}
        {event.variant_chance_percent ? (
          <p className="mt-1 border-l-4 border-comic-yellow bg-panel px-2.5 py-1 text-[13px] font-bold leading-4">
            Caccia alle varianti: nei pacchetti (del giorno, del Negozio, dei premi) una carta con varianti esce con un disegno
            variante al {event.variant_chance_percent}%
            {event.base_variant_chance_percent !== undefined && ` invece del ${event.base_variant_chance_percent}%`}.
          </p>
        ) : null}
        {event.variant_bonus_percent ? (
          <p className="mt-1 border-l-4 border-comic-cyan bg-panel px-2.5 py-1 text-[13px] font-bold leading-4">
            Varianti in squadra: ogni variante che schieri vale +{event.variant_bonus_percent}% di punti evento.
          </p>
        ) : null}
        {challenges.map((challenge) => (
          <Link
            key={challenge.id}
            href="/gioca"
            className="mt-1 flex items-center gap-2 border-l-4 bg-panel px-2.5 py-1 text-[13px] font-bold leading-4"
            style={{ borderColor: challenge.color }}
          >
            <span className="min-w-0 flex-1 truncate">
              ★ Sfida a tema: {challenge.title}
              {challenge.event_points && ` · ${challenge.event_points.win} punti a vittoria`}
            </span>
            <span className="shrink-0 font-display text-base uppercase" style={{ color: challenge.color }}>
              Gioca →
            </span>
          </Link>
        ))}
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
          {event.daily_cap !== null && !completed && (
            <p className="text-xs font-medium leading-4 text-muted">
              Oggi {event.my_points_today} su {event.daily_cap} punti al massimo: si riparte a mezzanotte.
            </p>
          )}
        </section>
      )}

      {/* After the last reward is opened (back from its reveal too): the place, and the way to the list. */}
      {completed && phase !== "upcoming" && !toOpen && leaderboard.status !== "loading" && (
        <CompletedBanner
          eventId={event.id}
          board={leaderboard.status === "ready" ? leaderboard.board : null}
          showLink={tab !== "leaderboard"}
          onOpen={() => setTab("leaderboard")}
        />
      )}

      <TabBar tabs={[...TABS]} current={tab} onPick={setTab} label="Evento" />

      <div role="tabpanel" data-keep-scroll="evento" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
        {tab === "leaderboard" ? (
          <LeaderboardTab state={leaderboard} upcoming={phase === "upcoming"} lockedText={lockedLine(lastTier)} />
        ) : tab === "rewards" ? (
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
                {challenges.flatMap((challenge) =>
                  challenge.event_points
                    ? [
                        <tr key={challenge.id} className="border-t border-white/10 font-semibold">
                          <td className="py-1.5" style={{ color: challenge.color }}>
                            ★ {challenge.title}
                          </td>
                          <td className="py-1.5 text-right">{challenge.event_points.win}</td>
                          <td className="py-1.5 text-right">{challenge.event_points.draw}</td>
                          <td className="py-1.5 text-right">{challenge.event_points.loss}</td>
                        </tr>,
                      ]
                    : [],
                )}
                <tr className="border-t border-white/10 font-semibold">
                  <td className="py-1.5">Emergenza</td>
                  <td colSpan={3} className="py-1.5 text-right">
                    {event.points.emergency.passed} per Minaccia superata
                  </td>
                </tr>
                {(coop.win > 0 || coop.loss > 0) && (
                  <tr className="border-t border-white/10 font-semibold">
                    <td className="py-1.5">Operazioni</td>
                    <td className="py-1.5 text-right">{coop.win}</td>
                    <td className="py-1.5 text-right text-muted">–</td>
                    <td className="py-1.5 text-right">{coop.loss}</td>
                  </tr>
                )}
                {coop.passed > 0 && (
                  <tr className="border-t border-white/10 font-semibold">
                    <td className="py-1.5">Operazioni</td>
                    <td colSpan={3} className="py-1.5 text-right">
                      {coop.passed} per Minaccia fermata
                    </td>
                  </tr>
                )}
                {(raid.win > 0 || raid.loss > 0) && (
                  <tr className="border-t border-white/10 font-semibold">
                    <td className="py-1.5">Caccia grossa</td>
                    <td className="py-1.5 text-right">{raid.win}</td>
                    <td className="py-1.5 text-right text-muted">–</td>
                    <td className="py-1.5 text-right">{raid.loss}</td>
                  </tr>
                )}
                {raid.passed > 0 && (
                  <tr className="border-t border-white/10 font-semibold">
                    <td className="py-1.5">Caccia grossa</td>
                    <td colSpan={3} className="py-1.5 text-right">
                      {raid.passed} per round senza perdere Difese
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="shrink-0 text-xs font-medium leading-4 text-muted">
              Contano le partite iniziate e finite durante l&apos;evento. Le partite abbandonate non danno punti a nessuno
              dei due.{coop.win + coop.loss + coop.passed > 0 && " Nelle Operazioni contano quelle finite restando nella stanza; una Minaccia è tua se l'hai fermata con la carta principale scelta da te."}
              {raid.win + raid.loss + raid.passed > 0 &&
                " Nella Caccia grossa contano le cacce finite restando nella stanza, se almeno metà delle tue carte l'hai scelta tu."}
              {(event.admitted ?? []).length > 0 &&
                ` Danno punti solo le squadre di personaggi ${describeAdmitted(event.admitted ?? [])}${
                  event.admitted_characters ? ` (${event.admitted_characters} in tutto)` : ""
                }: in Emergenza tutti e 8, nelle Operazioni tutti e 6.`} Contro lo stesso giocatore danno punti al massimo {balance.events.sameOpponentMatches} partite ogni{" "}
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

/**
 * "Evento completato! Sei 12° su 87": stamped in the first time the player sees it (also back
 * from the reveal of the last reward), then still there, quietly, on every visit.
 */
function CompletedBanner({
  eventId,
  board,
  showLink,
  onOpen,
}: {
  eventId: string;
  board: EventLeaderboard | null;
  showLink: boolean;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const place = completionPlace(board);

  // Read after the render, so the page is the same on the server and in the browser; before
  // the paint, so the stamp does not flash in its final place first.
  useLayoutEffect(() => {
    const key = `o-mega:event-completed:${eventId}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      return; // No storage (private window): no stamp, the banner stays.
    }
    ref.current?.classList.add("comic-stamp");
  }, [eventId]);

  return (
    <section
      ref={ref}
      aria-label={completionLine(board)}
      className="flex shrink-0 items-center justify-between gap-2 border-[3px] border-black bg-comic-magenta px-3 py-1.5 text-black shadow-[3px_3px_0_#000]"
    >
      <p className="min-w-0">
        <span className="block font-display text-[22px] uppercase leading-6">Evento completato!</span>
        {place && <span className="block text-[15px] font-extrabold leading-5">{place}</span>}
      </p>
      {showLink && (
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 -skew-x-8 bg-black px-2.5 py-1 font-display text-base uppercase text-comic-magenta"
        >
          Classifica
        </button>
      )}
    </section>
  );
}

/** The leaderboard tab: the list, or why it is still closed. */
function LeaderboardTab({ state, upcoming, lockedText }: { state: EventLeaderboardState; upcoming: boolean; lockedText: string }) {
  if (state.status === "loading") return <p className="text-sm font-semibold text-muted">Caricamento della classifica…</p>;
  if (state.status === "error") return <p className="text-sm font-semibold text-comic-magenta">{state.message}</p>;
  if (state.status === "locked" || (upcoming && !state.board)) {
    return (
      <div className="flex flex-col gap-1.5 bg-panel px-3 py-2.5">
        <p className="font-display text-xl uppercase leading-6 text-comic-yellow">Classifica generale</p>
        <p className="text-sm font-semibold leading-5">
          {upcoming ? "La classifica generale si sblocca quando completi l'evento, anche dopo la fine." : lockedText}
        </p>
        <p className="text-xs font-medium leading-4 text-muted">
          Ci sono tutti quelli che hanno giocato l&apos;evento, con i loro punti, e chi l&apos;ha già completato.
        </p>
      </div>
    );
  }
  if (!state.board) return <p className="text-sm font-medium text-muted">Ancora nessun giocatore in classifica.</p>;
  return (
    <>
      {upcoming && (
        <p className="shrink-0 text-[13px] font-bold leading-4">
          Classifica finale dell&apos;evento precedente: <span className="text-comic-yellow">{state.board.title}</span>
        </p>
      )}
      <EventLeaderboardList board={state.board} />
    </>
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
