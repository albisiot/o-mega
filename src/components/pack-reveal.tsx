"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CardView } from "@/components/card-view";
import { PackArt } from "@/components/comic-parts";
import { balance } from "@/config/balance";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import type { PackOpening } from "@/lib/packs";

type Stage =
  | { kind: "sealed" }
  | { kind: "tearing" }
  | { kind: "card"; index: number; intro: boolean }
  | { kind: "summary" };

const TEAR_MS = 700;
const RARE_INTRO_MS = 1400;

/** Sealed pack → cards revealed one at a time → summary. */
export function PackReveal({ opening }: { opening: PackOpening }) {
  const [stage, setStage] = useState<Stage>({ kind: "sealed" });
  const [abilities, setAbilities] = useState<AbilityInfo[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cards = opening.cards;

  useEffect(() => {
    fetchAbilities()
      .then(setAbilities)
      .catch((error: unknown) => console.error("Abilities failed", error));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function later(ms: number, next: Stage) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStage(next), ms);
  }

  function showCard(index: number) {
    const rare = cards[index].rarity.rank >= balance.packs.specialRevealMinRarityRank;
    setStage({ kind: "card", index, intro: rare });
    if (rare) later(RARE_INTRO_MS, { kind: "card", index, intro: false });
  }

  function tearOpen() {
    setStage({ kind: "tearing" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => showCard(0), TEAR_MS);
  }

  function next() {
    if (stage.kind !== "card" || stage.intro) return;
    if (stage.index + 1 < cards.length) showCard(stage.index + 1);
    else setStage({ kind: "summary" });
  }

  if (stage.kind === "sealed" || stage.kind === "tearing") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6 text-center">
        <div aria-hidden className="rays-dark fixed inset-0 -z-10" />
        <h1 className="-skew-x-8 font-display text-[44px] uppercase leading-[52px] text-comic-yellow [text-shadow:3px_3px_0_var(--comic-magenta)]">
          {opening.pack_type === "daily" ? "Pacchetto del giorno" : "Pacchetto standard"}
        </h1>
        <button
          type="button"
          onClick={tearOpen}
          disabled={stage.kind === "tearing"}
          className={stage.kind === "tearing" ? "animate-pack-shake" : "animate-pack-float"}
          aria-label="Apri il pacchetto"
        >
          <PackArt
            body="#ffd60a"
            omega="#ff2e6c"
            className="h-[380px] drop-shadow-[8px_8px_0_var(--comic-magenta)]"
          />
        </button>
        <p className="text-base font-bold">
          {stage.kind === "tearing" ? "Apertura…" : "Tocca il pacchetto per aprirlo"}
        </p>
      </main>
    );
  }

  if (stage.kind === "card") {
    const card = cards[stage.index];
    const rare = card.rarity.rank >= balance.packs.specialRevealMinRarityRank;

    if (stage.intro) {
      return (
        <main className="relative flex flex-1 items-center justify-center overflow-hidden">
          <div aria-hidden className="rays-gold fixed inset-0 -z-10" />
          <span
            className="animate-rare-burst absolute h-40 w-40 rounded-full"
            style={{ backgroundColor: card.rarity.color }}
          />
          <span
            className="animate-rare-burst absolute h-40 w-40 rounded-full [animation-delay:250ms]"
            style={{ backgroundColor: card.rarity.color }}
          />
          <p className="animate-rare-title text-sfx relative text-8xl uppercase text-comic-magenta">
            {card.rarity.name}!
          </p>
        </main>
      );
    }

    return (
      <main
        className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-5 px-6 py-6 ${
          rare ? "text-black" : ""
        }`}
        onClick={next}
      >
        <div aria-hidden className={`${rare ? "rays-gold" : "rays-dark"} fixed inset-0 -z-10`} />
        <div key={stage.index} className="animate-card-reveal relative">
          {card.is_new && (
            <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 -skew-x-8 bg-comic-cyan px-3 py-0.5 font-display text-sm uppercase text-black">
              Nuova!
            </span>
          )}
          <div className={`rounded-xl ${rare ? "shadow-[8px_8px_0_#000]" : "shadow-[6px_6px_0_var(--comic-magenta)]"}`}>
            <CardView card={card} abilities={abilities} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Progress total={cards.length} current={stage.index} rare={rare} />
          <p className="text-sm font-bold">Tocca per continuare</p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setStage({ kind: "summary" });
            }}
            className="min-h-11 px-4 text-sm font-bold underline"
          >
            Salta
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-6">
      <header>
        <h1 className="font-display text-4xl uppercase text-comic-yellow">Il tuo pacchetto</h1>
        <p className="mt-1 text-sm font-semibold text-muted">Le carte sono già nella tua collezione.</p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {[...cards].reverse().map((card) => (
          <div key={card.instance_id} className="relative">
            {card.is_new && (
              <span className="absolute -top-2 right-2 z-10 -skew-x-8 bg-comic-cyan px-2 font-display text-xs uppercase leading-5 text-black">
                Nuova
              </span>
            )}
            <CardView card={card} size="sm" />
          </div>
        ))}
      </div>
      <Link href="/" className="btn btn-primary mt-2">
        Torna alla home
      </Link>
    </main>
  );
}

function Progress({ total, current, rare }: { total: number; current: number; rare: boolean }) {
  const filled = rare ? "bg-black" : "bg-comic-yellow";
  const empty = rare ? "bg-black/25" : "bg-panel-raised";
  return (
    <div className="flex gap-1.5" aria-label={`Carta ${current + 1} di ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2 w-7 -skew-x-8 ${i <= current ? filled : empty}`} />
      ))}
    </div>
  );
}
