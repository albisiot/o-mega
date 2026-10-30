import type { CSSProperties, ReactNode } from "react";
import { FACTION_LABELS, type AbilityInfo } from "@/lib/catalog";
import { FACTION_COLORS, isFoil, rarityArt, rarityFrame, rarityLetter } from "@/lib/rarity-theme";

export type CardData = {
  name: string;
  faction: string;
  flavor: string;
  stats: Record<string, number>;
  rarity: { name: string; rank: number; color: string };
  power: { name: string; text: string } | null;
};

type CardViewProps = {
  card: CardData;
  /** Needed by the large layout to show the 12 abilities grouped by family. */
  abilities?: AbilityInfo[] | null;
  size?: "lg" | "sm";
  glow?: boolean;
};

/** A character card. The frame and art treatment grow with the rarity; art is a placeholder silhouette. */
export function CardView({ card, abilities, size = "lg", glow = false }: CardViewProps) {
  const color = card.rarity.color;
  const style = { "--glow-color": `${color}aa`, background: rarityFrame(card.rarity) } as CSSProperties;
  const large = size === "lg";

  return (
    <article
      style={style}
      className={`rounded-xl ${large ? "w-[300px] p-[7px]" : "w-full p-1"} ${glow ? "animate-rare-glow" : ""}`}
    >
      <div className="flex flex-col overflow-hidden rounded-md bg-panel text-foreground">
        <header className={`flex items-center justify-between gap-2 ${large ? "h-10 px-2.5" : "h-7 px-1.5"}`}>
          <h3 className={`min-w-0 truncate font-display uppercase ${large ? "text-2xl" : "text-sm"}`}>{card.name}</h3>
          <RarityTag rarity={card.rarity} compact={!large} />
        </header>

        <CardArt rarity={card.rarity} faction={card.faction} className={large ? "h-44" : "h-24"}>
          <span
            className={`absolute bottom-1.5 left-1.5 -skew-x-8 px-1.5 font-extrabold uppercase text-black ${
              large ? "py-0.5 text-xs" : "text-[10px]"
            }`}
            style={{ backgroundColor: FACTION_COLORS[card.faction] ?? "#fff8e7" }}
          >
            {FACTION_LABELS[card.faction] ?? card.faction}
          </span>
        </CardArt>

        {large && card.power && (
          <div className="border-t-2 px-2.5 py-1.5" style={{ borderColor: color }}>
            <p className="font-display text-sm uppercase" style={{ color }}>
              {card.power.name}
            </p>
            <p className="text-xs leading-[15px]">{card.power.text}</p>
          </div>
        )}

        {large && abilities && <AbilityGrid stats={card.stats} abilities={abilities} />}
      </div>
    </article>
  );
}

function RarityTag({ rarity, compact }: { rarity: CardData["rarity"]; compact: boolean }) {
  return (
    <span
      className={`flex shrink-0 -skew-x-8 items-center gap-1 font-display uppercase text-black ${
        compact ? "px-1 text-xs" : "h-6 px-2 text-sm"
      }`}
      style={{ background: rarityFrame(rarity) }}
    >
      <span className="font-sans font-black">{rarityLetter(rarity)}</span>
      {!compact && rarity.name}
    </span>
  );
}

export function CardArt({
  rarity,
  faction,
  className,
  children,
}: {
  rarity: CardData["rarity"];
  faction: string;
  className: string;
  children?: ReactNode;
}) {
  return (
    <div className={`@container relative overflow-hidden ${className}`} style={rarityArt(rarity)} aria-hidden={!children}>
      {isFoil(rarity) && (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center font-sans text-[50cqw] font-black leading-none text-foreground"
        >
          {rarityLetter(rarity)}
        </span>
      )}
      <Silhouette
        faction={faction}
        accent={rarity.color}
        className="absolute -bottom-1 left-1/2 h-[96%] -translate-x-1/2"
      />
      {children}
    </div>
  );
}

function AbilityGrid({ stats, abilities }: { stats: Record<string, number>; abilities: AbilityInfo[] }) {
  const families = abilities.reduce<{ family: AbilityInfo["family"]; items: AbilityInfo[] }[]>(
    (groups, ability) => {
      const group = groups.find((g) => g.family.code === ability.family.code);
      if (group) group.items.push(ability);
      else groups.push({ family: ability.family, items: [ability] });
      return groups;
    },
    [],
  );

  return (
    <div className="grid grid-cols-4 gap-1.5 bg-background px-2 pb-2 pt-1.5">
      {families.map(({ family, items }) => (
        <div key={family.code} className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-[10px] font-extrabold uppercase leading-[14px]" style={{ color: family.color }}>
            {family.name}
          </p>
          {items.map((ability) => {
            const value = stats[ability.code] ?? 0;
            const high = value >= 9;
            return (
              <div
                key={ability.code}
                title={ability.name}
                className={`flex h-5 items-center justify-between px-1 ${
                  high ? "bg-comic-yellow text-black" : "bg-panel-raised"
                }`}
              >
                <span className="text-[10px] font-semibold">{ability.code}</span>
                <span className="font-display text-sm">{value}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Placeholder art: a caped figure, or a horned cloak for villains. */
export function Silhouette({
  faction,
  accent,
  ink = "#000",
  className,
}: {
  faction: string;
  accent?: string;
  ink?: string;
  className: string;
}) {
  if (faction === "villains") {
    return (
      <svg viewBox="0 0 200 240" className={className} aria-hidden>
        <path fill={ink} d="M84 30 72 2l20 16z" />
        <path fill={ink} d="m116 30 12-28-20 16z" />
        <path fill={ink} d="M100 12c14 0 22 10 22 24l-2 20 50 14 20 170H10L30 70l50-14-2-20c0-14 8-24 22-24z" />
        {accent && <path fill={accent} d="m86 32 12 6-11 3zM114 32l-12 6 11 3zM100 76l16 20-16 28-16-28z" />}
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 240" className={className} aria-hidden>
      <path fill={ink} fillOpacity={0.45} d="M62 70h76l42 170-50-18-30 18-30-18-50 18z" />
      <path fill={ink} d="M80 30c0-16 10-20 20-20s20 4 20 20l-2 20-18 12-18-12z" />
      <path fill={ink} d="M66 66h68l-12 64H78z" />
      <path fill={ink} d="m66 66-20 6-6 40 34 18 6-12-20-14 6-20z" />
      <path fill={ink} d="m134 66 20 6 6 40-34 18-6-12 20-14-6-20z" />
      <path fill={ink} d="M78 130h44l10 110h-24l-8-80-8 80H68z" />
      {accent && <path fill={accent} d="m100 76 14 14-14 20-14-20z" />}
    </svg>
  );
}
