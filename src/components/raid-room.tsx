"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AbilityFamilies } from "@o-mega/game-engine";
import { CardDetailProvider, useCardDetail } from "@/components/card-detail";
import { CardLooksProvider, useCardLooks } from "@/components/card-looks";
import { DragGhost } from "@/components/drag-ghost";
import { useEventPointsFor } from "@/components/event-banner";
import { HandCard } from "@/components/hand-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { RaidMapReveal } from "@/components/raid-comic";
import { ReturnLink } from "@/components/return-link";
import { Sheet } from "@/components/sheet";
import { StarIcon } from "@/components/story-stars";
import { balance } from "@/config/balance";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import { describeEventPoints } from "@/lib/events";
import { subscribeToUpdates } from "@/lib/match";
import {
  addRaidAlly,
  currentRaidRound,
  describeRaidMove,
  DISTRICT_NAMES,
  fetchRaidRoom,
  lastResolvedRaidRound,
  leaveRaidRoom,
  MAGNITUDE_NAMES,
  myRaidMember,
  placeRaidCard,
  raidCardScores,
  raidHandOf,
  raidMemberKey,
  raidPreview,
  removeRaidAlly,
  resolveRaidRound,
  MODIFIER_MOVES,
  RAID_MOVES,
  RAID_SIGNAL_LABELS,
  RAID_STARS,
  raidStarCondition,
  RAID_SIGNALS,
  sendRaidSignal,
  setRaidReady,
  startRaidRoom,
  type RaidCard,
  type RaidMember,
  type RaidMove,
  type RaidRound,
  type RaidStar,
  type RaidStarRules,
  type RaidView,
} from "@/lib/raid";
import { useCardDrag } from "@/lib/use-card-drag";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useExpiry, useNow, useSecondsLeft } from "@/lib/use-now";

/** While broadcasts cannot arrive the room is read at this pace; it is read anyway now and then, to stay present. */
const OFFLINE_POLL_MS = 4_000;
const PRESENCE_MS = 8_000;
/** A member not seen for this long is shown as not answering. */
const ABSENT_MS = 20_000;

const abilityName = (abilities: AbilityInfo[], code: string) => abilities.find((a) => a.code === code)?.name ?? code;

/** A hunt's room (SPEC §5.18): the wait for the team, the rounds, each result, the end. */
export function RaidRoom({ roomId }: { roomId: string }) {
  return (
    <CardLooksProvider>
      <CardDetailProvider>
        <RaidRoomContent roomId={roomId} />
      </CardDetailProvider>
    </CardLooksProvider>
  );
}

function RaidRoomContent({ roomId }: { roomId: string }) {
  const [view, setView] = useState<RaidView | null>(null);
  // Server time minus device time: countdowns follow the server clock.
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>(() => seenAbilities() ?? []);
  // The round whose result is on screen.
  const [revealing, setRevealing] = useState<number | null>(null);
  const revealedUpTo = useRef<number | null>(null);
  useLockedScreen(true);

  const apply = useCallback((next: RaidView) => {
    setView(next);
    setOffset(Date.parse(next.server_now) - Date.now());
    const newest = lastResolvedRaidRound(next);
    // The first answer only sets where the reveals start: a result already seen is not shown again.
    if (revealedUpTo.current === null) revealedUpTo.current = newest;
    else if (newest > revealedUpTo.current) {
      revealedUpTo.current = newest;
      setRevealing(newest);
    }
  }, []);

  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      apply(await fetchRaidRoom(roomId));
      setError(null);
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      refreshing.current = false;
    }
  }, [apply, roomId]);

  useEffect(() => {
    fetchAbilities()
      .then(setAbilities)
      .catch((cause: unknown) => console.error("Abilities failed", cause));
  }, []);

  // Broadcasts from the database ("something changed"), a poll while they cannot arrive, and a
  // read now and then that also tells the server the player is here.
  const status = view?.status;
  const live = status === undefined || status === "lobby" || status === "active";
  useEffect(() => {
    if (!live) return;
    let connected = false;
    const first = setTimeout(() => void refresh(), 0);
    const unsubscribe = subscribeToUpdates(
      `raid:${roomId}`,
      () => void refresh(),
      (now) => {
        if (now && !connected) void refresh();
        connected = now;
      },
    );
    const poll = setInterval(() => {
      if (!connected) void refresh();
    }, OFFLINE_POLL_MS);
    const presence = setInterval(() => void refresh(), PRESENCE_MS);
    return () => {
      clearTimeout(first);
      unsubscribe();
      clearInterval(poll);
      clearInterval(presence);
    };
  }, [live, refresh, roomId]);

  // Everyone ready: any member may ask for the round; the database takes the first.
  const resolving = useRef(false);
  const resolve = useCallback(async () => {
    if (resolving.current) return;
    resolving.current = true;
    try {
      await resolveRaidRound(roomId);
      await refresh();
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      resolving.current = false;
    }
  }, [refresh, roomId]);
  const allReady = view?.status === "active" && view.all_ready;
  const readyRound = allReady ? view.current_round : null;
  useEffect(() => {
    if (readyRound === null) return;
    const timer = setTimeout(() => void resolve(), 0);
    return () => clearTimeout(timer);
  }, [readyRound, resolve]);

  // The time is up: the server puts down the cards of who has not chosen, and the allies'.
  const current = view ? currentRaidRound(view) : undefined;
  const deadline = current?.deadline_at ? Date.parse(current.deadline_at) : null;
  useExpiry(current?.round, deadline, offset, resolve);

  if (!view) {
    return (
      <div className="game-shell items-center justify-center gap-3 px-6 text-center">
        {error ? (
          <>
            <p className="text-sm font-semibold text-comic-magenta">{error}</p>
            <ReturnLink href="/caccia" className="text-sm font-bold underline">
              Torna alla Caccia grossa
            </ReturnLink>
          </>
        ) : (
          <p className="text-sm font-bold text-muted">Apertura della stanza…</p>
        )}
      </div>
    );
  }

  return (
    <RaidRoomScreen
      view={view}
      abilities={abilities}
      offset={offset}
      error={error}
      revealing={revealing}
      onRevealDone={() => setRevealing(null)}
      onView={apply}
      onRefresh={refresh}
      onError={setError}
    />
  );
}

/**
 * The room as it is drawn from its state: the wait, a round, a round's result, the end.
 * Also used by the development page /prova-caccia with fixed states.
 */
export function RaidRoomScreen({
  view,
  abilities,
  offset,
  error,
  revealing,
  onRevealDone,
  onView,
  onRefresh,
  onError,
}: {
  view: RaidView;
  abilities: AbilityInfo[];
  offset: number;
  error: string | null;
  /** The round whose result is on screen, if any. */
  revealing: number | null;
  onRevealDone: () => void;
  onView: (view: RaidView) => void;
  onRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const current = currentRaidRound(view);
  const shownRound = revealing === null ? null : (view.rounds.find((r) => r.round === revealing && r.resolved) ?? null);
  // A round's result: first on the map with its comic page, then the recap.
  const [mapSeen, setMapSeen] = useState<number | null>(null);
  return (
    <div className="game-shell">
      {view.status === "lobby" ? (
        <Lobby view={view} error={error} onChange={onRefresh} onError={onError} />
      ) : view.status === "closed" ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display text-2xl uppercase text-comic-yellow">Stanza chiusa</p>
          <p className="text-sm font-semibold text-muted">Chi l&apos;aveva aperta è uscito, o è rimasta ferma troppo a lungo.</p>
          <ReturnLink href="/caccia" className="btn btn-primary">
            Torna alla Caccia grossa
          </ReturnLink>
        </main>
      ) : shownRound ? (
        mapSeen === shownRound.round ? (
          <RoundResult view={view} round={shownRound} abilities={abilities} offset={offset} onDone={onRevealDone} />
        ) : (
          <>
            <RevealTimer view={view} offset={offset} onOver={onRevealDone} />
            <RaidMapReveal key={shownRound.round} view={view} round={shownRound} onContinue={() => setMapSeen(shownRound.round)} />
          </>
        )
      ) : view.status === "active" && myRaidMember(view)?.left ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display text-2xl uppercase text-comic-yellow">Sei uscito</p>
          <p className="text-sm font-semibold text-muted">I compagni continuano: le tue carte le gioca il server, senza premi per te.</p>
          <ReturnLink href="/caccia" className="btn btn-primary">
            Torna alla Caccia grossa
          </ReturnLink>
        </main>
      ) : view.status === "active" && current ? (
        <Board key={current.round} view={view} round={current} abilities={abilities} offset={offset} error={error} onView={onView} onError={onError} />
      ) : view.status === "won" || view.status === "lost" ? (
        <End view={view} />
      ) : (
        <main className="flex flex-1 items-center justify-center text-sm font-bold text-muted">Un attimo…</main>
      )}
    </div>
  );
}

/** «Magnitudo 3 · Pericolo». */
export function magnitudeLabel(magnitude: number): string {
  return `Magnitudo ${magnitude} · ${MAGNITUDE_NAMES[magnitude] ?? ""}`;
}

/** A move's colours: magenta against the team, yellow a modifier, cyan a chance, black nothing. */
export function moveLook(move: RaidMove): string {
  if (RAID_MOVES[move].hostile) return "bg-comic-magenta text-black";
  if (MODIFIER_MOVES.includes(move)) return "bg-comic-yellow text-black";
  return move === "plain" ? "bg-black text-foreground" : "bg-comic-cyan text-black";
}

/**
 * The three stars of a Boss, one per line: what each asks and whether the player has it.
 * `met`: on the result, the stars this hunt met; `fresh`: those paid now for the first time.
 */
export function RaidStarList({
  rules,
  earned,
  met = null,
  fresh = false,
}: {
  rules: RaidStarRules;
  earned: readonly RaidStar[];
  met?: readonly RaidStar[] | null;
  fresh?: boolean;
}) {
  return (
    <ul className="flex shrink-0 flex-col gap-0.5" aria-label="Le stelle del Boss">
      {RAID_STARS.map((star) => {
        const metNow = Boolean(met?.includes(star));
        const have = earned.includes(star) || metNow;
        return (
          <li key={star} className={`flex items-center gap-1.5 text-xs font-bold ${have ? "" : "text-muted"}`}>
            <StarIcon filled={have} className="h-4 w-4" />
            <span className="min-w-0 flex-1">{raidStarCondition(star, rules)}</span>
            {metNow && fresh ? (
              <span className="shrink-0 bg-comic-yellow px-1 text-[10px] font-extrabold text-black">Presa</span>
            ) : !have ? (
              <span className="shrink-0 text-[10px] font-extrabold text-faint">{rules.star_coins} monete</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** The Boss's repertoire as chips; a tap on «?» explains them in the rules. */
export function MoveChips({ moves, className = "" }: { moves: readonly RaidMove[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-1 ${className}`} aria-label="Le mosse del Boss">
      {moves.map((move) => (
        <li
          key={move}
          title={RAID_MOVES[move].text}
          className={`-skew-x-8 px-1.5 text-[10px] font-extrabold uppercase leading-4 ${moveLook(move)}`}
        >
          {RAID_MOVES[move].name}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// The wait: the code, the Boss, the team, the squads
// ---------------------------------------------------------------------------

function Lobby({
  view,
  error,
  onChange,
  onError,
}: {
  view: RaidView;
  error: string | null;
  onChange: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const me = myRaidMember(view);
  const isHost = view.host === view.me;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const everyoneReady = view.members.every((m) => m.ready && m.squad);
  const enough = view.members.length >= balance.raid.minPlayers;
  const rulesRef = useRef<HTMLDialogElement>(null);

  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    onError(null);
    try {
      await action();
      await onChange();
    } catch (cause) {
      onError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const text = `Entra nella mia Caccia grossa di O-MEGA con il codice ${view.code}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(view.code);
        setCopied(true);
      }
    } catch {
      // Closed or refused: the code is on screen anyway.
    }
  }

  return (
    <>
      <header className="flex items-center gap-2.5 px-3 py-1">
        <ReturnLink href="/caccia" label="Esci dalla stanza" className="btn btn-ghost h-11 w-11 shrink-0 px-0">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.6} aria-hidden>
            <path d="M12 3 5 10l7 7M5 10h13" strokeLinejoin="round" />
          </svg>
        </ReturnLink>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[22px] uppercase leading-6 text-comic-yellow">{view.boss.name}</h1>
          <p className="truncate text-[11px] font-bold text-muted">
            {magnitudeLabel(view.magnitude)} · {DISTRICT_NAMES[view.boss.district] ?? view.boss.district}
          </p>
        </div>
        <button type="button" onClick={() => rulesRef.current?.showModal()} aria-label="Come si gioca" className="btn btn-ghost h-11 w-11 shrink-0 px-0 font-display text-xl">
          ?
        </button>
      </header>
      <Sheet sheetRef={rulesRef} title="Come si gioca">
        <RaidRules />
      </Sheet>

      <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
        <section className="cut-bottom relative flex shrink-0 items-center justify-between gap-3 overflow-hidden bg-comic-orange px-3 pb-3 pt-2 text-black">
          <div className="min-w-0">
            <p className="text-xs font-extrabold">Il codice della stanza</p>
            <p className="select-text font-display text-[34px] leading-9 tracking-[0.18em]">{view.code}</p>
            <p className="text-[11px] font-bold leading-4">
              Passalo a un amico: entra da Gioca → Insieme → Caccia grossa. Siete al massimo in {view.max_players}.
            </p>
          </div>
          <button type="button" onClick={() => void share()} className="btn shrink-0 bg-black px-3 font-display text-base uppercase text-comic-yellow">
            {copied ? "Copiato" : "Condividi"}
          </button>
        </section>

        <p className="line-clamp-3 text-xs font-semibold leading-4">{view.boss.flavor}</p>
        <RoundLevels view={view} />
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="shrink-0 text-[11px] font-extrabold text-muted">Mosse:</span>
          <MoveChips moves={view.boss.moves} />
        </div>
        {view.boss.weekly && (
          <p className="shrink-0 text-[11px] font-extrabold text-comic-orange">
            Boss della settimana: la prima vittoria della settimana paga +{view.boss.weekly_coins} monete.
          </p>
        )}
        <p className="shrink-0 text-[11px] font-bold text-muted">
          Vittoria: +{view.boss.win_xp} esperienza
          {view.boss.beaten ? " · l'hai già abbattuto" : ` · la prima volta +${view.boss.first_win_coins} monete`}
        </p>
        <RaidStarList rules={view.boss} earned={view.boss.stars ?? []} />

        <ul className="flex flex-col gap-1.5" aria-label="La squadra">
          {view.members.map((member) => (
            <li key={member.seat} className="flex items-center gap-2 border-2 border-panel-raised bg-panel px-2 py-1.5">
              <PlayerAvatar username={member.username} avatarUrl={member.avatar_url} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold">
                  {member.user_id === view.me ? "Tu" : member.username}
                  {member.user_id === view.host && <span className="ml-1.5 bg-black px-1 text-[10px] font-extrabold uppercase text-comic-yellow">Apre</span>}
                  {member.bot && <span className="ml-1.5 bg-comic-magenta px-1 text-[10px] font-extrabold uppercase text-black">Server</span>}
                </span>
                <span className="block truncate text-[11px] font-bold text-muted">
                  {member.bot
                    ? "Alleato del server: gioca per ultimo, dove serve"
                    : member.squad
                      ? `Squadra: ${member.squad.map((c) => c.name).join(", ")}`
                      : "Sceglie la squadra…"}
                </span>
              </span>
              {member.bot && isHost ? (
                <button
                  type="button"
                  onClick={() => void act(() => removeRaidAlly(view.id, member.seat))}
                  disabled={busy}
                  aria-label={`Togli ${member.username}`}
                  className="btn btn-ghost h-9 w-9 shrink-0 px-0 text-sm"
                >
                  ✕
                </button>
              ) : (
                <span
                  className={`shrink-0 px-1 text-[10px] font-extrabold uppercase leading-[14px] ${
                    member.ready ? "bg-comic-cyan text-black" : "text-faint"
                  }`}
                >
                  {member.ready ? "✓ Pronto" : "Non pronto"}
                </span>
              )}
            </li>
          ))}
          {view.members.length < view.max_players && (
            <li className="flex items-center gap-2 border-2 border-dashed border-line px-2 py-1.5 text-xs font-bold text-faint">
              <span className="min-w-0 flex-1">
                {view.members.length < balance.raid.minPlayers
                  ? "In attesa di un compagno, o di un alleato del server…"
                  : `Possono entrare ancora ${view.max_players - view.members.length}: più siete, più il Boss è grosso.`}
              </span>
              {isHost && (
                <button type="button" onClick={() => void act(() => addRaidAlly(view.id))} disabled={busy} className="btn btn-ghost shrink-0 px-2 text-xs">
                  + Alleato del server
                </button>
              )}
            </li>
          )}
        </ul>

        <div className="mt-auto flex shrink-0 flex-col gap-2 pt-1">
          <div className="flex gap-2">
            <Link href={`/squadra/?caccia=${view.id}`} className="btn btn-outline flex-1">
              {me?.squad ? "Cambia squadra" : "Scegli la squadra"}
            </Link>
            {me?.squad && (
              <button type="button" onClick={() => void act(() => setRaidReady(view.id, !me.ready))} disabled={busy} className="btn btn-ghost flex-1">
                {me.ready ? "Annulla Pronto" : "Pronto"}
              </button>
            )}
          </div>
          {isHost ? (
            <button type="button" onClick={() => void act(() => startRaidRoom(view.id))} disabled={busy || !everyoneReady || !enough} className="btn btn-primary w-full">
              {!enough ? "Aspetta un compagno" : !everyoneReady ? "Aspetta che siano tutti pronti" : "Inizia la caccia"}
            </button>
          ) : (
            <p className="text-center text-xs font-bold text-muted">Inizia chi ha aperto la stanza, quando siete tutti pronti.</p>
          )}
          <LeaveButton view={view} label={isHost ? "Chiudi la stanza" : "Esci dalla stanza"} onError={onError} />
        </div>
      </main>
    </>
  );
}

/** The levels of the five rounds with their Attack: all a squad is chosen on. */
function RoundLevels({ view }: { view: RaidView }) {
  return (
    <ol className="flex shrink-0 gap-1" aria-label="I livelli delle Minacce, round per round">
      {view.rounds.map((round) => (
        <li
          key={round.round}
          aria-label={`Round ${round.round}: livello ${round.level}, Attacco ${round.attack}`}
          className="flex min-w-0 flex-1 flex-col items-center bg-black px-0.5 py-0.5"
        >
          <span className="text-[9px] font-extrabold uppercase leading-3 text-muted">R{round.round}</span>
          <span className="font-display text-[17px] leading-5">Lv {round.level}</span>
          <span className="text-[10px] font-extrabold leading-3 text-comic-orange">⚔ {round.attack}</span>
        </li>
      ))}
    </ol>
  );
}

function LeaveButton({ view, label, onError }: { view: RaidView; label: string; onError: (message: string | null) => void }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function leave() {
    setBusy(true);
    try {
      await leaveRaidRoom(view.id);
      router.replace("/caccia");
    } catch (cause) {
      onError(describeServerError(cause));
      setBusy(false);
    }
  }
  if (!confirm) {
    return (
      <button type="button" onClick={() => setConfirm(true)} className="btn btn-ghost w-full text-sm">
        {label}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 bg-comic-magenta p-2 text-black">
      <p className="min-w-0 flex-1 text-xs font-bold">
        {view.status !== "active"
          ? "Sicuro?"
          : view.members.some((m) => !m.bot && !m.left && m.user_id !== view.me)
            ? "Esci dalla caccia: i compagni continuano, le tue carte le gioca il server e non ricevi premi."
            : "Sei l'ultima persona della squadra: la caccia finisce persa e non ricevi premi."}
      </p>
      <button type="button" onClick={() => void leave()} disabled={busy} className="btn shrink-0 bg-black px-3 text-sm font-bold text-comic-yellow">
        Esci
      </button>
      <button type="button" onClick={() => setConfirm(false)} className="btn btn-ghost shrink-0 px-3 text-sm">
        No
      </button>
    </div>
  );
}

function RaidRules() {
  const { raid } = balance;
  return (
    <div className="flex flex-col gap-2 text-sm font-semibold leading-5">
      <p>
        Il Boss ha una barra della <b>Vita</b> e vi attacca per {raid.rounds} round, una Minaccia alla volta. Ognuno porta {raid.squadSize}{" "}
        personaggi; delle Minacce conoscete solo i livelli finché non arrivano.
      </p>
      <p>
        <b>Ogni round</b> ognuno mette una carta sulla Minaccia, insieme, prima che scada il tempo ({raid.roundSeconds} secondi): i punteggi si
        sommano. Vedete le carte dei compagni mentre le mettono.
      </p>
      <p>
        <b>Sotto l&apos;Attacco</b> la squadra perde una delle sue {raid.defenses} Difese. <b>All&apos;Attacco o sopra</b> regge, e quello che
        lo supera è danno al Boss. Vita a 0: vinto. Difese a 0, o il Boss ancora in piedi dopo l&apos;ultimo round: perso.
      </p>
      <p>
        <b>Le mosse del Boss</b> si vedono un round prima:
      </p>
      <ul className="flex flex-col gap-1">
        {(Object.keys(RAID_MOVES) as RaidMove[]).map((move) => (
          <li key={move} className="text-xs">
            <b>{RAID_MOVES[move].name}</b>: {RAID_MOVES[move].text}
          </li>
        ))}
      </ul>
      <p>
        <b>Poteri:</b> un Annullatore annulla la mossa del Boss contro la squadra nel suo round; una Spia, giocata, mostra le mosse di due round
        in più; un solo Sabotatore e un solo Implacabile per round, il più forte; Legame e simili contano la tua squadra.
      </p>
      <p>
        <b>Più siete, più il Boss è grosso</b>, ma si vince con la stessa probabilità. Allo scadere del tempo il server mette la carta di chi non
        ha scelto, e quella degli alleati del server. I premi vanno a chi ha scelto almeno metà delle sue carte.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A round: the Boss, the threat, everyone's cards, the hand
// ---------------------------------------------------------------------------

function Board({
  view,
  round,
  abilities,
  offset,
  error,
  onView,
  onError,
}: {
  view: RaidView;
  round: RaidRound;
  abilities: AbilityInfo[];
  offset: number;
  error: string | null;
  onView: (view: RaidView) => void;
  onError: (message: string | null) => void;
}) {
  const me = myRaidMember(view)!;
  // The player's card this round: what the server has, until the player moves it.
  const [mine, setMine] = useState<string | null>(() => me.placement);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rulesRef = useRef<HTMLDialogElement>(null);
  const movesRef = useRef<HTMLDialogElement>(null);
  const detail = useCardDetail();
  const looks = useCardLooks();

  const families: AbilityFamilies = useMemo(() => Object.fromEntries(abilities.map((a) => [a.code, a.family.code])), [abilities]);
  const scores = useMemo(() => (abilities.length ? raidCardScores(view, families) : new Map<string, number>()), [view, families, abilities.length]);
  const preview = useMemo(() => {
    if (!abilities.length) return null;
    const placements = Object.fromEntries(view.members.map((m) => [raidMemberKey(m), m.user_id === me.user_id ? mine : m.placement]));
    return raidPreview(view, families, placements);
  }, [view, families, abilities.length, me.user_id, mine]);
  const hand = raidHandOf(me);
  const cardOf = useMemo(() => {
    const all = new Map<string, { card: RaidCard; member: RaidMember }>();
    for (const member of view.members) for (const card of member.squad ?? []) all.set(card.instance_id, { card, member });
    return all;
  }, [view.members]);
  const ready = me.ready && me.placement !== null;
  const threat = round.threat;

  /** Sends the player's card: the allies see it at once. Pronto goes with it only when asked. */
  async function send(card: string | null, sayReady: boolean) {
    setBusy(true);
    onError(null);
    try {
      onView(await placeRaidCard(view.id, round.round, card, sayReady));
    } catch (cause) {
      onError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  function put(card: string | null) {
    setMine(card);
    setSelected(null);
    void send(card, false);
  }

  // A card dragged onto the threat goes there; dropped back on the hand it leaves the table.
  const { drag, start, ghostRef } = useCardDrag((id, zone) => {
    if (zone === "hand") {
      if (mine === id) put(null);
    } else if (zone === "threat") {
      put(id);
    }
  }, busy);

  // What the team makes with the cards placed so far, and what it means.
  const total = preview?.total ?? 0;
  const required = preview?.required ?? round.attack;
  const reaches = preview !== null && preview.plays.length > 0 && preview.held;
  const placedCount = view.members.filter((m) => (m.user_id === me.user_id ? mine : m.placement)).length;
  const share = Math.min(1, required > 0 ? total / required : 1);
  const outlook = !preview || preview.plays.length === 0
    ? "Nessuna carta ancora"
    : reaches
      ? preview.damage > 0
        ? `Reggete: ${preview.damage} danni al Boss`
        : "Reggete, ma senza danni"
      : `Mancano ${required - total}: ${round.move === "heavy" && !preview.cancelled ? "−2 Difese" : "−1 Difesa"}`;

  return (
    <>
      <BossHeader view={view} round={round} offset={offset} onRules={() => rulesRef.current?.showModal()} />
      <Sheet sheetRef={rulesRef} title="Come si gioca">
        <RaidRules />
        <LeaveButton view={view} label="Esci dalla caccia" onError={onError} />
      </Sheet>
      <MovesRow view={view} round={round} cancelled={Boolean(preview?.cancelled)} onOpen={() => movesRef.current?.showModal()} />
      <Sheet sheetRef={movesRef} title="Le mosse del Boss">
        <MovesSheet view={view} abilities={abilities} />
      </Sheet>
      {error && <p className="mx-3 text-sm font-semibold text-comic-magenta">{error}</p>}

      <Allies view={view} offset={offset} scores={scores} cardOf={cardOf} />

      {/* The threat: the drop zone for the card. */}
      <button
        type="button"
        data-drop="threat"
        onClick={() => {
          if (selected) put(selected);
          else if (mine) {
            // A tap on the threat with nothing selected takes the card back.
            setSelected(mine);
            put(null);
          }
        }}
        onPointerDown={mine ? start(mine) : undefined}
        onDragStart={(event) => event.preventDefault()}
        disabled={busy}
        aria-label={`${threat?.name ?? "Minaccia"}, livello ${round.level}, Attacco ${round.attack}: la squadra fa ${total}`}
        className={`mx-3 mt-1.5 flex min-h-0 flex-1 touch-none select-none flex-col border-[3px] px-2.5 pb-2 pt-1.5 text-left ${
          drag?.over === "threat"
            ? "border-comic-cyan bg-panel-raised shadow-[3px_3px_0_var(--comic-cyan)]"
            : placedCount
              ? "border-comic-yellow bg-panel"
              : "border-dashed border-line bg-panel"
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold text-muted">Livello {round.level}</span>
          <span className="-skew-x-8 bg-black px-1.5 font-display text-[15px] leading-5 text-comic-orange">Attacco {round.attack}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 font-display text-[20px] uppercase leading-6" lang="it">
          {threat?.name ?? "…"}
        </span>
        <span className="text-[11px] font-bold leading-4 text-muted">
          {(threat?.abilities ?? []).map((code) => abilityName(abilities, code)).join(" · ")}
        </span>
        {round.modifier && (
          <span className="mt-0.5 self-start -skew-x-8 bg-comic-yellow px-1.5 text-[11px] font-extrabold leading-4 text-black">
            {(() => {
              const move = describeRaidMove(round.move ?? "plain", round.modifier, abilityName(abilities, threat?.abilities[0] ?? ""));
              return `${move.name}: ${move.text}`;
            })()}
          </span>
        )}
        <span className="mt-auto flex flex-col gap-1 pt-1.5">
          <span className="flex flex-wrap gap-x-2 gap-y-0.5">
            {view.members.map((member) => {
              const card = member.user_id === me.user_id ? mine : member.placement;
              const play = preview?.plays.find((p) => p.player === raidMemberKey(member));
              return (
                <span
                  key={member.seat}
                  className={`flex min-w-0 items-center gap-1 text-[11px] font-extrabold leading-4 ${member.user_id === me.user_id ? "text-comic-yellow" : "text-comic-cyan"}`}
                >
                  <PlayerAvatar username={member.username} avatarUrl={member.avatar_url} size="2xs" />
                  {card ? (
                    <span className="truncate uppercase">
                      {cardOf.get(card)?.card.name ?? "?"} {play ? (play.counted !== play.total ? `${play.counted} (½)` : play.counted) : ""}
                    </span>
                  ) : (
                    <span className="text-faint">{member.bot ? "alla fine" : "…"}</span>
                  )}
                </span>
              );
            })}
          </span>
          <span className="relative h-7 -skew-x-8 bg-black" role="meter" aria-label="La squadra" aria-valuenow={total} aria-valuemin={0} aria-valuemax={required}>
            <span className={`absolute inset-y-0 left-0 ${reaches ? "bg-comic-cyan" : "bg-comic-yellow"}`} style={{ width: `${share * 100}%` }} />
            <span className="absolute inset-0 flex items-center justify-center font-display text-[18px] leading-6 text-white mix-blend-difference">
              {total} / {required}
            </span>
          </span>
          <span className={`text-center text-[12px] font-extrabold ${reaches ? "text-comic-cyan" : "text-comic-orange"}`}>{outlook}</span>
        </span>
      </button>

      {/* The hand: drag a card onto the threat, or tap it and then the threat. Dragged back here, it comes back. */}
      <div role="group" aria-label="Le tue carte" data-drop="hand" className="flex justify-center gap-1.5 px-3 pb-1 pt-2.5">
        {hand.map((card) => {
          const on = mine === card.instance_id;
          return (
            <div
              key={card.instance_id}
              onPointerDown={start(card.instance_id)}
              onDragStart={(event) => event.preventDefault()}
              className={`w-[calc((100%-2.5rem)/6)] max-w-24 touch-none ${drag?.id === card.instance_id ? "opacity-50" : ""}`}
            >
              <HandCard
                card={card}
                score={scores.get(card.instance_id) ?? 0}
                bonus={0}
                note={on ? "messa" : undefined}
                short
                artSizes="calc((100vw - 64px) / 6)"
                selected={card.instance_id === selected || on}
                disabled={busy}
                onSelect={() => {
                  if (on) return;
                  if (selected === card.instance_id) put(card.instance_id);
                  else setSelected(card.instance_id);
                }}
                look={looks(card.definition_id, "me")}
                press={detail.press(card, looks(card.definition_id, "me"))}
              />
            </div>
          );
        })}
      </div>

      <div className="border-t-[3px] border-foreground bg-black px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
        <div className="mb-2 flex gap-1" role="group" aria-label="Segnali ai compagni">
          {RAID_SIGNALS.map((signal) => (
            <button
              key={signal.code}
              type="button"
              onClick={() => void sendRaidSignal(view.id, signal.code).catch((cause: unknown) => onError(describeServerError(cause)))}
              className="btn btn-ghost min-h-9 flex-1 px-1 text-[11px] font-extrabold"
            >
              {signal.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void send(mine, !ready)} disabled={busy || (!ready && !mine)} className="btn btn-primary w-full">
          {ready ? "Pronto ✓ · tocca per ripensarci" : mine ? "Pronto" : selected ? "Tocca la Minaccia" : "Trascina una carta sulla Minaccia"}
        </button>
      </div>
      {drag && <DragGhost ref={ghostRef} card={cardOf.get(drag.id)?.card} look={looks(cardOf.get(drag.id)?.card.definition_id, "me")} />}
    </>
  );
}

function BossHeader({ view, round, offset, onRules }: { view: RaidView; round: RaidRound; offset: number; onRules: () => void }) {
  const deadline = round.deadline_at ? Date.parse(round.deadline_at) : null;
  return (
    <header className="flex items-center gap-2 px-3 py-1">
      <div className="min-w-0 flex-1 leading-none">
        <p className="truncate text-[10px] font-bold text-muted">
          {view.boss.name} · Round {round.round} di {view.rounds.length}
        </p>
        <VitaBar vita={view.vita ?? view.vita_max} max={view.vita_max} />
        <DefenseRow defenses={view.defenses} max={view.defenses_max} />
      </div>
      {deadline !== null && <RoundTimer key={deadline} deadline={deadline} offset={offset} />}
      <button type="button" onClick={onRules} aria-label="Regole ed esci" className="btn btn-ghost h-11 w-11 shrink-0 px-0 font-display text-xl">
        ?
      </button>
    </header>
  );
}

export function VitaBar({ vita, max }: { vita: number; max: number }) {
  const share = Math.max(0, Math.min(1, vita / max));
  return (
    <div className="mt-1 flex items-center gap-1.5" role="meter" aria-label="Vita del Boss" aria-valuenow={vita} aria-valuemin={0} aria-valuemax={max}>
      <span className="text-[10px] font-extrabold uppercase text-comic-magenta">Vita</span>
      <span className="relative h-3 min-w-0 flex-1 -skew-x-8 bg-panel-raised">
        <span className="absolute inset-y-0 left-0 bg-comic-magenta transition-[width] duration-700" style={{ width: `${share * 100}%` }} />
      </span>
      <span className="font-display text-[14px] leading-4">
        {vita}/{max}
      </span>
    </div>
  );
}

export function DefenseRow({ defenses, max }: { defenses: number; max: number }) {
  return (
    <div className="mt-1 flex items-center gap-1" aria-label={`Difese: ${defenses} su ${max}`}>
      <span className="text-[10px] font-extrabold uppercase text-comic-cyan">Difese</span>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} aria-hidden className={`font-display text-[14px] leading-4 ${i < defenses ? "text-comic-cyan" : "text-faint"}`}>
          {i < defenses ? "⛨" : "✕"}
        </span>
      ))}
    </div>
  );
}

function RoundTimer({ deadline, offset }: { deadline: number; offset: number }) {
  const seconds = useSecondsLeft(deadline, offset);
  return (
    <p
      role="timer"
      aria-label={`${seconds} secondi rimasti`}
      className={`flex h-11 w-11 shrink-0 rotate-3 items-center justify-center font-display text-[24px] ${
        seconds <= 10 ? "bg-comic-yellow text-black" : "bg-black text-comic-yellow"
      }`}
    >
      {seconds}
    </p>
  );
}

/** The move of the round and the next ones the team sees; a tap explains them. */
function MovesRow({ view, round, cancelled, onOpen }: { view: RaidView; round: RaidRound; cancelled: boolean; onOpen: () => void }) {
  const now = round.move ?? "plain";
  const later = view.rounds.filter((r) => r.round > round.round && r.move);
  const foreseen = view.rounds.some((r) => r.foreseen);
  return (
    <button type="button" onClick={onOpen} className="mx-3 flex shrink-0 items-center gap-1.5 text-left" aria-label="Le mosse del Boss">
      <span className="shrink-0 text-[10px] font-extrabold uppercase text-muted">Ora</span>
      <span className={`-skew-x-8 px-1.5 text-[11px] font-extrabold uppercase leading-5 ${cancelled ? "bg-panel-raised text-faint line-through" : moveLook(now)}`}>
        {describeRaidMove(now, round.modifier).name}
      </span>
      {later.map((r) => (
        <span key={r.round} className="flex min-w-0 items-center gap-1 text-[10px] font-extrabold text-muted">
          R{r.round}
          <span className="truncate text-foreground">{describeRaidMove(r.move!, r.modifier).name}</span>
        </span>
      ))}
      {foreseen && <span aria-hidden>👁</span>}
      <span aria-hidden className="ml-auto text-muted">
        ›
      </span>
    </button>
  );
}

function MovesSheet({ view, abilities }: { view: RaidView; abilities: AbilityInfo[] }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <ol className="flex flex-col gap-1">
        {view.rounds.map((r) => (
          <li key={r.round} className={`border-2 px-2 py-1 ${r.round === view.current_round ? "border-comic-yellow" : "border-panel-raised"} bg-panel`}>
            <p className="font-extrabold">
              Round {r.round} · Lv {r.level} · Attacco {r.attack}
              {r.resolved && <span className="text-muted"> · fatto</span>}
            </p>
            <p className="text-xs font-bold text-muted">
              {r.move
                ? (() => {
                    const move = describeRaidMove(r.move, r.modifier, r.threat ? abilityName(abilities, r.threat.abilities[0]) : undefined);
                    return `${move.name}: ${move.text}`;
                  })()
                : "Mossa ancora nascosta"}
            </p>
            {r.foreseen && (
              <p className="text-xs font-bold text-comic-magenta">
                👁 {r.foreseen.name}: {r.foreseen.abilities.map((code) => abilityName(abilities, code)).join(" · ")}
                {r.seen_by ? ` (visto da ${r.seen_by})` : ""}
              </p>
            )}
          </li>
        ))}
      </ol>
      <MoveChips moves={view.boss.moves} />
    </div>
  );
}

/** The other members: their card this round, Pronto, a signal. */
function Allies({
  view,
  offset,
  scores,
  cardOf,
}: {
  view: RaidView;
  offset: number;
  scores: Map<string, number>;
  cardOf: Map<string, { card: RaidCard; member: RaidMember }>;
}) {
  const now = useNow(1000) + offset;
  const others = view.members.filter((m) => m.user_id !== view.me);
  return (
    <ul className="mt-1 flex shrink-0 gap-1.5 px-3" aria-label="I compagni">
      {others.map((member) => {
        const absent = !member.bot && !member.left && now - Date.parse(member.last_seen_at) > ABSENT_MS;
        const signal =
          member.signal && member.signal_at && now - Date.parse(member.signal_at) < balance.raid.signalSeconds * 1000
            ? RAID_SIGNAL_LABELS[member.signal]
            : null;
        const card = member.placement ? cardOf.get(member.placement)?.card : null;
        const state = member.bot
          ? "Alleato: gioca per ultimo"
          : member.left
            ? "Uscito: gioca il server"
            : absent
              ? "Non risponde"
              : card
                ? `${member.ready ? "✓ " : ""}${card.name} ${scores.get(member.placement!) ?? ""}`
                : "Sta scegliendo…";
        return (
          <li key={member.seat} className="relative min-w-0 flex-1">
            <span className="flex w-full items-center gap-1.5 border-2 border-panel-raised bg-panel px-1.5 py-1">
              <PlayerAvatar username={member.username} avatarUrl={member.avatar_url} size="xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold">{member.username}</span>
                <span className={`block truncate text-[10px] font-bold ${member.ready ? "text-comic-cyan" : "text-muted"}`}>{state}</span>
              </span>
            </span>
            {signal && (
              <span className="absolute -top-2 right-1 -skew-x-8 bg-comic-yellow px-1.5 text-[11px] font-extrabold text-black shadow-[2px_2px_0_#000]">
                {signal}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// A round's result, and the end
// ---------------------------------------------------------------------------

/** The map leaves by itself when the pause before the next round is over (the next timer is running). */
function RevealTimer({ view, offset, onOver }: { view: RaidView; offset: number; onOver: () => void }) {
  const next = currentRaidRound(view);
  const nextDeadline = next?.deadline_at ? Date.parse(next.deadline_at) : null;
  const now = useNow(500) + offset;
  const over = nextDeadline !== null && nextDeadline - now <= balance.raid.roundSeconds * 1000;
  useEffect(() => {
    if (over) onOver();
  }, [over, onOver]);
  return null;
}

function RoundResult({
  view,
  round,
  abilities,
  offset,
  onDone,
}: {
  view: RaidView;
  round: RaidRound;
  abilities: AbilityInfo[];
  offset: number;
  onDone: () => void;
}) {
  const cardOf = new Map<string, { card: RaidCard; member: RaidMember }>();
  for (const member of view.members) for (const card of member.squad ?? []) cardOf.set(card.instance_id, { card, member });
  const next = currentRaidRound(view);
  const nextDeadline = next?.deadline_at ? Date.parse(next.deadline_at) : null;
  const now = useNow(500) + offset;
  // The result leaves by itself when the pause before the next round is over.
  const pauseOver = nextDeadline !== null && nextDeadline - now <= balance.raid.roundSeconds * 1000;
  useEffect(() => {
    if (pauseOver) onDone();
  }, [pauseOver, onDone]);
  const result = round.result!;
  const move = round.move ?? "plain";
  const finished = view.status !== "active";

  return (
    <main className="flex min-h-0 flex-1 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
      <p className="text-[11px] font-bold text-muted">
        {view.boss.name} · Round {round.round} di {view.rounds.length}
      </p>
      <h1 className={`font-display text-[30px] uppercase leading-8 ${result.held ? "text-comic-cyan" : "text-comic-magenta"}`}>
        {result.held ? (result.damage > 0 ? `−${result.damage} Vita al Boss` : "Retto, nessun danno") : `−${result.defenses_lost} ${result.defenses_lost === 1 ? "Difesa" : "Difese"}`}
      </h1>
      <section className="mt-1 border-[3px] border-panel-raised bg-panel px-2 py-1.5">
        <p className="font-display text-[16px] uppercase leading-5">{round.threat?.name}</p>
        <p className="text-[11px] font-bold text-muted">
          Lv {round.level} · {(round.threat?.abilities ?? []).map((code) => abilityName(abilities, code)).join(" · ")}
        </p>
        <p className="mt-0.5 text-[11px] font-extrabold">
          Mossa: {describeRaidMove(move, round.modifier, abilityName(abilities, round.threat?.abilities[0] ?? "")).name}
          {result.cancelled
            ? " · annullata da un Annullatore"
            : move !== "plain"
              ? ` · ${describeRaidMove(move, round.modifier, abilityName(abilities, round.threat?.abilities[0] ?? "")).text}`
              : ""}
        </p>
      </section>
      <ul className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label="Le carte del round">
        {(round.plays ?? []).map((play) => {
          const who = cardOf.get(play.instance_id);
          return (
            <li key={play.seat} className="flex items-center gap-2 border-2 border-panel-raised bg-panel px-2 py-1 text-sm font-bold">
              {who && <PlayerAvatar username={who.member.username} avatarUrl={who.member.avatar_url} size="xs" />}
              <span className="min-w-0 flex-1 truncate">
                {who?.card.name ?? "?"}
                <span className="text-[11px] text-muted">
                  {" "}
                  · {who?.member.user_id === view.me ? "tu" : who?.member.username}
                  {play.auto_played ? " (server)" : ""}
                </span>
              </span>
              <span className="shrink-0 font-display text-[18px] leading-6 text-comic-yellow">
                {play.counted !== play.score ? `${play.counted} (½ di ${play.score})` : play.counted}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-sm font-extrabold">
        Squadra {result.total} · Attacco {round.attack}
        {result.effective_attack < round.attack ? ` (${result.effective_attack} col Sabotatore)` : ""}
        {result.required < result.effective_attack ? ` · bastava ${result.required}` : ""}
      </p>
      {result.healed > 0 && <p className="text-xs font-bold text-comic-magenta">Rigenerazione: il Boss recupera {result.healed} di Vita.</p>}
      <VitaBar vita={result.vita} max={view.vita_max} />
      <DefenseRow defenses={result.defenses} max={view.defenses_max} />
      <button type="button" onClick={onDone} className="btn btn-primary mt-2 w-full shrink-0">
        {finished ? "Com'è finita" : "Al prossimo round"}
      </button>
    </main>
  );
}

function End({ view }: { view: RaidView }) {
  const me = myRaidMember(view);
  // The running event: the hunt and the rounds the team held (SPEC §8.2).
  const eventPoints = useEventPointsFor(view.id);
  const won = view.status === "won";
  const played = view.rounds.filter((r) => r.resolved);
  const last = played.at(-1);
  const reason = won
    ? `Il Boss è caduto al round ${last?.round ?? view.current_round}.`
    : last && last.result && last.result.defenses <= 0
      ? `Le Difese sono finite al round ${last.round}.`
      : played.length === view.rounds.length
        ? `Il Boss ha resistito: gli restavano ${view.vita ?? 0} di Vita.`
        : "La squadra si è sciolta prima della fine.";
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4">
      <h1 className={`font-display text-[34px] uppercase leading-9 ${won ? "text-comic-cyan" : "text-comic-magenta"}`}>
        {won ? "Boss abbattuto!" : "La caccia è fallita"}
      </h1>
      <p className="text-sm font-bold">
        {view.boss.name} · {magnitudeLabel(view.magnitude)}
      </p>
      <p className="text-sm font-bold">{reason}</p>
      <VitaBar vita={view.vita ?? 0} max={view.vita_max} />
      <DefenseRow defenses={view.defenses} max={view.defenses_max} />
      {me?.left ? (
        <p className="text-sm font-semibold text-muted">Sei uscito prima della fine: nessun premio.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {(me?.xp ?? 0) > 0 && <span className="bg-comic-yellow px-2 py-0.5 text-sm font-extrabold text-black">+{me?.xp} esperienza</span>}
          {(me?.coins ?? 0) > 0 && <span className="bg-comic-yellow px-2 py-0.5 text-sm font-extrabold text-black">+{me?.coins} monete</span>}
          {won && (me?.xp ?? 0) > 0 && (me?.coins ?? 0) === 0 && (
            <span className="text-xs font-bold text-muted">Le monete della prima vittoria su questo Boss le avevi già prese.</span>
          )}
          {(me?.star_coins ?? 0) > 0 && (
            <span className="bg-comic-yellow px-2 py-0.5 text-sm font-extrabold text-black">+{me?.star_coins} monete delle stelle</span>
          )}
          {(me?.weekly_coins ?? 0) > 0 && (
            <span className="bg-comic-orange px-2 py-0.5 text-sm font-extrabold text-black">+{me?.weekly_coins} monete del Boss della settimana</span>
          )}
          {me?.community && (
            <span className="bg-comic-magenta px-2 py-0.5 text-sm font-extrabold text-black">Boss della comunità abbattuto: premio ricevuto</span>
          )}
          {eventPoints && (eventPoints.points > 0 || eventPoints.not_admitted) && (
            <span className="bg-comic-magenta px-2 py-0.5 text-sm font-extrabold text-white">{describeEventPoints(eventPoints)}</span>
          )}
          {me?.xp === 0 && <span className="text-xs font-bold text-muted">Nessun premio: hai scelto meno della metà delle tue carte.</span>}
        </div>
      )}
      {won && !me?.left && (
        <RaidStarList
          rules={view.boss}
          earned={view.boss.stars ?? []}
          met={me?.stars ?? []}
          fresh={(me?.star_coins ?? 0) > 0}
        />
      )}
      <ul className="flex flex-col gap-1" aria-label="La squadra">
        {view.members.map((member) => (
          <li key={member.seat} className="flex items-center gap-2 text-sm font-bold">
            <PlayerAvatar username={member.username} avatarUrl={member.avatar_url} size="xs" />
            <span className="truncate">{member.user_id === view.me ? "Tu" : member.username}</span>
            {member.bot && <span className="text-[11px] text-faint">alleato del server</span>}
            {member.left && <span className="text-[11px] text-faint">uscito</span>}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <ReturnLink href="/caccia" className="btn btn-primary w-full">
          Torna alla Caccia grossa
        </ReturnLink>
      </div>
    </main>
  );
}
