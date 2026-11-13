"use client";

import { useEffect, useState } from "react";
import { useRequireSignedIn } from "@/components/auth-provider";
import { PageHeader } from "@/components/comic-parts";
import { LoadingScreen } from "@/components/loading-screen";
import { fetchAbilities, seenAbilities, type AbilityInfo } from "@/lib/catalog";
import { describeServerError } from "@/lib/errors";
import { bestiarySections, fetchBestiary, type Bestiary, type BestiaryThreat } from "@/lib/threat-catalog";
import { modifierLine } from "@/lib/threat-modifiers";
import { levelText, oddsText, type ThreatRarity } from "@/lib/threat-rarity";
import { useLockedScreen } from "@/lib/use-locked-screen";

/**
 * The Bestiario (SPEC §5.15): every threat of the game, those already met in full,
 * the others as silhouettes. The rare tiers say how often they turn up.
 */
export default function BestiaryPage() {
  const { session } = useRequireSignedIn();
  const [bestiary, setBestiary] = useState<Bestiary | null>(null);
  const [abilities, setAbilities] = useState<AbilityInfo[]>(() => seenAbilities() ?? []);
  const [error, setError] = useState<string | null>(null);
  useLockedScreen(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([fetchBestiary(), fetchAbilities()])
      .then(([next, abilityList]) => {
        if (cancelled) return;
        setBestiary(next);
        setAbilities(abilityList);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeServerError(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!bestiary && !error) return <LoadingScreen label="Caricamento del Bestiario…" />;
  const seen = bestiary?.threats.filter((t) => t.seen).length ?? 0;
  const nameOf = (code: string) => abilities.find((a) => a.code === code)?.name ?? code;

  return (
    // The page fits the screen (see .game-shell): the title stays, only the threats scroll.
    <div className="game-shell">
      <PageHeader backHref="/collezione" backLabel="Collezione" title="Bestiario" subtitle={bestiary ? `${seen}/${bestiary.threats.length} Minacce incontrate` : undefined} />
      <main
        data-keep-scroll="main"
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-[calc(env(safe-area-inset-bottom)+16px)]"
      >
        {error && <p className="text-sm font-semibold text-comic-magenta">{error}</p>}
        {bestiary && (
          <p className="text-sm font-medium text-muted">
            Ogni Minaccia che incontri in partita, in Emergenza o in Allarme Triplo si scopre qui. Quelle rare escono di rado:
            alcune non le ha ancora viste nessuno.
          </p>
        )}
        {bestiary &&
          bestiarySections(bestiary).map((section) => (
            <section key={section.key} className="flex flex-col gap-2">
              <h2 className="flex items-baseline justify-between gap-2 border-b-[3px] pb-1" style={{ borderColor: section.rarity?.color ?? "var(--line)" }}>
                <span className="font-display text-2xl uppercase leading-7" style={{ color: section.rarity?.color }}>
                  {section.title}
                </span>
                <span className="shrink-0 text-xs font-extrabold text-muted">
                  {section.threats.filter((t) => t.seen).length}/{section.threats.length}
                </span>
              </h2>
              {section.rarity && <p className="text-xs font-bold text-muted">Ognuna: {oddsText(section.rarity.one_in)}.</p>}
              <ul className="grid grid-cols-2 gap-2">
                {section.threats.map((threat) => (
                  <li key={threat.code}>
                    <ThreatTile threat={threat} rarity={section.rarity} nameOf={nameOf} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </main>
    </div>
  );
}

function ThreatTile({
  threat,
  rarity,
  nameOf,
}: {
  threat: BestiaryThreat;
  rarity: ThreatRarity | null;
  nameOf: (code: string) => string;
}) {
  const frame = rarity ? { borderColor: rarity.color, boxShadow: `3px 3px 0 ${rarity.color}` } : undefined;
  if (!threat.seen) {
    return (
      <div
        className="flex h-full min-h-28 flex-col items-center justify-center gap-1 border-[3px] border-dashed border-line bg-black px-2 py-3 text-center"
        style={frame}
        aria-label={`Minaccia non ancora incontrata, livello ${levelText(threat.level)}`}
      >
        <span aria-hidden className="font-display text-4xl leading-10 text-faint">
          ?
        </span>
        <span className="text-[11px] font-extrabold uppercase text-faint">Livello {levelText(threat.level)}</span>
        <span className="text-[11px] font-bold text-faint">Non ancora incontrata</span>
      </div>
    );
  }
  const abilities = threat.abilities ?? [];
  return (
    <div className="flex h-full flex-col gap-1 border-[3px] border-panel-raised bg-panel px-2 py-2" style={frame}>
      <span className="text-[11px] font-extrabold uppercase text-muted">Livello {levelText(threat.level)}</span>
      <span className="font-display text-lg uppercase leading-5">{threat.name}</span>
      <span className="text-[11px] font-bold leading-[14px] text-muted">
        {abilities.length > 0 ? abilities.map(nameOf).join(" · ") : "Abilità estratte a caso a ogni partita"}
      </span>
      {threat.modifier && (
        <span className="bg-comic-magenta px-1 text-[11px] font-extrabold leading-[14px] text-black">
          {modifierLine(threat.modifier, nameOf(abilities[0] ?? ""), nameOf)}
        </span>
      )}
      {threat.flavor && <span className="text-[11px] italic leading-[14px] text-muted">{threat.flavor}</span>}
      <span className="mt-auto text-[11px] font-bold text-faint">
        Incontrata {threat.times} {threat.times === 1 ? "volta" : "volte"}
      </span>
    </div>
  );
}
