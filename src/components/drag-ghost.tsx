"use client";

import { CardLookLayers } from "@/components/card-looks";
import { Silhouette } from "@/components/card-view";
import { artSrcSet } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import type { CardCosmetics } from "@/lib/cosmetics";
import type { MatchCard } from "@/lib/match";

/** The card under the finger while it is dragged (useCardDrag moves it through `ref`). */
export function DragGhost({
  ref,
  card,
  look,
}: {
  ref: (element: HTMLDivElement | null) => void;
  card: MatchCard | null | undefined;
  look: CardCosmetics | null;
}) {
  if (!card) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-50 w-24 border-[3px] border-comic-yellow bg-panel shadow-[5px_5px_0_var(--comic-magenta)]"
    >
      <span className="@container relative block aspect-[3/4] overflow-hidden bg-panel-raised">
        {card.art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={withBasePath(card.art_url)}
            srcSet={artSrcSet(card.art_url)}
            sizes="96px"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        ) : (
          <Silhouette faction={card.faction} accent={card.rarity.color} className="absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2" />
        )}
        <CardLookLayers look={look} card={card} />
      </span>
      <span className="block truncate px-0.5 py-0.5 text-center font-display text-xs uppercase leading-[15px]">{card.name}</span>
    </div>
  );
}
