import type { CSSProperties } from "react";
import { STAR_NAMES, STORY_STARS, starCondition, type StarRulesText, type StoryStar } from "@/lib/story-stars";

const STAR_PATH = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

/**
 * The color that marks the cards fitting a star in the team picker: the Rarità star is cyan,
 * the Tratti star magenta (the 3-0 star depends on the match, not on the cards).
 */
export const STAR_MARK_COLORS: Record<StoryStar, string> = {
  flawless: "var(--comic-yellow)",
  rarities: "var(--comic-cyan)",
  traits: "var(--comic-magenta)",
};

/** One star: yellow when earned (or the given color), an outline when not. */
export function StarIcon({
  filled,
  color = "var(--comic-yellow)",
  className = "h-4 w-4",
  style,
}: {
  filled: boolean;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} style={style} aria-hidden>
      <path
        d={STAR_PATH}
        fill={filled ? color : "none"}
        stroke={filled ? "#000" : "var(--line)"}
        strokeWidth={filled ? 1.6 : 2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The three stars of a mission in their order, as a small cluster. */
export function MissionStars({ earned, className = "h-4 w-4" }: { earned: readonly StoryStar[]; className?: string }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5" role="img" aria-label={`${earned.length} stelle su 3`}>
      {STORY_STARS.map((star) => (
        <StarIcon key={star} filled={earned.includes(star)} className={className} />
      ))}
    </span>
  );
}

/** "★ 12/15": the stars of a chapter or a season. */
export function StarCount({ earned, total, className = "" }: { earned: number; total: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 whitespace-nowrap ${className}`} aria-label={`${earned} stelle su ${total}`}>
      <StarIcon filled={earned > 0} className="h-[1.05em] w-[1.05em]" />
      <span aria-hidden>
        {earned}/{total}
      </span>
    </span>
  );
}

/**
 * What every star of a mission asks, one per line, with the star earned or not. `tone`
 * paints the line of a star: on the result, the stars this match met or earned now.
 */
export function StarConditions({
  rules,
  earned,
  coins,
  tone,
  className = "",
}: {
  rules: StarRulesText;
  earned: readonly StoryStar[];
  /** Coins each star pays the first time: shown once, at the end. */
  coins?: number;
  tone?: (star: StoryStar) => string | null;
  className?: string;
}) {
  return (
    <ul className={`flex flex-col gap-1 ${className}`} aria-label="Stelle della missione">
      {STORY_STARS.map((star) => {
        const has = earned.includes(star);
        return (
          <li key={star} className="flex items-start gap-1.5 text-[13px] font-semibold leading-4">
            <StarIcon filled={has} className="mt-px h-4 w-4" />
            <span className="min-w-0">
              <span className="font-extrabold uppercase">{STAR_NAMES[star]}</span>{" "}
              <span className={tone?.(star) ?? (has ? "text-muted" : "")}>{starCondition(star, rules)}</span>
              <span className="sr-only">{has ? ": ottenuta" : ": da ottenere"}</span>
            </span>
          </li>
        );
      })}
      {coins !== undefined && coins > 0 && (
        <li className="pl-[22px] text-[11px] font-semibold leading-[14px] text-faint">
          Ogni stella vale {coins} monete la prima volta che la ottieni, anche rigiocando.
        </li>
      )}
    </ul>
  );
}

/**
 * The stars on the result of a mission match. Those earned now land one after the other
 * with a ring around them; those earned before stay full; the others stay empty.
 */
export function EarnedStars({
  now,
  had,
  small = false,
}: {
  now: readonly StoryStar[];
  had: readonly StoryStar[];
  small?: boolean;
}) {
  let order = 0;
  const size = small ? "h-7 w-7" : "h-10 w-10";
  return (
    <span
      className={`flex -skew-x-8 items-end justify-center bg-black ${small ? "gap-1 px-2 py-1" : "gap-2 px-3 py-1.5"}`}
      role="img"
      aria-label={`${now.length + had.length} stelle su 3${now.length > 0 ? `, ${now.length} nuove` : ""}`}
    >
      {STORY_STARS.map((star) => {
        const isNew = now.includes(star);
        const delay = isNew ? `${0.35 + 0.3 * order++}s` : undefined;
        return (
          <span key={star} className="relative flex skew-x-8 flex-col items-center">
            {isNew && (
              <span
                aria-hidden
                className={`animate-star-ring pointer-events-none absolute top-0 rounded-full border-4 border-comic-yellow opacity-0 ${size}`}
                style={{ animationDelay: delay }}
              />
            )}
            <StarIcon
              filled={isNew || had.includes(star)}
              className={`${size} ${isNew ? "animate-star-pop" : ""}`}
              style={isNew ? { animationDelay: delay } : undefined}
            />
            <span
              className={`text-[10px] font-extrabold uppercase leading-3 ${
                isNew ? "text-comic-yellow" : had.includes(star) ? "text-foreground" : "text-faint"
              }`}
            >
              {STAR_NAMES[star]}
            </span>
          </span>
        );
      })}
    </span>
  );
}
