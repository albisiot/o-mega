"use client";

// Scontro a squadre (SPEC §5.19, docs/COMBAT.md): the battle on screen. The enemies on top, back
// line first; the player's side below, front line first. In manual mode the player picks a move
// and then a target among those the lines allow. Two ways to play: on the test page the engine
// runs in the browser (training, nothing saved); from stage 4, with `remote`, the server decides:
// the screen sends the player's choices and shows the steps it gets back. Either way every step is
// kept and a cursor walks through them, one at a time, at the chosen speed: the same walk shows the
// computer's turns, a battle played at once, and the replay.

import { useEffect, useState, type ReactNode } from "react";
import {
  applyCombatAction,
  chooseCombatAction,
  combatActor,
  combatMoveReady,
  combatTargets,
  combatUpcoming,
  createCombat,
  mulberry32,
  DEFAULT_COMBAT_TACTICS,
  type CombatAction,
  type CombatContext,
  type CombatEvent,
  type CombatFighter,
  type CombatSetup,
  type CombatSlot,
  type CombatState,
  type CombatStep,
  type CombatTactics,
  type Side,
} from "@o-mega/game-engine";
import { combatEventLine, describeCombatMove, SLOT_LABELS, STATUS_LABELS } from "@/lib/combat-text";
import { describeServerError } from "@/lib/errors";

/** Time an action stays on screen before the next, by speed (ms). */
const DELAY: Record<1 | 2 | 3, number> = { 1: 1100, 2: 550, 3: 260 };
const SLOTS: CombatSlot[] = ["base", "special", "supreme"];

/** The prizes of a battle against the computer (stage 4). */
export type CombatScreenRewards = { xp: number; coins: number };
/** What the server answers: the new steps, and the prizes once the battle is over. */
export type CombatScreenUpdate = { steps: CombatStep[]; rewards: CombatScreenRewards | null };

export type CombatScreenProps = {
  ctx: CombatContext;
  playerSide?: Side;
  /** The test page: the battle to play in the browser, its seed, the tactics of both sides. */
  setup?: CombatSetup;
  seed?: number;
  tactics?: Partial<Record<Side, CombatTactics>>;
  /** Stage 4: the server plays; the steps so far, where to start showing them, how to send a choice or finish. */
  remote?: {
    steps: CombatStep[];
    startAt: number;
    rewards: CombatScreenRewards | null;
    act: (action: CombatAction) => Promise<CombatScreenUpdate>;
    finish: () => Promise<CombatScreenUpdate>;
  };
  auto?: boolean;
  speed?: 1 | 2 | 3;
  /** The drawing of a character, by definition id. */
  artOf: (definitionId: string) => string | null;
  /** What the page puts at the two ends of the top row (back, give up): the screen keeps the phone's height. */
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Test scenes: change the battle once it is created, open on a chosen move, play it all at once, show the log. */
  prepare?: (state: CombatState) => void;
  preselect?: CombatSlot;
  finishAtOnce?: boolean;
  logOpen?: boolean;
  replayAtEnd?: boolean;
  /** Called when the player has to choose, and when the battle (or its replay) is over on screen. */
  onWaiting?: () => void;
  onFinished?: () => void;
  onRestart?: () => void;
  onChangeTeam?: () => void;
};

function otherSide(side: Side): Side {
  return side === "a" ? "b" : "a";
}

export function CombatScreen(props: CombatScreenProps) {
  const { ctx, playerSide = "a", artOf, remote } = props;
  const [rng] = useState(() => mulberry32(props.seed ?? 1));
  const tacticsOf = (side: Side) => props.tactics?.[side] ?? DEFAULT_COMBAT_TACTICS;
  const [history, setHistory] = useState<CombatStep[]>(() => {
    if (remote) return remote.steps;
    const first = createCombat(props.setup!, ctx, rng);
    props.prepare?.(first.state);
    if (!props.finishAtOnce) return [first];
    const steps = [first];
    while (!steps.at(-1)!.state.result) {
      const state = steps.at(-1)!.state;
      steps.push(applyCombatAction(state, chooseCombatAction(state, ctx, tacticsOf(combatActor(state)!.side)), ctx, rng));
    }
    return steps;
  });
  /** The step on screen; the steps after it are still to show (the computer's turns, or a replay). */
  const [cursor, setCursor] = useState(() => (remote ? remote.startAt : props.finishAtOnce && !props.replayAtEnd ? history.length - 1 : 0));
  const [auto, setAuto] = useState(props.auto ?? false);
  const [speed, setSpeed] = useState<1 | 2 | 3>(props.speed ?? 1);
  /** The move chosen; undefined until the player touches one (then a test scene's preselect no longer applies). */
  const [chosen, setChosen] = useState<CombatSlot | null | undefined>(undefined);
  const [logOpen, setLogOpen] = useState(props.logOpen ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rewards, setRewards] = useState<CombatScreenRewards | null>(remote?.rewards ?? null);
  /** «Rivedi» was touched: walking back through a finished battle is a replay, not its end being shown. */
  const [replaying, setReplaying] = useState(Boolean(props.finishAtOnce && props.replayAtEnd));

  const end = history.length - 1;
  const latest = history[end];
  const shown = history[Math.min(cursor, end)];
  const shownIndex = Math.min(cursor, end);
  const state = shown.state;
  const atEnd = cursor >= end;
  const actor = combatActor(latest.state);
  const human = atEnd && !pending && !auto && actor !== null && actor.side === playerSide;

  const playerActed = history.some((step) => step.events.some((e) => e.kind === "move" && e.actor.startsWith(playerSide)));
  const selected = chosen !== undefined ? chosen : human && !playerActed ? (props.preselect ?? null) : null;

  const names = new Map(latest.state.fighters.map((f) => [f.key, f.name]));
  const nameOf = (key: string) => names.get(key) ?? key;
  const moveNames = new Map<string, string>();
  for (const f of latest.state.fighters) {
    for (const slot of SLOTS) moveNames.set(f.kit[slot].id, f.kit[slot].name);
    if (f.kit.passive) moveNames.set(f.kit.passive.id, f.kit.passive.name);
  }
  const moveNameOf = (id: string) => moveNames.get(id) ?? id;

  /** The server's answer: its steps after the ones already here, shown from the first new one. */
  async function ask(call: () => Promise<CombatScreenUpdate>, showFirstAtOnce: boolean) {
    setPending(true);
    setError(null);
    try {
      const update = await call();
      setHistory((h) => [...h, ...update.steps]);
      if (showFirstAtOnce && update.steps.length > 0) setCursor(end + 1);
      if (update.rewards) setRewards(update.rewards);
    } catch (cause) {
      setError(describeServerError(cause));
      setAuto(false);
    } finally {
      setPending(false);
    }
  }

  function play(action: CombatAction) {
    setChosen(null);
    if (remote) {
      void ask(() => remote.act(action), true);
      return;
    }
    setHistory((h) => [...h, applyCombatAction(h.at(-1)!.state, action, ctx, rng)]);
    setCursor(end + 1);
  }

  function finish() {
    setChosen(null);
    if (remote) {
      void ask(remote.finish, false).then(() => setCursor(Number.MAX_SAFE_INTEGER));
      return;
    }
    const steps = [...history];
    while (!steps.at(-1)!.state.result) {
      const s = steps.at(-1)!.state;
      steps.push(applyCombatAction(s, chooseCombatAction(s, ctx, tacticsOf(combatActor(s)!.side)), ctx, rng));
    }
    setHistory(steps);
    setCursor(steps.length - 1);
  }

  // The walk through the steps, and what comes when it reaches the last one.
  useEffect(() => {
    if (!atEnd) {
      const timer = setTimeout(() => setCursor(Math.min(cursor, end) + 1), DELAY[speed]);
      return () => clearTimeout(timer);
    }
    if (latest.state.result) {
      props.onFinished?.();
      return;
    }
    if (pending || error) return;
    if (human) {
      props.onWaiting?.();
      return;
    }
    if (remote) {
      // Automatic mode: the server plays the rest with the player's tactics.
      if (!auto) return;
      const timer = setTimeout(() => void ask(remote.finish, false), 0);
      return () => clearTimeout(timer);
    }
    const s = latest.state;
    const timer = setTimeout(() => setHistory((h) => [...h, applyCombatAction(s, chooseCombatAction(s, ctx, tacticsOf(combatActor(s)!.side)), ctx, rng)]), DELAY[speed]);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, end, human, speed, auto, pending, error]);

  const lastMove = shown.events.find((e): e is Extract<CombatEvent, { kind: "move" }> => e.kind === "move");
  const struck = new Set(shown.events.flatMap((e) => (e.kind === "damage" || e.kind === "miss" ? [e.target] : [])));
  const targets = human && selected ? combatTargets(latest.state, actor!, actor!.kit[selected], ctx.rules) : null;
  const floats = floatingNumbers(shown.events);
  const upcoming = state.result ? [] : combatUpcoming(state, ctx.rules, 6);
  const enemy = otherSide(playerSide);
  const row = (side: Side, positions: number[]) => positions.map((p) => state.fighters.find((f) => f.side === side && f.position === p)!);

  const tile = (f: CombatFighter) => (
    <FighterTile
      key={`${f.key}-${shownIndex}`}
      fighter={f}
      art={artOf(f.definitionId)}
      rules={ctx.rules}
      acting={state.current === f.key || lastMove?.actor === f.key}
      struck={struck.has(f.key)}
      targetable={targets?.includes(f.key) ?? false}
      floats={floats.get(f.key) ?? []}
      onTap={targets?.includes(f.key) ? () => play({ slot: selected!, target: f.key }) : undefined}
    />
  );

  const lines: string[] = [];
  for (const step of history.slice(0, shownIndex + 1)) {
    for (const e of step.events) {
      const line = combatEventLine(e, nameOf, moveNameOf, playerSide);
      if (line) lines.push(line);
    }
  }

  if (logOpen) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-3 pb-3 pt-2 text-foreground">
        <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-2">
          <p className="font-display text-2xl leading-8">Registro</p>
          <button type="button" onClick={() => setLogOpen(false)} className="btn btn-ghost min-h-10 px-3 text-[12px]">
            Torna allo scontro
          </button>
        </div>
        <ol className="flex-1 py-2">
          {lines.map((line, i) => (
            <li key={i} className="py-0.5 text-[12px] leading-4">
              {line}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-1 px-3 pb-2 pt-1 text-foreground">
      <style>{"@keyframes combat-float{0%{transform:translate(-50%,0);opacity:0}15%{opacity:1}100%{transform:translate(-50%,-26px);opacity:0}}"}</style>
      <div className="flex min-h-5 items-center gap-2 text-[11px] font-bold text-faint">
        {props.leading}
        <span className="min-w-0 flex-1 truncate">{state.field ? `Campo: ${state.field.name}` : "Nessun campo"}</span>
        <span className="shrink-0">Azione {state.actions}/{ctx.rules.maxActions}</span>
        {props.trailing}
      </div>

      <div className="grid grid-cols-3 gap-1.5">{row(enemy, [2, 3, 4]).map(tile)}</div>
      <div className="flex justify-center gap-1.5">
        {row(enemy, [0, 1]).map((f) => (
          <div key={f.key} className="w-[calc((100%-0.75rem)/3)]">
            {tile(f)}
          </div>
        ))}
      </div>

      <TurnStrip order={upcoming} current={state.current} fighters={state.fighters} artOf={artOf} playerSide={playerSide} />

      <div className="flex justify-center gap-1.5">
        {row(playerSide, [0, 1]).map((f) => (
          <div key={f.key} className="w-[calc((100%-0.75rem)/3)]">
            {tile(f)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">{row(playerSide, [2, 3, 4]).map(tile)}</div>

      {latest.state.result && atEnd ? (
        <EndPanel
          state={latest.state}
          history={history}
          playerSide={playerSide}
          nameOf={nameOf}
          rewards={remote ? rewards : undefined}
          onReplay={() => {
            setReplaying(true);
            setCursor(0);
          }}
          onRestart={props.onRestart}
          onChangeTeam={props.onChangeTeam}
        />
      ) : human ? (
        <div className="rounded-md border-2 border-black bg-panel p-2">
          <p className="mb-1.5 text-[13px] font-bold">
            Tocca a <span className="text-comic-yellow">{actor!.name}</span>
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {SLOTS.map((slot) => {
              const move = actor!.kit[slot];
              const ready = combatMoveReady(actor!, slot, ctx.rules);
              const status =
                slot === "special" && !ready
                  ? `tra ${actor!.specialReadyAt - actor!.turns} turni`
                  : slot === "supreme" && !ready
                    ? `Carica ${actor!.charge}/${ctx.rules.charge.max}`
                    : SLOT_LABELS[slot];
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={!ready}
                  onClick={() => {
                    const targetsOf = combatTargets(latest.state, actor!, move, ctx.rules);
                    if (targetsOf === null) play({ slot, target: null });
                    else setChosen(selected === slot ? null : slot);
                  }}
                  className={`btn ${selected === slot ? "btn-primary" : "btn-ghost"} flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-1 text-center text-[12px] leading-4 disabled:opacity-45`}
                >
                  <span className="font-extrabold">{move.name}</span>
                  <span className="text-[10px] font-bold opacity-80">{status}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 min-h-8 text-[11px] leading-4 text-muted">
            {selected ? `${describeCombatMove(actor!.kit[selected])} Tocca un bersaglio evidenziato.` : "Scegli una mossa."}
          </p>
        </div>
      ) : (
        <div className="min-h-[7.5rem] rounded-md border-2 border-black bg-panel p-2">
          <p className="mb-1 text-[12px] font-bold text-faint">
            {error ?? (replaying && !atEnd ? `Replay · passo ${shownIndex + 1} di ${history.length}` : pending ? "Il server risponde…" : combatActor(state) ? `Tocca a ${combatActor(state)!.name}…` : "")}
          </p>
          {error && (
            <button type="button" onClick={() => setError(null)} className="btn btn-ghost mb-1 min-h-9 px-3 text-[12px]">
              Riprova
            </button>
          )}
          {lines.slice(-4).map((line, i) => (
            <p key={`${shownIndex}-${i}`} className="text-[12px] leading-4">
              {line}
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => setAuto(!auto)} className={`btn ${auto ? "btn-primary" : "btn-ghost"} min-h-9 flex-1 px-2 text-[12px]`}>
          Automatico
        </button>
        {([1, 2, 3] as const).map((s) => (
          <button key={s} type="button" onClick={() => setSpeed(s)} className={`btn ${speed === s ? "btn-primary" : "btn-ghost"} min-h-9 w-11 px-0 text-[12px]`}>
            ×{s}
          </button>
        ))}
        <button type="button" onClick={finish} disabled={latest.state.result !== null || pending} className="btn btn-ghost min-h-9 px-2 text-[12px] disabled:opacity-45">
          Salta
        </button>
        <button type="button" onClick={() => setLogOpen(true)} className="btn btn-ghost min-h-9 px-2 text-[12px]">
          Registro
        </button>
      </div>

    </div>
  );
}

/** The numbers that rise over a tile after a step: damage, misses, healing, shields, burns. */
function floatingNumbers(events: CombatEvent[]): Map<string, { text: string; tone: string }[]> {
  const out = new Map<string, { text: string; tone: string }[]>();
  const add = (key: string, text: string, tone: string) => out.set(key, [...(out.get(key) ?? []), { text, tone }]);
  for (const e of events) {
    if (e.kind === "damage") add(e.target, `−${e.amount}${e.critical ? "!" : ""}`, e.critical ? "text-comic-orange" : "text-comic-magenta");
    else if (e.kind === "miss") add(e.target, "mancato", "text-faint");
    else if (e.kind === "heal" && e.amount > 0) add(e.target, `+${e.amount}`, "text-[#3ddc84]");
    else if (e.kind === "shield" && e.amount > 0) add(e.target, `+${e.amount}`, "text-comic-cyan");
    else if (e.kind === "burn") add(e.target, `−${e.amount}`, "text-comic-orange");
    else if (e.kind === "stunned") add(e.actor, "stordito", "text-comic-yellow");
  }
  return out;
}

function FighterTile(props: {
  fighter: CombatFighter;
  art: string | null;
  rules: CombatContext["rules"];
  acting: boolean;
  struck: boolean;
  targetable: boolean;
  floats: { text: string; tone: string }[];
  onTap?: () => void;
}) {
  const { fighter: f, rules } = props;
  const down = f.vita <= 0;
  const life = Math.max(0, f.vita) / f.maxVita;
  const shield = Math.min(1, f.shield / f.maxVita);
  const ring = props.targetable ? "ring-2 ring-comic-cyan animate-pulse" : props.acting ? "ring-2 ring-comic-yellow" : props.struck ? "ring-2 ring-comic-magenta" : "";
  const badges = f.statuses.slice(0, 4);
  return (
    <button
      type="button"
      onClick={props.onTap}
      disabled={!props.onTap}
      aria-label={`${f.name}, Vita ${f.vita} su ${f.maxVita}`}
      className={`relative flex w-full flex-col overflow-visible rounded-md border-2 border-black bg-panel-raised text-left ${ring} ${down ? "opacity-45 grayscale" : ""}`}
    >
      <div className="relative h-11 w-full overflow-hidden rounded-t-[4px] bg-black">
        {props.art && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.art} alt="" className="h-full w-full object-cover object-[50%_18%]" draggable={false} />
        )}
        {down && <span className="absolute inset-0 grid place-items-center bg-black/55 font-display text-lg text-comic-magenta">KO</span>}
        {badges.length > 0 && (
          <span className="absolute bottom-0.5 left-0.5 right-0.5 flex flex-wrap-reverse gap-[2px]">
            {badges.map((s) => (
              <span key={s.code} className={`rounded-[3px] px-[2px] text-[8px] font-black leading-3 shadow-[0_1px_0_#000] ${STATUS_LABELS[s.code].good ? "bg-[#3ddc84] text-black" : "bg-comic-magenta text-white"}`}>
                {STATUS_LABELS[s.code].short}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="px-1 pb-1 pt-0.5">
        <p className="truncate text-[11px] font-extrabold leading-4">{f.name}</p>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-black">
          <div className="h-full bg-[#3ddc84]" style={{ width: `${life * 100}%` }} />
          <div className="absolute inset-y-0 left-0 bg-comic-cyan/80" style={{ width: `${shield * 100}%` }} />
        </div>
        <div className="mt-1 flex h-2 items-center gap-[3px]" aria-label={`Carica ${f.charge} su ${rules.charge.max}`}>
          {Array.from({ length: rules.charge.max }, (_, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < f.charge ? "bg-comic-yellow" : "bg-black"}`} />
          ))}
        </div>
      </div>
      {props.floats.map((float, i) => (
        <span
          key={i}
          className={`fx-token pointer-events-none absolute left-1/2 font-sfx text-xl ${float.tone}`}
          style={{ top: `${4 + i * 16}px`, animation: "combat-float 0.9s ease-out forwards", textShadow: "0 2px 0 #000" }}
        >
          {float.text}
        </span>
      ))}
    </button>
  );
}

function TurnStrip(props: { order: string[]; current: string | null; fighters: CombatFighter[]; artOf: (id: string) => string | null; playerSide: Side }) {
  const byKey = new Map(props.fighters.map((f) => [f.key, f]));
  const keys = props.current ? [props.current, ...props.order] : props.order;
  return (
    <div className="flex items-center gap-1.5 py-0.5" aria-label="Prossimi turni">
      <span className="shrink-0 text-[10px] font-bold uppercase text-faint">Turni</span>
      {keys.slice(0, 7).map((key, i) => {
        const f = byKey.get(key);
        if (!f) return null;
        const art = props.artOf(f.definitionId);
        return (
          <span
            key={`${key}-${i}`}
            title={f.name}
            className={`relative h-7 w-7 shrink-0 overflow-hidden rounded-full border-2 bg-black ${f.side === props.playerSide ? "border-comic-cyan" : "border-comic-magenta"} ${i === 0 ? "scale-110 ring-2 ring-comic-yellow" : "opacity-80"}`}
          >
            {art && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={art} alt="" className="h-full w-full object-cover object-[50%_18%]" draggable={false} />
            )}
          </span>
        );
      })}
    </div>
  );
}

function EndPanel(props: {
  state: CombatState;
  history: CombatStep[];
  playerSide: Side;
  nameOf: (key: string) => string;
  /** Stage 4: what the battle paid; undefined on the test page. */
  rewards?: CombatScreenRewards | null;
  onReplay: () => void;
  onRestart?: () => void;
  onChangeTeam?: () => void;
}) {
  const result = props.state.result!;
  const title = result.winner === "draw" ? "Pareggio" : result.winner === props.playerSide ? "Vittoria!" : "Sconfitta";
  const dealt = new Map<string, number>();
  for (const step of props.history) for (const e of step.events) if (e.kind === "damage") dealt.set(e.actor, (dealt.get(e.actor) ?? 0) + e.amount);
  const best = [...dealt.entries()].sort((x, y) => y[1] - x[1])[0];
  const standing = (side: Side) => props.state.fighters.filter((f) => f.side === side && f.vita > 0).length;
  return (
    <div className="rounded-md border-[3px] border-black bg-panel p-2.5">
      <p className={`font-display text-3xl leading-9 ${result.winner === props.playerSide ? "text-comic-yellow" : result.winner === "draw" ? "text-foreground" : "text-comic-magenta"}`}>{title}</p>
      <p className="text-[12px] leading-4 text-muted">
        {result.reason === "limit" ? "Dopo 100 azioni." : `In ${props.state.actions} azioni.`} In piedi: {standing(props.playerSide)} dei tuoi, {standing(otherSide(props.playerSide))} degli avversari.
        {best ? ` Più danni: ${props.nameOf(best[0])} (${best[1]}).` : ""}
      </p>
      {props.rewards !== undefined && (
        <p className="mt-1 text-[12px] font-bold leading-4 text-comic-yellow">
          {props.rewards && (props.rewards.xp > 0 || props.rewards.coins > 0)
            ? `+${props.rewards.xp} XP${props.rewards.coins > 0 ? ` · +${props.rewards.coins} monete` : ""}`
            : "Niente premi: hai già giocato gli scontri premiati di oggi."}
        </p>
      )}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button type="button" onClick={props.onReplay} className="btn btn-ghost min-h-11 px-1 text-[12px]">
          Rivedi
        </button>
        <button type="button" onClick={props.onRestart} className="btn btn-primary min-h-11 px-1 text-[12px]">
          Di nuovo
        </button>
        <button type="button" onClick={props.onChangeTeam} className="btn btn-ghost min-h-11 px-1 text-[12px]">
          Squadra
        </button>
      </div>
    </div>
  );
}
