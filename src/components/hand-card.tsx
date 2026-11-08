import { Silhouette } from "@/components/card-view";
import { artSrcSet } from "@/lib/art";
import { withBasePath } from "@/lib/base-path";
import { rarityFrame, rarityLetter } from "@/lib/rarity-theme";
import { LONG_PRESS_CLASS, type LongPressHandlers } from "@/lib/use-long-press";

const SCORE_TONES = { pass: "text-comic-cyan", fail: "text-faint" } as const;

type HandCardProps = {
  card: { name: string; faction: string; art_url: string | null; rarity: { name: string; rank: number; color: string } };
  /** Predicted score, shown big on the card. */
  score: number;
  bonus: number;
  /** Emergenza: whether the score beats the threat, told by the number's color. */
  tone?: keyof typeof SCORE_TONES;
  /** A short tag above the card (Emergenza: a lower target for this card). */
  note?: string;
  /** A wider crop of the art, for a hand on two rows. */
  short?: boolean;
  /** The art's displayed width, as an <img sizes> value: phones get the thumbnail. */
  artSizes: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  /** Long-press handlers that open the card's detail; a tap still selects it. */
  press?: LongPressHandlers;
};

/** A card in the hand of the choice phase: portrait art, name and the predicted score. */
export function HandCard({ card, score, bonus, tone, note, short = false, artSizes, selected, disabled, onSelect, press }: HandCardProps) {
  const outcome = tone === "pass" ? ", la supera" : tone === "fail" ? ", non basta" : "";
  return (
    <button
      type="button"
      {...press}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${card.name}, ${score} punti${bonus ? `, ${bonus > 0 ? "+" : ""}${bonus} ${bonus > 0 ? "bonus" : "malus"}` : ""}${outcome}${
        note ? `, ${note}` : ""
      }`}
      className={`relative flex w-full min-w-0 flex-col border-[3px] bg-panel text-left ${LONG_PRESS_CLASS} ${
        selected ? "-translate-y-1.5 border-comic-yellow shadow-[4px_4px_0_var(--comic-magenta)]" : "border-panel-raised"
      }`}
    >
      {note && (
        <span
          aria-hidden
          className="absolute -top-2.5 left-1/2 z-[2] -translate-x-1/2 -skew-x-8 whitespace-nowrap bg-comic-yellow px-1 text-[9.5px] font-extrabold leading-[13px] text-black"
        >
          {note}
        </span>
      )}
      <span className={`relative block bg-panel-raised ${short ? "aspect-[4/3]" : "aspect-[3/4]"}`}>
        {card.art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={withBasePath(card.art_url)}
            srcSet={artSrcSet(card.art_url)}
            sizes={artSizes}
            alt=""
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
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
            selected
              ? "border-black bg-comic-yellow text-black"
              : `border-panel-raised bg-black ${tone ? SCORE_TONES[tone] : "text-foreground"}`
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
