"use client";

// The order and filters of a card list with made-up cards, to try several filters at once and the
// order by several abilities without a server. A development-only page: next.config.ts serves
// *.dev.tsx pages in `next dev` only. The view is kept for the visit, like the real lists.
//   /prova-filtri/            the album's layout (rarity and faction chips in view)
//   /prova-filtri/?l=compact  the team pickers' layout (every filter behind one button)

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CardGroupHeading, CardListControls, useCardListView } from "@/components/card-list-controls";
import { applyCardListView, groupCardList, sortAbilitiesOf, type TraitIndex } from "@/lib/card-list";
import type { AbilityInfo } from "@/lib/catalog";

const FAMILY = { code: "body", name: "Corpo", color: "#ffd23f", sort_order: 1 };
const ABILITIES: AbilityInfo[] = [
  ["FOR", "Forza"],
  ["VEL", "Velocità"],
  ["RES", "Resistenza"],
  ["INT", "Intelligenza"],
  ["VOL", "Volontà"],
  ["AGI", "Agilità"],
].map(([code, name]) => ({ code, name, family: FAMILY }));

const RARITIES = [
  { rank: 1, name: "Comune", color: "#b8b8b8" },
  { rank: 2, name: "Rara", color: "#3fa9ff" },
  { rank: 3, name: "Epica", color: "#c264ff" },
  { rank: 4, name: "Leggendaria", color: "#ffb52e" },
];

const FACTIONS = ["heroes", "villains", "neutrals"];

// Made-up cards: the stats are spread so that ties on the first ability are common.
const CARDS = Array.from({ length: 24 }, (_, index) => {
  const rarity = RARITIES[index % RARITIES.length];
  const stat = (seed: number) => ((index * seed) % 5) + 3;
  return {
    id: `card-${index}`,
    code: `P${String(index + 1).padStart(3, "0")}`,
    name: `Prova ${index + 1}`,
    faction: FACTIONS[index % FACTIONS.length],
    stats: { FOR: stat(7), VEL: stat(3), RES: stat(5), INT: stat(11), VOL: stat(2), AGI: stat(13) },
    rarity,
  };
});

const TRAITS: TraitIndex = {
  catalog: [
    {
      code: "origin",
      name: "Origine",
      traits: [
        { code: "origin.segno", name: "Segno" },
        { code: "origin.mito", name: "Mito" },
        { code: "origin.strappo", name: "Strappo" },
      ],
    },
    {
      code: "group",
      name: "Gruppo",
      traits: [
        { code: "group.banco", name: "Banco" },
        { code: "group.figli", name: "Figli dell'Ultima" },
      ],
    },
  ],
  byCard: new Map(
    CARDS.map((card, index) => [
      card.id,
      [["origin.segno", "origin.mito", "origin.strappo"][index % 3], ...(index % 4 === 0 ? ["group.banco"] : index % 5 === 0 ? ["group.figli"] : [])],
    ]),
  ),
};

function Scene() {
  const compact = useSearchParams().get("l") === "compact";
  const [view, updateView] = useCardListView(compact ? "o-mega.prova-filtri-compact" : "o-mega.prova-filtri");
  const sorted = applyCardListView(CARDS, view, TRAITS);
  const groups = groupCardList(sorted, view.sort, TRAITS);
  const abilities = sortAbilitiesOf(view.sort);

  return (
    <main className="flex h-dvh flex-col gap-2 overflow-hidden px-3 pt-3">
      <h1 className="font-display text-2xl uppercase text-comic-yellow">{compact ? "Filtri (squadra)" : "Filtri (collezione)"}</h1>
      <CardListControls
        view={view}
        onChange={updateView}
        abilities={ABILITIES}
        traits={TRAITS}
        rarities={RARITIES}
        layout={compact ? "compact" : "inline"}
      />
      <p className="text-xs font-semibold text-muted">{sorted.length} carte</p>
      <ul className="-mx-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
        {sorted.length === 0 && <li className="py-6 text-center text-sm font-semibold text-muted">Nessuna carta con questi filtri.</li>}
        {groups.flatMap((group) => [
          ...(group.label ? [<li key={`g-${group.key}`}><CardGroupHeading label={group.label} count={group.cards.length} /></li>] : []),
          ...group.cards.map((card) => (
            <li key={card.id} className="flex items-center justify-between gap-2 border-2 border-line bg-panel px-2 py-1 text-xs font-semibold">
              <span className="truncate">
                {card.code} · <span style={{ color: card.rarity.color }}>{card.rarity.name}</span> · {card.faction}
              </span>
              <span className="shrink-0 text-comic-yellow">
                {(abilities.length > 0 ? abilities : ["FOR"]).map((code) => `${code} ${card.stats[code as keyof typeof card.stats]}`).join(" · ")}
              </span>
            </li>
          )),
        ])}
      </ul>
    </main>
  );
}

export default function FiltersScenePage() {
  return (
    <Suspense>
      <Scene />
    </Suspense>
  );
}
