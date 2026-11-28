"use client";

// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 4: battles against the computer, decided by
// the server. The player fields five of their characters that have a kit, in their places, picks
// manual or automatic and the strategy, and fights; a battle left half-way is picked up again. The
// mode starts off (EDITOR → Modalità di gioco): the page says so, and the server refuses anyway.
// A character fights once its kit is unlocked by matches played in the other modes (get_combat_unlocks):
// without five unlocked characters the page shows how far the closest ones are, and no team.
// Stage 6a: a second tab, «Sfide», with the challenges between players (src/components/combat-arena.tsx).

import { useEffect, useState } from "react";
import type { CombatStrategy, CombatTactics } from "@o-mega/game-engine";
import { useRequireSignedIn } from "@/components/auth-provider";
import { BackLink } from "@/components/comic-parts";
import { CombatArenaPanel } from "@/components/combat-arena";
import { CombatViewSwitch, prefetchCombatBoard, useCombatView } from "@/components/combat-board";
import { CombatScreen } from "@/components/combat-screen";
import { CombatStrategySelect, CombatTeamPicker } from "@/components/combat-team-picker";
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
  startArenaBattle,
  startCombatBattle,
  type CombatCard,
  type CombatCatalog,
  type CombatUnlocks,
  type CombatUpdate,
} from "@/lib/combat";
import { describeServerError } from "@/lib/errors";
import { statusOf, useModeAvailability } from "@/lib/mode-availability";
import { useLockedScreen } from "@/lib/use-locked-screen";
import { useNow } from "@/lib/use-now";

type Tab = "computer" | "arena";

export default function ScontroPage() {
  const { session } = useRequireSignedIn();
  const modes = useModeAvailability(Boolean(session));
  const now = useNow(60_000);
  const status = statusOf(modes, "combat", now);
  const [catalog, setCatalog] = useState<CombatCatalog | null>(null);
  const [cards, setCards] = useState<CombatCard[] | null>(null);
  const [unlocks, setUnlocks] = useState<CombatUnlocks | null>(null);
  const [tab, setTab] = useState<Tab>("computer");
  const [battle, setBattle] = useState<{ update: CombatUpdate; startAt: number; round: number } | null>(null);
  /** The battle on screen has reached its end (then there is nothing to give up). */
  const [over, setOver] = useState(false);
  const [places, setPlaces] = useState<(CombatCard | null)[]>([null, null, null, null, null]);
  const [auto, setAuto] = useState(false);
  const [strategy, setStrategy] = useState<CombatStrategy>("balanced");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view] = useCombatView();
  // Fits the phone and never scrolls (see .game-shell): the team, the challenges and the battle
  // scroll inside, under a header that stays.
  useLockedScreen(Boolean(session));

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
        if (active) {
          setBattle({ update: active, startAt: active.steps.length - 1, round: 0 });
          if (active.kind === "arena") setTab("arena");
        }
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

  async function begin(start: () => Promise<CombatUpdate>) {
    // The 3D board downloads while the server prepares the battle.
    if (view === "3d") prefetchCombatBoard();
    setBusy(true);
    setError(null);
    try {
      const update = await start();
      setOver(false);
      setBattle({ update, startAt: 0, round: (battle?.round ?? 0) + 1 });
    } catch (cause) {
      setError(describeServerError(cause));
    } finally {
      setBusy(false);
    }
  }
  const fight = () =>
    begin(() =>
      startCombatBattle(
        places.map((p) => p!.instanceId),
        auto,
        tactics,
      ),
    );
  const challenge = (offer: number, team: CombatCard[], arenaAuto: boolean, arenaStrategy: CombatStrategy) =>
    void begin(() =>
      startArenaBattle(
        offer,
        team.map((card) => card.instanceId),
        arenaAuto,
        { strategy: arenaStrategy, priority: null, orders: {} },
      ),
    );

  if (battle) {
    const { update } = battle;
    const arena = update.kind === "arena";
    // A challenge is not played again: its list of opponents is new. Back to the challenges.
    const back = () => {
      setOver(false);
      setBattle(null);
    };
    return (
      <main className="game-shell">
        <CombatScreen
          key={`${update.battleId}-${battle.round}`}
          ctx={combatContext()}
          artOf={artOf}
          codeOf={(id) => catalog?.codes.get(id) ?? null}
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
                {arena ? "Ritirati" : "Abbandona"}
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
          onRestart={() => (!arena && teamReady ? void fight() : back())}
          onChangeTeam={back}
        />
      </main>
    );
  }

  const { rewards } = balance.combat;
  const closed = status.open ? null : `Lo Scontro a squadre non è disponibile ora${status.label ? ` · ${status.label}` : ""}.`;
  // The unlock: who can be fielded, and how far the others are (closest first).
  const isUnlocked = (card: CombatCard) => !unlocks || combatUnlocked(unlocks, card.definitionId);
  const done = (card: CombatCard) => unlocks?.progress[card.definitionId] ?? 0;
  const fieldable = (cards ?? []).filter(isUnlocked);
  const waiting = (cards ?? []).filter((card) => !isUnlocked(card)).sort((x, y) => done(y) - done(x) || x.code.localeCompare(y.code));
  const locked = unlocks !== null && !combatReady(unlocks);
  const chosen = places.filter((p): p is CombatCard => p !== null);

  return (
    <div className="game-shell text-foreground">
      <header className="mx-auto flex w-full max-w-md shrink-0 items-center gap-2 px-3 pb-1 pt-2">
        <BackLink href="/gioca" />
        <h1 className="font-display text-2xl uppercase leading-8">Scontro a squadre</h1>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-1">
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
              <div role="tablist" aria-label="Contro chi" className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["computer", "Contro il computer"],
                    ["arena", "Sfide"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setTab(key)}
                    className={`btn min-h-10 px-1 text-[12px] ${tab === key ? "btn-primary" : "btn-ghost"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-[12px] font-bold text-faint">Battaglie con</span>
                <CombatViewSwitch className="flex-1" />
              </div>
              {tab === "arena" ? (
                <>
                  <p className="text-[12px] leading-4 text-muted">
                    Sfida la squadra in difesa di altri giocatori, guidata dal computer: vincendo guadagni Gloria, e chi ti sfida la vince o la perde contro la tua difesa.
                    Le prime {balance.combatArena.rewards.dailyBattles} sfide finite di ogni giorno danno {balance.combatArena.rewards.winXp} XP e{" "}
                    {balance.combatArena.rewards.winCoins} monete se vinci, {balance.combatArena.rewards.lossXp} XP se perdi. Le carte non si perdono.
                  </p>
                  <CombatArenaPanel cards={fieldable} codeOf={(id) => catalog?.codes.get(id) ?? null} closed={closed !== null} busy={busy} onChallenge={challenge} />
                </>
              ) : (
                <>
                  <p className="text-[12px] leading-4 text-muted">
                    Cinque dei tuoi contro cinque del computer: due in prima linea, tre dietro. Le prime {rewards.dailyBattles} battaglie finite di ogni giorno danno {rewards.winXp} XP e{" "}
                    {rewards.winCoins} monete se vinci, {rewards.lossXp} XP se perdi. Le carte non si perdono.
                  </p>
                  <CombatTeamPicker cards={fieldable} places={places} onChange={setPlaces} />
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setAuto(!auto)} className={`btn ${auto ? "btn-primary" : "btn-ghost"} min-h-10 flex-1 px-2 text-[12px]`}>
                      {auto ? "Automatico" : "Manuale"}
                    </button>
                    <CombatStrategySelect value={strategy} onChange={setStrategy} />
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
            </>
          )}
        </div>
      </main>
    </div>
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
