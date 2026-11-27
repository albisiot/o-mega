import { BackSide, DataTexture, Mesh, MeshBasicMaterial, RedFormat, type Object3D } from "three";
import { describe, expect, it } from "vitest";
import { boardSlot, buildBoardDiorama, firstHex } from "@/lib/combat-board-3d";
import { DIORAMAS } from "@/lib/diorama-index";

const toonSteps = new DataTexture(new Uint8Array([90, 170, 255]), 3, 1, RedFormat);
const ink = new MeshBasicMaterial({ color: 0x000000, side: BackSide });

/** The meshes three.js would draw for a diorama: every visible mesh (each one is a draw). */
function draws(root: Object3D): number {
  let count = 0;
  root.traverseVisible((object) => {
    if ((object as Mesh).isMesh) count += 1;
  });
  return count;
}

describe("boardSlot", () => {
  it("puts the enemy far and the player's team near, front lines in the middle", () => {
    expect(boardSlot(false, 3)).toEqual({ x: 0, z: expect.any(Number) });
    expect(boardSlot(false, 3).z).toBeLessThan(boardSlot(false, 0).z);
    expect(boardSlot(false, 0).z).toBeLessThan(0);
    expect(boardSlot(true, 0).z).toBeGreaterThan(0);
    expect(boardSlot(true, 2).z).toBeGreaterThan(boardSlot(true, 0).z);
    expect(boardSlot(true, 2).x).toBeLessThan(boardSlot(true, 0).x);
    expect(boardSlot(true, 4).x).toBeGreaterThan(boardSlot(true, 1).x);
  });
});

describe("firstHex", () => {
  it("takes the first colour of a name's paint", () => {
    expect(firstHex("linear-gradient(180deg, #ffd60a 0 40%, #ff8a00)", "#fff")).toBe("#ffd60a");
    expect(firstHex("#abc", "#fff")).toBe("#abc");
    expect(firstHex("var(--x)", "#ffffff")).toBe("#ffffff");
  });
});

describe("buildBoardDiorama", () => {
  it("merges the still parts of a diorama into a few draws", async () => {
    // Drawn part by part each of these is well over a hundred draws (a part and its ink, and the
    // details on it); Matins (P230) is left out: its crowd nods, so most of it stays apart.
    for (const code of ["P001", "P043", "P204", "P062"]) {
      const build = await DIORAMAS.find((entry) => entry.code === code)!.load();
      const diorama = buildBoardDiorama(build, toonSteps, ink);
      expect(diorama.merged.length).toBeGreaterThan(0);
      expect(draws(diorama.root)).toBeLessThan(30);
    }
  });

  it("keeps apart the parts the diorama moves", async () => {
    // Gantry (P001): the crane's beacon flashes, so it is not merged.
    const build = await DIORAMAS.find((entry) => entry.code === "P001")!.load();
    const diorama = buildBoardDiorama(build, toonSteps, ink);
    expect(diorama.tickers.length).toBeGreaterThan(0);
    expect(diorama.live.length).toBeGreaterThan(0);
  });
});
