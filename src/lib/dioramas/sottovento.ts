import { BoxGeometry, ExtrudeGeometry, Group, Shape, SphereGeometry } from "three";
import { CYAN, YELLOW, colorOf, limb, octagonBase, cable, type Framing, type Kit, type Point } from "@/lib/diorama-kit";
import { figure } from "@/lib/diorama-figure";
import { floor } from "@/lib/diorama-props";

/**
 * Sottovento (P195): the hunter of hunters on a terrace of the old town at night, under a
 * crescent moon and a dome. Hooded cloak, bracers, a gourd on his back and an old crossbow across
 * his body (no gadgets: he has no head for them); the wind blows the washing towards him, so the
 * monster hunter sitting on the next roof with his lantern, his back turned, never smells him.
 */
export function sottovento(kit: Kit): Framing {
  const { add, box, cylinder, ball, decorate, tick } = kit;
  const LEATHER = 0x6a4228;
  const WOOD = 0x5e4a3a;
  const F = octagonBase(kit, 0x1a1c28);
  const G = floor(kit, F, 0.06, 0x34303c, 0x24212c, 0.5);

  // The town behind: a block with a dome, and the crescent moon.
  const block = box(1.0, 1.5, 0.12, 0x2a2f4a, -0.55, G, -1.98, { delay: 0.1, ink: 1.02 });
  decorate(block, new BoxGeometry(0.08, 0.12, 0.01), YELLOW, [
    [-0.3, 0.4, 0.065],
    [0.1, 0.4, 0.065],
    [-0.1, 0.8, 0.065],
    [0.3, 1.15, 0.065],
  ]);
  box(0.6, 0.35, 0.12, 0x323854, -0.55, G + 1.5, -1.98, { delay: 0.14 });
  add(new SphereGeometry(0.33, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.1, 0.3), 0x323854, -0.55, G + 1.85, -1.98, { delay: 0.18 });
  cylinder(0.05, 0.07, 0.22, 0x323854, -0.55, G + 2.2, -1.98, { delay: 0.2 }, 8);
  const R = 0.3;
  const d = 0.14;
  const moon = new Shape();
  moon.absarc(0, 0, R, -Math.PI / 2, Math.PI / 2, false);
  moon.absarc(-d, 0, Math.hypot(R, d), Math.atan2(R, d), -Math.atan2(R, d), true);
  add(new ExtrudeGeometry(moon, { depth: 0.04, bevelEnabled: false }), YELLOW, 1.2, G + 2.75, -1.5, { delay: 0.25, flat: true, rotation: [0, 0.35, 0.3] });

  // The next roof: the monster hunter sitting on its edge, his back to us, his lantern lit.
  const RX = -1.0;
  const RZ = -0.95;
  const house = box(1.1, 1.2, 0.95, 0x3a3048, RX, G, RZ, { delay: 0.3 });
  decorate(house, new BoxGeometry(0.16, 0.22, 0.01), YELLOW, [
    [-0.25, 0.75, 0.48],
    [0.3, 0.75, 0.48],
  ]);
  decorate(house, new BoxGeometry(0.16, 0.22, 0.01), 0x141a26, [[0.3, 0.3, 0.48]]);
  box(1.14, 0.12, 0.08, 0x46405a, RX, G + 1.2, RZ + 0.44, { delay: 0.34 });
  box(0.08, 0.12, 0.95, 0x46405a, RX + 0.53, G + 1.2, RZ, { delay: 0.35 });
  figure(kit, {
    x: RX - 0.1,
    z: RZ - 0.44,
    y: G + 1.2 - 1.08 * 0.62 * (1.15 / 2.4),
    facing: Math.PI - 0.35,
    height: 1.15,
    build: "broad",
    skin: 0xd8a88e,
    hair: { style: "bob", color: 0x3a2a22 },
    headwear: { kind: "hat", color: 0x3a3230, accent: 0x5a2a2a },
    scarf: 0x5a2a2a,
    top: { kind: "coat", color: 0x2f5866 },
    bottom: { kind: "trousers", color: 0x2a2826 },
    arms: [
      [-0.1, 0.38, 0.22],
      [0.1, 0.38, 0.22],
    ],
    legs: "sit",
    delay: 0.9,
  });
  const lantern = box(0.12, 0.16, 0.12, YELLOW, RX + 0.25, G + 1.2, RZ - 0.25, { delay: 1.1, flat: true });
  box(0.14, 0.03, 0.14, 0x23222b, RX + 0.25, G + 1.36, RZ - 0.25, { delay: 1.12 });
  limb(kit, [RX - 0.45, G + 1.2, RZ - 0.2], [RX - 0.38, G + 2.0, RZ - 0.35], 0.03, 0.02, 0xc8c0b0, { delay: 1.14 });

  // The chimney, and the washing line from it to that roof: the wind blows the sheets towards him.
  box(0.42, 1.7, 0.42, 0x5a3a3a, 0.15, G, -1.45, { delay: 0.2 });
  box(0.5, 0.08, 0.5, 0x4a2e2e, 0.15, G + 1.7, -1.45, { delay: 0.24 });
  const from: Point = [RX + 0.55, G + 1.55, RZ + 0.47];
  const to: Point = [0.0, G + 1.62, -1.3];
  cable(kit, [from, [(from[0] + to[0]) / 2, G + 1.43, (from[2] + to[2]) / 2], to], 0.01, 0xd8d2c4, 0.3);
  const yaw = Math.atan2(-(to[2] - from[2]), to[0] - from[0]);
  const sheets = [
    [0.3, 0xc8ccd8, 0.55],
    [0.68, 0x8a4a6a, 0.45],
  ].map(([s, color, h], i) => {
    const top: Point = [from[0] + (to[0] - from[0]) * s, from[1] + (to[1] - from[1]) * s - 0.12, from[2] + (to[2] - from[2]) * s];
    const sheet = box(0.42, h, 0.015, color, top[0], top[1] - h, top[2], { delay: 0.4 + i * 0.05 });
    const pivot = new Group();
    pivot.position.set(...top);
    pivot.rotation.order = "YXZ";
    pivot.rotation.y = yaw;
    sheet.parent?.add(pivot);
    pivot.add(sheet);
    sheet.position.set(0, -h, 0);
    return pivot;
  });

  // Sottovento, downwind, the crossbow across his body.
  const man = figure(kit, {
    x: 1.2,
    z: 0.6,
    y: G,
    facing: 0.1,
    height: 2.45,
    skin: 0xc49072,
    hair: { style: "curly", color: 0x2a201c },
    face: { mouth: "smirk", brows: "angry", beard: "stubble", beardColor: 0x2a201c },
    top: { kind: "jacket", color: 0x3a3630, accent: 0x4a3a2c },
    bottom: { kind: "trousers", color: 0x2a2826 },
    belt: LEATHER,
    shoes: 0x5a3a28,
    cape: 0x4e4c58,
    scarf: 0x4e4c58,
    arms: [
      [-0.36, 1.12, 0.44],
      [0.26, 1.06, 0.4],
    ],
    legs: "wide",
    delay: 0.8,
  });
  const at = man.at;
  // Leather bracers on his forearms, a strap across his chest and the gourd on his back.
  man.hands.forEach((hand, i) => {
    const elbow = man.elbows[i];
    const lerp = (k: number): Point => [elbow[0] + (hand[0] - elbow[0]) * k, elbow[1] + (hand[1] - elbow[1]) * k, elbow[2] + (hand[2] - elbow[2]) * k];
    limb(kit, lerp(0.2), lerp(0.75), 0.125, 0.115, LEATHER, { delay: 1.3 });
  });
  limb(kit, at(0.3, 1.2, 0.25), at(-0.3, 1.75, 0.2), 0.03, 0.03, LEATHER, { delay: 1.32 });
  add(new SphereGeometry(0.19, 14, 10).scale(0.85, 1.25, 0.7), 0xd8d0c0, ...at(-0.2, 1.4, -0.36), { delay: 1.35 });
  cylinder(0.04, 0.05, 0.1, WOOD, ...at(-0.2, 1.86, -0.36), { delay: 1.37 }, 8);
  // The crossbow: stock, bolt, bow and string.
  const bowAt = at(-0.62, 1.1, 0.44);
  limb(kit, at(0.5, 1.04, 0.4), bowAt, 0.04, 0.035, WOOD, { delay: 1.4 });
  limb(kit, at(-0.1, 1.15, 0.44), at(-0.72, 1.15, 0.44), 0.012, 0.012, 0xc8d0dc, { delay: 1.45 });
  ball(0.03, CYAN, ...at(-0.14, 1.12, 0.44), { delay: 1.47, flat: true });
  const tips = [-1, 1].map((side) => at(-0.5, 1.1 + side * 0.26, 0.44 + side * 0.16));
  tips.forEach((tip) => limb(kit, bowAt, tip, 0.03, 0.02, 0x3a2e28, { delay: 1.5 }));
  const nut = at(-0.22, 1.12, 0.44);
  tips.forEach((tip) => limb(kit, tip, nut, 0.006, 0.006, 0xd8d2c4, { delay: 1.52, noInk: true }));

  const glow = colorOf(lantern);
  const warm = glow.clone();
  const dim = warm.clone().multiplyScalar(0.7);
  tick((t) => {
    // The washing blows towards him; the hunter's lantern flickers, quite at ease.
    sheets.forEach((pivot, i) => (pivot.rotation.x = -0.35 + Math.sin(t * 2.2 + i * 1.3) * 0.15));
    glow.lerpColors(warm, dim, Math.max(0, Math.sin(t * 9) * Math.sin(t * 3.1)));
  });

  return { width: 4.9, height: 4.4, lookY: 1.5 };
}
