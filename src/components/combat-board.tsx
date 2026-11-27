"use client";

// Scontro a squadre (SPEC §5.19, docs/COMBAT.md): the battlefield in 3D, every character as its
// whole diorama with its name on a plate (src/lib/combat-board-3d.ts, downloaded with three.js only
// when a battle opens). Over the canvas, where the board says each character stands: the life bar
// with the shield, the statuses and the Carica under each plate, the numbers of the step, KO, and
// a button over every character for the targets. When the phone cannot draw it (no WebGL, the
// context lost, a download failed) onFail hands the battle back to the cards.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CombatContext, CombatFighter, Side } from "@o-mega/game-engine";
import { withBasePath } from "@/lib/base-path";
import type { BoardAnchor, BoardFighter, BoardLook, CombatBoard } from "@/lib/combat-board-3d";
import { STATUS_LABELS } from "@/lib/combat-text";

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
  /** The step on screen: a struck character shakes again at every new one. */
  step: number;
  acting: Set<string>;
  struck: Set<string>;
  targets: string[] | null;
  floats: Map<string, { text: string; tone: string }[]>;
  onTap: (key: string) => void;
  onFail: () => void;
}) {
  const { fighters, playerSide, rules } = props;
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
  const looks: BoardLook[] = fighters.map((f) => ({
    key: f.key,
    acting: props.acting.has(f.key),
    targetable: props.targets?.includes(f.key) ?? false,
    struck: props.struck.has(f.key),
    down: f.vita <= 0,
  }));
  const latest = useRef({ looks, step: props.step, roster, onFail: props.onFail });
  useEffect(() => {
    latest.current = { looks, step: props.step, roster, onFail: props.onFail };
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
        made.show(latest.current.looks, latest.current.step);
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
    boardRef.current?.show(latest.current.looks, latest.current.step);
  }, [looksKey, props.step, ready]);

  const byKey = new Map(fighters.map((f) => [f.key, f]));
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
          const floats = props.floats.get(f.key) ?? [];
          return (
            <div key={anchor.key} className="pointer-events-none">
              <div className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5" style={{ left: anchor.hud.x, top: anchor.hud.y }}>
                <div className="flex items-center gap-[3px]">
                  <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-black ring-1 ring-black">
                    <div className="h-full bg-[#3ddc84]" style={{ width: `${life * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-comic-cyan/80" style={{ width: `${shield * 100}%` }} />
                  </div>
                </div>
                <div className="flex h-2 items-center gap-[3px]" aria-hidden>
                  {Array.from({ length: rules.charge.max }, (_, i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < f.charge ? "bg-comic-yellow" : "bg-black ring-1 ring-white/20"}`} />
                  ))}
                </div>
                {f.statuses.length > 0 && (
                  <div className="flex gap-[2px]">
                    {f.statuses.slice(0, 3).map((s) => (
                      <span
                        key={s.code}
                        className={`rounded-[3px] px-[2px] text-[8px] font-black leading-3 shadow-[0_1px_0_#000] ${STATUS_LABELS[s.code].good ? "bg-[#3ddc84] text-black" : "bg-comic-magenta text-white"}`}
                      >
                        {STATUS_LABELS[s.code].short}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {down && (
                <span className="absolute -translate-x-1/2 -translate-y-1/2 font-sfx text-2xl text-comic-magenta [text-shadow:0_2px_0_#000]" style={{ left: anchor.middle.x, top: anchor.middle.y }}>
                  KO
                </span>
              )}
              {floats.map((float, i) => (
                <span
                  key={`${props.step}-${i}`}
                  className={`absolute font-sfx text-2xl leading-none ${float.tone}`}
                  style={{
                    left: anchor.middle.x,
                    top: anchor.middle.y - 18 + i * 20,
                    animation: "combat-float 0.9s ease-out forwards",
                    textShadow: "0 2px 0 #000, 0 0 6px #000",
                    WebkitTextStroke: "1px #000",
                  }}
                >
                  {float.text}
                </span>
              ))}
            </div>
          );
        })}
      {ready &&
        order.map((anchor) => {
          const f = byKey.get(anchor.key);
          if (!f) return null;
          const targetable = props.targets?.includes(f.key) ?? false;
          return (
            <button
              key={`tap-${anchor.key}`}
              type="button"
              disabled={!targetable}
              onClick={() => props.onTap(f.key)}
              aria-label={`${f.name}, Vita ${Math.max(0, f.vita)} su ${f.maxVita}${targetable ? ", bersaglio" : ""}`}
              className={`absolute rounded-xl ${targetable ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-comic-cyan" : "pointer-events-none"}`}
              style={{ left: anchor.box.x, top: anchor.box.y, width: anchor.box.width, height: anchor.box.height }}
            />
          );
        })}
    </div>
  );
}
