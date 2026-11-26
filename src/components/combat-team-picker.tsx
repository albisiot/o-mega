"use client";

// Scontro a squadre (SPEC §5.19): five characters in their places (F1 and F2 in front, R1-R3
// behind), picked from a list, and the computer's strategy. The battles against the computer, the
// defence and the challenges (stage 6a) share it.

import type { CombatStrategy } from "@o-mega/game-engine";
import { combatArtUrl, type CombatCard } from "@/lib/combat";

export const COMBAT_PLACES = ["F1", "F2", "R1", "R2", "R3"];

export const COMBAT_STRATEGY_LABELS: { code: CombatStrategy; label: string }[] = [
  { code: "balanced", label: "Equilibrata" },
  { code: "aggressive", label: "Aggressiva" },
  { code: "defensive", label: "Difensiva" },
  { code: "control", label: "Controllo" },
  { code: "assassin", label: "Assassinio" },
];

export const RARITY_LABELS: Record<string, string> = { delta: "Delta", gamma: "Gamma", beta: "Beta", alfa: "Alfa", omega: "Omega" };

/** A tap on a character puts it in the first free place, or takes it out; a tap on a place empties it. */
export function CombatTeamPicker({
  cards,
  places,
  onChange,
}: {
  cards: CombatCard[];
  places: (CombatCard | null)[];
  onChange: (places: (CombatCard | null)[]) => void;
}) {
  const toggle = (card: CombatCard) => {
    const at = places.findIndex((p) => p?.definitionId === card.definitionId);
    if (at >= 0) onChange(places.map((p, i) => (i === at ? null : p)));
    else {
      const free = places.indexOf(null);
      if (free >= 0) onChange(places.map((p, i) => (i === free ? card : p)));
    }
  };
  return (
    <>
      <div className="grid grid-cols-5 gap-1.5">
        {places.map((p, i) => (
          <button
            key={COMBAT_PLACES[i]}
            type="button"
            onClick={() => p && toggle(p)}
            className={`flex flex-col items-center rounded-md border-2 border-black p-1 ${i < 2 ? "bg-panel-raised" : "bg-panel"}`}
          >
            <span className="text-[10px] font-black text-faint">{COMBAT_PLACES[i]}</span>
            <span className="h-9 w-9 overflow-hidden rounded-full border-2 border-black bg-black">
              {p && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={combatArtUrl(p.code)} alt="" className="h-full w-full object-cover object-[50%_18%]" />
              )}
            </span>
            <span className="w-full truncate text-center text-[10px] font-bold leading-4">{p?.name ?? "—"}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {cards.map((card) => {
          const at = places.findIndex((p) => p?.definitionId === card.definitionId);
          return (
            <button
              key={card.definitionId}
              type="button"
              onClick={() => toggle(card)}
              className={`flex items-center gap-2 rounded-md border-2 p-1 text-left ${at >= 0 ? "border-comic-yellow bg-panel-raised" : "border-black bg-panel"}`}
            >
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={combatArtUrl(card.code)} alt="" className="h-full w-full object-cover object-[50%_18%]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-extrabold leading-4">{card.name}</span>
                <span className="block truncate text-[10px] leading-4 text-faint">
                  {RARITY_LABELS[card.rarity] ?? card.rarity} · {card.kit.supreme.name}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function CombatStrategySelect({ value, onChange, label = "Strategia" }: { value: CombatStrategy; onChange: (value: CombatStrategy) => void; label?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CombatStrategy)}
      aria-label={label}
      className="min-h-10 flex-1 rounded-md border-2 border-black bg-panel px-2 text-[12px] font-bold"
    >
      {COMBAT_STRATEGY_LABELS.map((s) => (
        <option key={s.code} value={s.code}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
