import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sceneThreatNames, threatScene } from "./threat-scene";

const catalog = readFileSync("supabase/migrations/20261030090100_threats.sql", "utf8");

describe("threatScene", () => {
  it("only refers to threats that exist in the catalog", () => {
    for (const name of sceneThreatNames()) {
      expect(catalog, name).toContain(`'${name.replaceAll("'", "''")}'`);
    }
  });

  it("gives a threat its environment and actor", () => {
    expect(threatScene("Robot impazzito")).toEqual({ environment: "city", actor: "robot" });
    expect(threatScene("Contrabbando al porto")).toEqual({ environment: "port" });
  });

  it("leaves threats without an environment on the plain panel", () => {
    expect(threatScene("Portale instabile")).toBeNull();
  });
});
