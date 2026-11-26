"use client";

// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 4: battles against the computer, decided by
// the server. The player fields five of their characters that have a kit, in their places, picks
// manual or automatic and the strategy, and fights; a battle left half-way is picked up again. The
// mode starts off (EDITOR → Modalità di gioco): the page says so, and the server refuses anyway.
// A character fights once its kit is unlocked by matches played in the other modes (get_combat_unlocks):
// without five unlocked characters the page shows how far the closest ones are, and no team.

import { useEffect, useState } from "react";
import type { CombatStrategy, CombatTactics } from "@o-mega/game-engine";
import { useRequireSignedIn } from "@/components/auth-provider";
import { BackLink } from "@/components/comic-parts";
import { CombatScreen } from "@/components/combat-screen";
import { LoadingScreen } from "@/components/loading-screen";
import { ReturnLink } from "@/components/return-link";
import { balance } from "@/config/balance";
import {
  abandonCombatBattle,
  actCombatBattle,
  combatArtUrl,
  combatContext,
  combatReady,
  combatUnlocked,
  combatUnlockRule,
  fetchCombatBattle,
  fetchCombatCards,
  fetchCombatCatalog,
  fetchCombatUnlocks,
  finishCombatBattle,
  startCombatBattle,
  type CombatCard,
  type CombatCatalog,
  type CombatUnlocks,
  type CombatUpdate,
} from "@/lib/combat";
import { describeServerError } from "@/lib/errors";
import { statusOf, useModeAvailability } from "@/lib/mode-availability";
import { useNow } from "@/lib/use-now";

const PLACES = ["F1", "F2", "R1", "R2", "R3"];
const STRATEGIES: { code: CombatStrategy; label: string }[] = [
  { code: "balanced", label: "Equilibrata" },
  { code: "aggressive", label: "Aggressiva" },
  { code: "defensive", label: "Difensiva" },
  { code: "control", label: "Controllo" },
  { code: "assassin", label: "Assassinio" },
];
const RARITY: Record<string, string> = { delta: "Delta", gamma: "Gamma", beta: "Beta", alfa: "Alfa", omega: "Omega" };

export default function ScontroPage() {
  const { session } = useRequireSignedIn();
  const modes = useModeAvailability(Boolean(session));
  const now = useNow(60_000);
  const status = statusOf(modes, "combat", now);
  const [catalog, setCatalog] = useState<CombatCatalog | null>(null);
  const [cards, setCards] = useState<CombatCard[] | null>(null);
  const [unlocks, setUnlocks] = useState<CombatUnlocks | null>(null);
  const [battle, setBattle] = useState<{ update: CombatUpdate; startAt: number; round: number } | null>(null);
  /** The battle on screen has reached its end (then there is nothing to give up). */
  const [over, setOver] = useState(false);
  const [places, setPlaces] = useState<(CombatCard | null)[]>([null, null, null, null, null]);
  const [auto, setAuto] = useState(false);
  const [strategy, setStrategy] = useState<CombatStrategy>("balanced");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let live = true;
    (async () => {
      try {
        const [found, active, unlocked] = await Promise.all([fetchCombatCatalog(), fetchCombatBattle(), fetchCombatUnlocks()]);
        const owned = await fetchCombatCards(found.kits);
        if (!live) return;
        setCatalog(found);
        setCards(owned);
        setUnlocks(unlocked);
        // A battle left half-way: back to where it was.
        if (active) setBattle({ update: active, startAt: active.steps.length - 1, round: 0 });
      } catch (cause) {
        if (live) setError(describeServerError(cause));
      }
    })();
    return () => {
      live = false;
    };
  }, [session]);

  if (!session || (cards === null && !error)) return <LoadingScreen label="Preparo lo Scontro…" />;

  const artOf = (definitionId: string) => {
    const code = catalog?.codes.get(definitionId);
    return code ? combatArtUrl(code) : null;
  };
  const tactics: CombatTactics = { strategy, priority: null, orders: {} };
  const teamReady = places.every((p) => p !== null);

  async function fight() {
    setBusy(true);
    setError(null);
    try {
      const update = await startCombatBattle(
        places.map((p) => p!.instanceId),
        auto,
        tactics,
      );
      setOver(false);
      setBattle({ update, startAt: 0, round: (battle?.round ?? 0) + 1 });
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }

  if (battle) {
    const { update } = battle;
    return (
      <main className="flex flex-1 flex-col">
        <CombatScreen
          key={`${update.battleId}-${battle.round}`}
          ctx={combatContext()}
          artOf={artOf}
          auto={update.auto}
          leading={
            <ReturnLink href="/gioca" label="Torna a Gioca" className="btn btn-ghost h-8 w-8 shrink-0 px-0 text-[15px]">
              ←
            </ReturnLink>
          }
          trailing={
            update.status === "active" && !over ? (
              <button
                type="button"
                onClick={async () => {
                  await abandonCombatBattle(update.battleId).catch(() => false);
                  setBattle(null);
                }}
                className="btn btn-ghost h-8 shrink-0 px-2 text-[11px]"
              >
                Abbandona
              </button>
            ) : null
          }
          onFinished={() => setOver(true)}
          remote={{
            steps: update.steps,
            startAt: battle.startAt,
            rewards: update.rewards,
            act: async (action) => {
              const next = await actCombatBattle(update.battleId, action);
              return { steps: next.steps, rewards: next.rewards };
            },
            finish: async () => {
              const next = await finishCombatBattle(update.battleId);
              return { steps: next.steps, rewards: next.rewards };
            },
          }}
          onRestart={() => (teamReady ? void fight() : setBattle(null))}
          onChangeTeam={() => {
            setOver(false);
            setBattle(null);
          }}
        />
      </main>
    );
  }

  const chosen = places.filter((p): p is CombatCard => p !== null);
  const toggle = (card: CombatCard) => {
    const at = places.findIndex((p) => p?.definitionId === card.definitionId);
    if (at >= 0) setPlaces(places.map((p, i) => (i === at ? null : p)));
    else {
      const free = places.indexOf(null);
      if (free >= 0) setPlaces(places.map((p, i) => (i === free ? card : p)));
    }
  };
  const { rewards } = balance.combat;
  const closed = status.open ? null : `Lo Scontro a squadre non è disponibile ora${status.label ? ` · ${status.label}` : ""}.`;
  // The unlock: who can be fielded, and how far the others are (closest first).
  const isUnlocked = (card: CombatCard) => !unlocks || combatUnlocked(unlocks, card.definitionId);
  const done = (card: CombatCard) => unlocks?.progress[card.definitionId] ?? 0;
  const fieldable = (cards ?? []).filter(isUnlocked);
  const waiting = (cards ?? []).filter((card) => !isUnlocked(card)).sort((x, y) => done(y) - done(x) || x.code.localeCompare(y.code));
  const locked = unlocks !== null && !combatReady(unlocks);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-2 px-3 pb-4 pt-2 text-foreground">
      <div className="flex items-center gap-2">
        <BackLink href="/gioca" />
        <p className="font-display text-2xl uppercase leading-8">Scontro a squadre</p>
      </div>
      <p className="text-[12px] leading-4 text-muted">
        Cinque dei tuoi contro cinque del computer: due in prima linea, tre dietro. Le prime {rewards.dailyBattles} battaglie finite di ogni giorno danno {rewards.winXp} XP e{" "}
        {rewards.winCoins} monete se vinci, {rewards.lossXp} XP se perdi. Le carte non si perdono.
      </p>
      {closed && <p className="border-[3px] border-black bg-comic-yellow px-3 py-2 text-sm font-extrabold text-black">{closed}</p>}
      {error && <p className="text-sm font-bold text-comic-magenta">{error}</p>}
      {locked && unlocks ? (
        <section className="flex flex-col gap-2">
          <p className="border-[3px] border-black bg-comic-yellow px-3 py-2 text-sm font-extrabold text-black">
            Per entrare ti servono {unlocks.needed} personaggi con il kit sbloccato: ne hai {unlocks.ready}.
          </p>
          <p className="text-[12px] leading-4 text-muted">{combatUnlockRule(unlocks)}</p>
          {waiting.length > 0 && <p className="text-[12px] font-extrabold uppercase leading-4 text-faint">I più vicini</p>}
          <WaitingList cards={waiting.slice(0, 10)} done={done} unlocks={unlocks} />
          {waiting.length > 10 && <p className="text-[11px] leading-4 text-faint">E altri {waiting.length - 10}.</p>}
        </section>
      ) : cards && fieldable.length < 5 ? (
        <p className="text-[13px] leading-5">Ti servono cinque personaggi con le mosse dello Scontro: ne hai {fieldable.length}.</p>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            {places.map((p, i) => (
              <button key={PLACES[i]} type="button" onClick={() => p && toggle(p)} className={`flex flex-col items-center rounded-md border-2 border-black p-1 ${i < 2 ? "bg-panel-raised" : "bg-panel"}`}>
                <span className="text-[10px] font-black text-faint">{PLACES[i]}</span>
                <span className="h-9 w-9 overflow-hidden rounded-full border-2 border-black bg-black">
                  {p && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={combatArtUrl(p.code)} alt="" className="h-full w-full object-cover object-[50%_18%]" />
                  )}
                </span>
                <span className="w-full truncate text-center text-[10px] font-bold leading-4">{p?.name ?? "—"}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {fieldable.map((card) => {
              const at = places.findIndex((p) => p?.definitionId === card.definitionId);
              return (
                <button key={card.definitionId} type="button" onClick={() => toggle(card)} className={`flex items-center gap-2 rounded-md border-2 p-1 text-left ${at >= 0 ? "border-comic-yellow bg-panel-raised" : "border-black bg-panel"}`}>
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={combatArtUrl(card.code)} alt="" className="h-full w-full object-cover object-[50%_18%]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-extrabold leading-4">{card.name}</span>
                    <span className="block truncate text-[10px] leading-4 text-faint">
                      {RARITY[card.rarity] ?? card.rarity} · {card.kit.supreme.name}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setAuto(!auto)} className={`btn ${auto ? "btn-primary" : "btn-ghost"} min-h-10 flex-1 px-2 text-[12px]`}>
              {auto ? "Automatico" : "Manuale"}
            </button>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value as CombatStrategy)} aria-label="Strategia" className="min-h-10 flex-1 rounded-md border-2 border-black bg-panel px-2 text-[12px] font-bold">
              {STRATEGIES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" disabled={chosen.length < 5 || busy || closed !== null} onClick={() => void fight()} className="btn btn-primary min-h-12 px-2 text-[15px] disabled:opacity-45">
            {busy ? "Preparo lo scontro…" : chosen.length < 5 ? `Scegli ancora ${5 - chosen.length}` : "Combatti"}
          </button>
          {unlocks && waiting.length > 0 && (
            <>
              <p className="pt-1 text-[12px] font-extrabold uppercase leading-4 text-faint">Da sbloccare</p>
              <p className="text-[11px] leading-4 text-muted">{combatUnlockRule(unlocks)}</p>
              <WaitingList cards={waiting.slice(0, 6)} done={done} unlocks={unlocks} />
            </>
          )}
        </>
      )}
    </main>
  );
}

/** Characters whose kit is still locked, closest first: the matches they have of those needed. */
function WaitingList({ cards, done, unlocks }: { cards: CombatCard[]; done: (card: CombatCard) => number; unlocks: CombatUnlocks }) {
  const unit = unlocks.basis === "played" ? "partite" : "vittorie";
  return (
    <ul className="flex flex-col gap-1">
      {cards.map((card) => {
        const n = done(card);
        return (
          <li key={card.definitionId} className="flex items-center gap-2 rounded-md border-2 border-black bg-panel p-1">
            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-black opacity-60 grayscale">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={combatArtUrl(card.code)} alt="" className="h-full w-full object-cover object-[50%_18%]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-extrabold leading-4">{card.name}</span>
              <span aria-hidden className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-black">
                <span className="block h-full bg-comic-yellow" style={{ width: `${Math.min(100, (100 * n) / unlocks.count)}%` }} />
              </span>
            </span>
            <span className="shrink-0 text-[11px] font-bold leading-4 text-faint">
              {n}/{unlocks.count} {unit}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
