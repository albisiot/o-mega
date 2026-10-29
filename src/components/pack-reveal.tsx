"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CardView } from "@/components/card-view";
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
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <button
          type="button"
          onClick={tearOpen}
          disabled={stage.kind === "tearing"}
          className={`relative flex h-80 w-56 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-amber-300/60 bg-linear-to-b from-amber-400 via-orange-500 to-rose-700 shadow-2xl shadow-orange-600/40 ${
            stage.kind === "tearing" ? "animate-pack-shake" : "animate-pack-float"
          }`}
          aria-label="Apri il pacchetto"
        >
          <span className="text-7xl font-black text-zinc-950/80">Ω</span>
          <span className="text-sm font-black tracking-[0.3em] text-zinc-950/80">O-MEGA</span>
          <span className="absolute bottom-4 text-xs font-semibold text-zinc-950/70">
            {opening.pack_type === "daily" ? "Pacchetto del giorno" : "Pacchetto standard"}
          </span>
        </button>
        <p className="text-sm text-zinc-400">
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
          <span
            className="animate-rare-burst absolute h-40 w-40 rounded-full"
            style={{ backgroundColor: card.rarity.color }}
          />
          <span
            className="animate-rare-burst absolute h-40 w-40 rounded-full [animation-delay:250ms]"
            style={{ backgroundColor: card.rarity.color }}
          />
          <p
            className="animate-rare-title relative text-5xl font-black uppercase"
            style={{ color: card.rarity.color, textShadow: `0 0 30px ${card.rarity.color}` }}
          >
            {card.rarity.name}!
          </p>
        </main>
      );
    }

    return (
      <main
        className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-5 px-6 py-8"
        onClick={next}
        style={{ background: `radial-gradient(circle at 50% 45%, ${card.rarity.color}${rare ? "40" : "1f"}, transparent 65%)` }}
      >
        <div key={stage.index} className="animate-card-reveal relative">
          {card.is_new && (
            <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-emerald-400 px-3 py-0.5 text-xs font-bold text-zinc-950">
              Nuova!
            </span>
          )}
          <CardView card={card} abilities={abilities} glow={rare} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <Progress total={cards.length} current={stage.index} />
          <p className="text-xs text-zinc-500">Tocca per continuare</p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setStage({ kind: "summary" });
            }}
            className="text-xs text-zinc-400 underline"
          >
            Salta
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 py-6">
      <header className="text-center">
        <h1 className="text-xl font-bold">Il tuo pacchetto</h1>
        <p className="text-sm text-zinc-400">Le carte sono già nella tua collezione.</p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {[...cards].reverse().map((card) => (
          <div key={card.instance_id} className="relative">
            {card.is_new && (
              <span className="absolute -top-2 right-2 z-10 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-bold text-zinc-950">
                Nuova
              </span>
            )}
            <CardView card={card} size="sm" />
          </div>
        ))}
      </div>
      <Link
        href="/"
        className="mt-2 rounded-full bg-amber-400 px-5 py-3 text-center font-bold text-zinc-950"
      >
        Torna alla home
      </Link>
    </main>
  );
}

function Progress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Carta ${current + 1} di ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-1.5 w-6 rounded-full ${i <= current ? "bg-amber-400" : "bg-white/15"}`} />
      ))}
    </div>
  );
}
