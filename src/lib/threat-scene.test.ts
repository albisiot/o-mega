import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sceneThreatNames, threatScene } from "./threat-scene";

const catalog = readFileSync("supabase/migrations/20261030090100_threats.sql", "utf8");
const catalogNames = [...catalog.matchAll(/\('T\d{3}', '((?:[^']|'')+)'/g)].map(([, name]) => name.replaceAll("''", "'"));

describe("threatScene", () => {
  it("covers exactly the threats in the catalog", () => {
    expect(catalogNames).toHaveLength(60);
    expect(sceneThreatNames().sort()).toEqual([...catalogNames].sort());
  });

  it("gives a threat its environment and actor", () => {
    expect(threatScene("Robot impazzito")).toEqual({ environment: "city", actor: "robot" });
    expect(threatScene("Contrabbando al porto")).toEqual({ environment: "port" });
    expect(threatScene("Strega della palude")).toEqual({ environment: "swamp", actor: "witch" });
  });

  it("leaves unknown threats on the plain panel", () => {
    expect(threatScene("Minaccia futura")).toBeNull();
  });
});
