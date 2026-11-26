import { BoxGeometry, CylinderGeometry, Group, SphereGeometry, TorusGeometry } from "three";
import { CYAN, MAGENTA, ORANGE, YELLOW, cable, limb, octagonBase, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Saldatrice (P307): in the scrapyard, between a stack of crushed cars and a pile of tyres, the
 * girl from the breaker's yard welds the shoulder of her robot, goggles pushed up on her
 * bandana, sparks spraying from the torch. The robot is three car doors (two for forearms, one
 * for a head with headlamp eyes) and a washing machine for a chest, its drum still turning with
 * a sock inside. The price of no stealth at all: it puffs smoke from its exhaust like a lorry.
 */
export function saldatrice(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick, motes } = kit;
  const STEEL = 0x4a5262;
  const PIPE = 0x8a93a3;
  const WHITE = 0xd8d4c8;
  const F = octagonBase(kit, 0x1f1c24);
  const G = floor(kit, F, 0.06, 0x3a3236, 0x2a2428, 0);

  // The yard: crushed cars stacked at the back, a pile of tyres, oil stains.
  [
    [0.95, 0, -1.45, 0x7a2f55, 0.1],
    [1.0, 0.32, -1.5, 0x2f6f86, -0.08],
    [0.9, 0.64, -1.45, 0x5a5e6e, 0.15],
    [1.05, 0.96, -1.5, 0x3a6a5a, 0],
  ].forEach(([x, y, z, color, turn], i) => {
    const wreck = box(1.4, 0.3, 0.75, color, x, G + y, z, { delay: 0.1 + i * 0.05, rotation: [0, turn, 0.03 * (i % 2 ? 1 : -1)] });
    decorate(wreck, new BoxGeometry(0.35, 0.1, 0.01), 0x16303e, [
      [-0.3, 0.15, 0.38],
      [0.25, 0.15, 0.38],
    ]);
  });
  [0, 0.18, 0.36, 0.54].forEach((y, i) =>
    add(new TorusGeometry(0.28, 0.1, 8, 18).rotateX(Math.PI / 2), 0x1c1b22, -1.55 + (i % 2) * 0.06, G + y, -1.0, { delay: 0.3 + i * 0.04 }),
  );
  add(new CylinderGeometry(0.32, 0.32, 0.004, 16).scale(1, 1, 0.6), 0x2a2228, -1.2, G, 0.85, { delay: 0.3, flat: true, noInk: true });

  // The robot, facing us: tyre feet, pipe legs, a washing machine chest.
  const RX = -0.45;
  const RZ = -0.35;
  [-1, 1].forEach((side) => {
    const x = RX + side * 0.3;
    add(new TorusGeometry(0.2, 0.09, 8, 16).rotateX(Math.PI / 2), 0x1c1b22, x, G, RZ + 0.05, { delay: 0.4 });
    limb(kit, [x, G + 0.12, RZ + 0.05], [x + side * 0.06, G + 0.62, RZ + 0.12], 0.1, 0.09, PIPE, { delay: 0.45 });
    ball(0.12, STEEL, x + side * 0.06, G + 0.52, RZ + 0.12, { delay: 0.48 });
    limb(kit, [x + side * 0.06, G + 0.62, RZ + 0.12], [x, G + 1.1, RZ], 0.09, 0.1, PIPE, { delay: 0.5 });
  });
  box(0.8, 0.2, 0.5, STEEL, RX, G + 1.0, RZ, { delay: 0.52 });
  const chest = box(0.86, 0.92, 0.76, WHITE, RX, G + 1.18, RZ, { delay: 0.56 });
  decorate(chest, new BoxGeometry(0.86, 0.14, 0.01), 0xb8b4a8, [[0, 0.82, 0.385]]);
  decorate(chest, new CylinderGeometry(0.04, 0.04, 0.02, 10).rotateX(Math.PI / 2), 0x2a2a34, [
    [-0.28, 0.82, 0.395],
    [-0.16, 0.82, 0.395],
  ]);
  decorate(chest, new BoxGeometry(0.12, 0.05, 0.01), CYAN, [[0.25, 0.82, 0.392]]);
  decorate(chest, new TorusGeometry(0.26, 0.045, 8, 24), 0xb0b8c4, [[0, 0.4, 0.39]]);
  // The drum behind the porthole, turning with the washing in it.
  const holder = new Group();
  holder.position.set(RX, G + 1.58, RZ + 0.385);
  const drum = add(new CylinderGeometry(0.23, 0.23, 0.02, 22).rotateX(Math.PI / 2), 0x26344a, 0, 0, 0, { delay: 0.6, flat: true, noInk: true });
  drum.parent?.add(holder);
  holder.add(drum);
  drum.position.set(0, -0.23, 0);
  decorate(drum, new BoxGeometry(0.08, 0.2, 0.01), MAGENTA, [[0.08, 0.3, 0.012, 0.5]]);
  decorate(drum, new BoxGeometry(0.16, 0.1, 0.01), CYAN, [[-0.08, 0.16, 0.012, -0.3]]);
  decorate(drum, new SphereGeometry(0.025, 8, 6), 0xe8f4ff, [
    [0.1, 0.12, 0.015],
    [-0.12, 0.32, 0.015],
    [0.02, 0.38, 0.015],
  ]);
  // Arms: pipe shoulders, and car doors for forearms (one blue, one red), clamps for hands.
  const doors: [number, number, Point, Point][] = [
    [-1, 0x2f5f8a, [RX - 0.6, G + 1.95, RZ], [RX - 0.72, G + 1.45, RZ + 0.1]],
    [1, 0x9a2a4a, [RX + 0.6, G + 1.95, RZ], [RX + 0.78, G + 1.5, RZ + 0.2]],
  ];
  doors.forEach(([side, color, shoulder, elbow], i) => {
    ball(0.17, STEEL, shoulder[0], shoulder[1] - 0.17, shoulder[2], { delay: 0.64 + i * 0.03 });
    limb(kit, shoulder, elbow, 0.1, 0.09, PIPE, { delay: 0.66 + i * 0.03 });
    const door = box(0.1, 0.78, 0.56, color, elbow[0] + side * 0.02, elbow[1] - 0.74, elbow[2] + 0.12, { delay: 0.7 + i * 0.03, rotation: [0.15, 0, side * -0.06] });
    decorate(door, new BoxGeometry(0.11, 0.24, 0.4), 0x16303e, [[0, 0.58, -0.02]]);
    decorate(door, new BoxGeometry(0.12, 0.03, 0.1), 0xb0b8c4, [[0, 0.36, 0.12]]);
    [-1, 1].forEach((k) => box(0.06, 0.16, 0.05, STEEL, elbow[0] + side * 0.02, elbow[1] - 0.92, elbow[2] + 0.16 + k * 0.09, { delay: 0.76 }));
  });
  // The head: the third door folded into a box, two headlamps, a car aerial.
  cylinder(0.08, 0.1, 0.18, PIPE, RX, G + 2.1, RZ, { delay: 0.78 });
  const head = box(0.56, 0.4, 0.44, 0x3f6a5a, RX, G + 2.24, RZ, { delay: 0.8, rotation: [0, 0.15, 0] });
  decorate(head, new CylinderGeometry(0.08, 0.08, 0.02, 14).rotateX(Math.PI / 2), CYAN, [
    [-0.13, 0.22, 0.225],
    [0.13, 0.22, 0.225],
  ]);
  decorate(head, new BoxGeometry(0.4, 0.03, 0.01), 0x2a4a40, [[0, 0.06, 0.222]]);
  box(0.015, 0.5, 0.015, 0x2a2a34, RX + 0.2, G + 2.64, RZ - 0.1, { delay: 0.84, noInk: true });
  // The exhaust over its shoulder, and the smoke.
  limb(kit, [RX - 0.3, G + 1.9, RZ - 0.42], [RX - 0.3, G + 2.6, RZ - 0.42], 0.06, 0.06, PIPE, { delay: 0.86 });
  motes(12, 0x4a4650, 0.06, [RX - 0.45, G + 2.6, RZ - 0.55], [RX - 0.15, G + 3.5, RZ - 0.3], 1.2);

  // Saldatrice beside it, the torch up at its shoulder, the other hand on her hip.
  const welder = figure(kit, {
    x: 0.75,
    z: 0.3,
    y: G,
    facing: 0.05,
    height: 2.25,
    build: "slim",
    skin: 0xe8b898,
    hair: { style: "bun", color: 0x2a1a18 },
    face: { mouth: "smirk", brows: "raised", marks: 0xc07860 },
    headwear: { kind: "bandana", color: 0xc0303a },
    top: { kind: "apron", color: 0x2a3048, accent: 0x4a6a8a, sleeves: "long" },
    bottom: { kind: "trousers", color: 0x4a6a8a },
    shoes: 0x3a2a22,
    gloves: 0x7a4a2a,
    arms: [[-0.5, 1.85, 0.32], "hip"],
    delay: 0.9,
  });
  // Goggles pushed up on the bandana.
  const u = 2.25 / 2.4;
  decorate(welder.headPart, new CylinderGeometry(0.05, 0.05, 0.05, 12).rotateX(Math.PI / 2), 0x2a2a34, [
    [-0.075 * u, 0.33 * u, 0.2],
    [0.075 * u, 0.33 * u, 0.2],
  ]);
  decorate(welder.headPart, new CylinderGeometry(0.035, 0.035, 0.01, 12).rotateX(Math.PI / 2), CYAN, [
    [-0.075 * u, 0.33 * u, 0.228],
    [0.075 * u, 0.33 * u, 0.228],
  ]);
  // The torch: a handle, a bent nozzle, the hose down to the gas bottle.
  const hand = welder.hands[0];
  const nozzle: Point = [hand[0] - 0.22, hand[1] + 0.12, hand[2] - 0.08];
  limb(kit, [hand[0] + 0.04, hand[1] - 0.05, hand[2]], nozzle, 0.03, 0.022, 0x6a7282, { delay: 1.5 });
  cylinder(0.11, 0.11, 0.7, MAGENTA, 1.55, G, -0.35, { delay: 0.5 }, 14);
  ball(0.11, MAGENTA, 1.55, G + 0.64, -0.35, { delay: 0.52 });
  cylinder(0.03, 0.03, 0.1, 0x2a2a34, 1.55, G + 0.82, -0.35, { delay: 0.54 });
  cable(kit, [[1.55, G + 0.9, -0.35], [1.2, G + 0.35, -0.3], [0.55, G + 0.9, -0.05], [hand[0] + 0.06, hand[1] - 0.1, hand[2]]], 0.02, 0x1c1b22, 1.55);
  // The flame and the spray of sparks.
  const flame = ball(0.05, 0xf4f8ff, nozzle[0] - 0.03, nozzle[1] - 0.05, nozzle[2], { delay: 1.6, flat: true, noInk: true });
  const sparks = Array.from({ length: 10 }, (_, k) => box(0.03, 0.03, 0.03, k % 3 ? YELLOW : ORANGE, ...nozzle, { delay: 1.6 + k * 0.02, flat: true, noInk: true }));

  tick((t) => {
    holder.rotation.z = -t * 3;
    flame.visible = Math.floor(t * 20) % 5 !== 0 || t === 0;
    sparks.forEach((spark, k) => {
      const p = (t * 1.3 + k / 10) % 1;
      const a = k * 2.4;
      spark.position.set(nozzle[0] - 0.05 + Math.cos(a) * p * 0.5, nozzle[1] - 0.05 + p * 0.35 - p * p * 1.3, nozzle[2] + Math.sin(a) * p * 0.4);
    });
  });

  return { width: 4.9, height: 4.5, lookY: 1.65 };
}
