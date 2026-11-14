// The map of Nuova Megara (public/world/mappa-megara.svg, 400 × 600): nine districts, each
// with the point its name sits on and four spots where a threat lights up. A threat's
// district comes from the server (threat_definitions.district); threats without one (rare
// threats) get one from their name, always the same. Nothing here decides anything.

export type DistrictId = "necropoli" | "alti" | "vulcano" | "centro" | "stazione" | "popolari" | "lungomare" | "porto" | "cantiere";

export type District = {
  id: DistrictId;
  name: string;
  /** Where the district's name sits, on the map's 400 × 600 frame. */
  label: [number, number];
  /** Where its threats light up. */
  spots: [number, number][];
};

export const MAP_WIDTH = 400;
export const MAP_HEIGHT = 600;

export const DISTRICTS: District[] = [
  { id: "necropoli", name: "Necropoli", label: [18, 182], spots: [[40, 40], [110, 30], [40, 120], [118, 140]] },
  { id: "alti", name: "Quartieri alti", label: [292, 236], spots: [[200, 40], [255, 140], [330, 160], [372, 210]] },
  { id: "vulcano", name: "Vulcano", label: [300, 112], spots: [[312, 60], [368, 84], [300, 24], [372, 40]] },
  { id: "centro", name: "Centro dei templi", label: [160, 312], spots: [[175, 150], [228, 232], [168, 262], [240, 292]] },
  { id: "stazione", name: "Stazione e metrò", label: [10, 344], spots: [[40, 222], [118, 230], [30, 318], [106, 312]] },
  { id: "popolari", name: "Quartieri popolari", label: [292, 404], spots: [[300, 290], [370, 280], [320, 360], [378, 380]] },
  { id: "lungomare", name: "Lungomare", label: [8, 400], spots: [[30, 372], [120, 372], [112, 430], [60, 386]] },
  { id: "porto", name: "Porto", label: [168, 336], spots: [[160, 380], [262, 380], [150, 456], [70, 528]] },
  { id: "cantiere", name: "Cantiere dell'Ora Zero", label: [252, 556], spots: [[318, 436], [384, 432], [310, 488], [382, 520]] },
];

const byId = new Map(DISTRICTS.map((d) => [d.id, d]));

/** A small stable hash of a text, for the threats without a district. */
function hash(text: string): number {
  let h = 0;
  for (const char of text) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

/** The district of a threat: its own, or one picked from its name. */
export function districtOf(threat: { name: string; district?: string | null }): District {
  return byId.get(threat.district as DistrictId) ?? DISTRICTS[hash(threat.name) % DISTRICTS.length];
}

export type Placed = { district: District; x: number; y: number };

/**
 * Where each threat of a round lights up: a spot of its district, picked from its name, and
 * never the spot of another threat of the same round.
 */
export function placeThreats(threats: { name: string; district?: string | null }[]): Placed[] {
  const taken = new Set<string>();
  return threats.map((threat) => {
    const district = districtOf(threat);
    let spot = hash(threat.name) % district.spots.length;
    for (let tries = 0; tries < district.spots.length && taken.has(`${district.id}-${spot}`); tries++) {
      spot = (spot + 1) % district.spots.length;
    }
    taken.add(`${district.id}-${spot}`);
    const [x, y] = district.spots[spot];
    return { district, x, y };
  });
}
