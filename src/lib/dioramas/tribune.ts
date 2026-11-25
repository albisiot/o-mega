import { BoxGeometry, Color, CylinderGeometry, SphereGeometry, TorusGeometry, type Group } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, cable, colorOf, octagonBase, zigzag, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { crate, facade, floor, ring } from "@/lib/diorama-props";

/**
 * Tribune (P207): the ex-official who powers his quarter with his own body, in the back yard of a
 * tenement at night. In sleeveless work overalls, the six copper fins of his collar fanned out
 * glowing behind his neck, he lays one palm on the block's water boiler: sparks jump, the gauge
 * climbs, steam rises and the windows upstairs are lit. The heat comes up through his boots too.
 * He has a sandwich in the other hand and three lunch tins stacked on a crate, and on the wall
 * his delivery timetable is posted for anyone to read: everyone knows when he will be spent.
 */
export function tribune(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick, motes } = kit;
  const STEEL = 0x4a5060;
  const STEEL_DARK = 0x353a46;
  const OVERALL = 0x2a2e36;
  const BREAD = 0xd8a860;
  const F = octagonBase(kit, 0x1f1c26);
  const G = floor(kit, F, 0.06, 0x3a3a44, 0x2a2a32, 0.6);

  // The tenement, its windows lit by him; his delivery timetable posted on a board in the yard.
  facade(kit, -0.3, -1.4, G, 0.1, { width: 3.0, height: 2.7, color: 0x3a2f4e, windows: 4, floors: 3, door: true, lit: YELLOW });
  [-0.22, 0.22].forEach((dx) => box(0.05, 1.75, 0.05, STEEL_DARK, -1.72 + dx * Math.cos(0.6), G, 0.02 - dx * Math.sin(0.6), { delay: 0.28, noInk: true }));
  const board = box(0.62, 0.46, 0.03, 0xe8e2d0, -1.72, G + 1.2, 0.02, { delay: 0.3, rotation: [0, 0.6, 0] });
  const cells: Point[] = [];
  for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) if ((row + col) % 3 !== 1) cells.push([-0.22 + col * 0.11, 0.08 + row * 0.1, 0.017]);
  decorate(board, new BoxGeometry(0.08, 0.05, 0.01), 0x2a2e36, cells);
  decorate(board, new BoxGeometry(0.08, 0.05, 0.01), MAGENTA, [[0.22, 0.38, 0.018]]);

  // The block's water boiler: a riveted tank on legs, a gauge, a vent, a pipe into the wall.
  const BX = 1.22;
  const BZ = -0.42;
  [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(0.08, 0.22, 0.08, STEEL_DARK, BX + sx * 0.3, G, BZ + sz * 0.3, { delay: 0.3, noInk: true })));
  const tank = cylinder(0.52, 0.52, 1.5, STEEL, BX, G + 0.2, BZ, { delay: 0.35 }, 22);
  decorate(tank, new TorusGeometry(0.525, 0.025, 6, 30).rotateX(Math.PI / 2), STEEL_DARK, [
    [0, 0.12, 0],
    [0, 0.75, 0],
    [0, 1.38, 0],
  ]);
  const heat = add(new TorusGeometry(0.54, 0.035, 6, 30).rotateX(Math.PI / 2), ORANGE, BX, G + 0.36, BZ, { delay: 0.4, flat: true, noInk: true });
  add(new SphereGeometry(0.52, 22, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.4, 1), STEEL_DARK, BX, G + 1.7, BZ, { delay: 0.42 });
  cylinder(0.06, 0.06, 0.4, STEEL_DARK, BX + 0.2, G + 1.9, BZ - 0.1, { delay: 0.45 }, 10);
  motes(10, 0xe8eef4, 0.04, [BX + 0.1, G + 2.3, BZ - 0.2], [BX + 0.35, G + 3.4, BZ], 0.8);
  cable(kit, [[BX - 0.2, G + 1.9, BZ - 0.1], [BX - 0.45, G + 2.25, BZ - 0.5], [BX - 0.6, G + 2.2, -1.22]], 0.06, STEEL_DARK, 0.5);
  // The gauge faces us, its needle climbing as the water warms.
  const GA = 0.25;
  const gaugeAt: Point = [BX + Math.sin(GA) * 0.53, G + 1.25, BZ + Math.cos(GA) * 0.53];
  const gauge = add(new CylinderGeometry(0.14, 0.14, 0.05, 20).rotateX(Math.PI / 2), 0xe8e4d8, gaugeAt[0], gaugeAt[1] - 0.14, gaugeAt[2], { delay: 0.5, rotation: [0, GA, 0] });
  decorate(gauge, new TorusGeometry(0.14, 0.02, 6, 20), STEEL_DARK, [[0, 0.14, 0.015]]);
  decorate(gauge, new BoxGeometry(0.07, 0.035, 0.01), MAGENTA, [[0.08, 0.2, 0.028, -0.8]]);
  const needle = add(new BoxGeometry(0.018, 0.11, 0.01).translate(0, 0.055, 0), 0x14121c, gaugeAt[0] + Math.sin(GA) * 0.035, gaugeAt[1], gaugeAt[2] + Math.cos(GA) * 0.035, { delay: 0.55, noInk: true });
  needle.rotation.order = "YXZ";
  needle.rotation.set(0, GA, 0);

  // His lunch: three tins stacked on a crate, and a thermos.
  crate(kit, -1.3, 0.72, G, 0.5, 0.44, 0x5e4a3a, 0.4);
  [0, 1, 2].forEach((k) => {
    const tin = box(0.34, 0.12, 0.22, k === 1 ? 0x2f6f86 : 0x7a2f55, -1.3, G + 0.44 + k * 0.125, 0.72, { delay: 0.6 + k * 0.04, rotation: [0, 0.4 + k * 0.15, 0] });
    decorate(tin, new BoxGeometry(0.06, 0.03, 0.01), 0xc8c8d0, [[0, 0.07, 0.112]]);
  });
  cylinder(0.06, 0.06, 0.3, 0xc83a3a, -1.05, G + 0.44, 0.55, { delay: 0.72 }, 12);

  // Tribune, planted on his heels, one palm on the tank.
  const X = -0.05;
  const Z = 0.45;
  const T = 0.55;
  const man = figure(kit, {
    x: X,
    z: Z,
    y: G,
    facing: T,
    height: 2.6,
    build: "broad",
    skin: 0xc89070,
    hair: { style: "short", color: 0x2a2220 },
    face: { mouth: "neutral", brows: "angry", beard: "stubble", beardColor: 0x3a3030, marks: 0x9a6850 },
    top: { kind: "tank", color: OVERALL },
    bottom: { kind: "trousers", color: OVERALL },
    belt: 0x14141a,
    gloves: 0x1a1a20,
    shoes: 0x3a2a22,
    arms: [
      [-0.46, 1.24, 0.36],
      [1.0, 1.28, -0.08],
    ],
    legs: "wide",
    delay: 0.8,
  });
  const at = man.at;
  // Pockets and buckle on his overalls.
  box(0.2, 0.18, 0.03, 0x22262e, ...at(-0.17, 1.5, 0.33), { delay: 1.4, rotation: [0, T, 0] });
  box(0.2, 0.18, 0.03, 0x22262e, ...at(0.17, 1.5, 0.33), { delay: 1.42, rotation: [0, T, 0] });
  box(0.12, 0.09, 0.03, 0x8a8e98, ...at(0, 1.13, 0.35), { delay: 1.44, rotation: [0, T, 0] });
  // The collar: six copper fins fanned behind his neck.
  const fins: Group[] = [-1.45, -1.0, -0.55, 0.55, 1.0, 1.45].map((a, k) => {
    const fin = box(0.11, 0.5, 0.03, 0xb85a2a, ...at(Math.sin(a) * 0.12, 1.98 + Math.cos(a) * 0.12, -0.2), { delay: 1.5 + k * 0.03 });
    fin.rotation.order = "YXZ";
    fin.rotation.set(0, T, -a);
    return fin;
  });
  // The sandwich in his right hand.
  const [snack, palm] = man.hands;
  [0, 0.05].forEach((dy, k) => box(0.24, 0.035, 0.18, BREAD, snack[0], snack[1] - 0.06 + dy * 1.4, snack[2] + 0.05, { delay: 1.6 + k * 0.02, rotation: [0, T, 0.1] }));
  box(0.25, 0.03, 0.19, 0x5aa04a, snack[0], snack[1] - 0.025, snack[2] + 0.05, { delay: 1.61, rotation: [0, T, 0.1], noInk: true });

  // The current: sparks from his palm into the tank, and a glow under his boots.
  // Each spark runs from his palm round the tank's skin, towards us.
  const from = Math.atan2(palm[0] - BX, palm[2] - BZ);
  const arc = (to: number, rise: number, seed: number): Point[] =>
    Array.from({ length: 7 }, (_, k) => {
      const u = k / 6;
      const a = from + (to - from) * u;
      const wobble = k % 2 ? 0.05 : -0.05;
      return [BX + Math.sin(a) * 0.56, palm[1] + rise * u + wobble * Math.sin(seed + k), BZ + Math.cos(a) * 0.56] as Point;
    });
  const sparks = [0, 1].map((k) => [0.3, -0.25, 0.05].map((rise, j) => zigzag(kit, [palm, ...arc(from + 0.9 + j * 0.25 + k * 0.1, rise, k * 3 + j)], 0.016, k ? YELLOW : CYAN, 1.7)));
  const halo = ring(kit, [X, G + 0.006, Z], 0.5, ORANGE, 1.6);

  const copper = new Color(0xb85a2a);
  const glow = new Color(0xffa030);
  const cold = new Color(ORANGE);
  const white = new Color(0xffe0a0);
  tick((t) => {
    // The fins and the heat breathe with the current; sparks crackle; the gauge creeps up.
    const k = (Math.sin(t * 2.4) + 1) / 2;
    fins.forEach((fin, i) => colorOf(fin).lerpColors(copper, glow, Math.min(1, k + (i % 2) * 0.2)));
    colorOf(heat).lerpColors(cold, white, k);
    const flick = Math.floor(t * 9) % 2;
    sparks.forEach((set, i) => set.forEach((bolt) => bolt.forEach((piece) => (piece.visible = i === flick))));
    const u = (t * 0.5) % 1;
    halo.children[0].scale.set(1 + u * 0.4, 1, 1 + u * 0.4);
    needle.rotation.z = 1.1 - ((t * 0.12) % 1) * 2.0;
  });

  return { width: 4.9, height: 4.5, lookY: 1.55 };
}
