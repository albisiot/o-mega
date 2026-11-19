"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CardView } from "@/components/card-view";
import { PackArt } from "@/components/comic-parts";
import { ReturnLink } from "@/components/return-link";
import { balance } from "@/config/balance";
import { useBannerHold } from "@/lib/banner-hold";
import { withBasePath } from "@/lib/base-path";
import { fetchAbilities, type AbilityInfo } from "@/lib/catalog";
import { cosmeticsByCharacter } from "@/lib/cosmetics";
import { packColor } from "@/lib/pack-colors";
import { placeHref, returnLabel } from "@/lib/pack-return";
import { packRevealHref, type PackCard, type PackOpening } from "@/lib/packs";
import { navHistory } from "@/lib/nav-history";
import { useCosmetics } from "@/lib/use-cosmetics";
import { useLockedScreen } from "@/lib/use-locked-screen";

type Stage =
  | { kind: "sealed" }
  | { kind: "tearing" }
  | { kind: "card"; index: number; intro: boolean }
  | { kind: "summary" };

const TEAR_MS = 700;
const RARE_INTRO_MS = 1400;

/** High rarities and artwork variants get the special reveal. */
const isSpecial = (card: PackCard) =>
  card.rarity.rank >= balance.packs.specialRevealMinRarityRank || Boolean(card.variant);

const PACK_TITLES: Record<PackOpening["pack_type"], string> = {
  daily: "Pacchetto del giorno",
  standard: "Pacchetto standard",
  bonus: "Carte bonus",
  event: "Premio evento",
  special: "Pacchetto speciale",
  match: "Premio partita",
  objective: "Premio obiettivo",
  achievement: "Premio impresa",
  emergency: "Premio classifica Emergenza",
  challenge: "Premio della sfida",
  shards: "Con le Schegge",
};

/**
 * Sealed pack → cards revealed one at a time → summary, then the next pack if any, and at the
 * end back to `returnTo`, the page the pack was opened from (a place key, "/" for the home).
 */
export function PackReveal({
  opening,
  nextIds = [],
  returnTo = "/",
}: {
  opening: PackOpening;
  nextIds?: string[];
  returnTo?: string;
}) {
  const [stage, setStage] = useState<Stage>({ kind: "sealed" });
  const [abilities, setAbilities] = useState<AbilityInfo[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cards = opening.cards;
  // A character that already has a frame or an effect shows it on its new card (SPEC §4.8).
  const cosmetics = useCosmetics();
  const looks = useMemo(() => cosmeticsByCharacter(cosmetics), [cosmetics]);
  const lookOf = (card: PackCard) => (card.definition_id ? (looks.get(card.definition_id) ?? null) : null);
  useLockedScreen(stage.kind === "summary");
  // No in-app banner while the cards come out (SPEC §11.1).
  useBannerHold(stage.kind !== "summary");
  // Once seen, the reveal is over: the browser's back or forward never plays it again.
  useEffect(() => {
    if (stage.kind === "summary") navHistory()?.consumeCurrent();
  }, [stage.kind]);

  useEffect(() => {
    fetchAbilities()
      .then(setAbilities)
      .catch((error: unknown) => console.error("Abilities failed", error));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // The drawings download while the pack is still sealed, so each one is there the moment its
  // card flips, even on a slow network. One at a time, in the order the cards flip: all at once,
  // they would share the bandwidth and the first card would wait for the others. Same URLs as
  // the card and the summary.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const card of cards) {
        if (cancelled) return;
        if (!card.art_url) continue;
        const image = new Image();
        image.src = withBasePath(card.art_url);
        await image.decode().catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cards]);

  function later(ms: number, next: Stage) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStage(next), ms);
  }

  function showCard(index: number) {
    const rare = isSpecial(cards[index]);
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
    // A special pack looks as it does in the shop, with its own name.
    const colors = opening.pack_type === "special" ? packColor(opening.pack_color) : null;
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6 text-center">
        <div aria-hidden className="rays-dark fixed inset-0 -z-10" />
        <h1 className="-skew-x-8 font-display text-[44px] uppercase leading-[52px] text-comic-yellow [text-shadow:3px_3px_0_var(--comic-magenta)]">
          {opening.pack_name ?? PACK_TITLES[opening.pack_type]}
        </h1>
        <button
          type="button"
          onClick={tearOpen}
          disabled={stage.kind === "tearing"}
          className={stage.kind === "tearing" ? "animate-pack-shake" : "animate-pack-float"}
          aria-label="Apri il pacchetto"
        >
          <PackArt
            body={colors?.body ?? "#ffd60a"}
            omega={colors?.omega ?? "#ff2e6c"}
            cards={cards.length}
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
    const rare = isSpecial(card);

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
          <p
            className={`animate-rare-title text-sfx relative text-center uppercase text-comic-magenta ${
              card.variant ? "text-6xl" : "text-8xl"
            }`}
          >
            {card.variant ? `Variante ${card.variant.name}!` : `${card.rarity.name}!`}
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
            <CardView card={card} abilities={abilities} priority animated cosmetics={lookOf(card)} />
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

  // The summary fits the screen with the button fixed at the bottom: the five cards of a pack
  // fit, and the longer list a bonus code can give scrolls inside.
  return (
    <main className="game-shell gap-4 px-4 pt-4">
      <header className="shrink-0">
        <h1 className="font-display text-4xl uppercase text-comic-yellow">
          {opening.pack_type === "bonus" || opening.pack_type === "event" ? "Le tue carte" : "Il tuo pacchetto"}
        </h1>
        <p className="mt-1 text-sm font-semibold text-muted">Le carte sono già nella tua collezione.</p>
      </header>
      {/* Room above for the "Nuova" tags and at the sides for the rare cards' glow. */}
      <div className="-mx-4 min-h-0 flex-1 overflow-y-auto px-4 pt-2">
        <div className="grid grid-cols-2 gap-3">
          {[...cards].reverse().map((card) => (
            <div key={card.instance_id} className="relative">
              {card.is_new && (
                <span className="absolute -top-2 right-2 z-10 -skew-x-8 bg-comic-cyan px-2 font-display text-xs uppercase leading-5 text-black">
                  Nuova
                </span>
              )}
              <CardView card={card} size="sm" cosmetics={lookOf(card)} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col pb-[calc(env(safe-area-inset-bottom)+16px)]">
        {nextIds.length > 0 ? (
          <NextPackLink href={packRevealHref(nextIds, returnTo)}>
            {nextIds.length === 1 ? "Apri l'ultimo pacchetto" : `Apri il prossimo (ne restano ${nextIds.length})`}
          </NextPackLink>
        ) : (
          <ReturnLink href={placeHref(returnTo)} className="btn btn-primary">
            {returnLabel(returnTo)}
          </ReturnLink>
        )}
      </div>
    </main>
  );
}

/**
 * The next pack of the series takes the place of this one in the history: at the end, the way
 * out (and the browser's back) goes straight to the page it all started on.
 */
function NextPackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} replace data-return="" className="btn btn-primary">
      {children}
    </Link>
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
