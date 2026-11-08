import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sceneThreatNames, threatScene } from "./threat-scene";

const namesIn = (file: string) =>
  [...readFileSync(`supabase/migrations/${file}`, "utf8").matchAll(/\('T\d{3}', '((?:[^']|'')+)'/g)].map(([, name]) =>
    name.replaceAll("''", "'"),
  );
const catalogNames = [...namesIn("20261030090100_threats.sql"), ...namesIn("20261109180000_world_threats.sql")];

describe("threatScene", () => {
  it("covers exactly the threats in the catalog", () => {
    expect(catalogNames).toHaveLength(75);
    expect(sceneThreatNames().sort()).toEqual([...catalogNames].sort());
  });

  it("gives a threat its environment and actor", () => {
    expect(threatScene("Robot impazzito")).toEqual({ environment: "city", actor: "robot" });
    expect(threatScene("Contrabbando al porto")).toEqual({ environment: "port" });
    expect(threatScene("Strega della palude")).toEqual({ environment: "swamp", actor: "witch" });
    expect(threatScene("Risveglio della Sfinge")).toEqual({ environment: "desert", actor: "sphinx" });
  });

  it("leaves unknown threats on the plain panel", () => {
    expect(threatScene("Minaccia futura")).toBeNull();
  });
});
