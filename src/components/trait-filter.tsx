"use client";

import { toggleTrait, type TraitCategory } from "@/lib/traits";

const CHIP = "flex min-h-11 shrink-0 items-center border-2 px-3 text-sm font-bold disabled:opacity-50";

type TraitFilterProps = {
  catalog: TraitCategory[];
  chosen: string[];
  onChange: (next: string[]) => void;
  /**
   * "row": one line that scrolls sideways, for the card lists of the admin pages (the page itself
   * never scrolls). "wrap": every trait in view, grouped by category, for a form panel.
   */
  layout: "row" | "wrap";
  label: string;
  disabled?: boolean;
};

/**
 * Chooses traits: within a category any of the chosen ones, across categories all of them, the same
 * rule as the server's card_matches_traits.
 */
export function TraitFilter({ catalog, chosen, onChange, layout, label, disabled = false }: TraitFilterProps) {
  const chip = (code: string, name: string) => {
    const active = chosen.includes(code);
    return (
      <button
        key={code}
        type="button"
        onClick={() => onChange(toggleTrait(chosen, code))}
        aria-pressed={active}
        disabled={disabled}
        className={`${CHIP} ${active ? "border-comic-cyan text-comic-cyan" : "border-line"}`}
      >
        {name}
      </button>
    );
  };

  if (layout === "row") {
    return (
      <div className="-mx-3 flex shrink-0 items-center gap-1.5 overflow-x-auto px-3 pb-1" role="group" aria-label={label}>
        <button
          type="button"
          onClick={() => onChange([])}
          aria-pressed={chosen.length === 0}
          disabled={disabled}
          className={`${CHIP} ${chosen.length === 0 ? "border-comic-cyan text-comic-cyan" : "border-line"}`}
        >
          Tutti i tratti
        </button>
        {catalog.map((category) => (
          <div key={category.code} className="flex shrink-0 items-center gap-1.5">
            <span className="pl-1 text-[11px] font-extrabold uppercase text-muted">{category.name}</span>
            {category.traits.map((trait) => chip(trait.code, trait.name))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label={label}>
      {catalog.map((category) => (
        <div key={category.code} className="flex flex-col gap-1">
          <span className="text-[11px] font-extrabold uppercase text-muted">{category.name}</span>
          <div className="flex flex-wrap gap-1.5">{category.traits.map((trait) => chip(trait.code, trait.name))}</div>
        </div>
      ))}
    </div>
  );
}
