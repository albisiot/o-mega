"use client";

import { Fragment } from "react";
import { useCardDetail } from "@/components/card-detail";
import { useCardLooks } from "@/components/card-looks";
import { spiedBy, type MatchCard } from "@/lib/match";
import { LONG_PRESS_CLASS } from "@/lib/use-long-press";

/**
 * The opposing characters the player has seen and the opponent still holds: shown by Spia
 * after it played, or by Infiltrato at the start of the match (round 0, SPEC §4.4), and the
 * line names which. Each name opens the card. Nothing when there is none.
 */
export function SeenCards({
  cards,
  rival,
  played,
  className = "mt-1.5 text-xs font-bold",
}: {
  cards: readonly (MatchCard & { round: number })[];
  rival: string;
  /** Definition ids of the opposing characters already played: those are no longer news. */
  played: ReadonlySet<string | null | undefined>;
  className?: string;
}) {
  const detail = useCardDetail();
  const looks = useCardLooks();
  const left = [...new Map(cards.filter((card) => !played.has(card.definition_id)).map((card) => [card.definition_id, card])).values()];
  if (left.length === 0) return null;
  return (
    <p className={className}>
      Con {spiedBy(left)} hai visto: {rival} ha ancora{" "}
      {left.map((card, index) => (
        <Fragment key={card.definition_id}>
          {index > 0 && (index === left.length - 1 ? " e " : ", ")}
          {/* A tap has nothing else to do here: it opens the card's detail too. */}
          <button
            type="button"
            {...detail.press(card, looks(card.definition_id, "opponent"))}
            onClick={() => detail.open(card, looks(card.definition_id, "opponent"))}
            aria-haspopup="dialog"
            className={`font-extrabold underline decoration-dotted underline-offset-2 ${LONG_PRESS_CLASS}`}
          >
            {card.name}
          </button>
        </Fragment>
      ))}
      .
    </p>
  );
}
