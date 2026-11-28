"use client";

// Scontro a squadre (SPEC §5.19, docs/COMBAT.md): the battlefield in 3D, every character as its
// whole diorama with its name on a plate (src/lib/combat-board-3d.ts, downloaded with three.js only
// when a battle opens). Over the canvas, where the board says each character stands: the life bar
// with the shield and the Carica under each plate, the statuses on its base, the words of the step,
// KO, the arrows and the bubble of the move (src/components/combat-overlays.tsx), and a button over
// every character: a target, or its sheet. When the phone cannot draw it (no WebGL, the
// context lost, a download failed) onFail hands the battle back to the cards.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CombatContext, CombatFighter, Side } from "@o-mega/game-engine";
import { withBasePath } from "@/lib/base-path";
import { ActionArrows, MoveBubble, RisingWords, StatusChips, useHold } from "@/components/combat-overlays";
import type { BoardAnchor, BoardFighter, BoardLook, CombatBoard } from "@/lib/combat-board-3d";
import { previewParts, type StepView, type TargetPreview } from "@/lib/combat-clarity";

const loadBoard = () => import("@/lib/combat-board-3d");

const VIEW_KEY = "o-mega.combat-view";
const VIEW_EVENT = "o-mega:combat-view";

/** How the battle is shown: the 3D board or the cards. */
export type CombatView = "3d" | "cards";

function readView(): CombatView {
  try {
    return localStorage.getItem(VIEW_KEY) === "cards" ? "cards" : "3d";
  } catch {
    return "3d";
  }
}

function subscribeView(onChange: () => void) {
  window.addEventListener(VIEW_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(VIEW_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The player's choice between the 3D board and the cards, kept on this device; the cards while pre-rendering. */
export function useCombatView(): [CombatView, (view: CombatView) => void] {
  const view = useSyncExternalStore(subscribeView, readView, () => "cards" as const);
  const choose = (next: CombatView) => {
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // A convenience: without storage the choice lasts until the page is left.
    }
    window.dispatchEvent(new Event(VIEW_EVENT));
  };
  return [view, choose];
}

/** The choice between the dioramas in 3D and the cards with the drawings, as two buttons. */
export function ViewSwitch(props: { value: CombatView; onChange: (view: CombatView) => void; compact?: boolean; className?: string }) {
  const options: [CombatView, string][] = [
    ["3d", props.compact ? "3D" : "Diorami 3D"],
    ["cards", "Carte"],
  ];
  return (
    <div role="radiogroup" aria-label="Come vedere la battaglia" className={`flex shrink-0 gap-1 ${props.className ?? ""}`}>
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={props.value === key}
          onClick={() => props.onChange(key)}
          className={`btn ${props.value === key ? "btn-primary" : "btn-ghost"} ${props.compact ? "h-7 px-2 text-[11px]" : "min-h-10 flex-1 px-2 text-[12px]"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** The player's choice on this device, for the Scontro page before a battle. */
export function CombatViewSwitch({ className }: { className?: string }) {
  const [view, choose] = useCombatView();
  return <ViewSwitch value={view} onChange={choose} className={className} />;
}

/** Starts downloading the board's code: the press on «Combatti» comes a moment before the battle. */
export function prefetchCombatBoard() {
  void loadBoard().catch(() => {});
}

export function CombatBoardView(props: {
  fighters: CombatFighter[];
  playerSide: Side;
  codeOf: (definitionId: string) => string | null;
  rules: CombatContext["rules"];
  /** The step on screen: a struck character shakes, who acts leans, the arrows draw again at every new one. */
  step: number;
  /** Who acts at this step (or chooses now): a yellow ring. */
  acting: string | null;
  /** What the step did (src/lib/combat-clarity.ts). */
  view: StepView;
  /** The name of the step's move, for the bubble over who acts. */
  moveName: string | null;
  targets: string[] | null;
  /** While a move is chosen: what it would do to each target, and the enemies it cannot reach. */
  previews: TargetPreview[];
  protectedKeys: string[];
  onTap: (key: string) => void;
  onHold: (key: string) => void;
  onFail: () => void;
}) {
  const { fighters, playerSide, rules, view } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<CombatBoard | null>(null);
  const [anchors, setAnchors] = useState<BoardAnchor[] | null>(null);
  const [ready, setReady] = useState(false);

  const roster: BoardFighter[] = fighters.map((f) => ({
    key: f.key,
    code: props.codeOf(f.definitionId),
    name: f.name,
    player: f.side === playerSide,
    position: f.position,
  }));
  const rosterKey = roster.map((f) => `${f.key}:${f.code}:${f.player ? 1 : 0}`).join("|");
  const struck = new Set(view.struck);
  const looks: BoardLook[] = fighters.map((f) => ({
    key: f.key,
    acting: props.acting === f.key,
    targetable: props.targets?.includes(f.key) ?? false,
    struck: struck.has(f.key),
    down: f.vita <= 0,
  }));
  const reached = view.arrows.find((arrow) => arrow.tone !== "miss") ?? view.arrows[0];
  const lunge = view.actor && reached ? { from: view.actor, to: reached.to } : null;
  const latest = useRef({ looks, step: props.step, lunge, roster, onFail: props.onFail });
  useEffect(() => {
    latest.current = { looks, step: props.step, lunge, roster, onFail: props.onFail };
  });

  // The board: built once per battle (its ten characters), dropped when the battle leaves.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let board: CombatBoard | null = null;
    loadBoard()
      .then(({ mountCombatBoard }) =>
        mountCombatBoard(canvas, latest.current.roster, {
          fontUrl: (font) => withBasePath(`/fonts/names/${font}.json`),
          onAnchors: (next) => {
            if (!cancelled) setAnchors(next);
          },
          onLost: () => {
            if (!cancelled) latest.current.onFail();
          },
          isCancelled: () => cancelled,
        }),
      )
      .then((made) => {
        if (!made) return;
        if (cancelled) {
          made.dispose();
          return;
        }
        board = made;
        boardRef.current = made;
        made.show(latest.current.looks, latest.current.step, latest.current.lunge);
        setReady(true);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        console.error("Combat board failed", cause);
        latest.current.onFail();
      });
    return () => {
      cancelled = true;
      boardRef.current = null;
      board?.dispose();
    };
  }, [rosterKey]);

  const looksKey = looks.map((look) => `${look.key}${+look.acting}${+look.targetable}${+look.struck}${+look.down}`).join("");
  useEffect(() => {
    boardRef.current?.show(latest.current.looks, latest.current.step, latest.current.lunge);
  }, [looksKey, props.step, ready]);

  const byKey = new Map(fighters.map((f) => [f.key, f]));
  const middles = new Map((anchors ?? []).map((anchor) => [anchor.key, anchor.middle]));
  const previews = new Map(props.previews.map((preview) => [preview.key, preview]));
  const actorAnchor = view.actor ? anchors?.find((anchor) => anchor.key === view.actor) : undefined;
  // The far row first, so the buttons of the nearer characters lie on top.
  const order = [...(anchors ?? [])].sort((a, b) => a.box.y + a.box.height - (b.box.y + b.box.height));

  return (
    <div className="relative min-h-64 flex-1 overflow-hidden">
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
      {!ready && <p className="absolute inset-0 grid place-items-center text-[12px] font-bold text-faint">Preparo il campo…</p>}
      {ready &&
        anchors?.map((anchor) => {
          const f = byKey.get(anchor.key);
          if (!f) return null;
          const down = f.vita <= 0;
          const life = Math.max(0, f.vita) / f.maxVita;
          const shield = Math.min(1, f.shield / f.maxVita);
          const preview = previews.get(f.key);
          return (
            <div key={anchor.key} className="pointer-events-none">
              <div className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5" style={{ left: anchor.hud.x, top: anchor.hud.y }}>
                <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-black ring-1 ring-black">
                  <div className="h-full bg-[#3ddc84]" style={{ width: `${life * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-comic-cyan/80" style={{ width: `${shield * 100}%` }} />
                </div>
                <div className="flex h-2 items-center gap-[3px]" aria-hidden>
                  {Array.from({ length: rules.charge.max }, (_, i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < f.charge ? "bg-comic-yellow" : "bg-black ring-1 ring-white/20"}`} />
                  ))}
                </div>
              </div>
              {/* The statuses sit on the character's own base, just above its plate. */}
              {!down && f.statuses.length > 0 && (
                <div className="absolute w-24 -translate-x-1/2 -translate-y-full" style={{ left: anchor.plate.x, top: anchor.plate.y - 1 }}>
                  <StatusChips statuses={f.statuses} compact />
                </div>
              )}
              {down && (
                <span className="absolute -translate-x-1/2 -translate-y-1/2 font-sfx text-2xl text-comic-magenta [text-shadow:0_2px_0_#000]" style={{ left: anchor.middle.x, top: anchor.middle.y }}>
                  KO
                </span>
              )}
              {preview && (
                <span className="absolute z-[4] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-md bg-black/85 px-1 py-px text-center ring-2 ring-comic-cyan" style={{ left: anchor.middle.x, top: anchor.middle.y }}>
                  <span className="whitespace-nowrap text-[13px] font-black leading-4 text-comic-cyan">{previewParts(preview).main}</span>
                  {preview.hitPercent !== null && <span className="text-[10px] font-bold leading-3 text-[#c9c4d6]">{preview.hitPercent}%</span>}
                  {preview.covered && <span className="text-[10px] font-bold leading-3 text-[#c9c4d6]">coperto</span>}
                </span>
              )}
              {props.protectedKeys.includes(f.key) && (
                <span className="absolute z-[4] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-black/85 px-1.5 text-[11px] font-black leading-4 text-[#c9c4d6] ring-1 ring-[#8d879e]" style={{ left: anchor.middle.x, top: anchor.middle.y }}>
                  protetto
                </span>
              )}
              <RisingWords floats={view.floats.get(f.key) ?? []} at={{ x: anchor.middle.x, y: anchor.middle.y - 22 }} step={props.step} big />
            </div>
          );
        })}
      {ready && <ActionArrows points={middles} arrows={view.arrows} step={props.step} />}
      {ready && actorAnchor && props.moveName && (
        <MoveBubble at={{ x: actorAnchor.box.x + actorAnchor.box.width / 2, y: actorAnchor.box.y + 8 }} text={props.moveName} slot={view.slot} step={props.step} />
      )}
      {ready &&
        order.map((anchor) => {
          const f = byKey.get(anchor.key);
          if (!f) return null;
          return (
            <BoardHit
              key={`tap-${anchor.key}`}
              anchor={anchor}
              fighter={f}
              targetable={props.targets?.includes(f.key) ?? false}
              onTap={props.onTap}
              onHold={props.onHold}
            />
          );
        })}
    </div>
  );
}

/** The button over a character: a tap picks it as the target, or opens its sheet; holding it opens the sheet. */
function BoardHit(props: { anchor: BoardAnchor; fighter: CombatFighter; targetable: boolean; onTap: (key: string) => void; onHold: (key: string) => void }) {
  const { anchor, fighter: f, targetable } = props;
  const press = useHold(
    () => props.onHold(f.key),
    () => (targetable ? props.onTap(f.key) : props.onHold(f.key)),
  );
  return (
    <button
      type="button"
      {...press}
      aria-label={`${f.name}, Vita ${Math.max(0, f.vita)} su ${f.maxVita}${targetable ? ", bersaglio" : ", tocca per la scheda"}`}
      className={`absolute z-[6] select-none rounded-xl [-webkit-touch-callout:none] ${targetable ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-comic-cyan" : "focus-visible:outline-2 focus-visible:outline-white/40"}`}
      style={{ left: anchor.box.x, top: anchor.box.y, width: anchor.box.width, height: anchor.box.height }}
    />
  );
}
