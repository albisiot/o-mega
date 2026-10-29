import type { CSSProperties } from "react";
import { FACTION_LABELS, type AbilityInfo } from "@/lib/catalog";

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

/** A character card. Art is a placeholder silhouette tinted by rarity. */
export function CardView({ card, abilities, size = "lg", glow = false }: CardViewProps) {
  const color = card.rarity.color;
  const style = { "--glow-color": `${color}aa`, borderColor: `${color}99` } as CSSProperties;
  const large = size === "lg";

  return (
    <article
      style={style}
      className={`relative flex flex-col overflow-hidden rounded-2xl border-2 bg-zinc-900 ${
        large ? "w-72 gap-3 p-3" : "w-full gap-2 p-2"
      } ${glow ? "animate-rare-glow" : ""}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className={`truncate font-bold ${large ? "text-lg" : "text-sm"}`}>{card.name}</h3>
          <p className="text-[11px] text-zinc-400">{FACTION_LABELS[card.faction] ?? card.faction}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
          style={{ color, backgroundColor: `${color}22` }}
        >
          {card.rarity.name}
        </span>
      </header>

      <div
        className={`flex items-end justify-center rounded-xl ${large ? "h-36" : "h-20"}`}
        style={{ background: `radial-gradient(circle at 50% 35%, ${color}55, transparent 70%), #18181b` }}
        aria-hidden
      >
        <Silhouette color={color} className={large ? "h-32" : "h-16"} />
      </div>

      {large && card.power && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
            {card.power.name}
          </p>
          <p className="text-xs text-zinc-200">{card.power.text}</p>
        </div>
      )}

      {large && abilities && <AbilityGrid stats={card.stats} abilities={abilities} />}

      {large && card.flavor && <p className="text-[11px] italic text-zinc-500">{card.flavor}</p>}
    </article>
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
    <div className="grid grid-cols-4 gap-1.5">
      {families.map(({ family, items }) => (
        <div key={family.code} className="flex flex-col gap-0.5">
          <p className="truncate text-[10px] font-semibold uppercase" style={{ color: family.color }}>
            {family.name}
          </p>
          {items.map((ability) => {
            const value = stats[ability.code] ?? 0;
            return (
              <div
                key={ability.code}
                title={ability.name}
                className="flex items-center justify-between rounded bg-white/5 px-1.5 py-0.5"
              >
                <span className="text-[10px] text-zinc-400">{ability.code}</span>
                <span className={`text-xs font-bold ${value >= 9 ? "text-amber-300" : "text-zinc-100"}`}>
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Silhouette({ color, className }: { color: string; className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill={color} fillOpacity={0.55}>
      <circle cx="50" cy="30" r="16" />
      <path d="M18 100c0-22 14-40 32-40s32 18 32 40z" />
    </svg>
  );
}
