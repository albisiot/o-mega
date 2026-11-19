"use client";

import { createContext, useCallback, useContext, useMemo, type CSSProperties, type ReactNode } from "react";
import { CardArtEffects } from "@/components/card-effects";
import { FrameCorner, isRingFrame } from "@/components/card-frames";
import { cosmeticsByCharacter, opponentCosmetics, type CardCosmetics, type FrameCode, type OpponentLooks } from "@/lib/cosmetics";
import { FACTION_COLORS } from "@/lib/rarity-theme";
import { useCosmetics } from "@/lib/use-cosmetics";

/** Whose card it is: the player's own looks, or the opponent's the match state names. */
export type LookSide = "me" | "opponent";

type Looks = { mine: Map<string, CardCosmetics>; theirs: Map<string, CardCosmetics> };

const NONE: Looks = { mine: new Map(), theirs: new Map() };
const CardLooksContext = createContext<Looks>(NONE);

/**
 * The frames and effects of a screen's cards (SPEC §4.8): the player's own, from their state, and
 * the opponent's, which a match state names for the opposing cards it already shows.
 */
export function CardLooksProvider({ opponent, children }: { opponent?: OpponentLooks | null; children: ReactNode }) {
  const cosmetics = useCosmetics();
  const mine = useMemo(() => cosmeticsByCharacter(cosmetics), [cosmetics]);
  const theirs = useMemo(() => opponentCosmetics(opponent), [opponent]);
  const value = useMemo(() => ({ mine, theirs }), [mine, theirs]);
  return <CardLooksContext value={value}>{children}</CardLooksContext>;
}

/** The look of a character on this screen, the player's own or the opponent's; null without one. */
export function useCardLooks(): (definitionId: string | null | undefined, side: LookSide) => CardCosmetics | null {
  const { mine, theirs } = useContext(CardLooksContext);
  return useCallback(
    (definitionId, side) => (definitionId ? ((side === "me" ? mine : theirs).get(definitionId) ?? null) : null),
    [mine, theirs],
  );
}

/**
 * What a player applied to a character, on a small drawing drawn outside CardView (a hand, a
 * board, a team): the effect over the art and the frame around its edge. It goes in the art's box,
 * right after the drawing and before the tile's marks, which stay on top; the box is `relative`,
 * `overflow-hidden` and a size container (`@container`), as CardArt is.
 */
export function CardLookLayers({ look, card }: { look: CardCosmetics | null | undefined; card: { name: string; faction: string } }) {
  if (!look) return null;
  return (
    <>
      {look.effect && <CardArtEffects effects={[look.effect]} signature={card.name} serial={look.serial} />}
      <LookRing frame={look.frame} faction={card.faction} />
    </>
  );
}

/**
 * A frame drawn over the edge of a drawing: the tile keeps its size and its own border (the
 * rarity, the choice), and a ring of the frame shows just inside it. Inside a `relative` box.
 */
export function LookRing({ frame, faction }: { frame: FrameCode | null; faction: string }) {
  if (!frame) return null;
  if (isRingFrame(frame)) return <span aria-hidden className={`look-ring look-metal card-finish-${frame}`} />;
  return (
    <span
      aria-hidden
      className={`cf cf-sm cf-${frame} look-ring`}
      style={{ "--cf-color": FACTION_COLORS[faction] ?? "#fff8e7" } as CSSProperties}
    >
      {frame === "circuit" && (
        <svg className="cf-trace">
          {/* Along the middle of the ring; where CSS cannot size a rect, it runs along the edge. */}
          <rect
            x="2"
            y="2"
            width="100%"
            height="100%"
            rx={2}
            pathLength={100}
            style={{ width: "calc(100% - 4px)", height: "calc(100% - 4px)" }}
          />
        </svg>
      )}
      {frame === "baroque" && (["tl", "tr", "bl", "br"] as const).map((at) => <FrameCorner key={at} at={at} />)}
    </span>
  );
}
