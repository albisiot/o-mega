"use client";

// Fixed result pages for the layout check (scripts/test-layout.mjs): the comic pages of the
// classic match, Allarme Triplo, Grande Minaccia and Emergenza with many powers at once, so
// nothing covers anything. A development-only page: next.config.ts serves *.dev.tsx pages in
// `next dev` only, so it is never part of the published site. Data are placeholders.
// Every card wears an effect (SPEC §4.8), on both sides, so the check covers the art with them.

import { useEffect, useState } from "react";
import type { ThreatModifier } from "@o-mega/game-engine";
import { BossComic } from "@/components/boss-comic";
import { CardDetailProvider } from "@/components/card-detail";
import { CardLooksProvider } from "@/components/card-looks";
import { EmergencyComic } from "@/components/emergency-comic";
import { RoundComic, type ComicSide } from "@/components/round-comic";
import { TripleMapReveal } from "@/components/triple-comic";
import { abilityChips, chipsTotal } from "@/lib/ability-marks";
import type { BossEntry } from "@/lib/boss-powers";
import { EFFECT_CODES, type CosmeticsState, type OpponentLooks } from "@/lib/cosmetics";
import type { MatchCard } from "@/lib/match";
import type { PowerNote } from "@/lib/round-powers";
import { getSupabase } from "@/lib/supabase/client";
import type { TripleView } from "@/lib/triple";
import { keepCosmetics } from "@/lib/use-cosmetics";

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
// The backlog powers (P218-P231) and an opposing card covered by Nebbia, as the server sends it.
const afterimage = card("Afterimage", "P228", { FOR: 4, RES: 5, ENE: 0, VEL: 8, COM: 8, FUR: 9 }, "heroes", 4);
const recesso = card("Recesso", "P224", { FOR: 5, RES: 6, ENE: 0, MAG: 10, COM: 10 }, "heroes", 3);
const upkeep = card("Upkeep", "P218", { FOR: 3, RES: 5, ENE: 6, VEL: 2, TEC: 9 }, "heroes", 2);
const statera = card("Statera", "P220", { FOR: 5, RES: 8, ENE: 0, MAG: 9, PER: 10 }, "neutrals", 2);
const clementia = card("Clementia", "P214", { FOR: 3, RES: 4, ENE: 1, MAG: 10, COM: 3 }, "villains", 4);
const residuo = card("Residuo", "P227", { FOR: 7, RES: 10, ENE: 0, VEL: 5, MAG: 7, COM: 10, FUR: 6 }, "heroes", 4);
// The power variants of 16 November 2026.
const collateral = card("Collateral", "P073", { COM: 8, FOR: 6, TEC: 6 }, "neutrals", 2);
const zetaRax = card("Zeta Rax", "P099", { COM: 9, PER: 8, FUR: 7 }, "neutrals", 2);
const injunction = card("Injunction", "P179", { FOR: 4, RES: 5, ENE: 9, PER: 10, VOL: 10 }, "neutrals", 3);
const contromano = card("Contromano", "P215", { FOR: 5, RES: 7, ENE: 9, PSI: 10, INT: 9 }, "neutrals", 4);
const actuary = card("Actuary", "P047", { FOR: 5, RES: 6, ENE: 6, INT: 8, TEC: 8 }, "neutrals", 3);

// An effect on every card, the same for both sides; the result pages leave out the frames and the
// effects that write on the art (Autografo, Numerata), which stay on the cards of the table.
const LOOK_CARDS = [dredge, talos, plinth, malleus, mongi, tifeo, afterimage, recesso, upkeep, statera, clementia, residuo, collateral, zetaRax, injunction, contromano, actuary];
const LOOKS: OpponentLooks = Object.fromEntries(
  LOOK_CARDS.map((c, i) => [c.definition_id, { frame: "gold", effect: EFFECT_CODES[i % EFFECT_CODES.length], serial: 7 }]),
);
const MY_LOOKS: CosmeticsState = {
  shard_balance: 0,
  costs: { pack: 1, cosmetic: 1, kind: 2, variant: 3 },
  values: {},
  catalog: [],
  inventory: [],
  applied: Object.entries(LOOKS).map(([definition_id, look]) => ({
    definition_id,
    frame: look.frame,
    frame_visible: true,
    effect: look.effect,
    effect_visible: true,
    effect_serial: look.serial,
  })),
  breakable: [],
  missing_variants: 0,
};
// Sacrificio: Residuo scores 0, then every later card of its side gets this until the end of the match.
const SACRIFICE = 3;
const lasting = n("Sacrificio di Residuo", "sacrifice", `+${SACRIFICE}`, { points: SACRIFICE, source: "pack" });
const fogged: MatchCard = {
  definition_id: "",
  code: "",
  name: "Ignoto",
  faction: "",
  flavor: "",
  art_url: "/cards/nebbia.webp",
  stats: {},
  rarity: { code: "", name: "", rank: 0, color: "#7c8794" },
  power: { code: "fog", params: {}, name: "Nebbia", text: "L'avversario non vede chi hai giocato fino a fine partita" },
  hidden: true,
};

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
  /** The line under the verdict; a win of 32 to 31 when not given. */
  resultLine?: string;
  /** What the player's Veggente or Spia showed; one threat and one card when not given. */
  revealed?: { foreseen: { round: number; level: number; name: string }[]; spied: MatchCard[] };
  /** Points Sabotatore sul punteggio took from each side's score. */
  scoreStruck?: { me?: number; op?: number };
};
type Scene = RoundScene | { kind: "boss"; tie?: boolean } | { kind: "emergency"; reverse?: boolean } | { kind: "triple-map" };

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
  "nebbia": {
    kind: "round",
    threat: "Titano di metallo",
    abilities: GOLEM,
    me: [afterimage, 14, [n("Riverbero", "echo", "+2", { points: 2 }), n("Capobranco", "pack_leader", "+1", { points: 1, source: "pack" })]],
    op: [fogged, 22, [n("Nebbia", "fog", "nasconde chi l'ha giocato")]],
    winner: "opponent",
  },
  "poteri-nuovi": {
    kind: "round",
    threat: "Rivolta in fonderia",
    abilities: ["RES", "MAG", "COM"],
    me: [recesso, 24, [n("Riflesso", "reflect", "rimanda −1 a ogni abilità"), lasting]],
    op: [clementia, 16, [n("Sabotatore", "sabotage", "fermato dallo scudo", { cancelled: "blocked" })]],
    winner: "me",
  },
  // Residuo gives up its round: its score is 0, the bonus goes to every later card.
  "sacrificio": {
    kind: "round",
    threat: "Rivolta in fonderia",
    abilities: ["RES", "MAG", "COM"],
    me: [residuo, 0, [n("Sacrificio", "sacrifice", `+${SACRIFICE} ai prossimi`, { timing: "after" })]],
    op: [statera, 18, [n("Contrattacco", "counterpunch", "+1", { points: 1 })]],
    winner: "opponent",
  },
  // A later card with three bonuses: its own power, Capobranco and Sacrificio, the longest name.
  "sacrificio-duraturo": {
    kind: "round",
    threat: "Titano di metallo",
    abilities: GOLEM,
    me: [afterimage, 15, [n("Riverbero", "echo", "+2", { points: 2 }), n("Capobranco", "pack_leader", "+1", { points: 1, source: "pack" }), lasting]],
    op: [malleus, 21, [n("Riscossa", "comeback", "+2", { points: 2, source: "carried" }), n("Sacrificio di Residuo", "sacrifice", `+${SACRIFICE}`, { points: SACRIFICE, source: "pack" })]],
    winner: "opponent",
  },
  // Allarme Triplo: the bonus reaches the cards on every threat in the later rounds.
  "sacrificio-triplo": {
    kind: "round",
    triple: true,
    threat: "Gigante risvegliato",
    abilities: GOLEM,
    me: [dredge, 26, [lasting]],
    op: [tifeo, 26, [n("Slancio", "momentum", "+2 al prossimo", { timing: "after" })]],
    winner: "none",
  },
  // Rovescio: Residuo's 0 is the lowest score, so it wins its round.
  "sacrificio-rovescio": {
    kind: "round",
    threat: "Il mondo capovolto",
    abilities: ["FOR", "VEL", "MAG", "COM", "FUR"],
    rule: { code: "reverse" },
    twist: { name: "Rovescio", text: "Vince il punteggio più basso." },
    tier: "#b15cff",
    me: [residuo, 0, [n("Sacrificio", "sacrifice", `+${SACRIFICE} ai prossimi`, { timing: "after" })]],
    op: [plinth, 24, []],
    winner: "me",
  },
  "arrangiarsi": {
    kind: "round",
    threat: "Allagamento in galleria",
    abilities: ["VEL", "MAG", "TEC", "PER"],
    me: [upkeep, 22, [n("Arte di arrangiarsi", "scrappy", "+4", { points: 4 }), n("Catalizzatore", "catalyst", "×2 al potere del prossimo", { timing: "after" })]],
    op: [statera, 23, [n("Contrattacco", "counterpunch", "+2", { points: 2 })]],
    winner: "opponent",
    decisive: { side: "opponent", index: 0, text: "Senza Contrattacco finiva 21 a 22." },
  },
  // Four abilities wrap the chips onto two rows: every chip gets Sabotatore's −1, on both sides.
  "sabotatore-quattro": {
    kind: "round",
    threat: "Assalto alla torre",
    abilities: ["FOR", "VEL", "INT", "MAG"],
    me: [talos, 21, [n("Sabotatore", "sabotage", "−1 a ogni abilità rivale")]],
    op: [dredge, 13, [n("Sabotatore", "sabotage", "−1 a ogni abilità rivale")]],
    winner: "me",
  },
  // Five abilities with the rule's mark and Sabotatore's: two marks over a chip of the second row.
  "sabotatore-regola": {
    kind: "round",
    threat: "Il mondo capovolto",
    abilities: ["FOR", "VEL", "INT", "MAG", "FUR"],
    rule: { code: "focus" },
    twist: { name: "Colpo mirato", text: "Forza conta doppio." },
    me: [dredge, 30, [n("Riflesso", "reflect", "rimanda −1 a ogni abilità")]],
    op: [talos, 31, [n("Sabotatore", "sabotage", "−1 a ogni abilità rivale")]],
    winner: "opponent",
  },
  // Sabotatore brings the totals level and lowers the tie-break value too: a void round.
  "sabotatore-parita": {
    kind: "round",
    threat: "Assalto alla torre",
    abilities: ["FOR", "VEL"],
    me: [talos, 11, []],
    op: [malleus, 11, [n("Sabotatore", "sabotage", "−1 a ogni abilità rivale")]],
    winner: "none",
    resultLine: "Pari 11 a 11 e stesso valore più alto (7): round nullo.",
  },
  // The tie Sabotatore made goes to Implacabile, before the highest value.
  "sabotatore-implacabile": {
    kind: "round",
    threat: "Assalto alla torre",
    abilities: ["FOR", "VEL"],
    me: [plinth, 11, [n("Implacabile", "relentless", "vince la parità", { timing: "tie" })]],
    op: [malleus, 11, [n("Sabotatore", "sabotage", "−1 a ogni abilità rivale")]],
    winner: "me",
    decisive: { side: "me", index: 0, text: "Senza Implacabile vinceva Malleus, col valore più alto." },
    resultLine: "Pari 11 a 11: vince Plinth con Implacabile.",
  },
  // The power variants of 16 November 2026 (SPEC §4.4).
  "varianti-sabotatore": {
    kind: "round",
    threat: "Assalto alla torre",
    abilities: ["FOR", "VEL"],
    me: [clementia, 14, [n("Sabotatore", "sabotage_flat", "−2 al punteggio rivale")]],
    op: [talos, 15, [n("Specialità", "ability_bonus", "+2", { points: 2 })]],
    winner: "opponent",
    scoreStruck: { op: 2 },
    resultLine: "Talos batte Clementia · 15 a 14.",
  },
  "varianti-implacabile": {
    kind: "round",
    threat: "Rissa al porto",
    abilities: ["COM"],
    me: [collateral, 8, [n("Implacabile", "relentless_small", "vince anche sotto di 1", { timing: "tie" })]],
    op: [zetaRax, 9, []],
    winner: "me",
    decisive: { side: "me", index: 0, text: "Senza Implacabile vinceva Zeta Rax, 9 a 8." },
    resultLine: "Collateral batte Zeta Rax · 8 a 9: con Implacabile vince anche sotto di 1.",
  },
  "varianti-annullatore": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    me: [injunction, 18, [n("Annullatore", "delayed_nullifier", "annulla il potere del prossimo rivale", { timing: "after" })]],
    op: [tifeo, 26, [n("Nemesi", "nemesis", "+4", { points: 4 })]],
    winner: "opponent",
    resultLine: "Re Tifeo batte Injunction · 26 a 18.",
  },
  "varianti-annullato-dopo": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    me: [dredge, 23, [n("Tuttofare", "all_rounder", "+3", { points: 3 })]],
    op: [mongi, 26, [{ name: "Sfavorito", code: "underdog", effect: "annullato", active: false, source: "own", cancelled: "nullified" }]],
    winner: "opponent",
    resultLine: "Mongibello batte Dredge · 26 a 23.",
  },
  "varianti-veggente": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    me: [contromano, 21, [n("Veggente", "foresight_short", "svela le Minacce dei prossimi 2 round")]],
    op: [talos, 23, []],
    winner: "opponent",
    revealed: {
      foreseen: [
        { round: 4, level: 5, name: "Titano di metallo" },
        { round: 5, level: 2, name: "Robot impazzito" },
      ],
      spied: [],
    },
    resultLine: "Talos batte Contromano · 23 a 21.",
  },
  "varianti-spia": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    me: [actuary, 17, [n("Spia", "spy_many", "svela 2 personaggi rivali")]],
    op: [malleus, 21, [n("Ultimo baluardo", "round_exact", "+4", { points: 4 })]],
    winner: "opponent",
    revealed: { foreseen: [], spied: [plinth, mongi] },
    resultLine: "Malleus batte Actuary · 21 a 17.",
  },
  "varianti-riscossa": {
    kind: "round",
    threat: "Golem di cemento",
    abilities: GOLEM,
    me: [talos, 19, [n("Riscossa", "comeback_long", "+2 ai prossimi due", { timing: "after" }), n("Legame", "bond_relay", "+3", { points: 3 })]],
    op: [tifeo, 27, [n("Riscossa", "comeback_margin", "+3", { points: 3, source: "carried" }), n("Sfavorito", "underdog_wall", "+4", { points: 4 })]],
    winner: "opponent",
    resultLine: "Re Tifeo batte Talos · 27 a 19.",
  },
  "grande-minaccia": { kind: "boss" },
  // Equal scores on a front: the «i» on the card met there.
  "grande-minaccia-pari": { kind: "boss", tie: true },
  "triplo-mappa": { kind: "triple-map" },
  "emergenza": { kind: "emergency" },
  // Under Rovescio the target is a maximum: Sabotatore does not move it.
  "emergenza-rovescio": { kind: "emergency", reverse: true },
};

function sideOf(label: string, [c, score, notes, flag]: Play, abilities: string[], rule: ThreatModifier | undefined, malus: number): ComicSide {
  const threat = { abilities, modifier: rule ?? null };
  return {
    label,
    card: c,
    // A card covered by Nebbia shows no values.
    stats: c.hidden ? abilities.map((code) => `${code} ?`).join(" · ") : "",
    chips: c.hidden ? undefined : abilityChips(c.stats, threat, malus),
    score,
    notes,
    flag: flag ?? null,
    struckPoints: chipsTotal(abilityChips(c.stats, threat)) - chipsTotal(abilityChips(c.stats, threat, malus)),
  };
}

/** Sabotatore sul punteggio: what it took is struck from the score, like the abilities. */
function withStruck(side: ComicSide, points = 0): ComicSide {
  return points ? { ...side, struckPoints: (side.struckPoints ?? 0) + points } : side;
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
    facing: facing ? { card: facing, score: 23, highest: 9, since: 1, together: false } : null,
    holder: side,
  };
}

/** An Allarme Triplo round on the map: three threats in three districts, one each way. */
function tripleView(): TripleView {
  const mine = [dredge, talos, plinth].map((c, i) => ({ ...c, instance_id: `m${i}`, drawn_round: 1, played: true }));
  const theirs = [malleus, tifeo, mongi];
  const play = (score: number) => ({ base: score, bonus: 0, score, highest: 10, auto_played: false });
  const threat = (slot: number, name: string, level: number, district: string) => ({
    slot, name, level, district, abilities: ["FOR", "RES", "ENE", "TEC", "VEL", "MAG"].slice(0, level), flavor: "", modifier: null,
  });
  return {
    id: "prova", mode: "bot", format: "triple", bot_difficulty: "hard", status: "active", my_side: "a", current_round: 2, rounds_count: 3,
    threats: [threat(0, "Rissa al porto", 1, "porto"), threat(1, "Spettro del museo", 2, "centro"), threat(2, "Gigante risvegliato", 5, "vulcano")],
    points: { me: 2, opponent: 1 }, total_score: { me: 0, opponent: 0 }, result: null, end_reason: null, reward_coins: null, level_rewards: [],
    server_now: new Date().toISOString(), opponent: null, my_deck: mine,
    rounds: [
      {
        round: 1, deadline_at: "", resolved: true, hand: null, my_pending: null, opponent_has_chosen: false,
        contests: [0, 1, 2].map((slot) => ({
          slot,
          winner: (["me", "opponent", "me"] as const)[slot],
          my_play: { ...play([12, 14, 33][slot]), instance_id: `m${slot}`, definition_id: mine[slot].definition_id },
          opponent_play: { ...theirs[slot], ...play([9, 17, 31][slot]) },
        })),
      },
    ],
  } as unknown as TripleView;
}

function SceneView({ id }: { id: string }) {
  const scene = SCENES[id];
  if (scene?.kind === "triple-map") {
    const view = tripleView();
    return (
      <TripleMapReveal
        view={view}
        round={view.rounds[0]}
        rival="Bot Difficile"
        abilities={[]}
        finished={false}
        onVerdict={() => {}}
        onDone={() => window.setTimeout(markDone, 1500)}
        onContinue={() => {}}
      />
    );
  }
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
          me: bossEntry("me", dredge, 2, scene.tie ? 23 : 27, [n("Tuttofare", "all_rounder", "+3", { points: 3 }), n("Riscossa", "comeback", "+2", { points: 2, source: "carried" }), n("Slancio", "momentum", "+2 al prossimo", { timing: "after" })], talos),
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
  if (scene.kind === "emergency" && scene.reverse) {
    return (
      <EmergencyComic
        number={4}
        of={8}
        passedBefore={2}
        failedBefore={1}
        lastChance={false}
        threatName="Il mondo capovolto"
        level={5}
        abilities={["FOR", "VEL", "INT", "MAG", "FUR"]}
        card={malleus}
        stats=""
        chips={abilityChips(malleus.stats, { abilities: ["FOR", "VEL", "INT", "MAG", "FUR"], modifier: { code: "reverse" } })}
        twist={{ name: "Rovescio", text: "Vince il punteggio più basso: al massimo 20." }}
        rule={{ code: "reverse" }}
        tierColor="#b26bff"
        score={19}
        target={20}
        required={20}
        passed
        notes={[{ name: "Sabotatore", code: "sabotage", source: "own", effect: "sotto Rovescio non agisce", active: false }]}
        decisive={null}
        ended={false}
        onContinue={() => {}}
        onVerdict={() => window.setTimeout(markDone, 2500)}
        action={() => <button className="btn btn-primary w-full">Avanti</button>}
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
  // Sabotatore hits unless a shield stopped it; Riflesso sends it back to the other card.
  const hits = (notes: PowerNote[]) => notes.some((x) => (x.code === "sabotage" || x.code === "sabotage_big") && x.active && !x.cancelled);
  const reflects = (notes: PowerNote[]) => notes.some((x) => x.code === "reflect" && x.active);
  const meMalus = hits(scene.op[2]) || reflects(scene.op[2]) ? 1 : 0;
  const opMalus = hits(scene.me[2]) || reflects(scene.me[2]) ? 1 : 0;
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
      me={withStruck(sideOf("Tu", scene.me, scene.abilities, scene.rule, meMalus), scene.scoreStruck?.me)}
      opponent={withStruck(sideOf("Bot Difficile", scene.op, scene.abilities, scene.rule, opMalus), scene.scoreStruck?.op)}
      winner={scene.winner}
      decisive={scene.decisive ?? null}
      revealed={scene.revealed ?? { foreseen: [{ round: 4, level: 5, name: "Titano di metallo" }], spied: [plinth] }}
      resultLine={scene.resultLine ?? "Dredge batte Talos · 32 a 31."}
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
    // After the sign-in check, which forgets what was kept for a visitor without an account.
    void getSupabase().auth.getSession().then(() => window.setTimeout(() => keepCosmetics(MY_LOOKS), 300));
    const timer = window.setTimeout(() => setId(scene), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* As tall as a match's strip at the top, so the page gets the room it has in a match. */}
      <div className="h-16 shrink-0 bg-panel" />
      {id !== null && (
        <CardLooksProvider opponent={LOOKS}>
          <CardDetailProvider>
            <SceneView id={id} />
          </CardDetailProvider>
        </CardLooksProvider>
      )}
    </div>
  );
}
