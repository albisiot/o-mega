"use client";

// Scontro a squadre (SPEC §5.19, docs/COMBAT.md): what both views of the battle, the 3D board and
// the cards, draw over the characters to say who hits whom and how (src/lib/combat-clarity.ts):
// the arrows from who acts to whom it reaches, the bubble with the move's name, the words that rise
// over a character, its statuses, the preview of a move on a target, a line of the battle with the
// sides in their colours, and the sheet of a character, opened by holding it.

import { useEffect, useRef, type ReactNode } from "react";
import type { CombatContext, CombatFighter, CombatSlot, CombatStatus } from "@o-mega/game-engine";
import { combatMoveReady } from "@o-mega/game-engine";
import { describeMovePlain, type ClarityTone, type Segment, type StepArrow, type StepFloat } from "@/lib/combat-clarity";
import { describeCombatPassive, SLOT_LABELS, STATUS_LABELS } from "@/lib/combat-text";

export type Point = { x: number; y: number };

const ARROW_COLOR: Record<StepArrow["tone"], string> = {
  harm: "var(--comic-magenta)",
  miss: "#8d879e",
  heal: "#3ddc84",
  shield: "var(--comic-cyan)",
  status: "var(--comic-yellow)",
};

/** The arrows of a step, from who acts to each character it reached; drawn again at every step. */
export function ActionArrows({ points, arrows, step }: { points: Map<string, Point>; arrows: StepArrow[]; step: number }) {
  const lines = arrows.flatMap((arrow) => {
    const from = points.get(arrow.from);
    const to = points.get(arrow.to);
    if (!from || !to) return [];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length < 30) return [];
    // Start and stop short of both characters, so the arrow sits between them.
    const ux = dx / length;
    const uy = dy / length;
    const start = { x: from.x + ux * 22, y: from.y + uy * 22 };
    const end = { x: to.x - ux * 26, y: to.y - uy * 26 };
    return [{ arrow, start, end, length: length - 48 }];
  });
  if (!lines.length) return null;
  return (
    <svg key={step} aria-hidden className="pointer-events-none absolute inset-0 z-[3] h-full w-full overflow-visible">
      <defs>
        {(["harm", "miss", "heal", "shield", "status"] as const).map((tone) => (
          <marker key={tone} id={`combat-arrow-${tone}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M1 1L8 5L1 9z" fill={ARROW_COLOR[tone]} stroke="#000" strokeWidth="1" />
          </marker>
        ))}
      </defs>
      {lines.map(({ arrow, start, end, length }) => (
        <g key={arrow.to} style={{ animation: "combat-arrow-fade 1.3s ease-out forwards" }}>
          <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#000" strokeWidth="6" strokeLinecap="round" strokeDasharray={length} style={{ ["--len" as string]: length, animation: "combat-arrow-draw 0.35s ease-out both" }} />
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={ARROW_COLOR[arrow.tone]}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={arrow.tone === "miss" ? "6 6" : length}
            markerEnd={`url(#combat-arrow-${arrow.tone})`}
            style={arrow.tone === "miss" ? undefined : { ["--len" as string]: length, animation: "combat-arrow-draw 0.35s ease-out both" }}
          />
        </g>
      ))}
    </svg>
  );
}

/** The move's name in a comic bubble over who acts, for a moment; the supreme in orange. */
export function MoveBubble({ at, text, slot, step }: { at: Point; text: string; slot: CombatSlot | null; step: number }) {
  return (
    <span
      key={step}
      aria-hidden
      className={`fx-token pointer-events-none z-[4] max-w-[11rem] truncate text-[13px] uppercase ${slot === "supreme" ? "fx-forward" : ""}`}
      style={{ left: at.x, top: at.y, animation: "combat-bubble 1.4s ease-out forwards" }}
    >
      {text}
    </span>
  );
}

/** The colour of a word over a character. */
export function toneClass(tone: ClarityTone): string {
  switch (tone) {
    case "harm":
    case "bad":
      return "text-comic-magenta";
    case "crit":
      return "text-comic-orange";
    case "heal":
    case "good":
      return "text-[#3ddc84]";
    case "shield":
      return "text-comic-cyan";
    case "miss":
      return "text-[#c9c4d6]";
    case "info":
      return "text-comic-yellow";
  }
}

/** The words that rise over a character after a step, one under the other. */
export function RisingWords({ floats, at, step, big }: { floats: StepFloat[]; at: Point; step: number; big?: boolean }) {
  return (
    <>
      {floats.map((float, i) => {
        const number = /^(CRITICO )?[−+]\d/.test(float.text);
        return (
          <span
            key={`${step}-${i}`}
            className={`pointer-events-none absolute z-[5] whitespace-nowrap font-sfx leading-none ${number ? (big ? "text-2xl" : "text-xl") : "text-[15px]"} ${toneClass(float.tone)}`}
            style={{
              left: at.x,
              top: at.y + i * (number ? 20 : 16),
              animation: "combat-float 1.1s ease-out forwards",
              textShadow: "0 2px 0 #000, 0 0 6px #000",
              WebkitTextStroke: number ? "1px #000" : undefined,
            }}
          >
            {float.text}
          </span>
        );
      })}
    </>
  );
}

/**
 * A character's statuses with the turns left: the whole name when it has one, short names when more
 * or when `compact` (the 3D board, where the characters stand close).
 */
export function StatusChips({ statuses, compact, className = "" }: { statuses: CombatStatus[]; compact?: boolean; className?: string }) {
  if (!statuses.length) return null;
  const whole = statuses.length === 1 && !compact;
  return (
    <span className={`flex flex-wrap justify-center gap-[2px] ${className}`}>
      {statuses.slice(0, 4).map((s) => (
        <span
          key={s.code}
          title={`${STATUS_LABELS[s.code].name}, ${s.turns === 1 ? "1 turno" : `${s.turns} turni`}`}
          className={`rounded-[3px] px-[3px] text-[10px] font-black leading-[13px] shadow-[0_1px_0_#000] ${STATUS_LABELS[s.code].good ? "bg-[#3ddc84] text-black" : "bg-comic-magenta text-white"}`}
        >
          {`${whole ? STATUS_LABELS[s.code].name : STATUS_LABELS[s.code].short} ${s.turns}`}
        </span>
      ))}
    </span>
  );
}

/** A line of the battle, the characters in the colours of their side and the move in bold. */
export function BattleLine({ segments, className = "" }: { segments: Segment[]; className?: string }) {
  return (
    <p className={className}>
      {segments.map((segment, i) => (
        <span
          key={i}
          className={segment.side === "mine" ? "font-bold text-comic-cyan" : segment.side === "theirs" ? "font-bold text-comic-magenta" : segment.strong ? "font-extrabold" : undefined}
        >
          {segment.text}
        </span>
      ))}
    </p>
  );
}

/** Press handlers: a tap, or a hold of half a second (a character's sheet). */
export function useHold(onHold: () => void, onTap: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);
  return {
    onPointerDown: () => {
      held.current = false;
      clear();
      timer.current = setTimeout(() => {
        held.current = true;
        onHold();
      }, 450);
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClick: () => {
      clear();
      if (held.current) {
        held.current = false;
        return;
      }
      onTap();
    },
    onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
  };
}

/** A character's sheet in the battle: its Vita, shield and Carica, its statuses, its moves and passive. */
export function FighterSheet({ fighter, mine, ctx, onClose }: { fighter: CombatFighter | null; mine: boolean; ctx: CombatContext; onClose: () => void }) {
  const sheet = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = sheet.current;
    if (!dialog) return;
    if (fighter && !dialog.open) dialog.showModal();
    if (!fighter && dialog.open) dialog.close();
  }, [fighter]);
  const rules = ctx.rules;
  const row = (label: ReactNode, value: ReactNode) => (
    <p className="flex justify-between gap-2 text-[12px] leading-5">
      <span className="text-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </p>
  );
  return (
    <dialog
      ref={sheet}
      aria-label={fighter ? `Scheda di ${fighter.name}` : "Scheda"}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === sheet.current) sheet.current.close();
      }}
      className="m-0 mt-auto w-full max-w-none border-0 border-t-[3px] border-foreground bg-panel p-0 text-foreground backdrop:bg-black/70"
    >
      {fighter && (
        <div className="mx-auto flex max-w-md flex-col gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className={`min-w-0 truncate font-display text-2xl uppercase ${mine ? "text-comic-cyan" : "text-comic-magenta"}`}>{fighter.name}</h2>
            <button type="button" onClick={() => sheet.current?.close()} className="btn btn-ghost">
              Chiudi
            </button>
          </div>
          <div>
            {row("Vita", `${Math.max(0, fighter.vita)} / ${fighter.maxVita}`)}
            {fighter.shield > 0 && row("Scudo", fighter.shield)}
            {row("Carica", `${fighter.charge} / ${rules.charge.max}`)}
            {row("Linea", fighter.position < rules.frontSize ? "Prima" : "Seconda")}
          </div>
          {fighter.statuses.length > 0 && (
            <div>
              <p className="text-[11px] font-extrabold uppercase text-faint">Effetti</p>
              {fighter.statuses.map((s) => (
                <p key={s.code} className={`text-[12px] leading-5 ${STATUS_LABELS[s.code].good ? "text-[#3ddc84]" : "text-comic-magenta"}`}>
                  {STATUS_LABELS[s.code].name}: ancora {s.turns === 1 ? "1 turno" : `${s.turns} turni`}
                </p>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-extrabold uppercase text-faint">Mosse</p>
            {(["base", "special", "supreme"] as const).map((slot) => {
              const move = fighter.kit[slot];
              const ready = combatMoveReady(fighter, slot, rules);
              const when = ready ? "pronta" : slot === "special" ? `tra ${fighter.specialReadyAt - fighter.turns} turni` : `Carica ${fighter.charge}/${rules.charge.max}`;
              return (
                <div key={slot} className="rounded-md border-2 border-black bg-panel-raised px-2 py-1">
                  <p className="flex justify-between gap-2 text-[12px] font-extrabold leading-5">
                    <span>
                      {move.name} <span className="font-bold text-faint">· {SLOT_LABELS[slot]}</span>
                    </span>
                    <span className={ready ? "text-[#3ddc84]" : "text-faint"}>{when}</span>
                  </p>
                  <p className="text-[11px] leading-4 text-muted">{describeMovePlain(move, rules)}</p>
                </div>
              );
            })}
            {fighter.kit.passive && (
              <div className="rounded-md border-2 border-black bg-panel-raised px-2 py-1">
                <p className="text-[12px] font-extrabold leading-5">
                  {fighter.kit.passive.name} <span className="font-bold text-faint">· Passiva</span>
                </p>
                <p className="text-[11px] leading-4 text-muted">{describeCombatPassive(fighter.kit.passive)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}

/** The keyframes of the overlays (one copy per screen). */
export const OVERLAY_KEYFRAMES =
  "@keyframes combat-float{0%{transform:translate(-50%,0);opacity:0}12%{opacity:1}100%{transform:translate(-50%,-30px);opacity:0}}" +
  "@keyframes combat-arrow-draw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}" +
  "@keyframes combat-arrow-fade{0%,70%{opacity:1}100%{opacity:0}}" +
  "@keyframes combat-bubble{0%{transform:scale(.6);opacity:0}12%{transform:scale(1.05);opacity:1}20%{transform:scale(1)}80%{opacity:1}100%{opacity:0}}" +
  "@keyframes combat-lunge{0%,100%{translate:0 0}40%{translate:var(--lx) var(--ly)}}";
