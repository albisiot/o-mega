"use client";

// A fixed Bestiario, to look at the list and the dioramas without a server or an account.
// A development-only page: next.config.ts serves *.dev.tsx pages in `next dev` only, so it
// is never part of the published site. The threats met and the counts are placeholders.
//   /prova-bestiario/             a few threats met in every section, the others silhouettes
//   /prova-bestiario/?apri=AP01   opens La Fine del Mondo straight away (any code of the list)

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { BestiaryList } from "@/components/bestiary-list";
import { PageHeader } from "@/components/comic-parts";
import type { Bestiary, BestiaryThreat } from "@/lib/threat-catalog";
import type { ThreatRarity } from "@/lib/threat-rarity";
import { useLockedScreen } from "@/lib/use-locked-screen";

const ABILITY_NAMES: Record<string, string> = {
  FOR: "Forza", VEL: "Velocità", RES: "Resistenza", INT: "Intelligenza", VOL: "Volontà", PER: "Percezione",
  ENE: "Energia", MAG: "Magia", PSI: "Psiche", COM: "Combattimento", TEC: "Tecnologia", FUR: "Furtività",
};

const RARITIES: ThreatRarity[] = [
  { code: "rare", name: "Rara", rank: 1, color: "#2fb5ff", one_in: 200 },
  { code: "epic", name: "Epica", rank: 2, color: "#b15cff", one_in: 700 },
  { code: "legendary", name: "Leggendaria", rank: 3, color: "#ff9f1c", one_in: 2400 },
  { code: "apocalyptic", name: "Apocalittica", rank: 5, color: "#c1121f", one_in: 5000 },
  { code: "unique", name: "Unica", rank: 6, color: "#ffd60a", one_in: 20000 },
];

function threat(code: string, name: string, level: number | null, abilities: string[], extra: Partial<BestiaryThreat> = {}): BestiaryThreat {
  return {
    code,
    region: "megara",
    level,
    rarity_code: null,
    seen: true,
    times: 3,
    first_seen_at: "2026-11-01T18:00:00Z",
    name,
    flavor: "Minaccia segnaposto.",
    abilities,
    modifier: null,
    ...extra,
  };
}

function unseen(code: string, level: number, extra: Partial<BestiaryThreat> = {}): BestiaryThreat {
  return { ...threat(code, "", level, []), seen: false, times: 0, first_seen_at: null, name: null, flavor: null, abilities: null, ...extra };
}

const BESTIARY: Bestiary = {
  rarities: RARITIES,
  threats: [
    threat("T102", "Muro pericolante", 1, ["FOR"], { times: 1 }),
    threat("T201", "Robot impazzito", 2, ["FOR", "TEC"], { modifier: { code: "focus" } }),
    unseen("T202", 2),
    threat("T305", "Caccia nel buio", 3, [], { modifier: { code: "blind", abilities: [] } }),
    threat("T401", "Rituale proibito", 4, ["MAG", "VOL", "PSI", "INT"], { modifier: { code: "echo", abilities: [] } }),
    unseen("T501", 5),
    threat("T601", "Titano di metallo", 6, ["FOR", "RES", "TEC", "ENE", "COM", "VOL"], { times: 12 }),
    threat("G301", "Risveglio della Sfinge", 3, ["INT", "MAG", "PER"], { region: "giza", modifier: { code: "tomb_silence" } }),
    unseen("G302", 3, { region: "giza" }),
    threat("RA01", "Il Vulcano si sveglia", 7, ["FOR", "RES", "ENE", "VEL", "VOL", "PER", "COM"], {
      rarity_code: "rare",
      modifier: { code: "frost", cap: 8 },
      times: 1,
    }),
    unseen("RA02", 7, { rarity_code: "rare" }),
    unseen("EP01", 8, { rarity_code: "epic" }),
    threat("LE01", "Il gigante della baia", 10, ["FOR", "VEL", "RES", "INT", "VOL", "PER", "ENE", "MAG", "COM", "TEC"], {
      rarity_code: "legendary",
      modifier: { code: "price", maxValue: 3, malus: 2 },
      times: 1,
    }),
    threat("AP01", "La Fine del Mondo", 12, ["FOR", "VEL", "RES", "INT", "VOL", "PER", "ENE", "MAG", "PSI", "COM", "TEC", "FUR"], {
      rarity_code: "apocalyptic",
      times: 1,
    }),
    threat("UN02", "Il sismografo impazzito", null, [], { rarity_code: "unique", modifier: { code: "unknown_level", abilities: [] }, times: 1 }),
    unseen("UN01", 12, { rarity_code: "unique" }),
  ],
};

export default function BestiaryTestPage() {
  return (
    <Suspense>
      <Scene />
    </Suspense>
  );
}

function Scene() {
  const opening = useSearchParams().get("apri");
  useLockedScreen(true);

  // ?apri=CODE taps the threat for the layout checks.
  useEffect(() => {
    if (!opening) return;
    const name = BESTIARY.threats.find((t) => t.code === opening)?.name;
    const tile = name ? document.querySelector<HTMLButtonElement>(`button[aria-label="${name}: guarda il diorama"]`) : null;
    tile?.click();
  }, [opening]);

  const seen = BESTIARY.threats.filter((t) => t.seen).length;
  return (
    <div className="game-shell">
      <PageHeader backHref="/collezione" title="Bestiario" subtitle={`${seen}/${BESTIARY.threats.length} Minacce incontrate`} />
      <main
        data-keep-scroll="main"
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-[calc(env(safe-area-inset-bottom)+16px)]"
      >
        <BestiaryList bestiary={BESTIARY} nameOf={(code) => ABILITY_NAMES[code] ?? code} />
      </main>
    </div>
  );
}
