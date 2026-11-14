"use client";

// Fixed result pages for the layout check (scripts/test-layout.mjs): the comic pages of the
// classic match, Allarme Triplo, Grande Minaccia and Emergenza with many powers at once, so
// nothing covers anything. A development-only page: next.config.ts serves *.dev.tsx pages in
// `next dev` only, so it is never part of the published site. Data are placeholders.

import { useEffect, useState } from "react";
import type { ThreatModifier } from "@o-mega/game-engine";
import { BossComic } from "@/components/boss-comic";
import { EmergencyComic } from "@/components/emergency-comic";
import { RoundComic, type ComicSide } from "@/components/round-comic";
import { abilityChips, chipsTotal } from "@/lib/ability-marks";
import type { BossEntry } from "@/lib/boss-powers";
import type { MatchCard } from "@/lib/match";
import type { PowerNote } from "@/lib/round-powers";

const RARITY = ["", "delta", "gamma", "beta", "alfa", "omega"];
const card = (name: string, art: string, stats: Record<string, number>, faction = "heroes", rank = 3): MatchCard => ({
  definition_id: name,
  code: art,
  name,
  faction,
  flavor: "",
  art_url: `/cards/${art}.webp`,
  stats,
  rarity: { code: RARITY[rank], name: RARITY[rank][0].toUpperCase() + RARITY[rank].slice(1), rank, color: "#999" },
  power: null,
});
const n = (name: string, code: string, effect: string | null, extra: Partial<PowerNote> = {}): PowerNote => ({
  name,
  code,
  effect,
  active: true,
  source: "own",
  ...extra,
});

const GOLEM = ["FOR", "RES", "ENE"];
const dredge = card("Dredge", "P077", { FOR: 8, RES: 8, ENE: 7, VEL: 5, INT: 3, MAG: 1, FUR: 4 });
const talos = card("Talos", "P091", { FOR: 10, RES: 1, ENE: 10, VEL: 7, INT: 6, MAG: 2, FUR: 3 }, "neutrals");
const plinth = card("Plinth", "P112", { FOR: 10, RES: 10, ENE: 3 });
const malleus = card("Malleus", "P029", { FOR: 10, RES: 8, ENE: 3, FUR: 5 }, "villains", 4);
const mongi = card("Mongibello", "P060", { FOR: 10, RES: 6, ENE: 10, TEC: 3 }, "heroes", 5);
const tifeo = card("Re Tifeo", "P080", { FOR: 10, RES: 10, ENE: 6, TEC: 5 }, "villains", 4);

type Play = [MatchCard, number, PowerNote[], { text: string; points: number }?];
type RoundScene = {
  kind: "round";
  threat: string;
  abilities: string[];
  rule?: ThreatModifier;
  twist?: { name: string; text: string };
  tier?: string;
  me: Play;
  op: Play;
  winner: "me" | "opponent" | "none";
  decisive?: { side: "me" | "opponent"; index: number; text: string };
  /** Allarme Triplo: the caption and the verdict of a threat's page. */
  triple?: boolean;
  slots?: boolean;
};
type Scene = RoundScene | { kind: "boss" } | { kind: "emergency" };

const SCENES: Record<string, Scene> = {
  "tutto-insieme": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    rule: { code: "focus" },
    twist: { name: "Colpo mirato", text: "Forza conta doppio." },
    me: [dredge, 32, [n("Tuttofare", "all_rounder", "+3", { points: 3 }), n("Riscossa", "comeback", "+2", { points: 2, source: "carried" })]],
    op: [talos, 31, [n("Sabotatore", "sabotage", "−1 a ogni abilità rivale")]],
    winner: "me",
    decisive: { side: "me", index: 0, text: "Senza Tuttofare finiva 29 a 31." },
  },
  "slancio-riscossa": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    me: [dredge, 25, [n("Slancio", "momentum", "+2 al prossimo", { timing: "after" }), n("Riscossa", "comeback", "+2", { points: 2, source: "carried" })]],
    op: [tifeo, 29, [n("Nemesi", "nemesis", "+3", { points: 3 }), n("Riscossa", "comeback", "+2", { points: 2, source: "carried" })]],
    winner: "opponent",
  },
  "tre-fumetti": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    me: [
      dredge,
      30,
      [
        n("Tuttofare", "all_rounder", "+3", { points: 3 }),
        n("Riscossa", "comeback", "+2", { points: 2, source: "carried" }),
        n("Slancio", "momentum", "+2 al prossimo", { timing: "after" }),
      ],
    ],
    op: [
      malleus,
      28,
      [
        n("Sabotatore", "sabotage", "−1 a ogni abilità rivale"),
        n("Ultimo baluardo", "last_stand", "+3", { points: 3 }),
        n("Veggente", "foresight", "svela le prossime Minacce"),
      ],
    ],
    winner: "me",
    decisive: { side: "me", index: 0, text: "Senza Tuttofare finiva 27 a 28." },
  },
  "spia-eco": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    me: [talos, 24, [n("Spia", "spy", "svela le carte rivali"), n("Eco", "echo", "+2", { points: 2 })]],
    op: [plinth, 23, [n("Implacabile", "relentless", "vince la parità", { timing: "tie" }), n("Schermato", "shielded", "+1", { points: 1 })]],
    winner: "me",
  },
  "stop": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    me: [plinth, 23, [n("Annullatore", "nullifier", "annulla il potere rivale")]],
    op: [malleus, 21, [{ name: "Ultimo baluardo", code: "last_stand", effect: "annullato", active: false, source: "own", cancelled: "nullified" }]],
    winner: "me",
    decisive: { side: "me", index: 0, text: "Senza Annullatore Malleus faceva 24." },
  },
  "parita": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    me: [malleus, 21, [n("Implacabile", "relentless", "vince la parità", { timing: "tie" })]],
    op: [talos, 21, []],
    winner: "me",
    decisive: { side: "me", index: 0, text: "Senza Implacabile il round era nullo." },
  },
  "bandiere": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    rule: { code: "hostile_ground", favored: "heroes", hindered: "villains", bonus: 3, malus: 2 },
    twist: { name: "Territorio ostile", text: "Eroi +3, Cattivi -2." },
    me: [mongi, 31, [n("Legame", "bond", "+2", { points: 2 }), n("Riscossa", "comeback", "+2", { points: 2, source: "carried" })], { text: "Eroi +3", points: 3 }],
    op: [tifeo, 24, [n("Ultimo baluardo", "last_stand", "+3", { points: 3 })], { text: "Cattivi −2", points: -2 }],
    winner: "me",
  },
  "silenzio": {
    kind: "round",
    threat: "Trappola della tomba",
    abilities: ["FUR"],
    rule: { code: "tomb_silence" },
    twist: { name: "Silenzio della tomba", text: "In questo round nessun potere funziona." },
    me: [talos, 3, [{ name: "Apripista", code: "opener", effect: "zittito dalla tomba", active: false, source: "own", cancelled: "silenced" }]],
    op: [malleus, 5, [{ name: "Sabotatore", code: "sabotage", effect: "zittito dalla tomba", active: false, source: "own", cancelled: "silenced" }]],
    winner: "opponent",
  },
  "rovescio": {
    kind: "round",
    threat: "Il mondo capovolto",
    abilities: ["FOR", "VEL", "INT", "MAG", "FUR"],
    rule: { code: "reverse" },
    twist: { name: "Rovescio", text: "Vince il punteggio più basso." },
    tier: "#b26bff",
    me: [dredge, 21, []],
    op: [talos, 31, [n("Ultimo baluardo", "last_stand", "+3", { points: 3 })]],
    winner: "me",
  },
  "triplo": {
    kind: "round",
    triple: true,
    threat: "Infiltrazione nel quartier generale",
    abilities: GOLEM,
    me: [dredge, 27, [n("Riscossa", "comeback", "+2", { points: 2, source: "carried" }), n("Slancio", "momentum", "+2 al prossimo", { timing: "after" })]],
    op: [malleus, 26, [n("Sabotatore", "sabotage", "−1 a ogni abilità rivale"), n("Riscossa", "comeback", "+2", { points: 2, source: "carried" })]],
    winner: "me",
  },
  "grande-minaccia": { kind: "boss" },
  "emergenza": { kind: "emergency" },
};

function sideOf(label: string, [c, score, notes, flag]: Play, abilities: string[], rule: ThreatModifier | undefined, malus: number): ComicSide {
  const threat = { abilities, modifier: rule ?? null };
  return {
    label,
    card: c,
    stats: "",
    chips: abilityChips(c.stats, threat, malus),
    score,
    notes,
    flag: flag ?? null,
    struckPoints: chipsTotal(abilityChips(c.stats, threat)) - chipsTotal(abilityChips(c.stats, threat, malus)),
  };
}

const markDone = () => {
  document.documentElement.dataset.done = "1";
};
const hint = () => <span className="text-xs font-bold uppercase text-black">Tocca</span>;

function bossEntry(side: "me" | "opponent", c: MatchCard, front: number, score: number, notes: PowerNote[], facing: MatchCard | null): BossEntry {
  return {
    side,
    card: c,
    front,
    score,
    highest: 10,
    notes,
    facing: facing ? { card: facing, score: 23, highest: 10, since: 1, together: false } : null,
    holder: side,
  };
}

function SceneView({ id }: { id: string }) {
  const scene = SCENES[id];
  if (!scene) return <p className="p-4">Scene: {Object.keys(SCENES).join(", ")}</p>;
  if (scene.kind === "boss") {
    return (
      <BossComic
        turn={3}
        turns={5}
        bossName="Il Colosso del porto"
        fronts={[
          { name: "Rissa al porto", level: 1 },
          { name: "Robot impazzito", level: 2 },
          { name: "Contrabbando al porto", level: 3 },
          { name: "Esercito di androidi", level: 4 },
          { name: "Titano di metallo", level: 5 },
        ]}
        values={[1, 1, 4, 1, 4]}
        holdersBefore={["me", "opponent", null, "me", "opponent"]}
        holdersAfter={["me", "opponent", "me", "me", "opponent"]}
        rivalName="Bot Difficile"
        entries={{
          me: bossEntry("me", dredge, 2, 27, [n("Tuttofare", "all_rounder", "+3", { points: 3 }), n("Riscossa", "comeback", "+2", { points: 2, source: "carried" }), n("Slancio", "momentum", "+2 al prossimo", { timing: "after" })], talos),
          opponent: bossEntry("opponent", malleus, 4, 25, [n("Sabotatore", "sabotage", "−1 a ogni abilità rivale"), { name: "Legame", code: "bond", effect: null, active: false, source: "own" }], plinth),
        }}
        stats={{ me: "FOR 8 · RES 8 · ENE 7 · TEC 3", opponent: "FOR 10 · RES 8 · VOL 5 · COM 4" }}
        press={{ me: undefined, opponent: undefined }}
        points={{ me: 8, opponent: 6 }}
        totals={{ me: 17, opponent: 15 }}
        notices={[]}
        hint={hint}
        onContinue={() => {}}
        onDone={markDone}
      />
    );
  }
  if (scene.kind === "emergency") {
    return (
      <EmergencyComic
        number={4}
        of={8}
        passedBefore={2}
        failedBefore={1}
        lastChance={false}
        threatName="Golem di cemento"
        level={3}
        abilities={GOLEM}
        card={malleus}
        stats=""
        chips={abilityChips(malleus.stats, { abilities: GOLEM, modifier: null })}
        score={21}
        target={23}
        required={20}
        passed
        notes={[
          { name: "Sabotatore", code: "sabotage", source: "own", effect: "soglia −3", active: true, threshold: 3 },
          { name: "Riscossa", code: "comeback", source: "carried", effect: "+2", active: true, points: 2 },
        ]}
        decisive={{ index: 0, text: "Senza Sabotatore ne servivano 23." }}
        ended={false}
        onContinue={() => {}}
        onVerdict={() => window.setTimeout(markDone, 2500)}
        action={() => <button className="btn btn-primary w-full">Avanti</button>}
      />
    );
  }
  const meMalus = scene.op[2].some((x) => x.code === "sabotage" && x.active) ? 1 : 0;
  const opMalus = scene.me[2].some((x) => x.code === "sabotage" && x.active) ? 1 : 0;
  return (
    <RoundComic
      round={3}
      level={scene.abilities.length}
      threatName={scene.threat}
      abilities={scene.abilities}
      caption={scene.triple ? `R2 · Minaccia 2/3 · Lv ${scene.abilities.length}` : undefined}
      titles={scene.triple ? { win: "Minaccia presa!", lose: "Minaccia persa", void: "Minaccia pari" } : undefined}
      twist={scene.twist ?? null}
      rule={scene.rule ?? null}
      tierColor={scene.tier ?? null}
      me={sideOf("Tu", scene.me, scene.abilities, scene.rule, meMalus)}
      opponent={sideOf("Bot Difficile", scene.op, scene.abilities, scene.rule, opMalus)}
      winner={scene.winner}
      decisive={scene.decisive ?? null}
      revealed={{ foreseen: [{ round: 4, level: 5, name: "Titano di metallo" }], spied: [plinth] }}
      resultLine="Dredge batte Talos · 32 a 31."
      notices={[]}
      hint={hint}
      onContinue={() => {}}
      onDone={markDone}
    />
  );
}

export default function LayoutCheckPage() {
  // The scene comes from ?s=…, read once the page is in the browser (static pages have no query).
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const scene = new URLSearchParams(window.location.search).get("s") ?? "";
    (window as unknown as { __SCENES: string[] }).__SCENES = Object.keys(SCENES);
    const timer = window.setTimeout(() => setId(scene), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* As tall as a match's strip at the top, so the page gets the room it has in a match. */}
      <div className="h-16 shrink-0 bg-panel" />
      {id !== null && <SceneView id={id} />}
    </div>
  );
}
