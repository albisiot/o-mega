import type { CSSProperties, ReactNode } from "react";
import { RING_FRAMES, type FrameCode } from "@/lib/cosmetics";
import { FACTION_COLORS, isFoil, rarityFrame } from "@/lib/rarity-theme";

type Rarity = { name: string; rank: number; color: string };
type Size = "lg" | "sm";

type WrapFrame = Exclude<FrameCode, "silver" | "gold" | "prism">;

export const isRingFrame = (frame: FrameCode | null | undefined): boolean => frame != null && RING_FRAMES.includes(frame);

/**
 * The card's own frame: the rarity's color, inside a metal ring for Argento, Oro and Prisma. The
 * ring takes the outer part of the frame, so the card keeps its width and the rarity still reads.
 */
export function ringFrame(
  rarity: Rarity,
  frame: FrameCode | null | undefined,
  size: Size,
): { className: string; style: CSSProperties } {
  const plainPadding = size === "lg" ? "p-[7px]" : "p-1";
  if (!isRingFrame(frame)) return { className: plainPadding, style: { background: rarityFrame(rarity) } };
  const inner = isFoil(rarity) ? rarityFrame(rarity) : `linear-gradient(${rarity.color}, ${rarity.color})`;
  // Large cards only: the light runs around the ring.
  const moving = size === "lg" && frame !== "silver" ? " card-finish-moving" : "";
  return {
    className: `card-finish card-finish-${frame}${moving} ${size === "lg" ? "border-[5px] p-1" : "border-[3px] p-0.5"}`,
    style: { "--finish-inner": inner } as CSSProperties,
  };
}

/** Room around the card, in px: sides, and the top where it differs (the label of a Gradata). */
const ROOM: Record<WrapFrame, Record<Size, [number, number?]>> = {
  slab: { lg: [12, 76], sm: [4, 19] },
  slab_black: { lg: [12, 76], sm: [4, 19] },
  neon: { lg: [10], sm: [4] },
  magma: { lg: [10], sm: [4] },
  ice: { lg: [10], sm: [4] },
  circuit: { lg: [10], sm: [4] },
  comic: { lg: [11], sm: [4] },
  baroque: { lg: [13], sm: [5] },
  marble: { lg: [10], sm: [4] },
  carbon: { lg: [10], sm: [4] },
  void: { lg: [10], sm: [4] },
  pixel: { lg: [12], sm: [5] },
};

/**
 * A frame that wraps the card (all but the rings). A large card is shrunk inside so the whole
 * stays 300px wide; a small one fills its place. `card` names the Gradata's label.
 */
export function FrameShell({
  frame,
  size,
  card,
  fit = false,
  children,
}: {
  frame: FrameCode | null | undefined;
  size: Size;
  card: { name: string; code?: string; faction: string; rarity: Rarity };
  /** Inside a flex column that gives the card the height it has (the card's page). */
  fit?: boolean;
  children: ReactNode;
}) {
  if (!frame || isRingFrame(frame)) return children;
  const [side, top = side] = ROOM[frame as WrapFrame][size];
  const column = fit ? "flex min-h-0 flex-col" : "";
  return (
    <div
      className={`cf cf-${frame} cf-${size} ${column}`}
      style={{ padding: side, paddingTop: top, "--cf-color": FACTION_COLORS[card.faction] ?? "#fff8e7" } as CSSProperties}
    >
      {(frame === "slab" || frame === "slab_black") && <SlabLabel card={card} best={frame === "slab_black"} size={size} />}
      {frame === "circuit" && (
        <svg aria-hidden className="cf-trace">
          <rect x="1.6%" y="1.1%" width="96.8%" height="97.8%" rx={size === "lg" ? 9 : 4} pathLength={100} />
        </svg>
      )}
      {frame === "baroque" && (["tl", "tr", "bl", "br"] as const).map((at) => <Corner key={at} at={at} />)}
      <div className={`cf-card ${column}`} style={size === "lg" ? { zoom: (300 - 2 * side) / 300 } : undefined}>
        {children}
      </div>
    </div>
  );
}

function SlabLabel({ card, best, size }: { card: { name: string; code?: string; rarity: Rarity }; best: boolean; size: Size }) {
  const grade = best ? "Assoluta" : "Gemma";
  if (size === "sm") {
    return (
      <div aria-hidden className="cf-label">
        <span className="cf-barcode flex-1" />
        <span className="cf-grade">
          <b className="font-display">10</b>
        </span>
      </div>
    );
  }
  return (
    <div className="cf-label" aria-label={`Carta gradata: 10, ${grade}`}>
      <div className="cf-label-text" aria-hidden>
        <span className="cf-label-brand">O-MEGA · Carta certificata</span>
        <span className="cf-label-name">
          {card.name} · {card.rarity.name} {card.code?.replace(/^\D+/, "")}
        </span>
        <span className="cf-barcode" />
        <span className="cf-label-serial">N. {serialFor(card.code ?? card.name)}</span>
      </div>
      <div className="cf-grade" aria-hidden>
        <b className="font-display">10</b>
        <span>{grade}</span>
      </div>
    </div>
  );
}

/** A certificate number that looks real and stays the same for a character. */
function serialFor(seed: string): string {
  let hash = 7;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 100_000_000;
  const digits = String(hash).padStart(8, "0");
  return `${digits.slice(0, 4)} ${digits.slice(4)}`;
}

function Corner({ at }: { at: "tl" | "tr" | "bl" | "br" }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={`cf-corner cf-corner-${at}`}>
      <defs>
        <linearGradient id="cf-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff2b0" />
          <stop offset="0.45" stopColor="#d9a441" />
          <stop offset="1" stopColor="#7a4c14" />
        </linearGradient>
      </defs>
      <g fill="url(#cf-gold)" stroke="#2a1604" strokeWidth="1.1" strokeLinejoin="round">
        <path d="M9 2.5 46 6.5 9 11z" />
        <path d="M2.5 9 6.5 46 11 9z" />
        <path d="M13 13c7-2 11 1 11 5s-5 5-6 2" fill="none" stroke="url(#cf-gold)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="7" cy="7" r="6" />
        <circle cx="7" cy="7" r="2.4" fill="#2a1604" />
      </g>
    </svg>
  );
}
