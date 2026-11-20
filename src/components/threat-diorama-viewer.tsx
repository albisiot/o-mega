"use client";

import { useEffect, useRef } from "react";
import { ThreatDiorama } from "@/components/threat-diorama";
import type { BestiaryThreat } from "@/lib/threat-catalog";
import { modifierLine } from "@/lib/threat-modifiers";
import { levelText, rarityTitle, type ThreatRarity } from "@/lib/threat-rarity";
import { threatScene } from "@/lib/threat-scene";

/**
 * The level a threat's diorama is drawn at in the Bestiario. Livello ignoto changes it at
 * every match (the server sends null): the scene is drawn at full size, the biggest it gets.
 */
export const BESTIARY_UNKNOWN_LEVEL = 6;

/** Whether the Bestiario can show this threat's diorama: met, and with a scene this client knows. */
export function hasBestiaryDiorama(threat: BestiaryThreat): threat is BestiaryThreat & { name: string } {
  return threat.seen && threat.name !== null && threatScene(threat.name) !== null;
}

/**
 * A threat already met, full screen in the Bestiario: its diorama as in a match, and below
 * what the Bestiario knows of it. It opens when `threat` is set and closes on "Chiudi",
 * on Esc or on the phone's back gesture of a dialog; the list underneath never moves.
 */
export function ThreatDioramaViewer({
  threat,
  rarity,
  nameOf,
  onClose,
}: {
  threat: (BestiaryThreat & { name: string }) | null;
  rarity: ThreatRarity | null;
  nameOf: (code: string) => string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (threat && !element.open) element.showModal();
    if (!threat && element.open) element.close();
  }, [threat]);

  const abilities = threat?.abilities ?? [];
  return (
    <dialog
      ref={dialog}
      aria-label={threat ? `Diorama di ${threat.name}` : "Diorama"}
      onClose={onClose}
      className="m-0 h-dvh max-h-none w-full max-w-none border-0 bg-background p-0 text-foreground backdrop:bg-black"
    >
      {threat && (
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+8px)]">
            <p className="min-w-0 flex-1 truncate font-display text-2xl uppercase text-comic-yellow">Bestiario</p>
            <button type="button" onClick={() => dialog.current?.close()} className="btn btn-ghost shrink-0">
              Chiudi
            </button>
          </div>
          <section className="cut-bottom relative mx-3 mb-[calc(env(safe-area-inset-bottom)+12px)] flex min-h-0 flex-1 flex-col overflow-hidden bg-comic-magenta px-4 pb-5 text-black">
            <div aria-hidden className="halftone absolute inset-0 [mask-image:linear-gradient(135deg,transparent_45%,#000_100%)]" />
            {/* The diorama gets the room the screen has left, above the threat's card, as in a match. */}
            <div
              className="relative -mx-4 min-h-24 flex-1"
              style={rarity ? { boxShadow: `inset 0 0 0 4px ${rarity.color}, inset 0 0 26px ${rarity.color}` } : undefined}
            >
              <ThreatDiorama key={threat.code} name={threat.name} level={threat.level ?? BESTIARY_UNKNOWN_LEVEL} fill />
              <p className="pointer-events-none absolute bottom-1 right-2 bg-black/70 px-1.5 text-[11px] font-bold text-white">
                Trascina per girarla
              </p>
            </div>
            <div className="relative flex flex-col gap-1 pt-2">
              <p className="text-xs font-extrabold">
                Livello {levelText(threat.level)}
                {rarity && (
                  <span className="ml-1.5 bg-black px-1.5 py-0.5 uppercase" style={{ color: rarity.color }}>
                    {rarityTitle(rarity)}
                  </span>
                )}
              </p>
              <p className="font-display text-[30px] uppercase leading-8">{threat.name}</p>
              <p className="text-xs font-bold leading-4">
                {abilities.length > 0 ? abilities.map(nameOf).join(" · ") : "Abilità estratte a caso a ogni partita"}
              </p>
              {threat.modifier && (
                <p className="self-start bg-black px-1.5 py-0.5 text-xs font-extrabold leading-4 text-comic-magenta">
                  {modifierLine(threat.modifier, nameOf(abilities[0] ?? ""), nameOf)}
                </p>
              )}
              {threat.flavor && <p className="text-xs italic leading-4">{threat.flavor}</p>}
              <p className="text-[11px] font-extrabold uppercase">
                Incontrata {threat.times} {threat.times === 1 ? "volta" : "volte"}
              </p>
            </div>
          </section>
        </div>
      )}
    </dialog>
  );
}
