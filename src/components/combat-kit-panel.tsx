"use client";

import { useEffect, useState } from "react";
import type { CombatKit } from "@o-mega/game-engine";
import { combatUnlocked, combatUnlockRule, fetchCombatKit, fetchCombatUnlocksOften, type CombatUnlocks } from "@/lib/combat";
import { describeCombatMove, describeCombatPassive, SLOT_LABELS } from "@/lib/combat-text";

/**
 * The character's Scontro a squadre kit in its file (Collezione → card → Scheda), shown only once
 * the player has unlocked it (SPEC §5.19, asked by the user on 26 November 2026): its three moves
 * and its passive. While it is locked, only how far the unlock is, never the moves. Nothing for a
 * character without a kit, or when it does not load.
 */
export function CombatKitPanel({ definitionId, name }: { definitionId: string; name: string }) {
  const [loaded, setLoaded] = useState<{ kit: CombatKit; unlocks: CombatUnlocks } | null>(null);

  useEffect(() => {
    // The page mounts one sheet per card (key), so there is no previous card to clear.
    let cancelled = false;
    Promise.all([fetchCombatKit(definitionId), fetchCombatUnlocksOften()])
      .then(([kit, unlocks]) => {
        if (!cancelled && kit) setLoaded({ kit, unlocks });
      })
      .catch((cause: unknown) => console.error("Scontro kit failed", cause));
    return () => {
      cancelled = true;
    };
  }, [definitionId]);

  if (!loaded) return null;
  return <CombatKitView kit={loaded.kit} unlocks={loaded.unlocks} definitionId={definitionId} name={name} />;
}

export function CombatKitView({ kit, unlocks, definitionId, name }: { kit: CombatKit; unlocks: CombatUnlocks; definitionId: string; name: string }) {
  const done = unlocks.progress[definitionId] ?? 0;
  const unit = unlocks.basis === "played" ? "partite giocate" : "vittorie";
  return (
    <section className="flex w-full flex-col gap-1.5">
      <h3 className="text-[13px] font-semibold leading-[17px] text-muted">Scontro a squadre</h3>
      {combatUnlocked(unlocks, definitionId) ? (
        <ul className="flex flex-col gap-1.5">
          {(["base", "special", "supreme"] as const).map((slot) => (
            <Move key={slot} name={kit[slot].name} kind={SLOT_LABELS[slot]} text={describeCombatMove(kit[slot])} />
          ))}
          {kit.passive && <Move name={kit.passive.name} kind="Passiva" text={`${capitalized(describeCombatPassive(kit.passive))}.`} />}
        </ul>
      ) : (
        <div className="flex flex-col gap-1.5 bg-panel px-3 py-2">
          <p className="text-[13px] font-bold leading-[18px]">
            Kit bloccato: {done}/{unlocks.count} {unit} con {name} in squadra.
          </p>
          <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-black">
            <span className="block h-full bg-comic-yellow" style={{ width: `${Math.min(100, (100 * done) / unlocks.count)}%` }} />
          </span>
          <p className="text-[12px] leading-4 text-muted">{combatUnlockRule(unlocks)} Le mosse si vedono qui quando il kit è sbloccato.</p>
        </div>
      )}
    </section>
  );
}

/** The passive's line starts lower case (the sheets of docs/COMBAT-KITS.md write it after a dash); here it opens its box. */
const capitalized = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function Move({ name, kind, text }: { name: string; kind: string; text: string }) {
  return (
    <li className="flex flex-col bg-panel px-3 py-2">
      <span className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 font-display text-lg leading-6">{name}</span>
        <span className="shrink-0 text-[11px] font-extrabold uppercase text-comic-yellow">{kind}</span>
      </span>
      <span className="text-[13px] leading-[18px] text-muted">{text}</span>
    </li>
  );
}
