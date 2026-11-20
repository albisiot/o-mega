"use client";

import { useState } from "react";
import { hasBestiaryDiorama, ThreatDioramaViewer } from "@/components/threat-diorama-viewer";
import { bestiarySections, type Bestiary, type BestiaryThreat } from "@/lib/threat-catalog";
import { modifierLine } from "@/lib/threat-modifiers";
import { levelText, oddsText, type ThreatRarity } from "@/lib/threat-rarity";

/**
 * The Bestiario's threats, section by section (SPEC §5.15). A threat already met opens its
 * diorama full screen; the others stay silhouettes. Whether a threat was met is the server's
 * word (get_bestiary sends a name only then): the diorama itself is public graphics.
 */
export function BestiaryList({ bestiary, nameOf }: { bestiary: Bestiary; nameOf: (code: string) => string }) {
  const [open, setOpen] = useState<{ threat: BestiaryThreat & { name: string }; rarity: ThreatRarity | null } | null>(null);

  return (
    <>
      <p className="text-sm font-medium text-muted">
        Ogni Minaccia che incontri in partita, in Emergenza o in Allarme Triplo si scopre qui: toccala per guardarne il
        diorama. Quelle rare escono di rado: alcune non le ha ancora viste nessuno.
      </p>
      {bestiarySections(bestiary).map((section) => (
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
                <ThreatTile
                  threat={threat}
                  rarity={section.rarity}
                  nameOf={nameOf}
                  onOpen={hasBestiaryDiorama(threat) ? () => setOpen({ threat, rarity: section.rarity }) : undefined}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      <ThreatDioramaViewer threat={open?.threat ?? null} rarity={open?.rarity ?? null} nameOf={nameOf} onClose={() => setOpen(null)} />
    </>
  );
}

function ThreatTile({
  threat,
  rarity,
  nameOf,
  onOpen,
}: {
  threat: BestiaryThreat;
  rarity: ThreatRarity | null;
  nameOf: (code: string) => string;
  /** Set when the threat has a diorama to show. */
  onOpen?: () => void;
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
  const body = (
    <>
      <span className="flex items-start justify-between gap-1">
        <span className="text-[11px] font-extrabold uppercase text-muted">Livello {levelText(threat.level)}</span>
        {onOpen && (
          <span aria-hidden className="shrink-0 bg-comic-yellow px-1 text-[10px] font-extrabold uppercase leading-[14px] text-black">
            Diorama ▸
          </span>
        )}
      </span>
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
    </>
  );
  const box = "flex h-full w-full flex-col gap-1 border-[3px] border-panel-raised bg-panel px-2 py-2 text-left";
  if (!onOpen) {
    return (
      <div className={box} style={frame}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`${threat.name}: guarda il diorama`}
      onClick={onOpen}
      className={`${box} transition-transform active:translate-x-px active:translate-y-px`}
      style={frame}
    >
      {body}
    </button>
  );
}
