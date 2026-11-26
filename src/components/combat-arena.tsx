"use client";

// Scontro a squadre, stage 6a (SPEC §5.19, docs/COMBAT.md): the challenges between players, never
// live. The player's Gloria and paid challenges, their defence (five unlocked characters with the
// computer's strategy for them), today's three opponents (players close in Gloria, or teams of the
// computer), a new list while the day's renewals last, and the defences others challenged. The
// battle itself is the page's: it gets the opponent chosen, the team and the tactics.

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CombatStrategy } from "@o-mega/game-engine";
import { COMBAT_STRATEGY_LABELS, CombatStrategySelect, CombatTeamPicker } from "@/components/combat-team-picker";
import { useOpenPackReveal } from "@/components/pack-reveal-link";
import { LeagueBadge } from "@/components/ranked-parts";
import {
  claimCombatArenaPrize,
  combatArtUrl,
  fetchCombatArena,
  markCombatDefensesSeen,
  refreshCombatArena,
  saveCombatDefense,
  type CombatArena,
  type CombatArenaDefense,
  type CombatArenaPrize,
  type CombatCard,
} from "@/lib/combat";
import { describeServerError } from "@/lib/errors";
import { describePrize } from "@/lib/ranked";

type View = { kind: "list" } | { kind: "defense" } | { kind: "challenge"; offer: number };
const EMPTY: (CombatCard | null)[] = [null, null, null, null, null];

const signed = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n)}`;

export function CombatArenaPanel({
  cards,
  codeOf,
  closed,
  busy,
  onChallenge,
  initial = null,
}: {
  /** The player's characters with their kit unlocked, one copy each. */
  cards: CombatCard[];
  /** A character's code, for its drawing. */
  codeOf: (definitionId: string) => string | null;
  /** The mode is switched off: nothing can start. */
  closed: boolean;
  busy: boolean;
  onChallenge: (offer: number, team: CombatCard[], auto: boolean, strategy: CombatStrategy) => void;
  /** Fixed data instead of the server's (the development page /prova-arena). */
  initial?: CombatArena | null;
}) {
  const [arena, setArena] = useState<CombatArena | null>(initial);
  const [view, setView] = useState<View>({ kind: "list" });
  const [places, setPlaces] = useState<(CombatCard | null)[]>(EMPTY);
  const [strategy, setStrategy] = useState<CombatStrategy>("balanced");
  const [auto, setAuto] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) return;
    let live = true;
    fetchCombatArena()
      .then((next) => {
        if (!live) return;
        setArena(next);
        // Shown once as new, then read.
        if (next.defenses.some((d) => d.new)) void markCombatDefensesSeen().catch(() => {});
      })
      .catch((cause) => live && setError(describeServerError(cause)));
    return () => {
      live = false;
    };
  }, [initial]);

  if (!arena) return <p className="text-[12px] leading-4 text-muted">{error ?? "Carico le sfide…"}</p>;

  const byDefinition = new Map(cards.map((card) => [card.definitionId, card]));
  const defenseTeam = () => {
    const team = arena.defense?.definition_ids.map((id) => byDefinition.get(id) ?? null) ?? EMPTY;
    return team.length === 5 ? team : EMPTY;
  };
  const ready = places.every((p) => p !== null);

  async function run(action: () => Promise<void>) {
    setSaving(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setSaving(false);
    }
  }

  if (view.kind === "defense") {
    return (
      <section className="flex flex-col gap-2">
        <p className="text-[12px] leading-4 text-muted">
          Cinque dei tuoi personaggi sbloccati: quando qualcuno ti sfida, il computer li guida con la strategia che scegli qui.
        </p>
        {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
        <CombatTeamPicker cards={cards} places={places} onChange={setPlaces} />
        <div className="flex items-center gap-1.5">
          <CombatStrategySelect value={strategy} onChange={setStrategy} label="Strategia della difesa" />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={!ready || saving || closed}
            onClick={() =>
              void run(async () => {
                await saveCombatDefense(
                  places.map((p) => p!.instanceId),
                  { strategy, priority: null, orders: {} },
                );
                setArena(await fetchCombatArena());
                setView({ kind: "list" });
              })
            }
            className="btn btn-primary min-h-11 px-2 text-[13px] disabled:opacity-45"
          >
            {saving ? "Salvo…" : ready ? "Salva la difesa" : `Scegli ancora ${places.filter((p) => p === null).length}`}
          </button>
          <button type="button" onClick={() => setView({ kind: "list" })} className="btn btn-ghost min-h-11 px-2 text-[13px]">
            Annulla
          </button>
        </div>
      </section>
    );
  }

  if (view.kind === "challenge") {
    const offer = arena.offers[view.offer];
    return (
      <section className="flex flex-col gap-2">
        {offer && <Opponent name={offer.name} points={offer.points} computer={offer.kind === "computer"} codes={offer.definition_ids.map(codeOf)} />}
        <p className="text-[12px] leading-4 text-muted">La tua squadra per questa sfida (non cambia la tua difesa).</p>
        <CombatTeamPicker cards={cards} places={places} onChange={setPlaces} />
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setAuto(!auto)} className={`btn ${auto ? "btn-primary" : "btn-ghost"} min-h-10 flex-1 px-2 text-[12px]`}>
            {auto ? "Automatico" : "Manuale"}
          </button>
          <CombatStrategySelect value={strategy} onChange={setStrategy} />
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={!ready || busy || closed || !offer}
            onClick={() => onChallenge(view.offer, places as CombatCard[], auto, strategy)}
            className="btn btn-primary min-h-11 px-2 text-[13px] disabled:opacity-45"
          >
            {busy ? "Preparo la sfida…" : ready ? "Sfida" : `Scegli ancora ${places.filter((p) => p === null).length}`}
          </button>
          <button type="button" onClick={() => setView({ kind: "list" })} className="btn btn-ghost min-h-11 px-2 text-[13px]">
            Annulla
          </button>
        </div>
      </section>
    );
  }

  const strategyName = COMBAT_STRATEGY_LABELS.find((s) => s.code === arena.defense?.tactics.strategy)?.label ?? "Equilibrata";
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-2 rounded-md border-2 border-black bg-panel px-3 py-1.5">
        <span>
          <span className="block text-[11px] font-extrabold uppercase leading-4 text-faint">Gloria</span>
          <span className="flex items-center gap-2">
            <span className="font-display text-3xl leading-8 text-comic-yellow">{arena.points}</span>
            <LeagueBadge league={arena.season.league} />
          </span>
        </span>
        <span className="text-right text-[11px] leading-4 text-muted">
          Sfide premiate oggi
          <span className="block text-[13px] font-extrabold text-foreground">
            {Math.min(arena.paid_today, arena.paid_daily)}/{arena.paid_daily}
          </span>
        </span>
      </div>
      {/* Stage 6b: the season (a month), the place, the challenges its prize asks, the board. */}
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[11px] leading-4 text-muted">
          Stagione di {arena.season.label}
          {arena.season.place ? ` · ${arena.season.place}° posto` : ""} ·{" "}
          {arena.season.challenges >= arena.season.min_challenges
            ? "premio di fine stagione assicurato"
            : `${arena.season.challenges}/${arena.season.min_challenges} sfide per il premio`}
        </p>
        <Link href="/classifiche/?scheda=scontro" className="shrink-0 text-[12px] font-extrabold text-comic-yellow underline">
          Classifica
        </Link>
      </div>
      {arena.prizes.map((prize) => (
        <PrizeLine
          key={prize.season}
          prize={prize}
          onClaimed={() =>
            void fetchCombatArena()
              .then(setArena)
              .catch(() => {})
          }
        />
      ))}
      {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}

      <Title>La tua difesa</Title>
      {arena.defense ? (
        <div className="flex items-center gap-2 rounded-md border-2 border-black bg-panel p-1.5">
          <Thumbs codes={arena.defense.definition_ids.map(codeOf)} />
          <span className="min-w-0 flex-1 truncate text-[11px] font-bold leading-4 text-muted">{strategyName}</span>
          <button
            type="button"
            onClick={() => {
              setPlaces(defenseTeam());
              setStrategy(arena.defense?.tactics.strategy ?? "balanced");
              setView({ kind: "defense" });
            }}
            className="btn btn-ghost min-h-9 shrink-0 px-2 text-[12px]"
          >
            Cambia
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-md border-2 border-black bg-panel p-2">
          <p className="text-[12px] leading-4">Per sfidare gli altri prepara prima la tua squadra in difesa: anche tu potrai essere sfidato.</p>
          <button
            type="button"
            disabled={closed}
            onClick={() => {
              setPlaces(EMPTY);
              setStrategy("balanced");
              setView({ kind: "defense" });
            }}
            className="btn btn-primary min-h-10 px-2 text-[12px] disabled:opacity-45"
          >
            Prepara la difesa
          </button>
        </div>
      )}
      {arena.defense && !arena.defense.ok && (
        <p className="text-[12px] font-bold leading-4 text-comic-magenta">Nella tua difesa c&apos;è una carta che non hai più: rifalla per sfidare ed essere sfidato.</p>
      )}

      {arena.defense && (
        <>
          <Title>Avversari di oggi</Title>
          <ul className="flex flex-col gap-1.5">
            {arena.offers.map((offer, i) => (
              <li key={`${offer.name}-${i}`} className="flex items-center gap-2 rounded-md border-2 border-black bg-panel p-1.5">
                <span className="min-w-0 flex-1">
                  <Opponent name={offer.name} points={offer.points} computer={offer.kind === "computer"} codes={offer.definition_ids.map(codeOf)} bare />
                </span>
                <button
                  type="button"
                  disabled={closed || !arena.defense?.ok || busy}
                  onClick={() => {
                    setPlaces(defenseTeam());
                    setView({ kind: "challenge", offer: i });
                  }}
                  className="btn btn-primary min-h-10 shrink-0 px-3 text-[12px] disabled:opacity-45"
                >
                  Sfida
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={closed || saving || arena.refreshes_left <= 0 || !arena.defense.ok}
            onClick={() => void run(async () => setArena(await refreshCombatArena()))}
            className="btn btn-ghost min-h-10 px-2 text-[12px] disabled:opacity-45"
          >
            Nuovi avversari ·{" "}
            {arena.refreshes_left <= 0 ? "finiti per oggi" : arena.refreshes_left === 1 ? "ne resta 1 oggi" : `ne restano ${arena.refreshes_left} oggi`}
          </button>
        </>
      )}

      <Title>Le tue difese</Title>
      {arena.defenses.length === 0 ? (
        <p className="text-[12px] leading-4 text-muted">Nessuno ti ha ancora sfidato.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {arena.defenses.map((defense, i) => (
            <DefenseRow key={`${defense.finished_at}-${i}`} defense={defense} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** A past season's prize still to claim, on one line: coins on the ledger, packs opened at once. */
function PrizeLine({ prize, onClaimed }: { prize: CombatArenaPrize; onClaimed: () => void }) {
  const openReveal = useOpenPackReveal();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const claim = () => {
    setBusy(true);
    setMessage(null);
    claimCombatArenaPrize(prize.season)
      .then((result) => {
        if (result.opening_ids.length > 0) {
          openReveal(result.opening_ids);
          return;
        }
        setMessage(`+${result.coins} monete: ora ne hai ${result.coin_balance}`);
        setTimeout(onClaimed, 2500);
      })
      .catch((cause: unknown) => setMessage(describeServerError(cause)))
      .finally(() => setBusy(false));
  };
  return (
    <div className="flex min-h-9 items-center justify-between gap-2 bg-comic-yellow py-1 pl-2.5 pr-1 text-black">
      <p className="min-w-0 truncate text-[12px] font-bold leading-4">
        {message ?? `Premio di ${prize.label} (${prize.place}°): ${describePrize(prize)}`}
      </p>
      {!message && (
        <button type="button" disabled={busy} onClick={claim} className="btn min-h-8 shrink-0 bg-black px-2.5 text-[12px] text-comic-yellow disabled:opacity-50">
          {busy ? "…" : "Ritira"}
        </button>
      )}
    </div>
  );
}

function Title({ children }: { children: string }) {
  return <p className="pt-1 text-[12px] font-extrabold uppercase leading-4 text-faint">{children}</p>;
}

function Thumbs({ codes }: { codes: (string | null)[] }) {
  return (
    <span className="flex shrink-0 -space-x-1.5">
      {codes.map((code, i) => (
        <span key={`${code}-${i}`} className="h-8 w-8 overflow-hidden rounded-full border-2 border-black bg-black">
          {code && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={combatArtUrl(code)} alt="" className="h-full w-full object-cover object-[50%_18%]" />
          )}
        </span>
      ))}
    </span>
  );
}

function Opponent({ name, points, computer, codes, bare = false }: { name: string; points: number; computer: boolean; codes: (string | null)[]; bare?: boolean }) {
  return (
    <span className={`flex min-w-0 items-center gap-2 ${bare ? "" : "rounded-md border-2 border-black bg-panel p-1.5"}`}>
      <Thumbs codes={codes} />
      <span className="min-w-0">
        {/* A team of the computer says so in its name, short enough beside its five drawings. */}
        <span className="block truncate text-[13px] font-extrabold leading-4">{computer ? "Computer" : name}</span>
        <span className="block truncate text-[11px] leading-4 text-muted">{points} Gloria</span>
      </span>
    </span>
  );
}

function DefenseRow({ defense }: { defense: CombatArenaDefense }) {
  const outcome = defense.draw ? "pari" : defense.held ? "difesa tenuta" : "difesa persa";
  return (
    <li className="flex items-center gap-2 rounded-md border-2 border-black bg-panel px-2 py-1">
      <span className="min-w-0 flex-1 truncate text-[12px] leading-4">
        <b>{defense.attacker}</b> ti ha sfidato: {outcome}
      </span>
      {defense.new && <span className="shrink-0 bg-comic-magenta px-1 text-[10px] font-black uppercase leading-4 text-black">Nuova</span>}
      <span className={`shrink-0 text-[12px] font-extrabold leading-4 ${defense.points < 0 ? "text-comic-magenta" : "text-comic-yellow"}`}>
        {defense.points === 0 ? "0" : signed(defense.points)}
      </span>
    </li>
  );
}
