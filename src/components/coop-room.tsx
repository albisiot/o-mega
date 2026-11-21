"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AbilityFamilies } from "@o-mega/game-engine";
import { CardDetailProvider, useCardDetail } from "@/components/card-detail";
import { CardLooksProvider, useCardLooks } from "@/components/card-looks";
import { HandCard } from "@/components/hand-card";
import { PlayerAvatar } from "@/components/player-avatar";
import { ReturnLink } from "@/components/return-link";
import { Sheet } from "@/components/sheet";
import { balance } from "@/config/balance";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import {
  brokenFronts,
  cardsPerRound,
  coopPreviews,
  currentRound,
  fetchCoopRoom,
  handOf,
  lastResolvedRound,
  leaveCoopRoom,
  myMember,
  placeCoopCards,
  placedTotals,
  resolveCoopRound,
  sendCoopSignal,
  setCoopReady,
  SIGNAL_LABELS,
  SIGNALS,
  startCoopRoom,
  type CoopCard,
  type CoopMember,
  type CoopPreview,
  type CoopRound,
  type CoopView,
} from "@/lib/coop";
import { describeServerError } from "@/lib/errors";
import { subscribeToUpdates, type MatchCard } from "@/lib/match";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useExpiry, useNow, useSecondsLeft } from "@/lib/use-now";

/** While broadcasts cannot arrive the room is read at this pace; it is read anyway now and then, to stay present. */
const OFFLINE_POLL_MS = 4_000;
const PRESENCE_MS = 8_000;
/** A member not seen for this long is shown as not answering. */
const ABSENT_MS = 20_000;

type Placement = { card: string; slot: number };

const abilityName = (abilities: AbilityInfo[], code: string) => abilities.find((a) => a.code === code)?.name ?? code;

/** An operation's room (SPEC §5.17): the wait for the team, the rounds, each result, the end. */
export function CoopRoom({ roomId }: { roomId: string }) {
  return (
    <CardLooksProvider>
      <CardDetailProvider>
        <CoopRoomContent roomId={roomId} />
      </CardDetailProvider>
    </CardLooksProvider>
  );
}

function CoopRoomContent({ roomId }: { roomId: string }) {
  const [view, setView] = useState<CoopView | null>(null);
  // Server time minus device time: countdowns follow the server clock.
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>(() => seenAbilities() ?? []);
  // The round whose result is on screen.
  const [revealing, setRevealing] = useState<number | null>(null);
  const revealedUpTo = useRef<number | null>(null);
  useLockedScreen(true);

  const apply = useCallback((next: CoopView) => {
    setView(next);
    setOffset(Date.parse(next.server_now) - Date.now());
    const newest = lastResolvedRound(next);
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
      apply(await fetchCoopRoom(roomId));
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
      `coop:${roomId}`,
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
      await resolveCoopRound(roomId);
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

  // The time is up: the server puts down the cards of who has not chosen.
  const current = view ? currentRound(view) : undefined;
  const deadline = current?.deadline_at ? Date.parse(current.deadline_at) : null;
  useExpiry(current?.round, deadline, offset, resolve);

  if (!view) {
    return (
      <div className="game-shell items-center justify-center gap-3 px-6 text-center">
        {error ? (
          <>
            <p className="text-sm font-semibold text-comic-magenta">{error}</p>
            <ReturnLink href="/operazioni" className="text-sm font-bold underline">
              Torna alle Operazioni
            </ReturnLink>
          </>
        ) : (
          <p className="text-sm font-bold text-muted">Apertura della stanza…</p>
        )}
      </div>
    );
  }

  return (
    <CoopRoomScreen
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
 * Also used by the development page /prova-operazioni with fixed states.
 */
export function CoopRoomScreen({
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
  view: CoopView;
  abilities: AbilityInfo[];
  offset: number;
  error: string | null;
  /** The round whose result is on screen, if any. */
  revealing: number | null;
  onRevealDone: () => void;
  onView: (view: CoopView) => void;
  onRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const current = currentRound(view);
  const shownRound = revealing === null ? null : (view.rounds.find((r) => r.round === revealing) ?? null);
  return (
    <div className="game-shell">
      {view.status === "lobby" ? (
        <Lobby view={view} error={error} onChange={onRefresh} onError={onError} />
      ) : view.status === "closed" ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display text-2xl uppercase text-comic-yellow">Stanza chiusa</p>
          <p className="text-sm font-semibold text-muted">Chi l&apos;aveva aperta è uscito, o è rimasta ferma troppo a lungo.</p>
          <ReturnLink href="/operazioni" className="btn btn-primary">
            Torna alle Operazioni
          </ReturnLink>
        </main>
      ) : shownRound ? (
        <RoundResult view={view} round={shownRound} abilities={abilities} offset={offset} onDone={onRevealDone} />
      ) : view.status === "active" && myMember(view)?.left ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="font-display text-2xl uppercase text-comic-yellow">Sei uscito</p>
          <p className="text-sm font-semibold text-muted">I compagni continuano: le tue carte le gioca il server, senza premi per te.</p>
          <ReturnLink href="/operazioni" className="btn btn-primary">
            Torna alle Operazioni
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

// ---------------------------------------------------------------------------
// The wait: the code, the team, the squads
// ---------------------------------------------------------------------------

function Lobby({
  view,
  error,
  onChange,
  onError,
}: {
  view: CoopView;
  error: string | null;
  onChange: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const me = myMember(view);
  const isHost = view.host === view.me;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const everyoneReady = view.members.every((m) => m.ready && m.squad);
  const enough = view.members.length >= balance.coop.minPlayers;
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
    const text = `Entra nella mia operazione di O-MEGA con il codice ${view.code}`;
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
        <ReturnLink href="/operazioni" label="Esci dalla stanza" className="btn btn-ghost h-11 w-11 shrink-0 px-0">
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.6} aria-hidden>
            <path d="M12 3 5 10l7 7M5 10h13" strokeLinejoin="round" />
          </svg>
        </ReturnLink>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[22px] uppercase leading-6 text-comic-yellow">{view.operation.title}</h1>
          <p className="truncate text-[11px] font-bold text-muted">
            {view.operation.rival_name} · {view.operation.boss_name}
          </p>
        </div>
        <button type="button" onClick={() => rulesRef.current?.showModal()} aria-label="Come si gioca" className="btn btn-ghost h-11 w-11 shrink-0 px-0 font-display text-xl">
          ?
        </button>
      </header>
      <Sheet sheetRef={rulesRef} title="Come si gioca">
        <CoopRules />
      </Sheet>

      <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-1">
        {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
        <section className="cut-bottom relative flex shrink-0 items-center justify-between gap-3 overflow-hidden bg-comic-cyan px-3 pb-3 pt-2 text-black">
          <div className="min-w-0">
            <p className="text-xs font-extrabold">Il codice della stanza</p>
            <p className="select-text font-display text-[34px] leading-9 tracking-[0.18em]">{view.code}</p>
            <p className="text-[11px] font-bold leading-4">
              Passalo a un amico: entra da Gioca → Operazioni. Siete al massimo in {balance.coop.maxPlayers}.
            </p>
          </div>
          <button type="button" onClick={() => void share()} className="btn shrink-0 bg-black px-3 font-display text-base uppercase text-comic-yellow">
            {copied ? "Copiato" : "Condividi"}
          </button>
        </section>

        <p className="text-xs font-semibold leading-4">{view.operation.intro}</p>
        <RoundLevels view={view} />

        <ul className="flex flex-col gap-1.5" aria-label="La squadra">
          {view.members.map((member) => (
            <li key={member.user_id} className="flex items-center gap-2 border-2 border-panel-raised bg-panel px-2 py-1.5">
              <PlayerAvatar username={member.username} avatarUrl={member.avatar_url} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold">
                  {member.user_id === view.me ? "Tu" : member.username}
                  {member.user_id === view.host && <span className="ml-1.5 bg-black px-1 text-[10px] font-extrabold uppercase text-comic-yellow">Apre</span>}
                </span>
                <span className="block truncate text-[11px] font-bold text-muted">
                  {member.squad ? `Squadra: ${member.squad.map((c) => c.name).join(", ")}` : "Sceglie la squadra…"}
                </span>
              </span>
              <span
                className={`shrink-0 px-1 text-[10px] font-extrabold uppercase leading-[14px] ${
                  member.ready ? "bg-comic-cyan text-black" : "text-faint"
                }`}
              >
                {member.ready ? "✓ Pronto" : "Non pronto"}
              </span>
            </li>
          ))}
          {view.members.length < balance.coop.maxPlayers && (
            <li className="border-2 border-dashed border-line px-2 py-2 text-center text-xs font-bold text-faint">
              In attesa di un compagno…
            </li>
          )}
        </ul>

        <div className="mt-auto flex shrink-0 flex-col gap-2 pt-1">
          <div className="flex gap-2">
            <Link href={`/squadra/?operazione=${view.id}`} className="btn btn-outline flex-1">
              {me?.squad ? "Cambia squadra" : "Scegli la squadra"}
            </Link>
            {me?.squad && (
              <button type="button" onClick={() => void act(() => setCoopReady(view.id, !me.ready))} disabled={busy} className="btn btn-ghost flex-1">
                {me.ready ? "Annulla Pronto" : "Pronto"}
              </button>
            )}
          </div>
          {isHost ? (
            <button
              type="button"
              onClick={() => void act(() => startCoopRoom(view.id))}
              disabled={busy || !everyoneReady || !enough}
              className="btn btn-primary w-full"
            >
              {!enough ? "Aspetta un compagno" : !everyoneReady ? "Aspetta che siano tutti pronti" : "Inizia l'operazione"}
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

/** The levels of every round in play (the Boss last): all a squad is chosen on. */
function RoundLevels({ view }: { view: CoopView }) {
  return (
    <ol className="flex shrink-0 gap-1" aria-label="I livelli delle Minacce, round per round">
      {view.rounds.map((round) => (
        <li
          key={round.round}
          aria-label={`${round.boss ? "Boss" : `Round ${round.round}`}: livelli ${round.levels.join(", ")}`}
          className={`flex min-w-0 flex-1 flex-col items-center px-0.5 py-0.5 ${round.boss ? "bg-comic-magenta text-black" : "bg-black"}`}
        >
          <span className="text-[9px] font-extrabold uppercase leading-3">{round.boss ? "Boss" : `R${round.round}`}</span>
          <span className="font-display text-[15px] leading-5">{round.levels.join("·")}</span>
        </li>
      ))}
    </ol>
  );
}

function LeaveButton({ view, label, onError }: { view: CoopView; label: string; onError: (message: string | null) => void }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function leave() {
    setBusy(true);
    try {
      await leaveCoopRoom(view.id);
      router.replace("/operazioni");
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
        {view.status === "active"
          ? "Esci dall'operazione: i compagni continuano, le tue carte le gioca il server e non ricevi premi."
          : "Sicuro?"}
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

function CoopRules() {
  const { coop } = balance;
  return (
    <div className="flex flex-col gap-2 text-sm font-semibold leading-5">
      <p>
        Siete una squadra di Reggenti. Ognuno porta {coop.squadSize} personaggi; dei round conoscete solo i livelli finché non arrivano.
      </p>
      <p>
        <b>In città ({coop.cityRounds} round):</b> ci sono più Minacce che giocatori. Ognuno mette una carta su una Minaccia, insieme, prima
        che scada il tempo ({coop.roundSeconds} secondi). Vedete dove mettono le carte i compagni mentre lo fanno.
      </p>
      <p>
        <b>Fermare una Minaccia:</b> il punteggio deve arrivare alla soglia del suo livello. Se due carte vanno sulla stessa Minaccia, guida la più
        forte e l&apos;altra aggiunge il suo valore più alto tra le abilità richieste.
      </p>
      <p>
        <b>Il rivale</b> rinforza una Minaccia per round con un suo Eco, che si scopre alla fine: lì dovete battere l&apos;Eco.
      </p>
      <p>
        <b>Panico:</b> ogni Minaccia lasciata andare lo alza: +{coop.panicLow} fino al livello {coop.panicHighFromLevel - 1}, +{coop.panicHigh} dal
        livello {coop.panicHighFromLevel}, +{coop.panicReinforced} in più se era del rivale. A {coop.panicLimit} l&apos;operazione fallisce.
      </p>
      <p>
        <b>Il Boss:</b> alla fine ognuno gioca le sue ultime {coop.bossCards} carte sui fronti del Boss, uno in più dei giocatori, con soglie più
        alte. Vincete se ne sfondate almeno uno a testa.
      </p>
      <p>Allo scadere del tempo il server mette le carte di chi non ha scelto, dove aiutano di più.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A round: the threats, everyone's cards, the hand
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
  view: CoopView;
  round: CoopRound;
  abilities: AbilityInfo[];
  offset: number;
  error: string | null;
  onView: (view: CoopView) => void;
  onError: (message: string | null) => void;
}) {
  const me = myMember(view)!;
  const needed = cardsPerRound(round);
  // The player's own cards this round: what the server has, until the player moves them.
  const [mine, setMine] = useState<Placement[]>(() => me.placement ?? []);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rulesRef = useRef<HTMLDialogElement>(null);
  const allyRef = useRef<HTMLDialogElement>(null);
  const [ally, setAlly] = useState<string | null>(null);
  const detail = useCardDetail();
  const looks = useCardLooks();

  const families: AbilityFamilies = useMemo(() => Object.fromEntries(abilities.map((a) => [a.code, a.family.code])), [abilities]);
  const previews = useMemo(() => (abilities.length ? coopPreviews(view, families) : new Map<string, CoopPreview[]>()), [view, families, abilities.length]);
  const totals = useMemo(() => placedTotals(view, previews, new Map([[me.user_id, mine]])), [view, previews, me.user_id, mine]);
  const hand = handOf(me);
  const cardOf = useMemo(() => {
    const all = new Map<string, { card: CoopCard; member: CoopMember }>();
    for (const member of view.members) for (const card of member.squad ?? []) all.set(card.instance_id, { card, member });
    return all;
  }, [view.members]);
  const threats = round.threats ?? [];
  const ready = me.ready && me.placement !== null;

  /** Sends the player's cards: the allies see them at once. Pronto goes with them only when asked. */
  async function send(next: Placement[], sayReady: boolean) {
    setBusy(true);
    onError(null);
    try {
      onView(await placeCoopCards(view.id, round.round, next.length ? next : null, sayReady));
    } catch (cause) {
      onError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  function put(slot: number) {
    if (busy) return;
    const mineHere = mine.filter((p) => p.slot === slot);
    // A tap on a threat with one of the player's cards and nothing selected takes it back.
    if (!selected) {
      if (mineHere.length === 0) return;
      const next = mine.filter((p) => p !== mineHere[mineHere.length - 1]);
      setMine(next);
      setSelected(mineHere[mineHere.length - 1].card);
      void send(next, false);
      return;
    }
    let next = [...mine.filter((p) => p.card !== selected), { card: selected, slot }];
    // Only as many cards as the round takes: the oldest goes back to the hand.
    if (next.length > needed) next = next.slice(next.length - needed);
    setMine(next);
    setSelected(null);
    void send(next, false);
  }

  const complete = mine.length === needed;
  const placedIds = new Set(mine.map((p) => p.card));
  const active = selected ?? hand.find((card) => !placedIds.has(card.instance_id))?.instance_id ?? null;

  return (
    <>
      <PlayHeader view={view} round={round} offset={offset} onRules={() => rulesRef.current?.showModal()} />
      <Sheet sheetRef={rulesRef} title="Come si gioca">
        <CoopRules />
        <LeaveButton view={view} label="Esci dall'operazione" onError={onError} />
      </Sheet>
      <Sheet sheetRef={allyRef} title={ally ? `Le carte di ${view.members.find((m) => m.user_id === ally)?.username ?? ""}` : "Carte"}>
        {ally && <AllyHand member={view.members.find((m) => m.user_id === ally)!} round={round} previews={previews} />}
      </Sheet>
      {error && <p className="mx-3 text-sm font-semibold text-comic-magenta">{error}</p>}

      <Allies view={view} offset={offset} onOpen={(id) => {
        setAlly(id);
        allyRef.current?.showModal();
      }} />

      <div className={`grid min-h-0 flex-1 gap-1.5 px-3 pt-1.5 ${threats.length <= 3 ? "grid-cols-3" : threats.length === 4 ? "grid-cols-4" : "grid-cols-5"}`}>
        {threats.map((threat) => {
          const reinforced = threat.slot === round.reinforced_slot;
          const team = totals.get(threat.slot);
          const need = team?.required ?? threat.target;
          const incoming = active ? previews.get(active)?.[threat.slot] : undefined;
          const placedHere = view.members.flatMap((member) =>
            (member.user_id === me.user_id ? mine : (member.placement ?? []))
              .filter((p) => p.slot === threat.slot)
              .map((p) => ({ member, card: cardOf.get(p.card)?.card })),
          );
          const reaches = team && !reinforced && team.total >= need;
          return (
            <button
              key={threat.slot}
              type="button"
              onClick={() => put(threat.slot)}
              disabled={busy}
              aria-label={`${threat.name}, livello ${threat.level}${reinforced ? ", del rivale" : `, serve ${need}`}${
                team ? `: la squadra fa ${team.total}` : ": nessuno"
              }`}
              className={`flex min-h-0 min-w-0 flex-col border-[3px] px-1.5 pb-1.5 pt-1 text-left ${
                reinforced ? "border-comic-magenta bg-panel" : placedHere.length ? "border-comic-yellow bg-panel" : "border-dashed border-line bg-panel"
              }`}
            >
              <span className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-extrabold text-muted">Lv {threat.level}</span>
                {round.boss ? (
                  <span className="bg-comic-magenta px-1 text-[9px] font-extrabold uppercase text-black">Fronte</span>
                ) : (
                  <span className="bg-black px-1 text-[9px] font-extrabold text-comic-orange">+{threat.panic} Panico</span>
                )}
              </span>
              {reinforced && (
                <span className="-skew-x-8 self-start bg-comic-magenta px-1 text-[9px] font-extrabold uppercase leading-3 text-black">
                  Rivale
                </span>
              )}
              <span className="line-clamp-2 break-words font-display text-[14px] uppercase leading-4 [hyphens:auto]" lang="it">
                {threat.name}
              </span>
              <span className="mt-0.5 line-clamp-2 text-[9px] font-bold leading-3 text-muted">
                {threat.abilities.map((code) => abilityName(abilities, code)).join(" · ")}
              </span>
              <span className="mt-auto flex flex-col gap-0.5 pt-1">
                {placedHere.map(({ member, card }, i) => (
                  <span
                    key={`${member.user_id}-${card?.instance_id ?? i}`}
                    className={`flex min-w-0 items-center gap-1 text-[10px] font-extrabold leading-3 ${member.user_id === me.user_id ? "text-comic-yellow" : "text-comic-cyan"}`}
                  >
                    <PlayerAvatar username={member.username} avatarUrl={member.avatar_url} size="2xs" />
                    <span className="truncate uppercase">{card?.name ?? "?"}</span>
                  </span>
                ))}
                <span
                  className={`-skew-x-8 text-center font-display text-[18px] leading-6 ${
                    reaches ? "bg-comic-cyan text-black" : team ? "bg-comic-yellow text-black" : "bg-black text-faint"
                  }`}
                >
                  {team ? team.total : "–"}
                  <span className="text-[12px]">{reinforced ? " vs Eco" : ` / ${need}`}</span>
                </span>
                {incoming && !placedIds.has(active ?? "") && (
                  <span className="text-center text-[10px] font-extrabold text-comic-cyan">metti: {incoming.score.total}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* The hand: tap a card, then a threat. A tap on a threat with your card takes it back. */}
      <div role="group" aria-label="Le tue carte" className="flex justify-center gap-1.5 px-3 pb-1 pt-2.5">
        {hand.map((card) => {
          const scores = previews.get(card.instance_id) ?? [];
          const at = mine.find((p) => p.card === card.instance_id);
          const best = scores.length ? Math.max(...scores.map((s) => s.score.total)) : 0;
          const shown = at ? scores[at.slot] : undefined;
          return (
            <div key={card.instance_id} className="w-[calc((100%-2.5rem)/6)] max-w-24">
              <HandCard
                card={card}
                score={shown?.score.total ?? best}
                bonus={shown?.score.bonus ?? 0}
                note={at ? `su ${threats[at.slot]?.name ?? ""}` : undefined}
                short
                artSizes="calc((100vw - 64px) / 6)"
                selected={card.instance_id === selected}
                disabled={busy}
                onSelect={() => setSelected((shownId) => (shownId === card.instance_id ? null : card.instance_id))}
                look={looks(card.definition_id, "me")}
                press={detail.press(card, looks(card.definition_id, "me"))}
              />
            </div>
          );
        })}
      </div>

      <div className="border-t-[3px] border-foreground bg-black px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
        <div className="mb-2 flex gap-1" role="group" aria-label="Segnali ai compagni">
          {SIGNALS.map((signal) => (
            <button
              key={signal.code}
              type="button"
              onClick={() => void sendCoopSignal(view.id, signal.code).catch((cause: unknown) => onError(describeServerError(cause)))}
              className="btn btn-ghost min-h-9 flex-1 px-1 text-[11px] font-extrabold"
            >
              {signal.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void send(mine, !ready)}
          disabled={busy || (!ready && !complete)}
          className="btn btn-primary w-full"
        >
          {ready
            ? "Pronto ✓ · tocca per ripensarci"
            : complete
              ? "Pronto"
              : needed > 1
                ? `Metti ${needed - mine.length} ${needed - mine.length === 1 ? "carta" : "carte"} sui fronti`
                : "Metti una carta su una Minaccia"}
        </button>
      </div>
    </>
  );
}

function PlayHeader({ view, round, offset, onRules }: { view: CoopView; round: CoopRound; offset: number; onRules: () => void }) {
  const deadline = round.deadline_at ? Date.parse(round.deadline_at) : null;
  return (
    <header className="flex items-center gap-2 px-3 py-1">
      <div className="min-w-0 flex-1 leading-none">
        <p className="truncate text-[10px] font-bold text-muted">
          {view.operation.title} · {round.boss ? view.operation.boss_name : view.operation.rival_name}
        </p>
        <p className="mt-0.5 font-display text-[20px] uppercase leading-6 text-comic-yellow">
          {round.boss ? "Il Boss" : `Round ${round.round} di ${view.rounds.length - 1}`}
        </p>
        <PanicMeter panic={view.panic} limit={view.panic_limit} />
      </div>
      {deadline !== null && <RoundTimer key={deadline} deadline={deadline} offset={offset} />}
      <button type="button" onClick={onRules} aria-label="Regole ed esci" className="btn btn-ghost h-11 w-11 shrink-0 px-0 font-display text-xl">
        ?
      </button>
    </header>
  );
}

function PanicMeter({ panic, limit }: { panic: number; limit: number }) {
  const share = Math.min(1, panic / limit);
  return (
    <div className="mt-1 flex items-center gap-1.5" role="meter" aria-label="Panico" aria-valuenow={panic} aria-valuemin={0} aria-valuemax={limit}>
      <span className="text-[10px] font-extrabold uppercase text-comic-orange">Panico</span>
      <span className="relative h-2.5 min-w-0 flex-1 -skew-x-8 bg-panel-raised">
        <span
          className={`absolute inset-y-0 left-0 ${share >= 0.75 ? "bg-comic-magenta" : "bg-comic-orange"}`}
          style={{ width: `${share * 100}%` }}
        />
      </span>
      <span className="font-display text-[14px] leading-4">
        {panic}/{limit}
      </span>
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

/** The allies: where they are, Pronto, a signal; a tap shows their cards. */
function Allies({ view, offset, onOpen }: { view: CoopView; offset: number; onOpen: (userId: string) => void }) {
  const now = useNow(1000) + offset;
  const others = view.members.filter((m) => m.user_id !== view.me);
  return (
    <ul className="flex shrink-0 gap-1.5 px-3" aria-label="I compagni">
      {others.map((member) => {
        const absent = !member.left && now - Date.parse(member.last_seen_at) > ABSENT_MS;
        const signal =
          member.signal && member.signal_at && now - Date.parse(member.signal_at) < balance.coop.signalSeconds * 1000
            ? SIGNAL_LABELS[member.signal]
            : null;
        const state = member.left
          ? "Uscito: gioca il server"
          : absent
            ? "Non risponde"
            : member.ready
              ? "✓ Pronto"
              : member.placement
                ? "Ha messo le carte"
                : "Sta scegliendo…";
        return (
          <li key={member.user_id} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onOpen(member.user_id)}
              className="relative flex w-full items-center gap-1.5 border-2 border-panel-raised bg-panel px-1.5 py-1 text-left"
            >
              <PlayerAvatar username={member.username} avatarUrl={member.avatar_url} size="xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold">{member.username}</span>
                <span className={`block truncate text-[10px] font-bold ${member.ready ? "text-comic-cyan" : "text-muted"}`}>
                  {state} · {handOf(member).length} carte
                </span>
              </span>
              {signal && (
                <span className="absolute -top-2 right-1 -skew-x-8 bg-comic-yellow px-1.5 text-[11px] font-extrabold text-black shadow-[2px_2px_0_#000]">
                  {signal}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AllyHand({ member, round, previews }: { member: CoopMember; round: CoopRound; previews: Map<string, CoopPreview[]> }) {
  const looks = useCardLooks();
  const hand = handOf(member);
  return (
    <div className="grid grid-cols-3 gap-2 pt-2">
      {hand.map((card) => {
        const scores = previews.get(card.instance_id) ?? [];
        const best = scores.length ? Math.max(...scores.map((s) => s.score.total)) : 0;
        const at = member.placement?.find((p) => p.card === card.instance_id);
        return (
          <HandCard
            key={card.instance_id}
            card={card}
            score={at ? (scores[at.slot]?.score.total ?? best) : best}
            bonus={0}
            note={at ? `su ${round.threats?.[at.slot]?.name ?? ""}` : undefined}
            short
            artSizes="30vw"
            selected={false}
            disabled
            onSelect={() => {}}
            look={looks(card.definition_id, "me")}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// A round's result, and the end
// ---------------------------------------------------------------------------

function RoundResult({
  view,
  round,
  abilities,
  offset,
  onDone,
}: {
  view: CoopView;
  round: CoopRound;
  abilities: AbilityInfo[];
  offset: number;
  onDone: () => void;
}) {
  const cardOf = new Map<string, { card: MatchCard; member: CoopMember }>();
  for (const member of view.members) for (const card of member.squad ?? []) cardOf.set(card.instance_id, { card, member });
  const next = currentRound(view);
  const nextDeadline = next?.deadline_at ? Date.parse(next.deadline_at) : null;
  const now = useNow(500) + offset;
  // The result leaves by itself when the pause before the next round is over.
  const pauseOver =
    nextDeadline !== null && nextDeadline - now <= (next?.boss ? balance.coop.bossRoundSeconds : balance.coop.roundSeconds) * 1000;
  useEffect(() => {
    if (pauseOver) onDone();
  }, [pauseOver, onDone]);
  const finished = view.status !== "active";

  return (
    <main className="flex min-h-0 flex-1 flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
      <h1 className="font-display text-[26px] uppercase leading-7 text-comic-yellow">{round.boss ? "Il Boss" : `Round ${round.round}`}</h1>
      <p className="text-xs font-bold text-muted">
        {round.boss
          ? `Fronti sfondati: ${round.results?.filter((r) => r.stopped).length ?? 0} su ${round.results?.length ?? 0} (ne servono ${view.players})`
          : `Panico +${round.panic ?? 0} · ora ${view.panic}/${view.panic_limit}`}
      </p>
      <ul className="mt-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        {(round.threats ?? []).map((threat) => {
          const result = round.results?.find((r) => r.slot === threat.slot);
          const plays = (round.plays ?? []).filter((p) => p.slot === threat.slot);
          const reinforced = threat.slot === round.reinforced_slot;
          const stopped = Boolean(result?.stopped);
          return (
            <li key={threat.slot} className={`border-[3px] px-2 py-1.5 ${stopped ? "border-comic-cyan bg-panel" : "border-panel-raised bg-panel"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate font-display text-[15px] uppercase leading-5">{threat.name}</span>
                  <span className="block truncate text-[10px] font-bold text-muted">
                    Lv {threat.level} · {threat.abilities.map((code) => abilityName(abilities, code)).join(" · ")}
                  </span>
                </span>
                <span
                  className={`shrink-0 -skew-x-8 px-1.5 font-display text-[15px] uppercase leading-6 ${
                    stopped ? "bg-comic-cyan text-black" : "bg-black text-comic-orange"
                  }`}
                >
                  {stopped ? (round.boss ? "Sfondato" : "Fermata") : round.boss ? "Regge" : `+${result?.panic ?? 0} Panico`}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold">
                {plays.length === 0 && <span className="text-faint">Nessuno ci è andato.</span>}
                {plays.map((play) => {
                  const who = cardOf.get(play.instance_id);
                  return (
                    <span key={play.instance_id} className="flex items-center gap-1">
                      {who && <PlayerAvatar username={who.member.username} avatarUrl={who.member.avatar_url} size="2xs" />}
                      <span className={play.role === "lead" ? "text-comic-yellow" : "text-muted"}>
                        {who?.card.name ?? "?"} {play.role === "lead" ? play.score : `+${play.highest} aiuto`}
                        {play.auto_played ? " (server)" : ""}
                      </span>
                    </span>
                  );
                })}
              </div>
              <p className="mt-0.5 text-[11px] font-extrabold">
                Squadra {result?.total ?? 0}
                {reinforced && round.eco
                  ? ` contro l'Eco ${round.eco.name}: ${round.eco.score.total}`
                  : ` su ${result?.required ?? threat.target}`}
              </p>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onDone} className="btn btn-primary mt-2 w-full shrink-0">
        {finished ? "Com'è finita" : next?.boss ? "Al Boss" : "Al prossimo round"}
      </button>
    </main>
  );
}

function End({ view }: { view: CoopView }) {
  const me = myMember(view);
  const won = view.status === "won";
  const broken = brokenFronts(view);
  const reason = won
    ? `Il Boss è caduto: ${broken} fronti sfondati su ${view.players + 1}.`
    : view.panic >= view.panic_limit
      ? `Il Panico è arrivato a ${view.panic}: la città non ha retto.`
      : view.rounds.some((r) => r.boss && r.resolved)
        ? `Il Boss ha retto: ${broken} fronti sfondati, ne servivano ${view.players}.`
        : "La squadra si è sciolta prima della fine.";
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4">
      <h1 className={`font-display text-[34px] uppercase leading-9 ${won ? "text-comic-cyan" : "text-comic-magenta"}`}>
        {won ? "Operazione riuscita!" : "Operazione fallita"}
      </h1>
      <p className="text-sm font-bold">{reason}</p>
      <PanicMeter panic={view.panic} limit={view.panic_limit} />
      {won && view.operation.outro && <p className="border-l-4 border-comic-yellow pl-2 text-sm font-semibold italic">{view.operation.outro}</p>}
      {me?.left ? (
        <p className="text-sm font-semibold text-muted">Sei uscito prima della fine: nessun premio.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {(me?.xp ?? 0) > 0 && <span className="bg-comic-yellow px-2 py-0.5 text-sm font-extrabold text-black">+{me?.xp} esperienza</span>}
          {(me?.coins ?? 0) > 0 && <span className="bg-comic-yellow px-2 py-0.5 text-sm font-extrabold text-black">+{me?.coins} monete</span>}
          {me?.reward_card && (
            <span className="bg-comic-cyan px-2 py-0.5 text-sm font-extrabold text-black">Nuova carta: {me.reward_card.name}</span>
          )}
          {won && (me?.coins ?? 0) === 0 && !me?.reward_card && (
            <span className="text-xs font-bold text-muted">Il premio dell&apos;operazione l&apos;avevi già preso.</span>
          )}
        </div>
      )}
      <ul className="flex flex-col gap-1" aria-label="La squadra">
        {view.members.map((member) => (
          <li key={member.user_id} className="flex items-center gap-2 text-sm font-bold">
            <PlayerAvatar username={member.username} avatarUrl={member.avatar_url} size="xs" />
            <span className="truncate">{member.user_id === view.me ? "Tu" : member.username}</span>
            {member.left && <span className="text-[11px] text-faint">uscito</span>}
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <ReturnLink href="/operazioni" className="btn btn-primary w-full">
          Torna alle Operazioni
        </ReturnLink>
      </div>
    </main>
  );
}
