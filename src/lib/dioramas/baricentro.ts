import { BoxGeometry, CylinderGeometry, DodecahedronGeometry, ExtrudeGeometry, Group, Shape } from "three";
import { INK, MAGENTA, ORANGE, YELLOW, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { column, floor, ring, steps } from "@/lib/diorama-props";

/**
 * Baricentro (P337): the Banco's collector on the steps of its portico at night, one hand held
 * palm down over a debtor. Rings of gravity sink onto him, the paving has caved into a glowing
 * crater under his knees and lumps of it float loose round her; his coins rise out of his
 * pockets into a neat column over his head, the account squared. The weight spares nobody, her
 * included: her own heels have cracked the stone.
 */
export function baricentro(kit: Kit): Framing {
  const { add, box, cylinder, decorate, tick } = kit;
  const STONE = 0x7c8aa4;
  const F = octagonBase(kit, 0x1c1c26);
  const G = floor(kit, F, 0.06, 0x3a3f4e, 0x262a35, 0.5);

  // The Banco: steps, four columns, the architrave and a pediment, a lit doorway behind.
  box(2.95, 0.42, 0.55, 0x5d6680, 0, G, -1.45, { delay: 0.06, ink: 1.02 });
  steps(kit, 0, -0.6, G, 0.1, { width: 2.6, count: 3, tread: 0.19, rise: 0.14, color: 0x5d6680 });
  const wall = box(2.6, 2.06, 0.16, 0x2a2e40, 0, G + 0.42, -1.62, { delay: 0.08, ink: 1.02 });
  decorate(wall, new BoxGeometry(0.6, 1.2, 0.01), 0x14121c, [[0, 0.6, 0.081]]);
  decorate(wall, new BoxGeometry(0.22, 0.4, 0.01), YELLOW, [
    [-0.74, 1.1, 0.081],
    [0.74, 1.1, 0.081],
  ]);
  [-1.1, -0.37, 0.37, 1.1].forEach((x, k) => column(kit, x, -1.45, G + 0.42, 0.2 + k * 0.04, 2.0, false, STONE));
  box(2.95, 0.22, 0.5, 0x8a98b0, 0, G + 2.48, -1.45, { delay: 0.4 });
  const gable = new Shape();
  gable.moveTo(-1.5, 0);
  gable.lineTo(1.5, 0);
  gable.lineTo(0, 0.5);
  gable.closePath();
  add(new ExtrudeGeometry(gable, { depth: 0.4, bevelEnabled: false }).translate(0, 0, -0.2), STONE, 0, G + 2.7, -1.45, { delay: 0.45 });

  // The crater: dark caved paving, cracks glowing gold, slabs tipped up at its rim.
  const CX = -0.55;
  const CZ = 0.8;
  add(new CylinderGeometry(0.7, 0.7, 0.01, 18), 0x15141c, CX, G, CZ, { delay: 0.5, flat: true, noInk: true });
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + 0.2;
    const length = 0.45 + (k % 3) * 0.2;
    box(length, 0.006, 0.03, k % 2 ? YELLOW : ORANGE, CX + Math.cos(a) * (0.45 + length / 2), G + 0.012, CZ + Math.sin(a) * (0.45 + length / 2) * 0.9, {
      delay: 0.55 + k * 0.02,
      flat: true,
      noInk: true,
      rotation: [0, -a, 0],
    });
  }
  [0.6, 2.1, 3.3, 4.6].forEach((a, k) =>
    box(0.36, 0.06, 0.3, 0x3a3f4e, CX + Math.cos(a) * 0.72, G, CZ + Math.sin(a) * 0.7, { delay: 0.6 + k * 0.03, rotation: [0.5, -a, 0.2] }),
  );

  // The debtor, bald and sweating, on his knees under the weight.
  const debtor = figure(kit, {
    x: CX,
    z: CZ,
    y: G - 0.04,
    facing: 0.75,
    height: 2.1,
    build: "heavy",
    skin: 0xd8a888,
    hair: { style: "bald", color: 0x3a2a22 },
    face: { mouth: "open", brows: "worried" },
    top: { kind: "suit", color: 0x5a5048, accent: 0xd8d2c4, tie: MAGENTA },
    bottom: { kind: "trousers", color: 0x4a4038 },
    arms: [[-0.4, 0.55, 0.38], [0.3, 0.75, 0.5]],
    legs: "kneel",
    delay: 0.7,
  });
  debtor.headPart.rotation.x = 0.25;
  const drop = debtor.at(0.16, 1.88, 0.12);
  box(0.03, 0.05, 0.03, 0x9fe8ff, drop[0], drop[1], drop[2], { delay: 1.5, flat: true });

  // Baricentro: silver bob, long dark coat, black turtleneck, palm down over him.
  const collector = figure(kit, {
    x: 0.55,
    z: 0.05,
    y: G,
    facing: 0.05,
    height: 2.5,
    build: "slim",
    skin: 0xe8c8b0,
    hair: { style: "bob", color: 0xd8dde6 },
    face: { mouth: "neutral", brows: "calm", eyes: 0x3a4a5a },
    top: { kind: "coat", color: 0x2e3442, accent: 0x15161c },
    bottom: { kind: "trousers", color: 0x23262f },
    shoes: 0x15141a,
    scarf: 0x15161c,
    arms: [[-0.78, 1.3, 0.62], "down"],
    legs: "wide",
    delay: 0.9,
  });
  const palm = collector.hands[0];
  add(new CylinderGeometry(0.12, 0.12, 0.01, 16), YELLOW, palm[0], palm[1] - 0.1, palm[2], { delay: 1.6, flat: true, noInk: true });
  // Her own heels have cracked the paving too.
  [-0.5, 0.3, 1.2, 2.6].forEach((a, k) =>
    box(0.3, 0.006, 0.022, INK, 0.55 + Math.cos(a) * 0.45, G + 0.01, 0.05 + Math.sin(a) * 0.35, { delay: 1.0 + k * 0.02, flat: true, noInk: true, rotation: [0, -a, 0] }),
  );

  // Rings of weight sinking onto the debtor.
  const sink = [0, 1, 2].map((k) => ring(kit, [CX, G + 1.5, CZ], 0.55, k === 1 ? MAGENTA : YELLOW, 1.7 + k * 0.05));

  // Lumps of paving floating loose.
  const lumps: { part: Group; y: number; k: number }[] = [
    [-1.6, 1.4, 0.3, 0.13],
    [-1.2, 2.1, 1.1, 0.1],
    [0.1, 2.5, 0.9, 0.09],
    [1.5, 1.8, 0.6, 0.12],
    [-1.0, 2.45, 0.2, 0.08],
    [1.3, 1.1, 1.2, 0.1],
    [-1.55, 0.7, 1.15, 0.09],
  ].map(([x, y, z, r], k) => ({ part: add(new DodecahedronGeometry(r), k % 2 ? 0x4a5266 : 0x5d6680, x, G + y, z, { delay: 1.2 + k * 0.04, rotation: [k, k * 2, 0] }), y: G + y, k }));

  // His coins rising into a squared column at her side.
  const stackAt: Point = [-0.5, G + 2.5, 0.85];
  for (let k = 0; k < 7; k++) cylinder(0.075, 0.075, 0.03, YELLOW, stackAt[0], stackAt[1] - 0.25 + k * 0.035, stackAt[2], { delay: 1.8 + k * 0.03 }, 14);
  const coins = Array.from({ length: 6 }, (_, k) => cylinder(0.06, 0.06, 0.025, YELLOW, CX, G + 1.0, CZ, { delay: 1.9 + k * 0.03 }, 12));
  const from = debtor.at(0, 1.2, 0.1);

  tick((t) => {
    sink.forEach((part, k) => {
      const v = (t * 0.5 + k / 3) % 1;
      part.position.y = G + 1.55 - v * 1.4;
      part.children[0].scale.set(1 + v * 0.4, 1, 1 + v * 0.4);
    });
    lumps.forEach(({ part, y, k }) => {
      part.position.y = y + Math.sin(t * 1.3 + k * 1.7) * 0.06;
      part.rotation.y = k * 2 + t * 0.3;
    });
    coins.forEach((coin, k) => {
      const v = (t * 0.35 + k / coins.length) % 1;
      coin.position.set(from[0] + (stackAt[0] - from[0]) * v + Math.sin(v * 9) * 0.08, from[1] + (stackAt[1] + 0.1 - from[1]) * v, from[2] + (stackAt[2] - from[2]) * v);
      coin.rotation.x = v * 6;
    });
  });

  return { width: 4.9, height: 4.6, lookY: 1.6 };
}
