import { Silhouette } from "@/components/card-view";
import { withBasePath } from "@/lib/base-path";
import { rarityFrame, rarityLetter } from "@/lib/rarity-theme";

type HandCardProps = {
  card: { name: string; faction: string; art_url: string | null; rarity: { name: string; rank: number; color: string } };
  /** Predicted score, shown big on the card. */
  score: number;
  bonus: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
};

/** A card in the hand of the choice phase: portrait art, name and the predicted score. */
export function HandCard({ card, score, bonus, selected, disabled, onSelect }: HandCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${card.name}, ${score} punti${bonus ? `, ${bonus > 0 ? "+" : ""}${bonus} ${bonus > 0 ? "bonus" : "malus"}` : ""}`}
      className={`relative flex w-full min-w-0 flex-col border-[3px] bg-panel text-left ${
        selected ? "-translate-y-1.5 border-comic-yellow shadow-[4px_4px_0_var(--comic-magenta)]" : "border-panel-raised"
      }`}
    >
      <span className="relative block aspect-[3/4] bg-panel-raised">
        {card.art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={withBasePath(card.art_url)} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
        ) : (
          <Silhouette faction={card.faction} accent={card.rarity.color} className="absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2" />
        )}
        <span
          aria-hidden
          className="absolute left-0.5 top-0.5 flex h-4 w-4 items-center justify-center text-[11px] font-black text-black"
          style={{ background: rarityFrame(card.rarity) }}
        >
          {rarityLetter(card.rarity)}
        </span>
        <span
          aria-hidden
          className={`absolute -bottom-3 left-1/2 z-[1] min-w-10 -translate-x-1/2 -skew-x-8 border-2 px-1.5 text-center font-display text-[25px] leading-[28px] ${
            selected ? "border-black bg-comic-yellow text-black" : "border-panel-raised bg-black text-foreground"
          }`}
        >
          {score}
          {bonus !== 0 && (
            <span
              className={`absolute -right-1.5 -top-2.5 px-1 font-sans text-[10px] font-extrabold leading-[13px] text-black ${
                bonus > 0 ? "bg-comic-cyan" : "bg-comic-magenta"
              }`}
            >
              {bonus > 0 ? `+${bonus}` : bonus}
            </span>
          )}
        </span>
      </span>
      <span aria-hidden className="truncate px-0.5 pb-0.5 pt-3.5 text-center font-display text-xs uppercase leading-[15px]">
        {card.name}
      </span>
    </button>
  );
}
