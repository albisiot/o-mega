"use client";

import type { CardOrder } from "@/lib/card-sort";

const OPTIONS: { value: CardOrder; label: string }[] = [
  { value: "name", label: "A–Z" },
  { value: "number", label: "Numero" },
];

/** Two buttons choosing how the admin pages order cards: by name or by code number. */
export function CardSortToggle({ order, onChange }: { order: CardOrder; onChange: (next: CardOrder) => void }) {
  return (
    <div role="group" aria-label="Ordina le carte" className="flex shrink-0">
      {OPTIONS.map((option) => {
        const active = order === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`flex min-h-11 items-center border-2 px-3 text-sm font-bold ${
              active ? "border-comic-yellow bg-comic-yellow text-black" : "border-line bg-panel"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
