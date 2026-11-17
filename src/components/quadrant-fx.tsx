import type { CSSProperties } from "react";
import type { ClashTier } from "@/lib/quadrant";

// The effects of a Quadrante comparison (SPEC §5.14), comic style: the family of the ability
// that wins sets the look (Corpo cracks, Mente waves, Potere bolts, Mestiere cuts), the gap
// between the two numbers sets the size (a little, clearly, crushing). Border threats have
// their own hazard look; a tie shows a padlock. Keyframes: quad-* in globals.css.

export type FxStyle = "body" | "mind" | "power" | "craft" | "threat" | "tie";

const FAMILIES = ["body", "mind", "power", "craft"] as const;

/** The style of an ability family; an unknown family looks like Corpo. */
export function familyStyle(family: string | undefined): FxStyle {
  return (FAMILIES as readonly string[]).includes(family ?? "") ? (family as FxStyle) : "body";
}

/** The families' colours, as in ability_families (comic palette). */
export const FX_COLOR: Record<FxStyle, string> = {
  body: "#ff6a5e",
  mind: "#4db8ff",
  power: "#c58bff",
  craft: "#ffb800",
  threat: "var(--comic-magenta)",
  tie: "#ffffff",
};

const WORDS: Record<FxStyle, readonly [string, string]> = {
  body: ["SBAM!", "KA-BOOM!"],
  mind: ["ZING!", "WHOOOM!"],
  power: ["ZAP!", "KZZZAK!"],
  craft: ["ZAC!", "ZAC-ZAC!"],
  threat: ["AHI!", "AAARGH!"],
  tie: ["BLOCCATO!", "BLOCCATO!"],
};

/** The comic word of a comparison: none when won by a little; a tie is always "blocked". */
export function fxWord(style: FxStyle, tier: ClashTier): string | null {
  if (style === "tie") return WORDS.tie[0];
  return tier === 0 ? null : WORDS[style][tier - 1];
}

const JAGGED = "0,-22 6,-8 21,-11 10,0 19,14 4,8 -5,21 -7,7 -21,11 -11,-2 -19,-15 -5,-9";

function spikes(points: number, outer: number, inner: number): string {
  return Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer * (i % 4 === 0 ? 0.82 : 1);
    const a = (Math.PI * i) / points - Math.PI / 2;
    return `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

const POWER_STAR = spikes(9, 23, 11.5);

function BurstShape({ style }: { style: FxStyle }) {
  const fill = FX_COLOR[style];
  switch (style) {
    case "mind":
      return (
        <>
          <circle r={22} fill="none" stroke="#000" strokeWidth={1.4} />
          <circle r={19.5} fill="none" stroke={fill} strokeWidth={3} />
          <circle r={14.5} fill={fill} stroke="#000" strokeWidth={2.4} />
        </>
      );
    case "power":
      return <polygon points={POWER_STAR} fill={fill} stroke="#000" strokeWidth={2.2} strokeLinejoin="round" />;
    case "craft":
      return (
        <>
          <polygon points="0,-24 4.5,-4.5 24,0 4.5,4.5 0,24 -4.5,4.5 -24,0 -4.5,-4.5" fill={fill} stroke="#000" strokeWidth={2.2} strokeLinejoin="round" />
          <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" transform="rotate(45)" fill="#fff" stroke="#000" strokeWidth={1.6} />
        </>
      );
    case "tie":
      return (
        <>
          <path d="M-15,-17H15V-2C15,9 7,15 0,19C-7,15 -15,9 -15,-2Z" fill="#fff" stroke="#000" strokeWidth={2.4} strokeLinejoin="round" />
          <rect x={-6.5} y={-3} width={13} height={10} fill="#000" />
          <path d="M-4,-3V-7A4,4 0 0 1 4,-7V-3" fill="none" stroke="#000" strokeWidth={2.4} />
        </>
      );
    default:
      return <polygon points={JAGGED} fill={fill} stroke="#000" strokeWidth={2.6} strokeLinejoin="round" />;
  }
}

const BURST_SIZE = [30, 42, 60] as const;
const BURST_SECONDS = [0.56, 0.66, 0.82] as const;

/**
 * The burst where two numbers meet: the winning family's shape, as large as the gap, with the
 * winning ability's code inside once the gap is clear. Placed by its centre (left/top).
 */
export function ClashBurst({
  style,
  tier,
  code,
  delay,
  left,
  top,
}: {
  style: FxStyle;
  tier: ClashTier;
  code: string | null;
  delay: number;
  left: string;
  top: string;
}) {
  const size = style === "tie" ? 36 : BURST_SIZE[tier];
  const spin = style === "mind" || style === "tie" ? "0deg" : "1deg";
  const label = style === "threat" ? "!" : tier >= 1 && style !== "tie" ? code : null;
  return (
    <svg
      aria-hidden
      viewBox="-25 -25 50 50"
      className="quad-fx pointer-events-none absolute overflow-visible"
      style={{
        left,
        top,
        width: size,
        height: size,
        translate: "-50% -50%",
        ["--quad-spin" as string]: spin,
        animation: `quad-burst ${style === "tie" ? 0.75 : BURST_SECONDS[tier]}s ease-out ${delay}s both`,
      }}
    >
      <BurstShape style={style} />
      {label && (
        <text x={0} y={4.2} textAnchor="middle" fontSize={label.length > 1 ? 11.5 : 17} fill="#000" style={{ fontFamily: "var(--display-font)" }}>
          {label}
        </text>
      )}
    </svg>
  );
}

/** The comic word of a comparison, placed by its anchor point (left/top) and tilted. */
export function ClashWord({
  text,
  style,
  tier,
  delay,
  left,
  top,
  anchor,
  tilt,
}: {
  text: string;
  style: FxStyle;
  tier: ClashTier;
  delay: number;
  left: string;
  top: string;
  /** How much of the word sits left of the point, so a word by the grid's sides stays on screen. */
  anchor: string;
  tilt: number;
}) {
  return (
    <span
      aria-hidden
      className="quad-fx quad-fx-extra quad-word pointer-events-none absolute"
      style={{
        left,
        top,
        translate: `${anchor} -50%`,
        rotate: `${tilt}deg`,
        color: style === "tie" ? "var(--muted)" : FX_COLOR[style],
        fontSize: style === "tie" ? 17 : tier === 2 ? 32 : 22,
        animation: `quad-word ${tier === 2 ? 0.9 : 0.76}s ease-out ${delay}s both`,
      }}
    >
      {text}
    </span>
  );
}

// The marks a winning family leaves on the beaten card, drawn as if hit from its left edge
// (0, 50) on a 100 × 100 card, then turned to the edge actually hit.
const CRACKS = [
  ["0,50 16,45 24,53 38,46"],
  ["0,50 16,45 24,53 38,46 52,42 60,50", "16,45 22,32 34,26", "24,53 32,64 28,77"],
  [
    "0,50 16,45 24,53 38,46 52,42 60,50",
    "16,45 22,32 34,26 46,14 44,3",
    "24,53 32,64 28,77 40,88",
    "60,50 74,40 82,46 97,34",
    "60,50 68,64 83,70 93,88",
  ],
] as const;
const BOLTS = [
  ["0,50 18,40 28,56 44,42"],
  ["0,50 20,40 30,57 48,38 60,60 78,44 100,54"],
  ["0,50 20,40 30,57 48,38 60,60 78,44 100,54", "48,38 58,20 70,26 82,6", "60,60 70,79 86,74 96,95"],
] as const;
const SLASHES = [["26,26 74,74"], ["8,26 74,92", "26,8 92,74"], ["2,34 66,98", "14,12 88,86", "36,2 98,64"]] as const;

const TRACE_SECONDS = [0.6, 0.72, 0.9] as const;

/** Where a wave starts: the middle of the edge hit (0 top … 3 left). */
const EDGE_POINT = [
  ["50%", "0%"],
  ["100%", "50%"],
  ["50%", "100%"],
  ["0%", "50%"],
] as const;

/**
 * The mark on a beaten card, inside its face: cracks, waves, a bolt, cuts, or the threat's
 * hazard stripes. `entry` is the edge it was hit on.
 */
export function ClashTrace({ style, tier, entry, delay }: { style: FxStyle; tier: ClashTier; entry: number; delay: number }) {
  const color = FX_COLOR[style];
  const base = "quad-fx quad-fx-extra pointer-events-none absolute inset-0 z-[2]";
  if (style === "tie") return null;
  if (style === "threat") {
    return (
      <span aria-hidden className={base}>
        <span
          className="absolute inset-0"
          style={{
            background: "repeating-linear-gradient(45deg, rgb(255 214 10 / 0.9) 0 7px, rgb(0 0 0 / 0.9) 7px 14px)",
            ["--quad-peak" as string]: [0.35, 0.6, 0.8][tier],
            animation: `quad-hazard ${[0.5, 0.62, 0.76][tier]}s ease-out ${delay}s both`,
          }}
        />
        <span className="absolute inset-0 bg-comic-magenta" style={{ ["--quad-peak" as string]: 0.35, animation: `quad-glow 0.5s ease-out ${delay}s both` }} />
      </span>
    );
  }
  if (style === "mind") {
    const [left, top] = EDGE_POINT[entry];
    const size = [90, 150, 200][tier];
    return (
      <span aria-hidden className={`${base} overflow-hidden`}>
        {Array.from({ length: tier + 1 }, (_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left,
              top,
              width: size,
              height: size,
              translate: "-50% -50%",
              border: `4px solid ${color}`,
              boxShadow: "0 0 0 2px #000, inset 0 0 0 2px #000",
              animation: `quad-wave 0.52s ease-out ${delay + i * 0.11}s both`,
            }}
          />
        ))}
      </span>
    );
  }
  const lines = style === "body" ? CRACKS[tier] : style === "power" ? BOLTS[tier] : SLASHES[tier];
  const outer = style === "body" ? "#000" : color;
  const widths = style === "body" ? [4.5, 1.6] : style === "power" ? [6, 2.2] : [7, 2.4];
  const draw = style === "power" ? 0.09 : style === "craft" ? 0.12 : 0.17;
  const stagger = style === "craft" ? 0.08 : 0.04;
  const angle = ((entry - 3) * 90 + 360) % 360;
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`${base} h-full w-full`}
      style={{ animation: `${style === "power" ? "quad-flicker" : "quad-trace"} ${TRACE_SECONDS[tier]}s linear ${delay}s both` }}
    >
      <g transform={`rotate(${angle} 50 50)`} style={style === "power" ? { filter: `drop-shadow(0 0 3px ${color})` } : undefined}>
        {lines.map((points, i) =>
          [outer, "#fff"].map((stroke, layer) => (
            <polyline
              key={`${i}-${layer}`}
              points={points}
              pathLength={1}
              fill="none"
              stroke={stroke}
              strokeWidth={widths[layer]}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={1}
              style={{ animation: `quad-draw ${draw}s ease-out ${delay + i * stagger}s both` }}
            />
          )),
        )}
      </g>
    </svg>
  );
}

/** The white flash on a card (or a border) beaten by a crushing gap. */
export function ClashFlash({ delay, color = "#fff", peak = 0.85 }: { delay: number; color?: string; peak?: number }) {
  return (
    <span
      aria-hidden
      className="quad-fx quad-fx-extra pointer-events-none absolute inset-0 z-[2]"
      style={{ background: color, ["--quad-peak" as string]: peak, animation: `quad-glow ${peak > 0.6 ? 0.32 : 0.52}s ease-out ${delay}s both` }}
    />
  );
}

/** How a beaten card moves: pushed away from the edge hit when clearly, shaken when crushed. */
export function hitMotion(tier: ClashTier, entry: number, delay: number): string | null {
  if (tier === 0) return null;
  return tier === 2 ? `quad-shake 0.48s ease-out ${delay}s` : `quad-nudge-${(entry + 2) % 4} 0.36s ease-out ${delay}s`;
}

/** What a crushing Mente or Potere does to the art of the card it beats. */
export function artMotion(style: FxStyle, tier: ClashTier, delay: number): string | null {
  if (tier === 0) return null;
  if (style === "mind") return `quad-daze-${tier} 0.52s ease-out ${delay}s`;
  if (style === "power") return `quad-zapped 0.52s ease-out ${delay}s`;
  return null;
}

/** The variables the number keyframes read: how much it swells, tilts, shakes, and where it pushes. */
export function numberVars(tier: ClashTier, tone: string, pushSide: number | null): CSSProperties {
  const push = pushSide === null ? [0, 0] : [[0, -3], [3, 0], [0, 3], [-3, 0]][pushSide];
  return {
    ["--quad-swell" as string]: [1.55, 1.95, 2.45][tier],
    ["--quad-tilt" as string]: tier === 2 ? "-10deg" : "0deg",
    ["--quad-shake" as string]: `${[10, 16, 24][tier]}deg`,
    ["--quad-tone" as string]: tone,
    ["--quad-push-x" as string]: `${push[0]}px`,
    ["--quad-push-y" as string]: `${push[1]}px`,
  };
}
