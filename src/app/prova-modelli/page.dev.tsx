"use client";

// The cards that can be looked at in 3D, to try the dioramas and the models without a server
// or an account. A development-only page: next.config.ts serves *.dev.tsx pages in `next dev`
// only, so it is never part of the published site.
//   /prova-modelli/                    every card with a diorama (src/lib/diorama-index.ts)
//   /prova-modelli/?codes=P055,P013    only these cards (scripts/shoot-dioramas.mjs uses it)

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CardModelButton, hasCardModel } from "@/components/card-model";
import { PageHeader } from "@/components/comic-parts";
import { withBasePath } from "@/lib/base-path";
import { DIORAMAS } from "@/lib/diorama-index";

function Cards() {
  const filter = useSearchParams().get("codes")?.split(",").filter(Boolean);
  const cards = filter ? DIORAMAS.filter((card) => filter.includes(card.code)) : DIORAMAS;
  return (
    <>
      {cards.map((card) => (
        <div key={card.code} data-code={card.code} className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBasePath(`/cards/${card.code}.webp`)} alt="" loading="lazy" className="h-20 w-15 shrink-0 rounded object-cover" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl uppercase">{card.name}</p>
            <p className="text-xs font-semibold text-muted">
              {card.code} · {hasCardModel(card.code) ? "Diorama e modello" : "Diorama"}
            </p>
          </div>
          <CardModelButton code={card.code} name={card.name} className="shrink-0" />
        </div>
      ))}
    </>
  );
}

export default function ModelsTrialPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-10 pt-4">
      <PageHeader title="Prova modelli 3D" />
      <Suspense>
        <Cards />
      </Suspense>
    </main>
  );
}
