import { describe, expect, it } from "vitest";
import { DISTRICTS, MAP_HEIGHT, MAP_WIDTH, districtOf, placeThreats } from "./city-districts";

describe("city districts", () => {
  it("keeps every spot and label on the map", () => {
    for (const district of DISTRICTS) {
      expect(district.spots).toHaveLength(4);
      for (const [x, y] of [...district.spots, district.label]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(MAP_WIDTH);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(MAP_HEIGHT);
      }
    }
  });

  it("uses the server's district, or one from the name that never changes", () => {
    expect(districtOf({ name: "Rissa al porto", district: "porto" }).id).toBe("porto");
    const rare = districtOf({ name: "La Fine del Mondo", district: null });
    expect(districtOf({ name: "La Fine del Mondo" }).id).toBe(rare.id);
    expect(districtOf({ name: "Strano", district: "nowhere" })).toBeDefined();
  });

  it("never lights two threats of a round on the same spot", () => {
    const placed = placeThreats([
      { name: "Rissa al porto", district: "porto" },
      { name: "Robot impazzito", district: "porto" },
      { name: "Contrabbando al porto", district: "porto" },
    ]);
    expect(new Set(placed.map((p) => `${p.x},${p.y}`)).size).toBe(3);
    expect(placed.every((p) => p.district.id === "porto")).toBe(true);
  });
});
