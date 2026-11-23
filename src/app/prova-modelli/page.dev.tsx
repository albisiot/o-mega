"use client";

// The cards that can be looked at in 3D, to try the models and the dioramas without a server
// or an account. A development-only page: next.config.ts serves *.dev.tsx pages in `next dev`
// only, so it is never part of the published site.
//   /prova-modelli/   one "Guarda in 3D" per card: models (P001, P030, P060) and dioramas (P013, P028, P055)

import { CardModelButton } from "@/components/card-model";
import { PageHeader } from "@/components/comic-parts";
import { withBasePath } from "@/lib/base-path";

const CARDS = [
  { code: "P055", name: "Keelstone", kind: "Diorama" },
  { code: "P028", name: "Juncture", kind: "Diorama" },
  { code: "P013", name: "Hawser", kind: "Diorama" },
  { code: "P001", name: "Gantry", kind: "Modello" },
  { code: "P030", name: "Milewright", kind: "Modello" },
  { code: "P060", name: "Mongibello", kind: "Modello" },
];

export default function ModelsTrialPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-4">
      <PageHeader title="Prova modelli 3D" />
      {CARDS.map((card) => (
        <div key={card.code} className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBasePath(`/cards/${card.code}.webp`)} alt="" className="h-20 w-15 shrink-0 rounded object-cover" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl uppercase">{card.name}</p>
            <p className="text-xs font-semibold text-muted">
              {card.code} · {card.kind}
            </p>
          </div>
          <CardModelButton code={card.code} name={card.name} className="shrink-0" />
        </div>
      ))}
    </main>
  );
}
