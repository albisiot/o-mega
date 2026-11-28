"use client";

// Scontro a squadre (SPEC §5.19, docs/COMBAT.md), stage 3: the test page with the ten pilot
// characters and their real kits, played in the browser. A development-only page: next.config.ts
// serves *.dev.tsx pages in `next dev` only, so it is never part of the published site. Nothing is
// saved or paid. Scenes (npm run test:layout plays them all at phone sizes):
//   /prova-scontro/              build a team: five of the ten, in their places, then fight
//   /prova-scontro/?s=squadra    the same, with the «Porto» team already placed
//   /prova-scontro/?s=manuale    Porto against Rivali, the player's turn: three moves to choose
//   /prova-scontro/?s=bersaglio  a move chosen, the targets it can reach lit up
//   /prova-scontro/?s=effetti    statuses, shields, an empty and a full charge, a fighter down
//   /prova-scontro/?s=auto       the computer plays both sides at ×3 to the end
//   /prova-scontro/?s=fine       the end of a battle played at once
//   /prova-scontro/?s=replay     the same battle watched again at ×3
//   /prova-scontro/?s=registro   the log of a whole battle

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { autoCombatFormation, type CombatContext, type CombatFighterInput, type CombatField, type CombatSetup, type CombatState, type CombatStrategy } from "@o-mega/game-engine";
import { CombatViewSwitch } from "@/components/combat-board";
import { CombatScreen, type CombatScreenProps } from "@/components/combat-screen";
import { withBasePath } from "@/lib/base-path";
import { combatRules } from "@/lib/combat";
import { COMBAT_PILOTS, PILOT_BUDGETS, type CombatPilot } from "@/lib/combat-pilot";
import { useLockedScreen } from "@/lib/use-locked-screen";

const FAMILIES = { FOR: "body", VEL: "body", RES: "body", INT: "mind", VOL: "mind", PER: "mind", ENE: "power", MAG: "power", PSI: "power", COM: "craft", TEC: "craft", FUR: "craft" };
const CTX: CombatContext = { rules: combatRules(), families: FAMILIES };
const PLACES = ["F1", "F2", "R1", "R2", "R3"];
const ROLE: Record<string, string> = {
  P001: "Picchiatore",
  P125: "Difensore",
  P204: "Supporto",
  P152: "Guaritore",
  P123: "Controllo",
  P043: "Tiratrice",
  P044: "Incendiario",
  P037: "Infiltrata",
  P213: "Protettore",
  P104: "Distruttore",
};
/** Fields: threats of Nuova Megara with the abilities they require. */
const FIELDS: CombatField[] = [
  { name: "Rapina al treno blindato", abilities: ["FOR", "VEL", "COM"] },
  { name: "Inseguimento sui tetti", abilities: ["VEL", "FUR"] },
  { name: "Robot impazzito", abilities: ["FOR", "TEC", "INT", "PER"] },
  { name: "Golem di cemento", abilities: ["FOR", "RES", "ENE", "COM", "VOL"] },
];
const STRATEGIES: { code: CombatStrategy; label: string }[] = [
  { code: "balanced", label: "Equilibrata" },
  { code: "aggressive", label: "Aggressiva" },
  { code: "defensive", label: "Difensiva" },
  { code: "control", label: "Controllo" },
  { code: "assassin", label: "Assassinio" },
];

const artOf = (code: string) => withBasePath(`/cards/thumb/${code}.webp`);
const input = (p: CombatPilot): CombatFighterInput => ({ id: p.code, definitionId: p.code, name: p.name, stats: p.stats, budget: PILOT_BUDGETS[p.rarity], kit: p.kit });
const team = (name: CombatPilot["team"]) => COMBAT_PILOTS.filter((p) => p.team === name);
const porto = () => autoCombatFormation(team("porto").map(input), CTX);
const rivali = () => autoCombatFormation(team("rivali").map(input), CTX);
/** The scene is over: once the app's splash (it covers the page while the session loads) has gone. */
const markDone = () => {
  const check = () => {
    if (document.querySelector('[role="status"][aria-label="Caricamento"]')) setTimeout(check, 100);
    else document.documentElement.dataset.done = "1";
  };
  check();
};

/** Statuses and the rest on show, for the layout check. */
function showEverything(state: CombatState) {
  const at = (key: string) => state.fighters.find((f) => f.key === key)!;
  at("a0").statuses.push({ code: "empower", turns: 2, fresh: false }, { code: "fortify", turns: 1, fresh: false }, { code: "taunt", turns: 1, fresh: false });
  at("a0").shield = 60;
  at("a0").charge = 6;
  at("a1").statuses.push({ code: "haste", turns: 2, fresh: false });
  at("a2").vita = 0;
  at("a3").charge = 0;
  at("b0").statuses.push({ code: "weaken", turns: 2, fresh: false }, { code: "vulnerable", turns: 2, fresh: false }, { code: "burn", turns: 1, fresh: false });
  at("b1").statuses.push({ code: "stun", turns: 1, fresh: false });
  at("b3").vita = Math.round(at("b3").maxVita * 0.2);
}

type Scene = Partial<CombatScreenProps> & { done: "waiting" | "finished" };
const SCENES: Record<string, Scene | "builder"> = {
  squadra: "builder",
  manuale: { done: "waiting" },
  bersaglio: { preselect: "base", done: "waiting" },
  effetti: { prepare: showEverything, done: "waiting" },
  auto: { auto: true, speed: 3, done: "finished" },
  fine: { finishAtOnce: true, done: "finished" },
  replay: { finishAtOnce: true, replayAtEnd: true, speed: 3, done: "finished" },
  registro: { finishAtOnce: true, logOpen: true, done: "finished" },
};

function Builder(props: { initial: CombatPilot[]; onFight: (setup: CombatSetup, auto: boolean, strategy: CombatStrategy) => void }) {
  const [places, setPlaces] = useState<(CombatPilot | null)[]>(() => [...props.initial, null, null, null, null, null].slice(0, 5));
  const [field, setField] = useState(0);
  const [auto, setAuto] = useState(false);
  const [strategy, setStrategy] = useState<CombatStrategy>("balanced");
  const chosen = places.filter((p): p is CombatPilot => p !== null);
  const toggle = (pilot: CombatPilot) => {
    const at = places.findIndex((p) => p?.code === pilot.code);
    if (at >= 0) setPlaces(places.map((p, i) => (i === at ? null : p)));
    else {
      const free = places.indexOf(null);
      if (free >= 0) setPlaces(places.map((p, i) => (i === free ? pilot : p)));
    }
  };
  const fight = () => {
    const mine = places.map((p) => input(p!));
    const theirs = autoCombatFormation(COMBAT_PILOTS.filter((p) => !chosen.includes(p)).map(input), CTX);
    props.onFight({ a: mine, b: theirs, field: FIELDS[field] }, auto, strategy);
  };
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-3 pb-4 pt-2 text-foreground">
      <p className="font-display text-2xl leading-8">Scontro di prova</p>
      <p className="text-[12px] leading-4 text-muted">Scegli cinque personaggi e mettili al loro posto: due in prima linea, tre dietro. Gli altri cinque sono gli avversari.</p>
      <div className="grid grid-cols-5 gap-1.5">
        {places.map((p, i) => (
          <button key={PLACES[i]} type="button" onClick={() => p && toggle(p)} className={`flex flex-col items-center rounded-md border-2 border-black p-1 ${i < 2 ? "bg-panel-raised" : "bg-panel"}`}>
            <span className="text-[10px] font-black text-faint">{PLACES[i]}</span>
            <span className="h-9 w-9 overflow-hidden rounded-full border-2 border-black bg-black">
              {p && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artOf(p.code)} alt="" className="h-full w-full object-cover object-[50%_18%]" />
              )}
            </span>
            <span className="w-full truncate text-center text-[10px] font-bold leading-4">{p?.name ?? "—"}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {COMBAT_PILOTS.map((p) => {
          const at = places.findIndex((x) => x?.code === p.code);
          return (
            <button key={p.code} type="button" onClick={() => toggle(p)} className={`flex items-center gap-2 rounded-md border-2 p-1 text-left ${at >= 0 ? "border-comic-yellow bg-panel-raised" : "border-black bg-panel"}`}>
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={artOf(p.code)} alt="" className="h-full w-full object-cover object-[50%_18%]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-extrabold leading-4">{p.name}</span>
                <span className="block truncate text-[10px] leading-4 text-faint">
                  {ROLE[p.code]} · {p.rarity[0].toUpperCase() + p.rarity.slice(1)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" onClick={() => setPlaces(porto().map((f) => COMBAT_PILOTS.find((p) => p.code === f.id)!))} className="btn btn-ghost min-h-10 px-2 text-[12px]">
          Squadra del porto
        </button>
        <button type="button" onClick={() => setPlaces(rivali().map((f) => COMBAT_PILOTS.find((p) => p.code === f.id)!))} className="btn btn-ghost min-h-10 px-2 text-[12px]">
          Squadra dei rivali
        </button>
      </div>
      {/* As on /scontro: how the battle is shown on this device. */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[12px] font-bold text-faint">Battaglie con</span>
        <CombatViewSwitch className="flex-1" />
      </div>
      <button type="button" onClick={() => setField((field + 1) % FIELDS.length)} className="btn btn-ghost min-h-10 px-2 text-[12px]">
        Campo: {FIELDS[field].name}
      </button>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => setAuto(!auto)} className={`btn ${auto ? "btn-primary" : "btn-ghost"} min-h-10 flex-1 px-2 text-[12px]`}>
          {auto ? "Automatico" : "Manuale"}
        </button>
        <select value={strategy} onChange={(e) => setStrategy(e.target.value as CombatStrategy)} className="min-h-10 flex-1 rounded-md border-2 border-black bg-panel px-2 text-[12px] font-bold">
          {STRATEGIES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <button type="button" disabled={chosen.length < 5} onClick={fight} className="btn btn-primary min-h-12 px-2 text-[15px] disabled:opacity-45">
        {chosen.length < 5 ? `Scegli ancora ${5 - chosen.length}` : "Combatti"}
      </button>
    </div>
  );
}

function ScontroProof() {
  const scene = useSearchParams().get("s") ?? "";
  const preset = SCENES[scene];
  const [battle, setBattle] = useState<{ setup: CombatSetup; auto: boolean; strategy: CombatStrategy; round: number } | null>(() =>
    preset && preset !== "builder" ? { setup: { a: porto(), b: rivali(), field: FIELDS[2] }, auto: preset.auto ?? false, strategy: "balanced", round: 0 } : null,
  );
  const initialTeam = useMemo(() => (scene === "squadra" ? porto().map((f) => COMBAT_PILOTS.find((p) => p.code === f.id)!) : []), [scene]);
  // The battle fits the phone as on /scontro: the page stays still.
  useLockedScreen(battle !== null);

  useEffect(() => {
    (window as unknown as { __SCENES: string[] }).__SCENES = Object.keys(SCENES);
    if (!preset || preset === "builder") markDone();
  }, [preset]);

  if (!battle) return <Builder initial={initialTeam} onFight={(setup, auto, strategy) => setBattle({ setup, auto, strategy, round: 0 })} />;
  const scenery = preset && preset !== "builder" ? preset : null;
  return (
    <main className="game-shell">
      <CombatScreen
        key={battle.round}
        setup={battle.setup}
        ctx={CTX}
        seed={7 + battle.round}
        tactics={{ a: { strategy: battle.strategy, priority: null, orders: {} } }}
        artOf={artOf}
        codeOf={(id) => id}
        auto={battle.auto}
        // The same top row as /scontro: back, and give up while the battle is on.
        leading={
          <button type="button" onClick={() => setBattle(null)} aria-label="Torna alla squadra" className="btn btn-ghost h-8 w-8 shrink-0 px-0 text-[15px]">
            ←
          </button>
        }
        trailing={
          <button type="button" onClick={() => setBattle(null)} className="btn btn-ghost h-8 shrink-0 px-2 text-[11px]">
            Abbandona
          </button>
        }
        speed={scenery?.speed}
        prepare={scenery?.prepare}
        preselect={scenery?.preselect}
        finishAtOnce={scenery?.finishAtOnce}
        logOpen={scenery?.logOpen}
        replayAtEnd={scenery?.replayAtEnd}
        onWaiting={scenery?.done === "waiting" ? markDone : undefined}
        onFinished={scenery?.done === "finished" ? markDone : undefined}
        onRestart={() => setBattle({ ...battle, round: battle.round + 1 })}
        onChangeTeam={() => setBattle(null)}
      />
    </main>
  );
}

export default function ScontroProofPage() {
  return (
    <Suspense>
      <ScontroProof />
    </Suspense>
  );
}
