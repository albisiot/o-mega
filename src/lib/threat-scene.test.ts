import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bossScene, sceneThreatNames, threatScene } from "./threat-scene";

const namesIn = (file: string, code = /T\d{3}/) =>
  [...readFileSync(`supabase/migrations/${file}`, "utf8").matchAll(new RegExp(`\\('${code.source}', '((?:[^']|'')+)'`, "g"))].map(
    ([, name]) => name.replaceAll("''", "'"),
  );
const catalogNames = [
  ...namesIn("20261030090100_threats.sql"),
  ...namesIn("20261109180000_world_threats.sql"),
  // The rare threats (SPEC §5.15): RA01, EP01, LE01, MI01, AP01, UN01...
  ...namesIn("20261112230000_rare_threats.sql", /(?:RA|EP|LE|MI|AP|UN)\d{2}/),
];

describe("threatScene", () => {
  it("covers exactly the threats in the catalog", () => {
    expect(catalogNames).toHaveLength(104);
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

describe("bossScene", () => {
  it("draws every boss of the catalog", () => {
    const scenes = [...readFileSync("supabase/migrations/20261110090000_boss_mode.sql", "utf8").matchAll(/^ {3}'([a-z]+(?::[a-z]+)?)'\)[,;]\r?$/gm)].map(
      ([, scene]) => scene,
    );
    expect(scenes).toHaveLength(6);
    for (const scene of scenes) expect(bossScene(scene), scene).not.toBeNull();
  });

  it("reads the environment and the actor", () => {
    expect(bossScene("port:golem")).toEqual({ environment: "port", actor: "golem" });
    expect(bossScene("city")).toEqual({ environment: "city" });
    expect(bossScene("moon:golem")).toBeNull();
    expect(bossScene("port:dragon")).toBeNull();
  });
});
